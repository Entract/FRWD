import postcss from "postcss";

/**
 * One CSS declaration on one identified element.
 *
 * Core rather than a tool, because the meaning is deterministic: two conforming
 * implementations must agree about what "set `padding` to `6mm` on element Z"
 * does. `make_this_card_roomier` is the same idea with a judgement attached,
 * and judgement belongs in an editor.
 *
 * Scope is deliberately one element's own declaration block. Editing a shared
 * rule such as `.card` would change every card, which is a different question
 * about intent and is not answered here.
 *
 * Parsed as CSS, never patched as a string. An inline style attribute is a
 * declaration list, and treating it as text is how unrelated declarations get
 * lost and how a value with a semicolon in it becomes two declarations.
 */

export type StyleEditFailure =
  | { code: "invalid-style-property"; message: string }
  | { code: "invalid-style-value"; message: string }
  | { code: "unparseable-style"; message: string };

export interface StyleEditSuccess {
  /** The new value for the `style` attribute; empty means remove it entirely. */
  style: string;
  /** What the property was before, if it was declared. */
  previous: string | undefined;
  changed: boolean;
}

export type StyleEditResult = StyleEditSuccess | StyleEditFailure;

export function isStyleEditFailure(result: StyleEditResult): result is StyleEditFailure {
  return "code" in result;
}

/** A CSS property name, including custom properties. */
const PROPERTY = /^-{0,2}[a-zA-Z][a-zA-Z0-9-]*$/;

function parseDeclarations(style: string): postcss.Rule | undefined {
  try {
    const root = postcss.parse(`*{${style}}`);
    const rule = root.first;
    return rule?.type === "rule" ? rule : undefined;
  } catch {
    return undefined;
  }
}

function serialize(rule: postcss.Rule): string {
  const declarations: string[] = [];
  rule.walkDecls((declaration) => {
    declarations.push(`${declaration.prop}: ${declaration.value}${declaration.important ? " !important" : ""}`);
  });
  return declarations.join("; ");
}

/**
 * Set a declaration, returning the new `style` attribute value.
 *
 * Every other declaration on the element is preserved exactly, in order.
 */
export function setStyleProperty(style: string, property: string, value: string): StyleEditResult {
  if (!PROPERTY.test(property)) {
    return { code: "invalid-style-property", message: `"${property}" is not a CSS property name.` };
  }
  if (value.trim() === "") {
    return { code: "invalid-style-value", message: `An empty value for ${property} says nothing; remove it instead.` };
  }
  if (/[;{}]|\/\*|\*\//.test(value)) {
    return {
      code: "invalid-style-value",
      message: `The value for ${property} contains CSS structure characters and would change the declaration block's shape.`,
    };
  }

  const rule = parseDeclarations(style);
  if (!rule) return { code: "unparseable-style", message: "The element's existing style attribute could not be parsed." };

  let previous: string | undefined;
  let replaced = false;
  rule.walkDecls((declaration) => {
    if (declaration.prop !== property) return;
    previous = declaration.value;
    declaration.value = value;
    replaced = true;
  });
  if (!replaced) rule.append({ prop: property, value });

  const updated = serialize(rule);

  // Verify rather than trust: read the result back and confirm the property
  // holds exactly what was asked for. A value that restructured the block would
  // fail here even if the character check above let it past.
  const check = readStyleProperty(updated, property);
  if (check !== value.trim()) {
    return {
      code: "invalid-style-value",
      message: `Writing ${property} did not produce the requested value; the element was left unchanged.`,
    };
  }

  return { style: updated, previous, changed: previous !== value };
}

/** Remove a declaration, handing the property back to the document stylesheet. */
export function removeStyleProperty(style: string, property: string): StyleEditResult {
  if (!PROPERTY.test(property)) {
    return { code: "invalid-style-property", message: `"${property}" is not a CSS property name.` };
  }

  const rule = parseDeclarations(style);
  if (!rule) return { code: "unparseable-style", message: "The element's existing style attribute could not be parsed." };

  let previous: string | undefined;
  rule.walkDecls((declaration) => {
    if (declaration.prop !== property) return;
    previous = declaration.value;
    declaration.remove();
  });

  return { style: serialize(rule), previous, changed: previous !== undefined };
}

/** Read one declaration from a style attribute. */
export function readStyleProperty(style: string, property: string): string | undefined {
  const rule = parseDeclarations(style);
  if (!rule) return undefined;

  let found: string | undefined;
  rule.walkDecls((declaration) => {
    if (declaration.prop === property) found = declaration.value;
  });
  return found;
}

/** Every declaration on an element, as a map. Used by the inspector. */
export function readStyleProperties(style: string): Record<string, string> {
  const rule = parseDeclarations(style);
  if (!rule) return {};

  const declarations: Record<string, string> = {};
  rule.walkDecls((declaration) => {
    declarations[declaration.prop] = declaration.value;
  });
  return declarations;
}
