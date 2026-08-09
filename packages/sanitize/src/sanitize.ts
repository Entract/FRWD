import {
  getAttr,
  ID_ATTR,
  isElement,
  removeAttr,
  setTextContent,
  textContent,
  walkElements,
  type Element,
  type Node,
  type ParentNode,
} from "@frwd/format";
import { stripRemoteCss } from "./css.js";
import {
  FETCHING_ATTRIBUTES,
  FORBIDDEN_ELEMENTS,
  INERT_SCRIPT_TYPES,
  NAVIGATIONAL_ATTRIBUTES,
  isEventHandlerAttribute,
} from "./rules.js";
import { inspect } from "./inspect.js";
import type { InspectOptions, SanitizeChange, SanitizeReport } from "./types.js";
import { classifyUrl, isExecutableDataUrl, parseSrcset, requiresNetworkOrExternalFile } from "./urls.js";

/**
 * Bring a document inside the native safety profile, and say what that cost.
 *
 * This is the mutating half, deliberately separate from `inspect()`. Nothing in
 * this package edits a document unless a caller asks for it in these words -
 * opening a file is not consent to have it rewritten.
 *
 * Every edit is reported. A user who is told "we removed three things" and
 * shown which three can decide whether they still trust the sender; a user
 * whose document is silently altered cannot.
 */
export function sanitize(root: Node, options: InspectOptions = {}): SanitizeReport {
  const changes: SanitizeChange[] = [];

  const record = (change: Omit<SanitizeChange, "elementId">, element: Element): void => {
    const id = nearestId(element);
    changes.push(id === undefined ? change : { ...change, elementId: id });
  };

  // Collect first: removing elements while walking the tree would skip nodes.
  const elements = [...walkElements(root)];

  for (const element of elements) {
    const tagName = element.tagName;

    if (tagName === "script") {
      const type = (getAttr(element, "type") ?? "").trim().toLowerCase();
      if (!INERT_SCRIPT_TYPES.has(type)) {
        record(
          {
            action: "removed-element",
            code: "executable-script",
            detail: type === "" ? "<script>" : `<script type="${type}">`,
          },
          element,
        );
        detach(element);
        continue;
      }
      if (/<\s*\/?\s*script/i.test(textContent(element))) {
        record(
          {
            action: "cleared-script-content",
            code: "script-content-escape",
            detail: `Inert <script type="${type}"> content could close its own element.`,
          },
          element,
        );
        setTextContent(element, "");
      }
    }

    if (FORBIDDEN_ELEMENTS.has(tagName)) {
      record({ action: "removed-element", code: "forbidden-element", detail: `<${tagName}>` }, element);
      detach(element);
      continue;
    }

    if (tagName === "meta" && (getAttr(element, "http-equiv") ?? "").toLowerCase() === "refresh") {
      record({ action: "removed-element", code: "meta-refresh", detail: "<meta http-equiv=\"refresh\">" }, element);
      detach(element);
      continue;
    }

    sanitizeAttributes(element, record);

    if (tagName === "style") {
      const { css, removed } = stripRemoteCss(textContent(element));
      for (const finding of removed) {
        record(
          {
            action: "rewrote-css",
            code: finding.kind === "import" ? "css-import" : "css-external-resource",
            detail: `${finding.context}: ${finding.value}`,
          },
          element,
        );
      }
      if (removed.length > 0) setTextContent(element, css);
    }
  }

  return { changes, remaining: inspect(root, options) };
}

type Record_ = (change: Omit<SanitizeChange, "elementId">, element: Element) => void;

function sanitizeAttributes(element: Element, record: Record_): void {
  const tagName = element.tagName;
  const fetching = FETCHING_ATTRIBUTES.get(tagName);
  const navigational = NAVIGATIONAL_ATTRIBUTES.get(tagName);

  // Copy: the loop removes attributes from the live list.
  for (const attribute of [...element.attrs]) {
    const name = attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name;
    const value = attribute.value;

    if (isEventHandlerAttribute(name)) {
      record({ action: "removed-attribute", code: "event-handler-attribute", detail: `${name} on <${tagName}>` }, element);
      removeAttr(element, attribute.name);
      continue;
    }

    if (name === "style") {
      const { css, removed } = stripRemoteCss(value, { inlineDeclarations: true });
      if (removed.length === 0) continue;
      for (const finding of removed) {
        record(
          {
            action: "rewrote-css",
            code: finding.kind === "import" ? "css-import" : "css-external-resource",
            detail: `style attribute on <${tagName}>: ${finding.value}`,
          },
          element,
        );
      }
      if (css === "") removeAttr(element, "style");
      else attribute.value = css;
      continue;
    }

    const isFetching = fetching?.has(name) === true;
    const isNavigational = navigational?.has(name) === true;
    if (!isFetching && !isNavigational) continue;

    const candidates = name === "srcset" ? parseSrcset(value) : [value];
    const offending = candidates.find((candidate) => {
      const url = classifyUrl(candidate);
      if (url.kind === "executable" || url.kind === "opaque") return true;
      if (isExecutableDataUrl(url)) return true;
      return isFetching && requiresNetworkOrExternalFile(url);
    });
    if (offending === undefined) continue;

    const url = classifyUrl(offending);
    const code =
      url.kind === "executable" || url.kind === "opaque"
        ? "unsafe-url-scheme"
        : isExecutableDataUrl(url)
          ? "unsafe-data-url"
          : "external-resource";

    record({ action: "removed-attribute", code, detail: `${name} on <${tagName}>: ${offending}` }, element);
    removeAttr(element, attribute.name);
  }
}

function detach(element: Element): void {
  const parent = element.parentNode;
  if (!parent) return;
  const index = parent.childNodes.indexOf(element);
  if (index !== -1) parent.childNodes.splice(index, 1);
}

function nearestId(element: Element): string | undefined {
  let current: Element | null = element;
  while (current) {
    const id = getAttr(current, ID_ATTR);
    if (id !== undefined) return id;
    const parent: ParentNode | null = current.parentNode;
    current = parent !== null && isElement(parent) ? parent : null;
  }
  return undefined;
}
