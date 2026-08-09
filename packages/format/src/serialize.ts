import { serialize as parse5Serialize } from "parse5";
import { ID_ATTR } from "./constants.js";
import { isElement, walk } from "./dom.js";
import type { Attribute, Document, Node } from "./types.js";

/**
 * Deterministic serialization.
 *
 * Same document in, same bytes out - so a no-op open/save produces no diff, and
 * two editors that agree on the content agree on the file.
 *
 * What we deliberately do NOT do is pretty-print. Whitespace between and inside
 * HTML elements is significant in flow content: reindenting the markup would
 * change how the document renders. Text nodes come out exactly as they went in.
 *
 * The one normalization applied is attribute order, which HTML treats as
 * meaningless but diffs do not.
 */

function attributeKey(attribute: Attribute): string {
  return attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name;
}

function compareAttributes(a: Attribute, b: Attribute): number {
  const left = attributeKey(a);
  const right = attributeKey(b);
  if (left === right) return 0;
  // Identity first: it is the attribute a human reads for, and the one every
  // semantic operation addresses.
  if (left === ID_ATTR) return -1;
  if (right === ID_ATTR) return 1;
  return left < right ? -1 : 1;
}

/**
 * Sort every element's attributes into canonical order, in place.
 *
 * Idempotent, and applied on both parse and serialize so the in-memory tree and
 * the file always agree.
 */
export function canonicalizeAttributes(root: Node): void {
  for (const node of walk(root)) {
    if (isElement(node)) node.attrs.sort(compareAttributes);
  }
}

/**
 * Serialize a document to `.frwd` source.
 *
 * Note what is absent: a cosmetic trailing newline. Text after `</html>` is not
 * outside the document - the HTML5 parser moves it into `<body>` - so appending
 * one would add a newline to the document's content on every single save. The
 * output ends exactly where the document does.
 */
export function serializeDocument(document: Document): string {
  canonicalizeAttributes(document);
  return parse5Serialize(document);
}
