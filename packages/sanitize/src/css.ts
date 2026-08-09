import postcss, { type AtRule, type Declaration, type Root } from "postcss";
import valueParser from "postcss-value-parser";
import { classifyUrl, requiresNetworkOrExternalFile, type ClassifiedUrl } from "./urls.js";

/**
 * CSS inspection.
 *
 * CSS is part of the document (spec section 10), and it is also the quietest
 * way to make a "self-contained" file phone home: one `@import`, one
 * `url(https://…)` in a background or an `@font-face`, and opening the document
 * announces the reader to a third party.
 *
 * This uses a real CSS parser rather than a regular expression. Detecting a
 * remote reference by pattern-matching is guessable and therefore evadable, and
 * a sanitizer that can be evaded is worse than none, because it is trusted.
 */

export type CssFindingKind = "import" | "external-url" | "parse-error";

export interface CssFinding {
  kind: CssFindingKind;
  /** The offending value as written. */
  value: string;
  /** Declaration property or at-rule name it appeared in. */
  context: string;
  url?: ClassifiedUrl;
}

function parseCss(css: string): Root | undefined {
  try {
    return postcss.parse(css);
  } catch {
    return undefined;
  }
}

/** Every URL appearing in a declaration value, in source order. */
function urlsInValue(value: string): string[] {
  const found: string[] = [];
  try {
    valueParser(value).walk((node) => {
      if (node.type !== "function" || node.value.toLowerCase() !== "url") return;
      const first = node.nodes[0];
      if (first && (first.type === "string" || first.type === "word")) found.push(first.value);
      // Do not descend into the url() arguments; they are not nested values.
      return false;
    });
  } catch {
    // A value we cannot parse is reported by the caller as a parse error.
  }
  return found;
}

/** URLs in an at-rule prelude, e.g. `@import url("x") screen;` or `@import "x";`. */
function urlsInParams(params: string): string[] {
  const found = urlsInValue(params);
  if (found.length > 0) return found;

  try {
    const parsed = valueParser(params).nodes[0];
    if (parsed && (parsed.type === "string" || parsed.type === "word")) return [parsed.value];
  } catch {
    // Fall through: an unparseable prelude is still reported as an import.
  }
  return [];
}

/**
 * Inspect a stylesheet. Never modifies anything.
 *
 * @param css stylesheet source, or the value of a `style` attribute when
 *   `inlineDeclarations` is set
 */
export function inspectCss(css: string, options: { inlineDeclarations?: boolean } = {}): CssFinding[] {
  const source = options.inlineDeclarations === true ? `*{${css}}` : css;
  const root = parseCss(source);

  if (!root) {
    return [{ kind: "parse-error", value: css.slice(0, 80), context: "stylesheet" }];
  }

  const findings: CssFinding[] = [];

  root.walkAtRules((atRule: AtRule) => {
    if (atRule.name.toLowerCase() !== "import") return;
    const [first] = urlsInParams(atRule.params);
    findings.push({
      kind: "import",
      value: first ?? atRule.params,
      context: `@${atRule.name}`,
      ...(first === undefined ? {} : { url: classifyUrl(first) }),
    });
  });

  root.walkDecls((declaration: Declaration) => {
    for (const raw of urlsInValue(declaration.value)) {
      const url = classifyUrl(raw);
      if (!requiresNetworkOrExternalFile(url)) continue;
      findings.push({ kind: "external-url", value: raw, context: declaration.prop, url });
    }
  });

  return findings;
}

/**
 * Remove remote references from a stylesheet.
 *
 * `@import` rules are dropped entirely. A declaration whose value reaches
 * outside the file is dropped too, rather than having the URL blanked: a
 * `background-image` pointing nowhere is a broken rule, and leaving broken
 * rules behind makes it harder to see what the document actually does.
 */
export function stripRemoteCss(css: string, options: { inlineDeclarations?: boolean } = {}): {
  css: string;
  removed: CssFinding[];
} {
  const inline = options.inlineDeclarations === true;
  const root = parseCss(inline ? `*{${css}}` : css);
  if (!root) return { css, removed: [{ kind: "parse-error", value: css.slice(0, 80), context: "stylesheet" }] };

  const removed: CssFinding[] = [];

  root.walkAtRules((atRule: AtRule) => {
    if (atRule.name.toLowerCase() !== "import") return;
    const [first] = urlsInParams(atRule.params);
    removed.push({ kind: "import", value: first ?? atRule.params, context: `@${atRule.name}` });
    atRule.remove();
  });

  root.walkDecls((declaration: Declaration) => {
    for (const raw of urlsInValue(declaration.value)) {
      const url = classifyUrl(raw);
      if (!requiresNetworkOrExternalFile(url)) continue;
      removed.push({ kind: "external-url", value: raw, context: declaration.prop, url });
      declaration.remove();
      return;
    }
  });

  const result = root.toString();
  if (!inline) return { css: result, removed };

  // Unwrap the synthetic rule the inline declarations were parsed inside.
  const open = result.indexOf("{");
  const close = result.lastIndexOf("}");
  return { css: open === -1 || close === -1 ? "" : result.slice(open + 1, close).trim(), removed };
}
