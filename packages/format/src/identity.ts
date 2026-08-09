import { ID_ATTR, requiresStableId } from "./constants.js";
import { getAttr, setAttr, walkElements } from "./dom.js";
import type { Diagnostic, Element, EnsureIdsResult, Node } from "./types.js";

/**
 * Stable structural identity.
 *
 * Spec section 6: an editable block object carries `data-frwd-id`, and that id
 * survives edits for as long as the logical object does. Every semantic
 * operation in the stack addresses documents through these ids, so their
 * uniqueness and stability is the single guarantee this module exists to keep.
 */

function defaultIdFactory(): string {
  return globalThis.crypto.randomUUID();
}

/** Every element carrying an id, in document order. */
export function collectIdentified(root: Node): Map<string, Element> {
  const found = new Map<string, Element>();
  for (const element of walkElements(root)) {
    const id = getAttr(element, ID_ATTR);
    if (id !== undefined && !found.has(id)) found.set(id, element);
  }
  return found;
}

export function findById(root: Node, id: string): Element | undefined {
  for (const element of walkElements(root)) {
    if (getAttr(element, ID_ATTR) === id) return element;
  }
  return undefined;
}

/**
 * Block elements inside the document root that carry no id.
 *
 * Reported rather than fixed, because silently rewriting a document on open
 * would make the round-trip guarantee meaningless.
 */
export function findUnidentified(root: Node): Element[] {
  const missing: Element[] = [];
  for (const element of walkElements(root)) {
    if (requiresStableId(element.tagName) && getAttr(element, ID_ATTR) === undefined) {
      missing.push(element);
    }
  }
  return missing;
}

/** Ids used by more than one element. */
export function findDuplicateIds(root: Node): Map<string, Element[]> {
  const byId = new Map<string, Element[]>();
  for (const element of walkElements(root)) {
    const id = getAttr(element, ID_ATTR);
    if (id === undefined) continue;
    const existing = byId.get(id);
    if (existing) existing.push(element);
    else byId.set(id, [element]);
  }

  const duplicates = new Map<string, Element[]>();
  for (const [id, elements] of byId) {
    if (elements.length > 1) duplicates.set(id, elements);
  }
  return duplicates;
}

export function diagnoseIdentity(root: Node): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Spec section 6 says an editable block object MUST carry a stable id. Every
  // semantic operation addresses documents through these, so a block without
  // one is unreachable - an error, not a style note.
  for (const element of findUnidentified(root)) {
    diagnostics.push({
      severity: "error",
      code: "missing-stable-id",
      message: `<${element.tagName}> is an editable block object and must carry ${ID_ATTR}.`,
    });
  }

  for (const [id, elements] of findDuplicateIds(root)) {
    diagnostics.push({
      severity: "error",
      code: "duplicate-stable-id",
      message: `${ID_ATTR}="${id}" is used by ${elements.length} elements; ids must be unique.`,
      elementId: id,
    });
  }

  return diagnostics;
}

/**
 * Give every block element that lacks one a fresh id.
 *
 * Existing ids are never reassigned - that is the whole point of them. Pass
 * `idFactory` to make the result reproducible in tests; the default is
 * `crypto.randomUUID`, which is available in Node and in browsers.
 */
export function ensureIds(root: Node, idFactory: () => string = defaultIdFactory): EnsureIdsResult {
  const ids: string[] = [];
  for (const element of findUnidentified(root)) {
    const id = idFactory();
    setAttr(element, ID_ATTR, id);
    ids.push(id);
  }
  return { assigned: ids.length, ids };
}
