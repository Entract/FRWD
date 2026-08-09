import {
  ensureIds,
  findById,
  FrwdDocument,
  getAttr,
  ID_ATTR,
  isElement,
  parseFragment,
  removeAttr,
  setAttr,
  setTextContent,
  walkElements,
  type ChildNode,
  type Diagnostic,
  type Element,
  type FrwdManifest,
  type TextNode,
} from "@frwd/format";
import { inspect } from "@frwd/sanitize";
import {
  appendChildren,
  contains,
  detach,
  insertAfter,
  insertBefore,
  prependChildren,
  replaceNode,
  takeChildren,
} from "./tree.js";
import type {
  ApplyOptions,
  Constraints,
  Operation,
  OperationEnvelope,
  TransactionChange,
  TransactionResult,
} from "./types.js";

export const PROTOCOL = "frwd-ops";
export const PROTOCOL_VERSION = "0.1";

/** Attributes that carry appearance rather than meaning. */
const PRESENTATIONAL_ATTRIBUTES: ReadonlySet<string> = new Set(["class", "style"]);

/**
 * The revision a document is currently at.
 *
 * An absent `revision` reads as 0, so a document that has never been edited by
 * an operation still has a well-defined base for the first transaction.
 */
export function currentRevision(document: FrwdDocument): number | undefined {
  const raw = document.manifest?.["revision"];
  if (raw === undefined) return 0;
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0) return raw;
  return undefined;
}

/**
 * Compute the result of a transaction without touching anything.
 *
 * Strictly non-mutating, including on the document passed in. The staged
 * document that comes back is a separate object; the caller may inspect it,
 * diff it, show it, and throw it away.
 */
export function preview(
  document: FrwdDocument,
  envelope: OperationEnvelope,
  options: ApplyOptions = {},
): TransactionResult {
  return run(document, envelope, options);
}

/**
 * Apply a transaction.
 *
 * Operations are applied to a staged copy of the document, never optimistically
 * to the live tree with a rollback afterwards - a rollback is only as good as
 * the bookkeeping behind it, and the bookkeeping is exactly what fails on the
 * paths nobody tested. A rejected transaction therefore changes nothing at all,
 * by construction rather than by care.
 *
 * On success the staged tree is adopted into the live document in one step, so
 * callers holding a reference to `document` keep it.
 */
export function apply(
  document: FrwdDocument,
  envelope: OperationEnvelope,
  options: ApplyOptions = {},
): TransactionResult {
  const result = run(document, envelope, options);
  if (result.ok && result.staged) adoptTree(document, result.staged);
  return result;
}

