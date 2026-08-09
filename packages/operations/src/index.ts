/**
 * @frwd/operations - deterministic semantic edit operations.
 *
 * AI edits a FRWD through small, reviewable changes addressed by stable
 * identifier, never by regenerating the file. This package is that mechanism,
 * and it is deliberately ordinary code: no model, no network, no vendor.
 *
 * ```ts
 * import { apply, preview } from "@frwd/operations";
 *
 * const envelope = {
 *   protocol: "frwd-ops",
 *   version: "0.1",
 *   documentId: document.documentId,
 *   baseRevision: 0,
 *   operations: [{ op: "replace_text", target: "p-42", text: "Shorter." }],
 * };
 *
 * preview(document, envelope);  // changes nothing, shows what would happen
 * apply(document, envelope);    // changes nothing unless everything passes
 * ```
 */

export { apply, commitPrepared, currentRevision, preview, PROTOCOL, PROTOCOL_VERSION } from "./transaction.js";

export { readThemeToken, setThemeToken } from "./theme.js";

export { readStyleProperties, readStyleProperty, removeStyleProperty, setStyleProperty } from "./style.js";

export type {
  ApplyOptions,
  CommitResult,
  Constraints,
  DeleteNodeOperation,
  Diagnostic,
  InsertOperation,
  MoveNodeOperation,
  Operation,
  OperationEnvelope,
  Position,
  PreparedTransaction,
  ReplaceNodeOperation,
  ReplaceTextOperation,
  RemoveStylePropertyOperation,
  SetAttributeOperation,
  SetStylePropertyOperation,
  SetThemeTokenOperation,
  ThemeScope,
  TransactionChange,
  TransactionResult,
} from "./types.js";
