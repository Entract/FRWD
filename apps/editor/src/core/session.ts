import { FrwdDocument, type Diagnostic } from "@frwd/format";
import { apply, type Operation } from "@frwd/operations";
import { publish } from "@frwd/publisher";
import { inspect, sanitize } from "@frwd/sanitize";

/**
 * An open document.
 *
 * One durable model: `document`, the validated FRWD DOM. Everything that
 * changes it goes through here, so there is exactly one place that knows how
 * the document got to be the way it is.
 *
 * Undo is the editor's, not ProseMirror's. It stores whole-document snapshots,
 * which is honest rather than clever: correct by construction, and cheap enough
 * for documents of the size FRWD produces. The proper form is inverse
 * operations, and it can replace this without changing any caller.
 */
export interface OpenResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  /** True when the file is structurally valid and inside the safety profile. */
  conforming: boolean;
}

export interface ChangeResult {
  ok: boolean;
  errors: Diagnostic[];
  summary: string[];
}

const UNDO_LIMIT = 50;

export class EditorSession {
  document: FrwdDocument;

  /**
   * A document that failed to open cleanly is readable and diagnosable, and
   * nothing more.
   *
   * The load pipeline says a non-conforming or non-native file is quarantined
   * rather than edited, and this is where that is true - not in the shell.
   * A rule enforced only by the UI is a rule that holds until someone calls the
   * session from somewhere else. Publishing or importing such a file is a
   * separate, explicit act, and not one this class performs by accident.
   */
  readonly readOnly: boolean;
  readonly diagnostics: readonly Diagnostic[];

  private past: string[] = [];
  private future: string[] = [];

  private constructor(document: FrwdDocument, diagnostics: Diagnostic[], readOnly: boolean) {
    this.document = document;
    this.diagnostics = diagnostics;
    this.readOnly = readOnly;
  }

  /**
   * Open a file.
   *
   * Inspection, never sanitization. An unsafe document is reported, not
   * quietly repaired: opening a file is not consent to have it rewritten.
   */
  static open(source: string): { session: EditorSession; result: OpenResult } {
    const document = FrwdDocument.parse(source);
    const structural = document.validate();
    const profile = inspect(document.tree);
    const diagnostics = [...structural, ...profile];

    const conforming = !diagnostics.some((diagnostic) => diagnostic.severity === "error");

    return {
      session: new EditorSession(document, diagnostics, !conforming),
      result: { ok: true, diagnostics, conforming },
    };
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  private refuseIfReadOnly(): Diagnostic[] {
    return [
      {
        severity: "error",
        code: "document-read-only",
        message:
          "This document did not open as a conforming native FRWD, so it is read-only. Nothing here will be changed.",
      },
    ];
  }

  /** Capture the current state as an undo point. Call before mutating. */
  checkpoint(): void {
    this.past.push(this.document.toHtml());
    if (this.past.length > UNDO_LIMIT) this.past.shift();
    this.future.length = 0;
  }

  /**
   * Record a region edit that has already been written into the DOM.
   *
   * The whole region edit is one editor-level entry, however many keystrokes
   * produced it - which is the point of letting ProseMirror keep its own
   * fine-grained history while focused.
   */
  commitRegionEdit(before: string): void {
    if (this.readOnly) return;
    this.past.push(before);
    if (this.past.length > UNDO_LIMIT) this.past.shift();
    this.future.length = 0;
    this.touch();
  }

  /** Run FRWD operations. Atomic: a rejected transaction changes nothing. */
  run(operations: Operation[]): ChangeResult {
    if (this.readOnly) return { ok: false, errors: this.refuseIfReadOnly(), summary: [] };

    const before = this.document.toHtml();
    const result = apply(this.document, {
      protocol: "frwd-ops",
      version: "0.1",
      documentId: this.document.documentId ?? "",
      baseRevision: readRevision(this.document),
      operations,
    });

    if (!result.ok) return { ok: false, errors: [...result.errors], summary: [] };

    this.past.push(before);
    if (this.past.length > UNDO_LIMIT) this.past.shift();
    this.future.length = 0;

    return { ok: true, errors: [], summary: result.changes.map((change) => change.summary) };
  }

  undo(): boolean {
    if (this.readOnly) return false;
    const previous = this.past.pop();
    if (previous === undefined) return false;
    this.future.push(this.document.toHtml());
    this.document = FrwdDocument.parse(previous);
    return true;
  }

  redo(): boolean {
    if (this.readOnly) return false;
    const next = this.future.pop();
    if (next === undefined) return false;
    this.past.push(this.document.toHtml());
    this.document = FrwdDocument.parse(next);
    return true;
  }

  /** Bump `modified` after a change the operations layer did not make. */
  private touch(): void {
    this.document.touch();
  }

  save(): string {
    return this.document.toHtml();
  }

  publish(): { ok: boolean; html?: string; errors: Diagnostic[] } {
    const result = publish(this.document);
    return result.ok && result.html !== undefined
      ? { ok: true, html: result.html, errors: [] }
      : { ok: false, errors: result.errors };
  }

  /**
   * Make imported markup safe enough to accept.
   *
   * Used for paste. Pasted HTML is imported content and gets the same trust
   * boundary as a file: it does not reach the document until the safety profile
   * has had a look at it. Unlike opening a file, repairing here is right -
   * the user is asking to bring this content in, not to have it preserved as
   * they received it.
   */
  static sanitizeImportedHtml(html: string): string {
    const carrier = FrwdDocument.parse(
      `<!DOCTYPE html><html data-frwd-version="0.1"><body><main data-frwd-document><div id="paste">${html}</div></main></body></html>`,
    );
    sanitize(carrier.tree);
    const holder = carrier.getElementById?.("paste");
    void holder;
    const serialized = carrier.toHtml();
    const start = serialized.indexOf('<div id="paste">');
    if (start === -1) return "";
    const from = start + '<div id="paste">'.length;
    const to = serialized.indexOf("</div>", from);
    return to === -1 ? "" : serialized.slice(from, to);
  }
}

function readRevision(document: FrwdDocument): number {
  const raw = document.manifest?.["revision"];
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 ? raw : 0;
}
