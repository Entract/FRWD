import type { Operation } from "@frwd/operations";

/**
 * The properties panel for the selected object.
 *
 * It is meant to feel like adjusting *this object* rather than editing CSS
 * source. The user thinks "make this card roomier"; the editor turns that into
 * a deterministic declaration and sends it through an operation.
 *
 * Two rules hold the design together:
 *
 * - **Computed style is evidence, never state.** `getComputedStyle` tells us
 *   what the browser actually rendered, which is the only honest way to show a
 *   value that came from a stylesheet rule. It is read-only. The document's
 *   own DOM and CSS remain the truth.
 * - **Selecting is not editing.** Nothing is written until the user changes
 *   something, so opening the panel on an object never copies computed values
 *   into it.
 */

export interface InspectorTarget {
  id: string;
  /** The projected element, for computed values only. */
  element: HTMLElement;
  /** Declarations actually present on the canonical element. */
  overrides: Record<string, string>;
  classes: string[];
  tagName: string;
  parentLabel: string | null;
}

export interface InspectorHandlers {
  setProperty(property: string, value: string): void;
  clearProperty(property: string): void;
  setClasses(classes: string[]): void;
}

interface Field {
  property: string;
  label: string;
  /** A short list makes a select; otherwise a text box. */
  choices?: string[];
  placeholder?: string;
}

const SPACING: Field[] = [
  { property: "margin-top", label: "Margin top" },
  { property: "margin-right", label: "right" },
  { property: "margin-bottom", label: "bottom" },
  { property: "margin-left", label: "left" },
  { property: "padding-top", label: "Padding top" },
  { property: "padding-right", label: "right" },
  { property: "padding-bottom", label: "bottom" },
  { property: "padding-left", label: "left" },
];

const SIZING: Field[] = [
  { property: "width", label: "Width", placeholder: "auto" },
  { property: "max-width", label: "Max width", placeholder: "none" },
  { property: "min-width", label: "Min width", placeholder: "0" },
  { property: "text-align", label: "Text align", choices: ["", "start", "center", "end", "justify"] },
  { property: "align-self", label: "Align self", choices: ["", "auto", "start", "center", "end", "stretch"] },
];

const APPEARANCE: Field[] = [
  { property: "background-color", label: "Background" },
  { property: "color", label: "Text colour" },
  { property: "border-radius", label: "Corner radius" },
  { property: "border", label: "Border" },
];

const GRID: Field[] = [
  { property: "grid-template-columns", label: "Columns" },
  { property: "gap", label: "Gap" },
];

const FLEX: Field[] = [
  { property: "gap", label: "Gap" },
  { property: "flex-direction", label: "Direction", choices: ["", "row", "column"] },
  { property: "flex-wrap", label: "Wrap", choices: ["", "nowrap", "wrap"] },
];

/**
 * A convenient columns control.
 *
 * `repeat(N, 1fr)` covers the overwhelming majority of real grids and is what
 * someone means by "make this three columns". It is an editor convenience that
 * compiles to one ordinary declaration - `columns: 3` is not, and must never
 * become, a FRWD operation.
 */
function columnCount(value: string): number | null {
  const repeat = /^repeat\(\s*(\d+)\s*,\s*1fr\s*\)$/.exec(value.trim());
  if (repeat) return Number(repeat[1]);
  const tracks = value.trim().split(/\s+/).filter(Boolean);
  return tracks.length > 0 && tracks.every((track) => track === "1fr") ? tracks.length : null;
}

export function renderInspector(
  panel: HTMLElement,
  target: InspectorTarget | null,
  handlers: InspectorHandlers,
  readOnly: boolean,
): void {
  panel.replaceChildren();

  if (!target) {
    const empty = document.createElement("p");
    empty.className = "chrome-empty";
    empty.textContent = "Select an object to see its properties.";
    panel.appendChild(empty);
    return;
  }

  const computed = window.getComputedStyle(target.element);
  const display = computed.display;

  panel.appendChild(identityBlock(target, handlers, readOnly));

  if (display.includes("grid")) {
    panel.appendChild(gridBlock(target, computed, handlers, readOnly));
  } else if (display.includes("flex")) {
    panel.appendChild(section("Layout", FLEX, target, computed, handlers, readOnly));
  }

  panel.appendChild(section("Spacing", SPACING, target, computed, handlers, readOnly));
  panel.appendChild(section("Size and alignment", SIZING, target, computed, handlers, readOnly));
  panel.appendChild(section("Appearance", APPEARANCE, target, computed, handlers, readOnly));
}

