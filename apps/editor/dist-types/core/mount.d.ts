/**
 * Mounting a region editor onto a real FRWD block.
 *
 * ProseMirror is given authority over one block's inline content and nothing
 * else. It is created when a block takes focus and destroyed when the block is
 * committed, so there is never a second durable document model.
 *
 * Everything the view puts on the block element - `contenteditable`, its own
 * classes, translate and spellcheck hints, ARIA plumbing - is **editor chrome**.
 * The block's own attributes are captured before the view exists and restored
 * exactly afterwards, so a document that has been focused and blurred is
 * byte-identical to one that never was.
 */
export interface Region {
    readonly block: Element;
    /** Commit the region's content into the FRWD DOM and tear the view down. */
    commit(): boolean;
    /** Abandon the edit; the block returns to how it was. */
    cancel(): void;
    toggleStrong(): void;
    toggleEm(): void;
    setLink(href: string | null): void;
    focus(): void;
}
export interface RegionOptions {
    /** Called once, after the region has written itself back into the DOM. */
    onCommit?: (block: Element, changed: boolean) => void;
    /**
     * Turn pasted HTML into markup the region may accept. The editor passes the
     * safety profile through here: pasted content is imported content, and it
     * crosses the same trust boundary as a file.
     */
    sanitizePaste?: (html: string) => string;
}
export declare function mountRegion(block: Element, options?: RegionOptions): Region;
//# sourceMappingURL=mount.d.ts.map