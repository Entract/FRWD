import type { Attribute, ChildNode, Element, Node, ParentNode, TextNode } from "./types.js";

/**
 * Minimal helpers over parse5's default tree.
 *
 * parse5 gives us a spec-compliant HTML5 tree with no DOM API attached, which
 * is exactly what a format package wants - but it means the ordinary
 * `getAttribute` / `querySelector` moves have to be written once, here.
 */

export function isElement(node: Node): node is Element {
  return "tagName" in node;
}

export function isTextNode(node: Node): node is TextNode {
  return node.nodeName === "#text";
}

export function isParentNode(node: Node): node is ParentNode {
  return "childNodes" in node;
}

export function childNodes(node: Node): ChildNode[] {
  return isParentNode(node) ? node.childNodes : [];
}

export function getAttr(element: Element, name: string): string | undefined {
  return element.attrs.find((attr) => attr.name === name)?.value;
}

export function hasAttr(element: Element, name: string): boolean {
  return element.attrs.some((attr) => attr.name === name);
}

export function setAttr(element: Element, name: string, value: string): void {
  const existing = element.attrs.find((attr) => attr.name === name);
  if (existing) {
    existing.value = value;
    return;
  }
  element.attrs.push({ name, value } satisfies Attribute);
}

export function removeAttr(element: Element, name: string): void {
  const index = element.attrs.findIndex((attr) => attr.name === name);
  if (index !== -1) element.attrs.splice(index, 1);
}

/** Depth-first walk in document order, including the starting node. */
export function* walk(node: Node): Generator<Node> {
  yield node;
  for (const child of childNodes(node)) {
    yield* walk(child);
  }
}

/** Depth-first walk of elements only, in document order. */
export function* walkElements(node: Node): Generator<Element> {
  for (const current of walk(node)) {
    if (isElement(current)) yield current;
  }
}

export function findElement(root: Node, predicate: (element: Element) => boolean): Element | undefined {
  for (const element of walkElements(root)) {
    if (predicate(element)) return element;
  }
  return undefined;
}

export function findElements(root: Node, predicate: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  for (const element of walkElements(root)) {
    if (predicate(element)) found.push(element);
  }
  return found;
}

export function findByTagName(root: Node, tagName: string): Element | undefined {
  return findElement(root, (element) => element.tagName === tagName);
}

/**
 * Concatenated text of a node's descendants.
 *
 * For `<script>` and `<style>` this is the raw text content, which is how we
 * read the manifest and the document stylesheet.
 */
export function textContent(node: Node): string {
  let text = "";
  for (const current of walk(node)) {
    if (isTextNode(current)) text += current.value;
  }
  return text;
}

/** Replace all children of an element with a single text node. */
export function setTextContent(element: Element, value: string): void {
  const text: TextNode = {
    nodeName: "#text",
    value,
    parentNode: element,
  };
  element.childNodes = [text];
}
