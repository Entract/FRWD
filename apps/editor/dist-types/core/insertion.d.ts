import { type FrwdDocument } from "@frwd/format";
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
export type InsertionPlan = {
    ok: true;
    operation: Operation;
    describes: string;
} | {
    ok: false;
    reason: string;
};
/**
 * Plan an insertion relative to the selected object.
 *
 * The markup carries **no** `data-frwd-id`. Identity is minted by the
 * operations layer, through the one path that already does it and reports what
 * it assigned - so ids are never derived from the shape or sequence of
 * existing ones.
 */
export declare function planInsertion(document: FrwdDocument, selectedId: string | null): InsertionPlan;
/** Identified siblings of an object, in document order, including itself. */
export declare function identifiedSiblings(document: FrwdDocument, id: string): string[];
//# sourceMappingURL=insertion.d.ts.map