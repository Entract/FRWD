import type { Diagnostic, FrwdDocument } from "@frwd/format";

export type { Diagnostic };

/** Where a node goes relative to a target. */
export type Position = "before" | "after" | "append" | "prepend";

/**
 * Replace the target's complete child content with one plain-text node.
 *
 * Deliberately blunt in v0.1: it does **not** preserve `<strong>`, links,
 * citations or any other inline markup inside the target - whatever was there
 * is gone, replaced by exactly the text given. Rich replacement is
 * `replace_node`; range-aware editing is deferred.
 *
 * The text is inserted as text, never as markup, so `<b>` arrives as the four
 * characters someone typed rather than an element.
 */
export interface ReplaceTextOperation {
  op: "replace_text";
  target: string;
  text: string;
}

export interface ReplaceNodeOperation {
  op: "replace_node";
  target: string;
  html: string;
}

export interface InsertOperation {
  op: "insert_before" | "insert_after" | "append_child" | "prepend_child";
  target: string;
  html: string;
}

export interface DeleteNodeOperation {
  op: "delete_node";
  target: string;
}

export interface MoveNodeOperation {
  op: "move_node";
  target: string;
  destination: string;
  position: Position;
}

export interface SetAttributeOperation {
  op: "set_attribute";
  target: string;
  name: string;
  /** Omit or pass null to remove the attribute. */
  value?: string | null;
}

export type Operation =
  | ReplaceTextOperation
  | ReplaceNodeOperation
  | InsertOperation
  | DeleteNodeOperation
  | MoveNodeOperation
  | SetAttributeOperation;

export interface Constraints {
  /** Reject anything that changes what the document says. */
  contentLocked?: boolean;
  /** Reject anything that changes how the document looks. */
  styleLocked?: boolean;
}

/** The transaction envelope of protocol spec section 4. */
export interface OperationEnvelope {
  protocol: "frwd-ops";
  version: string;
  documentId: string;
  /** Revision the operations were written against. An absent manifest revision is 0. */
  baseRevision: number;
  constraints?: Constraints;
  operations: Operation[];
}

/** What one operation did, for the human-readable diff. */
export interface TransactionChange {
  op: Operation["op"];
  target: string;
  summary: string;
  /** Stable ids minted for inserted nodes that arrived without one. */
  assignedIds?: string[];
  /** Stable ids that no longer exist in the document afterwards. */
  removedIds?: string[];
}

export interface TransactionResult {
  ok: boolean;
  /** Why the transaction was rejected. Empty when `ok`. */
  errors: Diagnostic[];
  /**
   * The document as it would be, or now is. Present whenever the operations
   * could be staged at all - so a caller can show a rejected result's would-be
   * output alongside the reasons it was refused.
   */
  staged?: FrwdDocument;
  /** Revision the document carries after a successful commit. */
  revision?: number;
  changes: TransactionChange[];
}

/**
 * A transaction that has been worked out in full but not committed.
 *
 * `staged` is the finished document, metadata included: the revision and
 * `modified` timestamp it carries are the ones it will have after commit. That
 * is the point - what a reviewer reads is what lands, down to the identifiers
 * minted for nodes that arrived without one.
 *
 * The remaining fields exist so `commitPrepared` can establish that the
 * document it is about to overwrite is still the one this was prepared from.
 */
export interface PreparedTransaction extends TransactionResult {
  /** Document this was prepared from. */
  documentId: string | undefined;
  /** Revision the live document was at when this was prepared. */
  baseRevision: number | undefined;
  /**
   * Exact serialization of the live document at preparation time.
   *
   * Kept verbatim rather than hashed: preparation already serializes the
   * document to make the staged copy, so the string is free, and an exact
   * comparison cannot collide.
   */
  baseSource: string;
}

export interface CommitResult {
  ok: boolean;
  errors: Diagnostic[];
  /** Revision the document carries after a successful commit. */
  revision?: number;
}

export interface ApplyOptions {
  /** Timestamp written to `modified` on commit. Injectable for tests. */
  now?: Date;
  /** Id generator for nodes that arrive without one. Injectable for tests. */
  idFactory?: () => string;
  /** Passed through to the safety-profile inspection. */
  maxDataUrlBytes?: number;
}
