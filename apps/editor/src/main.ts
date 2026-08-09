import { getAttr, ID_ATTR, parseFragment, serializeElement, walkElements, type Element as FrwdElement } from "@frwd/format";
import { EditorSession } from "./core/session.js";
import { mountRegion, type Region } from "./core/mount.js";

/**
 * The editor shell.
 *
 * No UI framework, deliberately. ADR 0001 makes the FRWD DOM the document, and
 * the surest way to honour that is for nothing to be reconciling it. A
 * framework could own the toolbar and the outline perfectly well; it just must
 * not own the document surface, and at this size not having one is simpler than
 * drawing that line.
 *
 * The document surface is an ordinary element into which the FRWD document's
 * own DOM and its own stylesheet are placed. What you see is the document, not
 * a rendering of a model of the document.
 */

const EDITABLE_BLOCKS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "figcaption", "dt", "dd", "td", "th"]);

interface Shell {
  root: HTMLElement;
  surface: HTMLElement;
  style: HTMLStyleElement;
  status: HTMLElement;
}

let session: EditorSession | null = null;
let region: Region | null = null;
let regionSnapshot: string | null = null;

function build(): Shell {
  const root = document.getElementById("app") as HTMLElement;
  root.innerHTML = `
    <header class="chrome-bar">
      <strong class="chrome-brand">FRWD</strong>
      <input type="file" id="open" accept=".frwd,.html" />
      <span class="chrome-group">
        <button id="bold" title="Bold (Ctrl+B)"><b>B</b></button>
        <button id="italic" title="Italic (Ctrl+I)"><i>I</i></button>
        <button id="link" title="Link">Link</button>
      </span>
      <span class="chrome-group">
        <button id="new-paragraph">New paragraph</button>
        <button id="move-up">Move block up</button>
        <button id="move-down">Move block down</button>
      </span>
      <span class="chrome-group">
        <button id="theme">Theme token…</button>
      </span>
      <span class="chrome-group">
        <button id="undo">Undo</button>
        <button id="redo">Redo</button>
      </span>
      <span class="chrome-spacer"></span>
      <button id="save">Save .frwd</button>
      <button id="publish">Publish .frwd.html</button>
    </header>
    <main class="chrome-stage"><div id="surface" class="chrome-surface"></div></main>
    <footer class="chrome-status" id="status">Open a .frwd file to begin.</footer>
    <style id="document-style"></style>
  `;

  return {
    root,
    surface: root.querySelector("#surface") as HTMLElement,
    style: root.querySelector("#document-style") as HTMLStyleElement,
    status: root.querySelector("#status") as HTMLElement,
  };
}

const shell = build();

function say(message: string): void {
  shell.status.textContent = message;
}

/** Put the document's own DOM and stylesheet on screen. */
function render(): void {
  commitRegion();
  if (!session) return;

  const root = session.document.root;
  shell.style.textContent = session.document.css ?? "";
  shell.surface.innerHTML = "";

  if (!root) {
    say("This file has no <main data-frwd-document>, so there is nothing to edit.");
    return;
  }

  // A projection of the canonical tree, not a second model: it is thrown away
  // and rebuilt whenever the document changes, exactly like the region model.
  shell.surface.innerHTML = serializeElement(root);

  for (const element of Array.from(shell.surface.querySelectorAll<HTMLElement>("[data-frwd-id]"))) {
    element.addEventListener("mousedown", onBlockMouseDown);
  }

  updateButtons();
}

let selectedId: string | null = null;

function onBlockMouseDown(event: MouseEvent): void {
  const element = event.currentTarget as HTMLElement;
  event.stopPropagation();

  const id = element.getAttribute(ID_ATTR);
  if (!id) return;

  if (selectedId !== id) {
    commitRegion();
    selectedId = id;
    for (const other of Array.from(shell.surface.querySelectorAll(".is-selected"))) {
      other.classList.remove("is-selected");
    }
    element.classList.add("is-selected");
  }

  if (region?.block === element) return;
  if (!EDITABLE_BLOCKS.has(element.tagName.toLowerCase())) {
    commitRegion();
    say(`Selected <${element.tagName.toLowerCase()}> — move it, or select text inside a paragraph to edit.`);
    return;
  }

  commitRegion();
  regionSnapshot = session?.document.toHtml() ?? null;
  region = mountRegion(element, {
    sanitizePaste: (html) => EditorSession.sanitizeImportedHtml(html),
    onCommit: (block, changed) => {
      if (!changed || !session || regionSnapshot === null) return;
      writeBackRegion(block);
      session.commitRegionEdit(regionSnapshot);
      say("Edited text.");
      updateButtons();
    },
  });
  region.focus();
}

