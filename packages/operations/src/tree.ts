import type { ChildNode, Element, Node, ParentNode } from "@frwd/format";
import { isElement, walkElements } from "@frwd/format";

/**
 * Tree surgery.
 *
 * parse5's tree has parent links but no DOM methods, so the handful of moves an
 * edit operation needs are written once here. Every one of them keeps
 * `parentNode` correct: a node spliced into a new parent while still pointing
 * at the old one produces a document that serializes fine and then behaves
 * strangely for everyone downstream.
 */

function siblings(node: ChildNode): { parent: ParentNode; index: number } | undefined {
  const parent = node.parentNode;
  if (!parent) return undefined;
  const index = parent.childNodes.indexOf(node);
  return index === -1 ? undefined : { parent, index };
}

export function detach(node: ChildNode): boolean {
  const found = siblings(node);
  if (!found) return false;
  found.parent.childNodes.splice(found.index, 1);
  node.parentNode = null;
  return true;
}

export function insertBefore(reference: ChildNode, nodes: ChildNode[]): boolean {
  const found = siblings(reference);
  if (!found) return false;
  adopt(found.parent, nodes);
  found.parent.childNodes.splice(found.index, 0, ...nodes);
  return true;
}

export function insertAfter(reference: ChildNode, nodes: ChildNode[]): boolean {
  const found = siblings(reference);
  if (!found) return false;
  adopt(found.parent, nodes);
  found.parent.childNodes.splice(found.index + 1, 0, ...nodes);
  return true;
}

export function appendChildren(parent: ParentNode, nodes: ChildNode[]): void {
  adopt(parent, nodes);
  parent.childNodes.push(...nodes);
}

export function prependChildren(parent: ParentNode, nodes: ChildNode[]): void {
  adopt(parent, nodes);
  parent.childNodes.unshift(...nodes);
}

export function replaceNode(reference: ChildNode, nodes: ChildNode[]): boolean {
  const found = siblings(reference);
  if (!found) return false;
  adopt(found.parent, nodes);
  found.parent.childNodes.splice(found.index, 1, ...nodes);
  reference.parentNode = null;
  return true;
}

function adopt(parent: ParentNode, nodes: ChildNode[]): void {
  for (const node of nodes) node.parentNode = parent;
}

/** Is `candidate` inside `ancestor`, or the same element? */
export function contains(ancestor: Element, candidate: Node): boolean {
  if (!isElement(candidate)) return false;
  for (const element of walkElements(ancestor)) {
    if (element === candidate) return true;
  }
  return false;
}

/** Detach a fragment's children so they can be inserted elsewhere. */
export function takeChildren(parent: ParentNode): ChildNode[] {
  const children = [...parent.childNodes];
  parent.childNodes.length = 0;
  for (const child of children) child.parentNode = null;
  return children;
}