function identityBlock(target: InspectorTarget, handlers: InspectorHandlers, readOnly: boolean): HTMLElement {
  const block = document.createElement("section");
  block.className = "chrome-panel-block";

  const heading = document.createElement("h2");
  heading.className = "chrome-panel-title";
  heading.textContent = `<${target.tagName}>`;
  block.appendChild(heading);

  if (target.parentLabel) {
    const context = document.createElement("p");
    context.className = "chrome-panel-context";
    context.textContent = `in ${target.parentLabel}`;
    block.appendChild(context);
  }

  const classes = document.createElement("div");
  classes.className = "chrome-chips";
  classes.dataset["testid"] = "classes";

  for (const name of target.classes) {
    const chip = document.createElement("span");
    chip.className = "chrome-chip";
    chip.textContent = name;

    if (!readOnly) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.title = `Remove ${name}`;
      remove.dataset["removeClass"] = name;
      remove.addEventListener("click", () =>
        handlers.setClasses(target.classes.filter((existing) => existing !== name)),
      );
      chip.appendChild(remove);
    }
    classes.appendChild(chip);
  }

  if (!readOnly) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "chrome-chip-add";
    add.textContent = "+ class";
    add.addEventListener("click", () => {
      const name = window.prompt("Class name:");
      if (name && !target.classes.includes(name)) handlers.setClasses([...target.classes, name]);
    });
    classes.appendChild(add);
  }
  block.appendChild(classes);

  // Identity is secondary: useful when you need it, not competing for attention.
  const identity = document.createElement("details");
  identity.className = "chrome-identity";
  const summary = document.createElement("summary");
  summary.textContent = "Identity";
  const code = document.createElement("code");
  code.textContent = target.id;
  identity.append(summary, code);
  block.appendChild(identity);

  return block;
}

function gridBlock(
  target: InspectorTarget,
  computed: CSSStyleDeclaration,
  handlers: InspectorHandlers,
  readOnly: boolean,
): HTMLElement {
  const block = section("Layout", GRID, target, computed, handlers, readOnly);

  const current =
    columnCount(target.overrides["grid-template-columns"] ?? "") ??
    columnCount(computed.gridTemplateColumns) ??
    columnCount(String(computed.getPropertyValue("grid-template-columns")));

  const row = document.createElement("div");
  row.className = "chrome-field";

  const label = document.createElement("span");
  label.className = "chrome-field-label";
  label.textContent = "Columns";

  const group = document.createElement("div");
  group.className = "chrome-segmented";
  group.dataset["testid"] = "columns";

  for (const count of [1, 2, 3, 4]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(count);
    button.dataset["columns"] = String(count);
    if (current === count) button.classList.add("is-current");
    button.disabled = readOnly;
    button.addEventListener("click", () => handlers.setProperty("grid-template-columns", `repeat(${count}, 1fr)`));
    group.appendChild(button);
  }

  row.append(label, group);
  block.insertBefore(row, block.children[1] ?? null);
  return block;
}

function section(
  title: string,
  fields: Field[],
  target: InspectorTarget,
  computed: CSSStyleDeclaration,
  handlers: InspectorHandlers,
  readOnly: boolean,
): HTMLElement {
  const block = document.createElement("section");
  block.className = "chrome-panel-block";

  const heading = document.createElement("h3");
  heading.className = "chrome-panel-heading";
  heading.textContent = title;
  block.appendChild(heading);

  for (const field of fields) {
    // Skip the grid-only duplicate of a field the section already rendered.
    if (title === "Layout" && field.property === "grid-template-columns") continue;
    block.appendChild(fieldRow(field, target, computed, handlers, readOnly));
  }

  return block;
}

function fieldRow(
  field: Field,
  target: InspectorTarget,
  computed: CSSStyleDeclaration,
  handlers: InspectorHandlers,
  readOnly: boolean,
): HTMLElement {
  const override = target.overrides[field.property];
  const effective = computed.getPropertyValue(field.property).trim();
  const isOverridden = override !== undefined;

  const row = document.createElement("div");
  row.className = "chrome-field";
  row.dataset["property"] = field.property;
  if (isOverridden) row.classList.add("is-override");

  const label = document.createElement("span");
  label.className = "chrome-field-label";
  label.textContent = field.label;
  row.appendChild(label);

  const control: HTMLInputElement | HTMLSelectElement = field.choices
    ? document.createElement("select")
    : document.createElement("input");

  if (control instanceof HTMLSelectElement) {
    for (const choice of field.choices ?? []) {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = choice === "" ? `— ${effective || "default"} —` : choice;
      control.appendChild(option);
    }
    control.value = override ?? "";
  } else {
    control.type = "text";
    control.value = override ?? "";
    // The computed value as a placeholder: visible, clearly not typed in, and
    // not written anywhere until the user types over it.
    control.placeholder = effective || field.placeholder || "";
  }

  control.className = "chrome-field-input";
  control.disabled = readOnly;
  control.addEventListener("change", () => {
    const value = control.value.trim();
    if (value === "") handlers.clearProperty(field.property);
    else handlers.setProperty(field.property, value);
  });
  row.appendChild(control);

  const state = document.createElement("span");
  state.className = "chrome-field-state";
  state.dataset["state"] = isOverridden ? "override" : "inherited";
  state.textContent = isOverridden ? "local" : effective ? "from rule" : "";
  state.title = isOverridden
    ? `Set on this object. Clear it to hand ${field.property} back to the stylesheet.`
    : `Coming from the document stylesheet: ${effective || "not set"}.`;
  row.appendChild(state);

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "chrome-field-clear";
  clear.textContent = "×";
  clear.title = `Clear the local ${field.property}`;
  clear.dataset["clear"] = field.property;
  clear.hidden = !isOverridden;
  clear.disabled = readOnly;
  clear.addEventListener("click", () => handlers.clearProperty(field.property));
  row.appendChild(clear);

  return row;
}

/** Class changes compile to the existing attribute operation. */
export function classOperation(id: string, classes: string[]): Operation {
  const value = classes.join(" ").trim();
  return value === ""
    ? { op: "set_attribute", target: id, name: "class", value: null }
    : { op: "set_attribute", target: id, name: "class", value };
}
