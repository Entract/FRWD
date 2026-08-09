import { baseKeymap, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { parseRegion, regionSchema, writeRegionInto } from "./region.js";

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

/** Attributes that belong to the view rather than the document. */
const CHROME_ATTRIBUTES = ["contenteditable", "translate", "spellcheck", "autocorrect", "autocapitalize", "role", "aria-multiline"];

export function mountRegion(block: Element, options: RegionOptions = {}): Region {
  // Captured before ProseMirror touches anything.
  const originalAttributes = new Map<string, string>();
  for (const attribute of Array.from(block.attributes)) {
    originalAttributes.set(attribute.name, attribute.value);
  }
  const originalHtml = block.innerHTML;

  const state = EditorState.create({
    doc: parseRegion(block),
    plugins: [
      // Local, transient, fine-grained. The durable undo model is the
      // editor's; this exists so typing feels like typing.
      history(),
      keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Shift-Mod-z": redo,
        "Mod-b": toggleMark(regionSchema.marks["strong"]!),
        "Mod-i": toggleMark(regionSchema.marks["em"]!),
      }),
      keymap(baseKeymap),
    ],
  });

  const view = new EditorView(
    { mount: block as HTMLElement },
    {
      state,
      // A region is one block. Enter does not create a paragraph here; block
      // creation is a FRWD operation, not a keystroke the region owns.
      handleKeyDown: (_view, event) => event.key === "Enter" && !event.shiftKey,
      transformPastedHTML: (html) => (options.sanitizePaste ? options.sanitizePaste(html) : html),
    },
  );

  let live = true;

  const restoreAttributes = (): void => {
    for (const attribute of Array.from(block.attributes)) {
      if (!originalAttributes.has(attribute.name)) block.removeAttribute(attribute.name);
    }
    for (const [name, value] of originalAttributes) {
      if (block.getAttribute(name) !== value) block.setAttribute(name, value);
    }
    // Belt and braces for the attributes a view is known to add, in case one
    // of them was also present originally with a different value.
    for (const name of CHROME_ATTRIBUTES) {
      if (!originalAttributes.has(name)) block.removeAttribute(name);
    }
  };

  return {
    block,

    commit(): boolean {
      if (!live) return false;
      const doc = view.state.doc;
      live = false;
      view.destroy();

      writeRegionInto(block, doc);
      restoreAttributes();

      const changed = block.innerHTML !== originalHtml;
      options.onCommit?.(block, changed);
      return changed;
    },

    cancel(): void {
      if (!live) return;
      live = false;
      view.destroy();
      block.innerHTML = originalHtml;
      restoreAttributes();
    },

    toggleStrong(): void {
      toggleMark(regionSchema.marks["strong"]!)(view.state, view.dispatch);
      view.focus();
    },

    toggleEm(): void {
      toggleMark(regionSchema.marks["em"]!)(view.state, view.dispatch);
      view.focus();
    },

    setLink(href: string | null): void {
      const mark = regionSchema.marks["link"]!;
      if (href === null) toggleMark(mark)(view.state, view.dispatch);
      else toggleMark(mark, { href })(view.state, view.dispatch);
      view.focus();
    },

    focus(): void {
      view.focus();
    },
  };
}
