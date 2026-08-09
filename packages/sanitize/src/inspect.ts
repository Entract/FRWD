import { getAttr, ID_ATTR, textContent, walkElements, type Element, type Node } from "@frwd/format";
import { inspectCss } from "./css.js";
import {
  DEFAULT_MAX_DATA_URL_BYTES,
  FETCHING_ATTRIBUTES,
  FORBIDDEN_ELEMENTS,
  INERT_SCRIPT_TYPES,
  KNOWN_CUSTOM_ELEMENTS,
  NAVIGATIONAL_ATTRIBUTES,
  isCustomElement,
  isEventHandlerAttribute,
} from "./rules.js";
import type { Diagnostic, InspectOptions } from "./types.js";
import { classifyUrl, isExecutableDataUrl, parseSrcset, requiresNetworkOrExternalFile } from "./urls.js";

/**
 * Report every way this document leaves the native safety profile.
 *
 * Strictly non-mutating. An unsafe file is still a file: it parses as inert
 * data, and the honest response is to describe what is wrong with it, not to
 * quietly delete the sender's content. Repair is `sanitize()`, invoked
 * separately and on purpose.
 */
export function inspect(root: Node, options: InspectOptions = {}): Diagnostic[] {
  const maxDataUrlBytes = options.maxDataUrlBytes ?? DEFAULT_MAX_DATA_URL_BYTES;
  const diagnostics: Diagnostic[] = [];

  const report = (diagnostic: Omit<Diagnostic, "elementId">, element?: Element): void => {
    const id = element ? nearestId(element) : undefined;
    diagnostics.push(id === undefined ? diagnostic : { ...diagnostic, elementId: id });
  };

  for (const element of walkElements(root)) {
    const tagName = element.tagName;

    if (tagName === "script") {
      const type = (getAttr(element, "type") ?? "").trim().toLowerCase();
      if (!INERT_SCRIPT_TYPES.has(type)) {
        report(
          {
            severity: "error",
            code: "executable-script",
            message:
              type === ""
                ? "<script> with no type is executable; a native FRWD contains no arbitrary script."
                : `<script type="${type}"> is not inert FRWD data; a native FRWD contains no arbitrary script.`,
          },
          element,
        );
      } else if (/<\s*\/?\s*script/i.test(textContent(element))) {
        // A parsed document cannot reach this: the HTML parser ends a script
        // element at the first `</script`. A tree built in memory can - an
        // editor or an AI operation writing asset metadata - and serializing it
        // would split the document in two, turning the remainder into markup.
        report(
          {
            severity: "error",
            code: "script-content-escape",
            message: `Inert <script type="${type}"> content contains a script tag sequence and could break out of the block.`,
          },
          element,
        );
      }
    }

    if (FORBIDDEN_ELEMENTS.has(tagName)) {
      report(
        {
          severity: "error",
          code: "forbidden-element",
          message: `<${tagName}> is not permitted in a native FRWD: it executes, loads a remote document, or changes how every other URL resolves.`,
        },
        element,
      );
    }

    if (tagName === "meta" && (getAttr(element, "http-equiv") ?? "").toLowerCase() === "refresh") {
      report(
        {
          severity: "error",
          code: "meta-refresh",
          message: "<meta http-equiv=\"refresh\"> navigates without user action.",
        },
        element,
      );
    }

    if (tagName === "foreignobject") {
      report(
        {
          severity: "warning",
          code: "svg-foreign-object",
          message: "<foreignObject> embeds HTML inside SVG, where sanitization is easy to get wrong.",
        },
        element,
      );
    }

    if (isCustomElement(tagName) && !KNOWN_CUSTOM_ELEMENTS.has(tagName)) {
      report(
        {
          severity: "warning",
          code: "unknown-custom-element",
          message: `<${tagName}> is not part of the FRWD vocabulary; readers should preserve it but cannot give it behavior.`,
        },
        element,
      );
    }

    inspectAttributes(element, report, maxDataUrlBytes);
  }

  return diagnostics;
}