function run(
  document: FrwdDocument,
  envelope: OperationEnvelope,
  options: ApplyOptions,
): TransactionResult {
  const changes: TransactionChange[] = [];

  const envelopeErrors = validateEnvelope(document, envelope);
  if (envelopeErrors.length > 0) return { ok: false, errors: envelopeErrors, changes };

  const constraintErrors = envelope.operations.flatMap((operation, index) =>
    checkConstraints(operation, envelope.constraints ?? {}, index),
  );
  if (constraintErrors.length > 0) return { ok: false, errors: constraintErrors, changes };

  // The staged copy. Round-tripping through the serializer is a genuine deep
  // copy and, because serialization is idempotent, produces a document
  // indistinguishable from the original.
  const staged = FrwdDocument.parse(document.toHtml());
  const root = staged.root;
  if (!root) {
    return {
      ok: false,
      errors: [{ severity: "error", code: "missing-document-root", message: "Document has no <main data-frwd-document> to edit." }],
      changes,
    };
  }

  const errors: Diagnostic[] = [];
  for (const [index, operation] of envelope.operations.entries()) {
    const outcome = applyOperation(staged, root, operation, index, options);
    if (outcome.error) {
      errors.push(outcome.error);
      break; // Atomic: one failure ends the transaction.
    }
    if (outcome.change) changes.push(outcome.change);
  }
  if (errors.length > 0) return { ok: false, errors, staged, changes };

  const revision = (currentRevision(document) ?? 0) + 1;
  const manifest = staged.manifest;
  if (manifest) {
    // Exactly once, and only after every operation has succeeded.
    staged.manifest = {
      ...manifest,
      revision,
      modified: (options.now ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"),
    } satisfies FrwdManifest;
  }

  // The final state - including the bumped revision - has to satisfy both
  // layers before anything is committed. Unsafe generated content is rejected
  // and reported here; it is never quietly sanitized into shape, because a
  // caller who asked for one thing and silently got another cannot review it.
  const structural = staged.validate();
  const profile = inspect(staged.tree, options.maxDataUrlBytes === undefined ? {} : { maxDataUrlBytes: options.maxDataUrlBytes });
  const blocking = [...structural, ...profile].filter((diagnostic) => diagnostic.severity === "error");
  if (blocking.length > 0) return { ok: false, errors: blocking, staged, changes };

  return { ok: true, errors: [], staged, revision, changes };
}

function validateEnvelope(document: FrwdDocument, envelope: OperationEnvelope): Diagnostic[] {
  const errors: Diagnostic[] = [];

  if (envelope.protocol !== PROTOCOL) {
    errors.push({
      severity: "error",
      code: "bad-protocol",
      message: `Envelope protocol must be "${PROTOCOL}", found ${JSON.stringify(envelope.protocol)}.`,
    });
  }

  const [major] = String(envelope.version ?? "").split(".");
  const [ourMajor] = PROTOCOL_VERSION.split(".");
  if (major !== ourMajor) {
    errors.push({
      severity: "error",
      code: "unsupported-protocol-version",
      message: `Envelope declares protocol version ${envelope.version}; this implementation speaks ${PROTOCOL_VERSION}.`,
    });
  }

  const documentId = document.documentId;
  if (documentId !== undefined && envelope.documentId !== documentId) {
    errors.push({
      severity: "error",
      code: "document-id-mismatch",
      message: `Envelope targets document ${envelope.documentId}, but this document is ${documentId}.`,
    });
  }

  const revision = currentRevision(document);
  if (revision === undefined) {
    errors.push({
      severity: "error",
      code: "invalid-revision",
      message: "Manifest revision is not a non-negative integer, so no transaction can be based on it.",
    });
  } else if (envelope.baseRevision !== revision) {
    errors.push({
      severity: "error",
      code: "stale-revision",
      message: `Operations were written against revision ${envelope.baseRevision}; the document is at revision ${revision}.`,
    });
  }

  if (!Array.isArray(envelope.operations) || envelope.operations.length === 0) {
    errors.push({
      severity: "error",
      code: "empty-transaction",
      message: "A transaction must contain at least one operation.",
    });
  }

  return errors;
}

function checkConstraints(operation: Operation, constraints: Constraints, index: number): Diagnostic[] {
  const presentational =
    operation.op === "set_attribute" && PRESENTATIONAL_ATTRIBUTES.has(operation.name.toLowerCase());

  if (constraints.contentLocked === true && !presentational) {
    return [
      {
        severity: "error",
        code: "content-locked",
        message: `Operation ${index} (${operation.op}) would change content, and this transaction declares contentLocked.`,
      },
    ];
  }

  if (constraints.styleLocked === true && presentational) {
    return [
      {
        severity: "error",
        code: "style-locked",
        message: `Operation ${index} (${operation.op}) would change appearance, and this transaction declares styleLocked.`,
      },
    ];
  }

  return [];
}

interface Outcome {
  change?: TransactionChange;
  error?: Diagnostic;
}

function applyOperation(
  staged: FrwdDocument,
  root: Element,
  operation: Operation,
  index: number,
  options: ApplyOptions,
): Outcome {
  const target = resolveTarget(root, operation.target, index, operation.op);
  if ("error" in target) return { error: target.error };
  const element = target.element;

  switch (operation.op) {
    case "replace_text": {
      const removedIds = identifiedDescendants(element);
      setTextContent(element, operation.text);
      return {
        change: {
          op: operation.op,
          target: operation.target,
          summary: `Replaced the content of <${element.tagName}> with ${operation.text.length} characters of text.`,
          ...(removedIds.length > 0 ? { removedIds } : {}),
        },
      };
    }

    case "replace_node":
    case "insert_before":
    case "insert_after":
    case "append_child":
    case "prepend_child": {
      // Fragment parsing depends on context: `<li>` outside a list is
      // discarded. Children parse inside the target; siblings parse inside its
      // parent.
      const context =
        operation.op === "append_child" || operation.op === "prepend_child" ? element : element.parentNode;
      const nodes = takeChildren(
        parseFragment(operation.html, context !== null && isElement(context) ? context : undefined),
      );
      // Whitespace is not nothing: it is significant in flow content, so a
      // fragment that contributes only whitespace would quietly change how the
      // document renders while appearing to do no work.
      const contributes = nodes.some(
        (node) => isElement(node) || (node.nodeName === "#text" && (node as TextNode).value.trim() !== ""),
      );
      if (!contributes) {
        return {
          error: {
            severity: "error",
            code: "empty-fragment",
            message: `Operation ${index} (${operation.op}) supplied markup that contributes no content.`,
          },
        };
      }

      const removedIds = operation.op === "replace_node" ? [...identifiedDescendants(element), ...selfId(element)] : [];
      const placed = place(operation.op, element, nodes);
      if (!placed) {
        return {
          error: {
            severity: "error",
            code: "unplaceable-node",
            message: `Operation ${index} (${operation.op}) could not place markup relative to ${operation.target}.`,
          },
        };
      }

      const assignedIds = assignIds(nodes, options.idFactory);
      return {
        change: {
          op: operation.op,
          target: operation.target,
          summary: `${describeOperation(operation.op)} ${nodes.filter(isElement).length || nodes.length} node(s) at <${element.tagName}>.`,
          ...(assignedIds.length > 0 ? { assignedIds } : {}),
          ...(removedIds.length > 0 ? { removedIds } : {}),
        },
      };
    }

    case "delete_node": {
      if (element === root) {
        return {
          error: {
            severity: "error",
            code: "undeletable-target",
            message: `Operation ${index} would delete the document root.`,
          },
        };
      }
      const removedIds = [...selfId(element), ...identifiedDescendants(element)];
      detach(element);
      return {
        change: {
          op: operation.op,
          target: operation.target,
          summary: `Deleted <${element.tagName}>.`,
          ...(removedIds.length > 0 ? { removedIds } : {}),
        },
      };
    }

    case "move_node": {
      const destination = resolveTarget(root, operation.destination, index, operation.op);
      if ("error" in destination) return { error: destination.error };

      if (contains(element, destination.element)) {
        return {
          error: {
            severity: "error",
            code: "invalid-move",
            message: `Operation ${index} would move ${operation.target} inside itself.`,
          },
        };
      }

      detach(element);
      const placed = place(positionToOp(operation.position), destination.element, [element]);
      if (!placed) {
        return {
          error: {
            severity: "error",
            code: "unplaceable-node",
            message: `Operation ${index} could not place ${operation.target} ${operation.position} ${operation.destination}.`,
          },
        };
      }

      return {
        change: {
          op: operation.op,
          target: operation.target,
          summary: `Moved <${element.tagName}> ${operation.position} ${operation.destination}.`,
        },
      };
    }

    case "set_attribute": {
      const name = operation.name.toLowerCase();
      if (name === ID_ATTR) {
        return {
          error: {
            severity: "error",
            code: "immutable-attribute",
            message: `Operation ${index} would change ${ID_ATTR}. Stable identity is not an editable attribute; it is what every other operation addresses.`,
          },
        };
      }

      const value = operation.value;
      if (value === undefined || value === null) {
        removeAttr(element, name);
        return {
          change: { op: operation.op, target: operation.target, summary: `Removed ${name} from <${element.tagName}>.` },
        };
      }

      setAttr(element, name, value);
      return {
        change: { op: operation.op, target: operation.target, summary: `Set ${name} on <${element.tagName}>.` },
      };
    }

    default: {
      const unknown = operation as { op: string };
      return {
        error: {
          severity: "error",
          code: "unknown-operation",
          message: `Operation ${index} has unknown op ${JSON.stringify(unknown.op)}.`,
        },
      };
    }
  }
}

function resolveTarget(
  root: Element,
  id: string,
  index: number,
  op: string,
): { element: Element } | { error: Diagnostic } {
  if (typeof id !== "string" || id === "") {
    return {
      error: {
        severity: "error",
        code: "unknown-target",
        message: `Operation ${index} (${op}) has no target id.`,
      },
    };
  }

  const matches = [...walkElements(root)].filter((element) => getAttr(element, ID_ATTR) === id);
  if (matches.length === 0) {
    return {
      error: {
        severity: "error",
        code: "unknown-target",
        message: `Operation ${index} (${op}) targets ${id}, which is not in this document.`,
        elementId: id,
      },
    };
  }
  if (matches.length > 1) {
    return {
      error: {
        severity: "error",
        code: "ambiguous-target",
        message: `Operation ${index} (${op}) targets ${id}, which ${matches.length} elements claim. An ambiguous target is never committed.`,
        elementId: id,
      },
    };
  }

  return { element: matches[0] as Element };
}

function place(op: string, reference: Element, nodes: ChildNode[]): boolean {
  switch (op) {
    case "replace_node":
      return replaceNode(reference, nodes);
    case "insert_before":
      return insertBefore(reference, nodes);
    case "insert_after":
      return insertAfter(reference, nodes);
    case "append_child":
      appendChildren(reference, nodes);
      return true;
    case "prepend_child":
      prependChildren(reference, nodes);
      return true;
    default:
      return false;
  }
}

function positionToOp(position: string): string {
  switch (position) {
    case "before":
      return "insert_before";
    case "after":
      return "insert_after";
    case "prepend":
      return "prepend_child";
    default:
      return "append_child";
  }
}

/**
 * Give every inserted block that needs one a stable id.
 *
 * Assigned rather than demanded: a model that forgets an id on one paragraph
 * should not have its whole transaction rejected, because that pushes callers
 * back toward regenerating the document - the exact thing this protocol exists
 * to avoid. A *duplicate* id is different: it is ambiguous, cannot be resolved
 * without guessing what the author meant, and is refused by the conformance
 * check before commit.
 */
function assignIds(nodes: ChildNode[], idFactory?: () => string): string[] {
  const assigned: string[] = [];
  for (const node of nodes) {
    const result = idFactory ? ensureIds(node, idFactory) : ensureIds(node);
    assigned.push(...result.ids);
  }
  return assigned;
}

function selfId(element: Element): string[] {
  const id = getAttr(element, ID_ATTR);
  return id === undefined ? [] : [id];
}

function identifiedDescendants(element: Element): string[] {
  const ids: string[] = [];
  for (const descendant of walkElements(element)) {
    if (descendant === element) continue;
    const id = getAttr(descendant, ID_ATTR);
    if (id !== undefined) ids.push(id);
  }
  return ids;
}

function describeOperation(op: string): string {
  switch (op) {
    case "replace_node":
      return "Replaced with";
    case "insert_before":
      return "Inserted before,";
    case "insert_after":
      return "Inserted after,";
    case "prepend_child":
      return "Prepended";
    default:
      return "Appended";
  }
}

/** Move the staged tree into the live document, in one step, after all checks pass. */
function adoptTree(document: FrwdDocument, staged: FrwdDocument): void {
  document.tree.childNodes.length = 0;
  for (const child of staged.tree.childNodes) {
    child.parentNode = null;
    document.tree.childNodes.push(child);
  }
  document.tree.mode = staged.tree.mode;
}
