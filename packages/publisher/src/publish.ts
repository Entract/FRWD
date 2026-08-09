import {
  FrwdDocument,
  findByTagName,
  findElement,
  getAttr,
  setAttr,
  setTextContent,
  type Diagnostic,
  type Element,
} from "@frwd/format";
import { RUNTIME_SOURCE, RUNTIME_STYLE, RUNTIME_VERSION } from "@frwd/runtime";
import { inspect } from "@frwd/sanitize";

export const RUNTIME_SCRIPT_ID = "frwd-runtime";
export const RUNTIME_STYLE_ID = "frwd-runtime-style";
export const RUNTIME_VERSION_META = "frwd-runtime-version";
export const PROFILE_META = "frwd-publication-profile";

/** Publication profiles. Only `read` exists in 0.1; editing arrives with the reference editor. */
export type PublicationProfile = "read";

export interface PublishOptions {
  profile?: PublicationProfile;
  /** Passed through to the safety-profile inspection of the source document. */
  maxDataUrlBytes?: number;
}

export interface PublishResult {
  ok: boolean;
  /** The publication. Present only when `ok`. */
  html?: string;
  /** Why publishing was refused. */
  errors: Diagnostic[];
  runtimeVersion: string;
}

/**
 * Publish a native `.frwd` as a self-contained `.frwd.html`.
 *
 * ```text
 * native .frwd  +  trusted runtime  =  .frwd.html
 * ```
 *
 * The addition is the runtime and nothing else. Publishing does not make a
 * document's own script legal: a native FRWD that carries executable content is
 * refused here rather than published with it, because "it is HTML now" is not a
 * reason for a recipient to run code the sender wrote.
 *
 * The publisher never flattens text to canvas, rasterizes the document,
 * replaces semantics with coordinates, or reaches for a CDN. What comes out is
 * the same semantic document, still readable by generic tooling decades from
 * now, with one standard script alongside it.
 */
export function publish(document: FrwdDocument, options: PublishOptions = {}): PublishResult {
  const inspectOptions = options.maxDataUrlBytes === undefined ? {} : { maxDataUrlBytes: options.maxDataUrlBytes };

  // A publication inherits every problem of the document it came from, so the
  // source has to be a conforming native FRWD on both counts first.
  const errors = [...document.validate(), ...inspect(document.tree, inspectOptions)].filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  if (errors.length > 0) return { ok: false, errors, runtimeVersion: RUNTIME_VERSION };

  // Work on a copy: publishing must not disturb the document being published.
  const publication = FrwdDocument.parse(document.toHtml());
  const head = findByTagName(publication.tree, "head");
  if (!head) {
    return {
      ok: false,
      errors: [{ severity: "error", code: "missing-head", message: "Document has no <head> to publish into." }],
      runtimeVersion: RUNTIME_VERSION,
    };
  }

  setMeta(publication, head, RUNTIME_VERSION_META, RUNTIME_VERSION);
  setMeta(publication, head, PROFILE_META, options.profile ?? "read");

  appendElement(head, styleElement(RUNTIME_STYLE_ID, RUNTIME_STYLE));

  // A classic script, not a module. Module scripts are fetched with CORS, and a
  // file:// origin is opaque - a module runtime would simply not run in the one
  // place a publication most needs to: a file someone was emailed.
  const body = findByTagName(publication.tree, "body");
  appendElement(body ?? head, runtimeScriptElement());

  return { ok: true, html: publication.toHtml(), errors: [], runtimeVersion: RUNTIME_VERSION };
}

function setMeta(publication: FrwdDocument, head: Element, name: string, content: string): void {
  const existing = findElement(
    publication.tree,
    (element) => element.tagName === "meta" && getAttr(element, "name") === name,
  );
  if (existing) {
    setAttr(existing, "content", content);
    return;
  }

  const meta: Element = {
    nodeName: "meta",
    tagName: "meta",
    attrs: [
      { name: "content", value: content },
      { name: "name", value: name },
    ],
    namespaceURI: head.namespaceURI,
    childNodes: [],
    parentNode: head,
  };
  appendElement(head, meta);
}

function styleElement(id: string, css: string): Element {
  const style: Element = {
    nodeName: "style",
    tagName: "style",
    attrs: [{ name: "id", value: id }],
    namespaceURI: "http://www.w3.org/1999/xhtml" as Element["namespaceURI"],
    childNodes: [],
    parentNode: null,
  };
  setTextContent(style, `\n${css}`);
  return style;
}

function runtimeScriptElement(): Element {
  const script: Element = {
    nodeName: "script",
    tagName: "script",
    attrs: [{ name: "id", value: RUNTIME_SCRIPT_ID }],
    namespaceURI: "http://www.w3.org/1999/xhtml" as Element["namespaceURI"],
    childNodes: [],
    parentNode: null,
  };
  setTextContent(script, `\n${RUNTIME_SOURCE}`);
  return script;
}

function appendElement(parent: Element, child: Element): void {
  child.parentNode = parent;
  parent.childNodes.push(child);
}
