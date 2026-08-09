import postcss, { type AtRule, type Rule } from "postcss";
import type { ThemeScope } from "./types.js";

/**
 * Editing a theme token in the document's own stylesheet.
 *
 * Done over a real CSS AST rather than by string replacement, for the same
 * reason the sanitizer parses rather than pattern-matches: a regular expression
 * that edits CSS is guessing, and a guess that lands in the middle of a
 * declaration produces a stylesheet nobody wrote.
 *
 * Scope is explicit because it has to be. Every designed FRWD so far pairs a
 * light value with a `prefers-color-scheme: dark` counterpart, and the two are
 * the same token name in two different rules - so "set `--accent`" is not a
 * question textual surgery can answer, and an operation that picked one by
 * position would silently change the wrong half of a theme.
 */

export type ThemeEditFailure =
  | { code: "ambiguous-theme-scope"; message: string }
  | { code: "unparseable-stylesheet"; message: string }
  | { code: "invalid-theme-value"; message: string };

export interface ThemeEditSuccess {
  css: string;
  /** True when the rule holding the token had to be created. */
  createdRule: boolean;
  /** True when the token existed and its value changed. */
  replaced: boolean;
}

export type ThemeEditResult = ThemeEditSuccess | ThemeEditFailure;

export function isThemeEditFailure(result: ThemeEditResult): result is ThemeEditFailure {
  return "code" in result;
}

const DARK_QUERY = /prefers-color-scheme\s*:\s*dark/i;

function isRootRule(node: unknown): node is Rule {
  const rule = node as Rule;
  return rule?.type === "rule" && rule.selectors?.some((selector) => selector.trim() === ":root") === true;
}

function isDarkQuery(node: unknown): node is AtRule {
  const atRule = node as AtRule;
  return atRule?.type === "atrule" && atRule.name.toLowerCase() === "media" && DARK_QUERY.test(atRule.params);
}

/** The `:root` rules that belong to the requested scope. */
function candidateRules(root: postcss.Root, scope: ThemeScope): Rule[] {
  const rules: Rule[] = [];

  if (scope === "default") {
    // Top level only: a :root inside any at-rule is conditional, and a
    // conditional rule is not the document's default value.
    for (const node of root.nodes) if (isRootRule(node)) rules.push(node);
    return rules;
  }

  for (const node of root.nodes) {
    if (!isDarkQuery(node)) continue;
    for (const child of node.nodes ?? []) if (isRootRule(child)) rules.push(child);
  }
  return rules;
}

/**
 * Set a custom property, returning the new stylesheet or a reason it cannot be
 * done. Never guesses which rule was meant.
 */
export function setThemeToken(
  css: string,
  name: string,
  value: string,
  scope: ThemeScope,
): ThemeEditResult {
  if (!name.startsWith("--")) {
    return { code: "invalid-theme-value", message: `"${name}" is not a custom property; theme tokens start with --.` };
  }
  if (/[;{}]|\/\*|\*\//.test(value)) {
    return {
      code: "invalid-theme-value",
      message: `Value for ${name} contains CSS structure characters and would change the stylesheet's shape.`,
    };
  }

  let root: postcss.Root;
  try {
    root = postcss.parse(css);
  } catch (error) {
    return { code: "unparseable-stylesheet", message: `Document stylesheet could not be parsed: ${(error as Error).message}` };
  }

  const candidates = candidateRules(root, scope);
  const declaring = candidates.filter((rule) => rule.some((node) => node.type === "decl" && node.prop === name));

  if (declaring.length > 1) {
    return {
      code: "ambiguous-theme-scope",
      message: `${declaring.length} :root rules in the ${scope} scope declare ${name}; which one wins depends on source order, so this is refused rather than guessed.`,
    };
  }

  let createdRule = false;
  let replaced = false;
  let target = declaring[0] ?? candidates[0];

  if (candidates.length > 1 && declaring.length === 0) {
    return {
      code: "ambiguous-theme-scope",
      message: `The ${scope} scope has ${candidates.length} :root rules and none declares ${name}; there is no non-arbitrary choice of where to add it.`,
    };
  }

  if (!target) {
    target = postcss.rule({ selector: ":root" });
    createdRule = true;
    if (scope === "default") {
      root.append(target);
    } else {
      const query = postcss.atRule({ name: "media", params: "(prefers-color-scheme: dark)" });
      query.append(target);
      root.append(query);
    }
  }

  const existing = target.nodes.find((node) => node.type === "decl" && node.prop === name);
  if (existing && existing.type === "decl") {
    replaced = existing.value !== value;
    existing.value = value;
  } else {
    target.append({ prop: name, value });
  }

  const updated = root.toString();

  // Verify rather than trust: re-read the result and confirm the token now
  // holds exactly the requested value in exactly the requested scope. A value
  // that restructured the stylesheet would fail here even if the character
  // check above missed it.
  const check = readThemeToken(updated, name, scope);
  if (check !== value) {
    return {
      code: "invalid-theme-value",
      message: `Writing ${name} did not produce the requested value; the stylesheet was left unchanged.`,
    };
  }

  return { css: updated, createdRule, replaced };
}

/** Read a token's value in a scope, or undefined when it is not declared there. */
export function readThemeToken(css: string, name: string, scope: ThemeScope): string | undefined {
  let root: postcss.Root;
  try {
    root = postcss.parse(css);
  } catch {
    return undefined;
  }

  let found: string | undefined;
  for (const rule of candidateRules(root, scope)) {
    for (const node of rule.nodes) {
      if (node.type === "decl" && node.prop === name) found = node.value;
    }
  }
  return found;
}
