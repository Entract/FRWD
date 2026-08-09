import { STYLE_ID } from "./constants.js";
import { findElement, getAttr, setTextContent, textContent } from "./dom.js";
import type { Element, Node } from "./types.js";

/**
 * The document stylesheet.
 *
 * Spec section 10: CSS is part of the document, not editor configuration, and a
 * conforming editor preserves it unless the user intends a change. So this is a
 * read/write accessor over one specific element, not a style engine.
 */

export function findStyleElement(root: Node): Element | undefined {
  return findElement(root, (element) => element.tagName === "style" && getAttr(element, "id") === STYLE_ID);
}

export function readDocumentStyle(root: Node): string | undefined {
  const element = findStyleElement(root);
  return element ? textContent(element) : undefined;
}

/**
 * Replace the document stylesheet.
 *
 * Returns false when the document has no `<style id="frwd-document-style">`;
 * creating one belongs to `FrwdDocument`, which knows where `<head>` is.
 */
export function writeDocumentStyle(root: Node, css: string): boolean {
  const element = findStyleElement(root);
  if (!element) return false;
  setTextContent(element, css);
  return true;
}