type Report = (diagnostic: Omit<Diagnostic, "elementId">, element?: Element) => void;

function inspectAttributes(element: Element, report: Report, maxDataUrlBytes: number): void {
  const tagName = element.tagName;
  const fetching = FETCHING_ATTRIBUTES.get(tagName);
  const navigational = NAVIGATIONAL_ATTRIBUTES.get(tagName);

  for (const attribute of element.attrs) {
    const name = attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name;
    const value = attribute.value;

    if (isEventHandlerAttribute(name)) {
      report(
        {
          severity: "error",
          code: "event-handler-attribute",
          message: `${name}="…" on <${tagName}> is executable script.`,
        },
        element,
      );
      continue;
    }

    if (name === "style") {
      for (const finding of inspectCss(value, { inlineDeclarations: true })) {
        report(cssDiagnostic(finding, `style attribute on <${tagName}>`), element);
      }
      continue;
    }

    const isFetching = fetching?.has(name) === true;
    const isNavigational = navigational?.has(name) === true;
    if (!isFetching && !isNavigational) continue;

    const candidates = name === "srcset" ? parseSrcset(value) : [value];
    for (const candidate of candidates) {
      const url = classifyUrl(candidate);

      if (url.kind === "executable") {
        report(
          {
            severity: "error",
            code: "unsafe-url-scheme",
            message: `${name} on <${tagName}> uses the executable scheme "${url.scheme}:".`,
          },
          element,
        );
        continue;
      }

      if (url.kind === "opaque") {
        report(
          {
            severity: "error",
            code: "unsafe-url-scheme",
            message: `${name} on <${tagName}> uses "${url.scheme}:", which cannot resolve in a portable document.`,
          },
          element,
        );
        continue;
      }

      if (isExecutableDataUrl(url)) {
        report(
          {
            severity: "error",
            code: "unsafe-data-url",
            message: `${name} on <${tagName}> embeds a ${url.mediaType} data URL, which is a program rather than an asset.`,
          },
          element,
        );
        continue;
      }

      if (isFetching && requiresNetworkOrExternalFile(url)) {
        report(
          {
            severity: "error",
            code: "external-resource",
            message: `${name} on <${tagName}> points outside the file (${describe(candidate)}); a native FRWD embeds everything it needs.`,
          },
          element,
        );
        continue;
      }

      if (url.kind === "data" && (url.bytes ?? 0) > maxDataUrlBytes) {
        report(
          {
            severity: "warning",
            code: "oversized-data-url",
            message: `${name} on <${tagName}> embeds ${formatBytes(url.bytes ?? 0)}, above the ${formatBytes(
              maxDataUrlBytes,
            )} limit.`,
          },
          element,
        );
      }
    }
  }

  if (tagName === "style") {
    for (const finding of inspectCss(textContent(element))) {
      report(cssDiagnostic(finding, "<style>"), element);
    }
  }
}

function cssDiagnostic(
  finding: ReturnType<typeof inspectCss>[number],
  where: string,
): Omit<Diagnostic, "elementId"> {
  if (finding.kind === "parse-error") {
    return {
      severity: "warning",
      code: "css-parse-error",
      message: `CSS in ${where} could not be parsed, so it could not be checked.`,
    };
  }

  if (finding.kind === "import") {
    return {
      severity: "error",
      code: "css-import",
      message: `@import in ${where} loads a stylesheet from outside the file.`,
    };
  }

  return {
    severity: "error",
    code: "css-external-resource",
    message: `${finding.context} in ${where} references ${describe(finding.value)} from outside the file.`,
  };
}

function nearestId(element: Element): string | undefined {
  let current: Element | null = element;
  while (current) {
    const id = getAttr(current, ID_ATTR);
    if (id !== undefined) return id;
    const parent: unknown = current.parentNode;
    current = parent && typeof parent === "object" && "tagName" in parent ? (parent as Element) : null;
  }
  return undefined;
}

function describe(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 60 ? `"${trimmed.slice(0, 57)}…"` : `"${trimmed}"`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