/** Copy a committed region's inline content into the canonical FRWD DOM. */
function writeBackRegion(block: Element): void {
  if (!session) return;
  const id = block.getAttribute(ID_ATTR);
  if (!id) return;
  const target = session.document.getElementById(id);
  if (!target) return;

  // The block in the canonical tree keeps its element, its identity and its
  // attributes; only its inline children are replaced. Parsed by the format
  // package, so the canonical tree only ever holds nodes it produced.
  const fragment = parseFragment(block.innerHTML, target);
  target.childNodes.length = 0;
  for (const child of fragment.childNodes) {
    child.parentNode = target;
    target.childNodes.push(child);
  }
}

function commitRegion(): void {
  region?.commit();
  region = null;
  regionSnapshot = null;
}

function updateButtons(): void {
  (shell.root.querySelector("#undo") as HTMLButtonElement).disabled = !session?.canUndo;
  (shell.root.querySelector("#redo") as HTMLButtonElement).disabled = !session?.canRedo;
}

function runOps(operations: Parameters<EditorSession["run"]>[0], done: string): void {
  if (!session) return;
  commitRegion();
  const result = session.run(operations);
  if (!result.ok) {
    say(`Refused: ${result.errors.map((error) => error.message).join(" ")}`);
    return;
  }
  render();
  say(done);
}

function download(name: string, contents: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ---- wiring ---------------------------------------------------------------

shell.root.querySelector("#open")!.addEventListener("change", async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const opened = EditorSession.open(await file.text());
  session = opened.session;
  selectedId = null;
  render();

  const errors = opened.result.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  say(
    opened.result.conforming
      ? `Opened ${file.name}.`
      : `Opened ${file.name} with ${errors.length} problem(s): ${errors.map((error) => error.code).join(", ")}. Nothing has been changed.`,
  );
});

shell.root.querySelector("#bold")!.addEventListener("click", () => region?.toggleStrong());
shell.root.querySelector("#italic")!.addEventListener("click", () => region?.toggleEm());
shell.root.querySelector("#link")!.addEventListener("click", () => {
  const href = window.prompt("Link to:");
  if (href !== null) region?.setLink(href === "" ? null : href);
});

shell.root.querySelector("#new-paragraph")!.addEventListener("click", () => {
  if (!selectedId) return say("Select a block first.");
  runOps([{ op: "insert_after", target: selectedId, html: "<p>New paragraph.</p>" }], "Inserted a paragraph.");
});

shell.root.querySelector("#move-up")!.addEventListener("click", () => moveSelected("before"));
shell.root.querySelector("#move-down")!.addEventListener("click", () => moveSelected("after"));

function moveSelected(position: "before" | "after"): void {
  if (!session || !selectedId) return say("Select a block first.");
  const neighbour = siblingOf(selectedId, position);
  if (!neighbour) return say("No sibling to move past.");
  runOps(
    [{ op: "move_node", target: selectedId, destination: neighbour, position }],
    `Moved the block ${position} ${neighbour}.`,
  );
}

function siblingOf(id: string, direction: "before" | "after"): string | null {
  if (!session) return null;
  const root = session.document.root;
  if (!root) return null;

  const identified: FrwdElement[] = [];
  for (const element of walkElements(root)) {
    if (getAttr(element, ID_ATTR) !== undefined) identified.push(element);
  }
  const target = session.document.getElementById(id);
  if (!target) return null;

  const parent = target.parentNode;
  const siblings = identified.filter((element) => element.parentNode === parent);
  const index = siblings.indexOf(target);
  const neighbour = siblings[direction === "before" ? index - 1 : index + 1];
  return neighbour ? (getAttr(neighbour, ID_ATTR) ?? null) : null;
}

shell.root.querySelector("#theme")!.addEventListener("click", () => {
  const name = window.prompt("Theme token (e.g. --accent):", "--accent");
  if (!name) return;
  const value = window.prompt(`Value for ${name}:`);
  if (value === null) return;
  const scope = window.confirm("OK for the light theme, Cancel for dark.") ? "default" : "dark";
  runOps([{ op: "set_theme_token", name, value, scope }], `Set ${name} in the ${scope} theme.`);
});

shell.root.querySelector("#undo")!.addEventListener("click", () => {
  commitRegion();
  if (session?.undo()) {
    render();
    say("Undone.");
  }
});

shell.root.querySelector("#redo")!.addEventListener("click", () => {
  commitRegion();
  if (session?.redo()) {
    render();
    say("Redone.");
  }
});

shell.root.querySelector("#save")!.addEventListener("click", () => {
  if (!session) return;
  commitRegion();
  download(`${session.document.title ?? "document"}.frwd`, session.save(), "text/html");
  say("Saved.");
});

shell.root.querySelector("#publish")!.addEventListener("click", () => {
  if (!session) return;
  commitRegion();
  const result = session.publish();
  if (!result.ok || !result.html) {
    say(`Cannot publish: ${result.errors.map((error) => error.code).join(", ")}`);
    return;
  }
  download(`${session.document.title ?? "document"}.frwd.html`, result.html, "text/html");
  say("Published.");
});

document.addEventListener("mousedown", (event) => {
  if (!shell.surface.contains(event.target as Node)) commitRegion();
});
