import { parse, parseFragment as parse5Fragment } from "parse5";
import { readAssets } from "./assets.js";
import { DOCUMENT_ATTR, DOCUMENT_ID_META, FRWD_VERSION, ID_ATTR, VERSION_ATTR } from "./constants.js";
import { findByTagName, findElement, getAttr, hasAttr, walkElements } from "./dom.js";
import { collectIdentified, diagnoseIdentity, ensureIds, findById, requiresStableIdForElement } from "./identity.js";
import { readManifest, stringifyManifest, writeManifest } from "./manifest.js";
import { canonicalizeAttributes, serializeDocument } from "./serialize.js";
import { readDocumentStyle, writeDocumentStyle } from "./style.js";
import type {
  Diagnostic,
  Document,
  DocumentFragment,
  Element,
  EnsureIdsResult,
  FrwdAsset,
  FrwdManifest,
  ParseOptions,
} from "./types.js";

/**
 * A parsed FRWD document.
 *
 * The HTML tree is the document - there is no second canonical model that could
 * drift from it (spec section 4). This class is a set of accessors over that
 * tree, not a copy of it: everything it returns points into the same nodes, and
 * `toHtml()` serializes exactly what is there.
 */
export class FrwdDocument {
  readonly tree: Document;

  private constructor(tree: Document) {
    this.tree = tree;
  }

  /**
   * Parse a `.frwd` file.
   *
   * Never throws. HTML5 parsing is error-tolerant by design, and a document
   * that breaks the FRWD profile is still worth opening and reporting on -
   * refusing to read it would strand the user's content.
   */
  static parse(html: string, options: ParseOptions = {}): FrwdDocument {
    const tree = parse(html);
    canonicalizeAttributes(tree);

    if (options.assignMissingIds === true) {
      const root = findDocumentRoot(tree);
      if (root) {
        if (options.idFactory) ensureIds(root, options.idFactory);
        else ensureIds(root);
      }
    }

    return new FrwdDocument(tree);
  }

  /**
   * Validate the document as it stands right now.
   *
   * Computed on every call rather than captured at parse. The tree is mutable -
   * `ensureIds`, the manifest setter, `css` and `touch` all change it - and a
   * cached verdict would keep reporting problems the caller has already fixed.
   * Recomputing is a linear pass, which is cheap next to the cost of being
   * wrong about whether a document conforms.
   *
   * This covers the structural layer only. The native safety profile is
   * `@frwd/sanitize`'s rule, and the public answer to "is this a conforming
   * native FRWD?" composes both: a structurally valid document carrying
   * executable script does not conform, however clean its structure.
   */
  validate(): Diagnostic[] {
    return diagnose(this.tree);
  }

  /** Structural problems with the document as it stands. Recomputed on access. */
  get diagnostics(): Diagnostic[] {
    return this.validate();
  }

  /** Errors block a document from being treated as conforming; warnings do not. */
  get errors(): Diagnostic[] {
    return this.validate().filter((diagnostic) => diagnostic.severity === "error");
  }

  /** Structurally conforming. Does not yet include the native safety profile. */
  get isConforming(): boolean {
    return this.errors.length === 0;
  }

  /** `<main data-frwd-document>`, the root of the canonical document tree. */
  get root(): Element | undefined {
    return findDocumentRoot(this.tree);
  }

  get manifest(): FrwdManifest | undefined {
    return readManifest(this.tree).manifest;
  }

  set manifest(manifest: FrwdManifest) {
    if (!writeManifest(this.tree, manifest)) {
      throw new Error(
        "Document has no FRWD manifest element to write into. Add one to <head> before setting the manifest.",
      );
    }
  }

  get documentId(): string | undefined {
    return this.manifest?.documentId;
  }

  get title(): string | undefined {
    return this.manifest?.title;
  }

  /** CSS owned by the document, from `<style id="frwd-document-style">`. */
  get css(): string | undefined {
    return readDocumentStyle(this.tree);
  }

  set css(value: string) {
    if (!writeDocumentStyle(this.tree, value)) {
      throw new Error(
        "Document has no <style id=\"frwd-document-style\"> to write into. Add one to <head> before setting CSS.",
      );
    }
  }

  get assets(): FrwdAsset[] {
    return readAssets(this.tree).assets;
  }

  /** Every element carrying a stable id, keyed by id, in document order. */
  get identified(): Map<string, Element> {
    const root = this.root;
    return root ? collectIdentified(root) : new Map();
  }

  getElementById(id: string): Element | undefined {
    const root = this.root;
    return root ? findById(root, id) : undefined;
  }

  /**
   * Assign ids to block elements that lack them.
   *
   * Explicit by design: parsing does not mutate the document, because a reader
   * that quietly rewrites what it opened cannot promise a stable round-trip.
   */
  ensureIds(idFactory?: () => string): EnsureIdsResult {
    const root = this.root;
    if (!root) return { assigned: 0, ids: [] };
    return idFactory ? ensureIds(root, idFactory) : ensureIds(root);
  }

  /** Set `modified` in the manifest. Defaults to now, injectable for tests. */
  touch(when: Date = new Date()): void {
    const manifest = this.manifest;
    if (!manifest) return;
    this.manifest = { ...manifest, modified: when.toISOString().replace(/\.\d{3}Z$/, "Z") };
  }

  /** Serialize back to a `.frwd` file. Deterministic for a given tree. */
  toHtml(): string {
    return serializeDocument(this.tree);
  }
}

