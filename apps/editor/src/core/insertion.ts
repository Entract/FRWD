import { getAttr, ID_ATTR, isElement, type Element as FrwdElement, type FrwdDocument } from "@frwd/format";
import type { Operation } from "@frwd/operations";

/**
 * Where a new block belongs.
 *
 * Blindly inserting `<p>New paragraph.</p>` after whatever was selected was
 * fine for proving the pipeline and is not editor behaviour. A list item wants
 * another list item; a paragraph inside a card wants to stay inside the card;
 * a table cell wants nothing this tool can offer.
 *
 * This is an **editor tool**. It reasons about context and compiles to the
 * existing structural operations - it is not a new FRWD operation, and nothing
 * here is normative. Two conforming editors may reasonably disagree about what
 * "insert" should do, which is exactly the test from protocol section 4a for
 * what belongs at this layer.
 *
 * It reasons from HTML semantics and the real hierarchy. No fixture class name
 * appears anywhere in it.
 */

export type InsertionPlan =
  | { ok: true; operation: Operation; describes: string }
  | { ok: false; reason: string };

/** Elements whose children are a homogeneous list: a new item copies its sibling. */
const HOMOGENEOUS_PARENTS: ReadonlyMap<string, string> = new Map([
  ["ul", "li"],
  ["ol", "li"],
  ["menu", "li"],
]);

/**
 * Elements that hold ordinary flow content, so a new paragraph is a reasonable
 * sibling or child. Deliberately a list of HTML sectioning and grouping
 * elements rather than anything FRWD-specific.
 */
const FLOW_CONTAINERS: ReadonlySet<string> = new Set([
  "article",
  "aside",
  "blockquote",
  "div",
  "footer",
  "header",
  "main",
  "nav",
  "section",
]);

/**
 * Contexts where inserting a paragraph would produce invalid or meaningless
 * markup, and where guessing would be worse than declining.
 */
const REFUSALS: ReadonlyMap<string, string> = new Map([
  ["figcaption", "A figure has one caption. Select the figure itself to add content beside it."],
  ["caption", "A table has one caption."],
  ["summary", "A disclosure has one summary."],
  ["dt", "Adding to a description list needs a term and a description together, which this tool cannot infer."],
  ["dd", "Adding to a description list needs a term and a description together, which this tool cannot infer."],
  ["td", "Table cells are added by changing the table, not by inserting a block."],
  ["th", "Table cells are added by changing the table, not by inserting a block."],
  ["thead", "Table structure is not edited by inserting blocks."],
  ["tbody", "Table structure is not edited by inserting blocks."],
  ["tfoot", "Table structure is not edited by inserting blocks."],
  ["tr", "Table structure is not edited by inserting blocks."],
  ["table", "Table structure is not edited by inserting blocks."],
]);

/**
 * Plan an insertion relative to the selected object.
 *
 * The markup carries **no** `data-frwd-id`. Identity is minted by the
 * operations layer, through the one path that already does it and reports what
 * it assigned - so ids are never derived from the shape or sequence of
 * existing ones.
 */
export function planInsertion(document: FrwdDocument, selectedId: string | null): InsertionPlan {
  if (!selectedId) return { ok: false, reason: "Select something first." };

  const target = document.getElementById(selectedId);
  if (!target) return { ok: false, reason: "That object is no longer in the document." };

  const tag = target.tagName.toLowerCase();

  const refusal = REFUSALS.get(tag);
  if (refusal) return { ok: false, reason: refusal };

  const parentNode: unknown = target.parentNode;
  const parent =
    parentNode !== null && parentNode !== undefined && isElement(parentNode as never)
      ? (parentNode as FrwdElement)
      : null;
  const parentTag = parent?.tagName.toLowerCase() ?? "";

  const parentRefusal = REFUSALS.get(parentTag);
  if (parentRefusal && !HOMOGENEOUS_PARENTS.has(parentTag)) {
    return { ok: false, reason: parentRefusal };
  }

  // A list item gets another list item, in the same list.
  const sibling = HOMOGENEOUS_PARENTS.get(parentTag);
  if (sibling && tag === sibling) {
    return {
      ok: true,
      operation: { op: "insert_after", target: selectedId, html: `<${sibling}>New item.</${sibling}>` },
      describes: `Added a list item to the <${parentTag}>.`,
    };
  }

  // A container was selected rather than something inside it: the new content
  // belongs inside it, not beside it.
  if (FLOW_CONTAINERS.has(tag)) {
    const listChild = HOMOGENEOUS_PARENTS.get(tag);
    if (listChild) {
      return {
        ok: true,
        operation: { op: "append_child", target: selectedId, html: `<${listChild}>New item.</${listChild}>` },
        describes: `Added a list item inside the <${tag}>.`,
      };
    }
    return {
      ok: true,
      operation: { op: "append_child", target: selectedId, html: "<p>New paragraph.</p>" },
      describes: `Added a paragraph inside the <${tag}>.`,
    };
  }

  // Ordinary flow content: a sibling paragraph, in whatever container this
  // already lives in - so content inside a card stays inside that card.
  if (parent) {
    return {
      ok: true,
      operation: { op: "insert_after", target: selectedId, html: "<p>New paragraph.</p>" },
      describes: `Added a paragraph after the <${tag}>${parentTag ? ` in the <${parentTag}>` : ""}.`,
    };
  }

  return { ok: false, reason: `Nothing sensible can be inserted next to a <${tag}> here.` };
}

/** Identified siblings of an object, in document order, including itself. */
export function identifiedSiblings(document: FrwdDocument, id: string): string[] {
  const target = document.getElementById(id);
  const parent = target?.parentNode;
  if (!target || !parent) return [];

  const siblings: string[] = [];
  for (const child of parent.childNodes) {
    if (!isElement(child)) continue;
    const childId = getAttr(child, ID_ATTR);
    if (childId !== undefined) siblings.push(childId);
  }
  return siblings;
}
