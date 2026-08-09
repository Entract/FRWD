import { Schema, type Node as PmNode } from "prosemirror-model";
/**
 * The rich-text region.
 *
 * ADR 0001: the FRWD DOM is the document. This schema is deliberately the
 * smallest thing that can edit ordinary prose, and it is scoped to the inline
 * content of a single block.
 *
 * Everything it does not understand becomes an **opaque atom**: preserved
 * exactly, moved around freely, never looked inside and never rewritten. That
 * one escape hatch is what stops the schema growing every time FRWD gains an
 * element - inline MathML, an inline SVG, an unknown inline custom element all
 * arrive here and leave unchanged.
 *
 * Unsupported valid content becomes uneditable-but-preserved. It is never
 * silently normalised away.
 */
export declare const regionSchema: Schema<"doc" | "text" | "hard_break" | "opaque", "strong" | "em" | "link">;
/**
 * Read a block's inline children into a region document.
 *
 * Written by hand rather than delegating to ProseMirror's DOM parser, because
 * the whole point of the architecture is that *we* decide what crosses this
 * boundary. A parser configured with rules drops what it has no rule for; this
 * one preserves it.
 */
export declare function parseRegion(block: Element): PmNode;
/**
 * Write a region document back out as inline DOM.
 *
 * Marks are emitted in a fixed order - link outermost, then em, then strong -
 * so the same region always serializes the same way. Without that, two edits
 * producing identical content could produce different markup, and the format's
 * round-trip guarantee would start depending on the order someone applied
 * formatting in.
 */
export declare function serializeRegion(doc: PmNode, target: Document): DocumentFragment;
/** Replace a block's inline children, leaving the block element itself alone. */
export declare function writeRegionInto(block: Element, doc: PmNode): void;
//# sourceMappingURL=region.d.ts.map