/**
 * Parse an HTML fragment, such as the markup an edit operation supplies.
 *
 * The context element matters: `<li>` outside a list, or `<td>` outside a row,
 * is discarded by the HTML5 fragment parsing algorithm. Pass the element the
 * fragment will live inside and the parse matches what the document will hold.
 */
export function parseFragment(html: string, context?: Element): DocumentFragment {
  const fragment = context ? parse5Fragment(context, html, {}) : parse5Fragment(html);
  canonicalizeAttributes(fragment);
  return fragment;
}

/**
 * Content a printout would lose.
 *
 * A closed `<details>` hides its content, and no stylesheet can reliably force
 * one open: `::details-content` covers Chromium and Firefox, WebKit has no
 * equivalent. So substantive content inside one silently fails to reach paper
 * in at least one major engine, which is exactly what the rich-media print
 * contract forbids.
 *
 * `<details>` remains perfectly good HTML for convenience content - an inline
 * aside, a hint, a bit of prose the reader can take or leave. The line drawn
 * here is block objects: once a disclosure contains something the document
 * model treats as an editable object in its own right, it is document content,
 * and it belongs in a `frwd-disclosure` - whose print behaviour FRWD controls -
 * or in a `<details open>`.
 */
function diagnoseCollapsedContent(root: Element): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const element of walkElements(root)) {
    if (element.tagName !== "details" || hasAttr(element, "open")) continue;

    const blocks = [...walkElements(element)].filter(
      (descendant) => descendant !== element && requiresStableIdForElement(descendant),
    );
    if (blocks.length === 0) continue;

    const id = getAttr(element, ID_ATTR);
    diagnostics.push({
      severity: "error",
      code: "collapsed-substantive-content",
      message: `A closed <details> holds ${blocks.length} block object(s), which would not reach a printout in every browser. Use <frwd-disclosure>, or open the <details>.`,
      ...(id === undefined ? {} : { elementId: id }),
    });
  }

  return diagnostics;
}

function findDocumentRoot(tree: Document): Element | undefined {
  return findElement(tree, (element) => element.tagName === "main" && getAttr(element, DOCUMENT_ATTR) !== undefined);
}

/**
 * Structural checks this package owns.
 *
 * Deliberately not here: enforcement of the no-script native profile, which
 * belongs to `@frwd/sanitize` so that one rule has one owner.
 */
function diagnose(tree: Document): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Normative. FRWD's layout and pagination rest on predictable standards-mode
  // rendering, so a document that lands a browser in quirks mode does not
  // conform - even though its content is perfectly recoverable.
  const doctype = tree.childNodes.find((node) => node.nodeName === "#documentType");
  if (!doctype) {
    diagnostics.push({
      severity: "error",
      code: "missing-doctype",
      message: "Document has no <!doctype html>; browsers would render it in quirks mode.",
    });
  }

  const htmlElement = findByTagName(tree, "html");
  const version = htmlElement ? getAttr(htmlElement, VERSION_ATTR) : undefined;
  if (version === undefined) {
    diagnostics.push({
      severity: "error",
      code: "missing-version",
      message: `<html> is missing ${VERSION_ATTR}; this may not be a FRWD document.`,
    });
  } else if (version !== FRWD_VERSION) {
    const [major] = version.split(".");
    const [ourMajor] = FRWD_VERSION.split(".");
    diagnostics.push({
      severity: major === ourMajor ? "warning" : "error",
      code: "version-mismatch",
      message: `Document declares FRWD ${version}; this package implements ${FRWD_VERSION}.`,
    });
  }

  const root = findDocumentRoot(tree);
  if (!root) {
    diagnostics.push({
      severity: "error",
      code: "missing-document-root",
      message: `No <main ${DOCUMENT_ATTR}> found; the canonical document tree is missing.`,
    });
  } else {
    diagnostics.push(...diagnoseIdentity(root));
    diagnostics.push(...diagnoseCollapsedContent(root));
  }

  const { manifest, diagnostics: manifestDiagnostics } = readManifest(tree);
  diagnostics.push(...manifestDiagnostics);

  const { diagnostics: assetDiagnostics } = readAssets(tree);
  diagnostics.push(...assetDiagnostics);

  const meta = findElement(
    tree,
    (element) => element.tagName === "meta" && getAttr(element, "name") === DOCUMENT_ID_META,
  );
  const metaId = meta ? getAttr(meta, "content") : undefined;
  if (manifest && metaId !== undefined && metaId !== manifest.documentId) {
    diagnostics.push({
      severity: "warning",
      code: "document-id-mismatch",
      message: `<meta name="${DOCUMENT_ID_META}"> is "${metaId}" but the manifest says "${manifest.documentId}".`,
    });
  }

  // An id outside the document root cannot be addressed by a semantic
  // operation, so it is almost certainly a mistake. Membership is collected in
  // one pass rather than re-walking the root per candidate, which kept this
  // whole function linear once validation became something we recompute.
  if (root) {
    const insideRoot = new Set<Element>(walkElements(root));
    for (const element of walkElements(tree)) {
      if (getAttr(element, ID_ATTR) === undefined) continue;
      if (!insideRoot.has(element)) {
        diagnostics.push({
          severity: "warning",
          code: "id-outside-document-root",
          message: `<${element.tagName}> carries ${ID_ATTR} but sits outside <main ${DOCUMENT_ATTR}>.`,
        });
      }
    }
  }

  return diagnostics;
}

export { stringifyManifest };
