import { FrwdDocument, type Diagnostic } from "@frwd/format";
import { type Operation } from "@frwd/operations";
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
export declare class EditorSession {
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
    private past;
    private future;
    private constructor();
    /**
     * Open a file.
     *
     * Inspection, never sanitization. An unsafe document is reported, not
     * quietly repaired: opening a file is not consent to have it rewritten.
     */
    static open(source: string): {
        session: EditorSession;
        result: OpenResult;
    };
    get canUndo(): boolean;
    get canRedo(): boolean;
    private refuseIfReadOnly;
    /** Capture the current state as an undo point. Call before mutating. */
    checkpoint(): void;
    /**
     * Record a region edit that has already been written into the DOM.
     *
     * The whole region edit is one editor-level entry, however many keystrokes
     * produced it - which is the point of letting ProseMirror keep its own
     * fine-grained history while focused.
     */
    commitRegionEdit(before: string): void;
    /** Run FRWD operations. Atomic: a rejected transaction changes nothing. */
    run(operations: Operation[]): ChangeResult;
    undo(): boolean;
    redo(): boolean;
    /** Bump `modified` after a change the operations layer did not make. */
    private touch;
    save(): string;
    publish(): {
        ok: boolean;
        html?: string;
        errors: Diagnostic[];
    };
    /**
     * Make imported markup safe enough to accept.
     *
     * Used for paste. Pasted HTML is imported content and gets the same trust
     * boundary as a file: it does not reach the document until the safety profile
     * has had a look at it. Unlike opening a file, repairing here is right -
     * the user is asking to bring this content in, not to have it preserved as
     * they received it.
     */
    static sanitizeImportedHtml(html: string): string;
}
//# sourceMappingURL=session.d.ts.map