import {
  getAttr,
  ID_ATTR,
  isElement,
  parseFragment,
  serializeElement,
  walkElements,
  type Element as FrwdElement,
} from "@frwd/format";
import { identifiedSiblings, planInsertion } from "./core/insertion.js";
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
  quarantine: HTMLElement;
  breadcrumb: HTMLElement;
  handle: HTMLButtonElement;
  drop: HTMLElement;
  stage: HTMLElement;
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
      <input type="file" id="open" accept=".frwd" />
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
    <div id="quarantine" class="chrome-quarantine" hidden></div>
    <nav class="chrome-breadcrumb" id="breadcrumb" aria-label="Selected object"></nav>
    <main class="chrome-stage">
      <div id="surface" class="chrome-surface"></div>
      <button id="handle" class="chrome-handle" hidden title="Drag to reorder among siblings" aria-label="Drag to reorder">⣿</button>
      <div id="drop" class="chrome-drop" hidden></div>
    </main>
    <footer class="chrome-status" id="status">Open a .frwd file to begin.</footer>
    <style id="document-style"></style>
  `;

  return {
    root,
    surface: root.querySelector("#surface") as HTMLElement,
    quarantine: root.querySelector("#quarantine") as HTMLElement,
    breadcrumb: root.querySelector("#breadcrumb") as HTMLElement,
    handle: root.querySelector("#handle") as HTMLButtonElement,
    drop: root.querySelector("#drop") as HTMLElement,
    stage: root.querySelector(".chrome-stage") as HTMLElement,
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

/**
 * Editor selection.
 *
 * Entirely editor state. The selected object is identified by its stable id -
 * the one thing that is canonical - and everything else here, outlines,
 * handles, breadcrumbs, is chrome that never reaches the document.
 */
interface Selection {
  id: string;
  /** The projected element, which is rebuilt whenever the document changes. */
  element: HTMLElement;
  parentId: string | null;
  /** Position among identified siblings, and the siblings themselves. */
  index: number;
  siblings: string[];
}

let selection: Selection | null = null;

function selectBlock(id: string | null): void {
  for (const previous of Array.from(shell.surface.querySelectorAll(".is-selected"))) {
    previous.classList.remove("is-selected");
  }

  if (!id || !session) {
    selection = null;
    shell.breadcrumb.replaceChildren();
    shell.handle.hidden = true;
    return;
  }

  const element = shell.surface.querySelector<HTMLElement>(`[${ID_ATTR}="${CSS.escape(id)}"]`);
  if (!element) {
    selection = null;
    shell.handle.hidden = true;
    return;
  }

  const siblings = identifiedSiblings(session.document, id);
  const canonical = session.document.getElementById(id);
  const parentNode: unknown = canonical?.parentNode;
  const parentId =
    parentNode !== null && parentNode !== undefined && isElement(parentNode as never)
      ? (getAttr(parentNode as FrwdElement, ID_ATTR) ?? null)
      : null;

  selection = { id, element, parentId, index: siblings.indexOf(id), siblings };
  element.classList.add("is-selected");

  renderBreadcrumb();
  positionHandle();
}

/**
 * Where the selected object lives.
 *
 * Small on purpose - this is not an outline panel. It exists so nested
 * selection is understandable and so the property controls that come later
 * have an obvious target.
 */
function renderBreadcrumb(): void {
  shell.breadcrumb.replaceChildren();
  if (!selection || !session) return;

  const trail: { label: string; id: string | null }[] = [];
  let current: FrwdElement | null = session.document.getElementById(selection.id) ?? null;

  while (current) {
    const tag = current.tagName.toLowerCase();
    const classes = (getAttr(current, "class") ?? "").trim().split(/s+/).filter(Boolean);
    trail.unshift({
      label: classes.length > 0 ? `${tag}.${classes[0]}` : tag,
      id: getAttr(current, ID_ATTR) ?? null,
    });
    if (tag === "main") break;
    const ancestor: unknown = current.parentNode;
    current =
      ancestor !== null && ancestor !== undefined && isElement(ancestor as never)
        ? (ancestor as FrwdElement)
        : null;
  }

  trail.forEach((step, position) => {
    if (position > 0) {
      const separator = document.createElement("span");
      separator.className = "chrome-crumb-sep";
      separator.textContent = "›";
      shell.breadcrumb.appendChild(separator);
    }

    const isLast = position === trail.length - 1;
    if (step.id && !isLast) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chrome-crumb";
      button.textContent = step.label;
      button.dataset["crumbId"] = step.id;
      button.addEventListener("click", () => {
        commitRegion();
        selectBlock(step.id);
        say(`Selected ${step.label}.`);
      });
      shell.breadcrumb.appendChild(button);
      return;
    }

    const label = document.createElement("span");
    label.className = isLast ? "chrome-crumb is-current" : "chrome-crumb is-plain";
    label.textContent = step.label;
    shell.breadcrumb.appendChild(label);
  });
}

/** Park the drag handle beside the selected object. Chrome, never document. */
function positionHandle(): void {
  if (!selection || session?.readOnly === true || selection.siblings.length < 2) {
    shell.handle.hidden = true;
    return;
  }

  const box = selection.element.getBoundingClientRect();
  const stage = shell.stage.getBoundingClientRect();
  shell.handle.hidden = false;
  shell.handle.style.top = `${box.top - stage.top + shell.stage.scrollTop + 2}px`;
  shell.handle.style.left = `${box.left - stage.left + shell.stage.scrollLeft - 26}px`;
}

function onBlockMouseDown(event: MouseEvent): void {
  const element = event.currentTarget as HTMLElement;
  event.stopPropagation();

  const id = element.getAttribute(ID_ATTR);
  if (!id) return;

  if (selection?.id !== id) {
    commitRegion();
    selectBlock(id);
  }

  if (region?.block === element) return;

  // The load pipeline's rule, enforced where a user would meet it: a document
  // that did not open as conforming native FRWD is readable and nothing else.
  if (session?.readOnly === true) {
    say("This document is read-only: it did not open as a conforming native FRWD.");
    return;
  }

  if (!EDITABLE_BLOCKS.has(element.tagName.toLowerCase())) {
    commitRegion();
    say(`Selected <${element.tagName.toLowerCase()}>. Drag the handle to reorder it, or use the breadcrumb to go up.`);
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

const MUTATING_CONTROLS = ["#bold", "#italic", "#link", "#new-paragraph", "#move-up", "#move-down", "#theme", "#save"];

function updateButtons(): void {
  const readOnly = session?.readOnly === true;

  for (const selector of MUTATING_CONTROLS) {
    (shell.root.querySelector(selector) as HTMLButtonElement).disabled = readOnly;
  }
  (shell.root.querySelector("#undo") as HTMLButtonElement).disabled = readOnly || !session?.canUndo;
  (shell.root.querySelector("#redo") as HTMLButtonElement).disabled = readOnly || !session?.canRedo;

  shell.quarantine.hidden = !readOnly;
  if (readOnly && session) {
    const errors = session.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    shell.quarantine.innerHTML =
      "<strong>Read-only.</strong> This file did not open as a conforming native FRWD, so nothing here can be changed. " +
      "Publishing or importing it is a separate, deliberate step.<ul>" +
      errors
        .slice(0, 6)
        .map((error) => `<li><code>${error.code}</code> ${escapeHtml(error.message)}</li>`)
        .join("") +
      (errors.length > 6 ? `<li>and ${errors.length - 6} more</li>` : "") +
      "</ul>";
  }
}

function escapeHtml(value: string): string {
  const holder = document.createElement("span");
  holder.textContent = value;
  return holder.innerHTML;
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
  selectBlock(null);
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
  if (!selection) return say("Select a block first.");
  const plan = planInsertion(session!.document, selection!.id);
  if (!plan.ok) return say(plan.reason);
  runOps([plan.operation], plan.describes);
});

shell.root.querySelector("#move-up")!.addEventListener("click", () => moveSelected("before"));
shell.root.querySelector("#move-down")!.addEventListener("click", () => moveSelected("after"));

function moveSelected(position: "before" | "after"): void {
  if (!session || !selection) return say("Select a block first.");

  const neighbour = selection.siblings[position === "before" ? selection.index - 1 : selection.index + 1];
  if (!neighbour) return say("Nothing to move past: this is already the first or last object in its container.");

  reorder(selection.id, neighbour, position);
}

/**
 * Commit a reorder.
 *
 * Through `move_node`, always. The thing on screen is a projection; dragging
 * it around would move a picture of the document rather than the document.
 */
function reorder(id: string, destination: string, position: "before" | "after"): void {
  runOps([{ op: "move_node", target: id, destination, position }], "Reordered.");
  selectBlock(id);
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


/**
 * Dragging a block.
 *
 * Deliberately narrow: this reorders identified siblings inside one parent and
 * nothing else. Drag changes semantic order in flow - it does not introduce
 * coordinates, and there is no arrangement it can produce that the document
 * could not already express.
 *
 * A drag that leaves the parent is refused and snaps back, because the honest
 * answer to "what did you mean by that" is to ask rather than guess.
 */
function installDragHandle(): void {
  let dragging: { id: string; siblings: Set<string> } | null = null;
  let over: { id: string; position: "before" | "after" } | null = null;

  const clearIndicator = (): void => {
    shell.drop.hidden = true;
    over = null;
  };

  const siblingUnderPointer = (event: PointerEvent): HTMLElement | null => {
    if (!dragging) return null;
    shell.handle.style.pointerEvents = "none";
    const under = document.elementFromPoint(event.clientX, event.clientY);
    shell.handle.style.pointerEvents = "";
    if (!under) return null;

    const candidate = (under as HTMLElement).closest<HTMLElement>(`[${ID_ATTR}]`);
    if (!candidate) return null;

    // Walk out to whichever ancestor is a sibling of the dragged object, so
    // pointing at a paragraph inside a card targets the card.
    let element: HTMLElement | null = candidate;
    while (element) {
      const id = element.getAttribute(ID_ATTR);
      if (id && dragging.siblings.has(id) && id !== dragging.id) return element;
      element = element.parentElement;
    }
    return null;
  };

  shell.handle.addEventListener("pointerdown", (event) => {
    if (!selection || session?.readOnly === true) return;
    event.preventDefault();
    commitRegion();

    dragging = { id: selection.id, siblings: new Set(selection.siblings) };
    shell.handle.setPointerCapture(event.pointerId);
    shell.handle.classList.add("is-dragging");
    selection.element.classList.add("is-dragging");
    say("Dragging. Release over a sibling to reorder, or anywhere else to cancel.");
  });

  shell.handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;

    const target = siblingUnderPointer(event);
    if (!target) return clearIndicator();

    const box = target.getBoundingClientRect();
    const stage = shell.stage.getBoundingClientRect();
    const after = event.clientY > box.top + box.height / 2;

    over = { id: target.getAttribute(ID_ATTR)!, position: after ? "after" : "before" };

    shell.drop.hidden = false;
    shell.drop.style.top = `${(after ? box.bottom : box.top) - stage.top + shell.stage.scrollTop - 1}px`;
    shell.drop.style.left = `${box.left - stage.left + shell.stage.scrollLeft}px`;
    shell.drop.style.width = `${box.width}px`;
  });

  const finish = (event: PointerEvent): void => {
    if (!dragging) return;

    const moved = dragging;
    const destination = over;
    dragging = null;
    clearIndicator();
    shell.handle.releasePointerCapture(event.pointerId);
    shell.handle.classList.remove("is-dragging");
    shell.surface.querySelector(".is-dragging")?.classList.remove("is-dragging");

    if (!destination) {
      say("Nothing changed: a block can only be reordered among its own siblings.");
      positionHandle();
      return;
    }

    reorder(moved.id, destination.id, destination.position);
  };

  shell.handle.addEventListener("pointerup", finish);
  shell.handle.addEventListener("pointercancel", finish);
}

installDragHandle();

const toolbar = shell.root.querySelector(".chrome-bar") as HTMLElement;

// Pressing a toolbar button must not take focus or selection away from the
// region it is about to act on. Without this the sequence is: toolbar
// mousedown, outside-surface handler commits the region, click handler finds
// nothing to format - which is exactly why bold and italic did nothing while
// the keyboard shortcuts worked.
toolbar.addEventListener("mousedown", (event) => {
  const target = event.target as HTMLElement;
  if (target.closest("button")) event.preventDefault();
});

document.addEventListener("mousedown", (event) => {
  const target = event.target as Node;
  if (shell.surface.contains(target)) return;
  if (toolbar.contains(target)) return;
  commitRegion();
});

// Dev-only introspection for the end-to-end suite. Not present in a build:
// tests should drive the real UI, and the one thing they cannot see from the
// outside is the canonical source.
if (import.meta.env.DEV) {
  (window as unknown as { __frwdEditor: unknown }).__frwdEditor = {
    source: () => session?.save() ?? null,
    readOnly: () => session?.readOnly ?? null,
    diagnostics: () => session?.diagnostics.map((diagnostic) => diagnostic.code) ?? [],
  };
}
