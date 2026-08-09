/**
 * Names fixed by the FRWD 0.1 format specification.
 *
 * These are the only strings in the package that a spec change would force us
 * to edit, so they live in one place rather than being spelled inline.
 */

/** Format version this package reads and writes. */
export const FRWD_VERSION = "0.1";

/** `<html data-frwd-version="0.1">` */
export const VERSION_ATTR = "data-frwd-version";

/** `<main data-frwd-document>` - the root of the canonical document tree. */
export const DOCUMENT_ATTR = "data-frwd-document";

/** Stable structural identity on editable block objects. */
export const ID_ATTR = "data-frwd-id";

/** Inert JSON carried in a `<script>` that must never execute. */
export const MANIFEST_TYPE = "application/frwd+json";
export const MANIFEST_ID = "frwd-manifest";

export const ASSET_TYPE = "application/frwd-asset+json";
export const ASSET_ID_ATTR = "data-frwd-asset-id";

/** `<style id="frwd-document-style">` - CSS owned by the document. */
export const STYLE_ID = "frwd-document-style";

/** `<meta name="frwd-document-id" content="...">` */
export const DOCUMENT_ID_META = "frwd-document-id";

/** Prefix reserved for FRWD custom elements. */
export const CUSTOM_ELEMENT_PREFIX = "frwd-";

/**
 * Block-level elements that spec section 6 requires to carry a stable id.
 *
 * Any `frwd-*` custom element also qualifies and is matched by prefix rather
 * than being listed here, so the vocabulary can grow without touching this set.
 */
export const IDENTIFIED_ELEMENTS: ReadonlySet<string> = new Set([
  "article",
  "section",
  "aside",
  "header",
  "footer",
  "nav",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "blockquote",
  "pre",
  "figure",
  "figcaption",
  "table",
  "caption",
  "hr",
  "address",
  "math",
]);

/**
 * Does this element need a stable id?
 *
 * @param tagName lower-case tag name
 */
export function requiresStableId(tagName: string): boolean {
  return IDENTIFIED_ELEMENTS.has(tagName) || tagName.startsWith(CUSTOM_ELEMENT_PREFIX);
}
