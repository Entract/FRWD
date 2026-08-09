import type { DefaultTreeAdapterTypes } from "parse5";

/** parse5's default tree, re-exported so callers never import parse5 directly. */
export type Node = DefaultTreeAdapterTypes.Node;
export type ParentNode = DefaultTreeAdapterTypes.ParentNode;
export type ChildNode = DefaultTreeAdapterTypes.ChildNode;
export type Element = DefaultTreeAdapterTypes.Element;
export type TextNode = DefaultTreeAdapterTypes.TextNode;
export type Document = DefaultTreeAdapterTypes.Document;
export type DocumentFragment = DefaultTreeAdapterTypes.DocumentFragment;
export type Attribute = Element["attrs"][number];

/**
 * The document manifest, carried inert in
 * `<script type="application/frwd+json" id="frwd-manifest">`.
 *
 * Required fields are spec section 5. Recommended fields are optional and
 * preserved verbatim on round-trip, including any we do not model.
 */
export interface FrwdManifest {
  format: "frwd";
  version: string;
  documentId: string;
  title: string;
  /** RFC 3339 timestamp. */
  created: string;
  /** RFC 3339 timestamp. */
  modified: string;

  language?: string;
  authors?: string[];
  description?: string;
  keywords?: string[];
  generator?: string;
  generatorVersion?: string;
  license?: string;
  subject?: string;
  revision?: number;

  /** Unmodelled fields survive a round-trip untouched. */
  [key: string]: unknown;
}

/** An entry from a `application/frwd-asset+json` metadata block. */
export interface FrwdAsset {
  id: string;
  mediaType?: string;
  bytes?: number;
  sha256?: string;
  title?: string;
  [key: string]: unknown;
}

export type Severity = "error" | "warning";

/**
 * A structural problem found while reading a document.
 *
 * Parsing never throws: HTML5 parsing is error-tolerant by design, and a
 * document that violates the FRWD profile is still something we want to open,
 * inspect and report on rather than reject outright.
 */
export interface Diagnostic {
  severity: Severity;
  /** Stable machine-readable code, e.g. `missing-manifest`. */
  code: string;
  message: string;
  /** Stable id of the element the diagnostic concerns, when there is one. */
  elementId?: string;
}

export interface ParseOptions {
  /**
   * Assign ids to block elements that lack them. Off by default: reading a
   * document should not silently change it. `FrwdDocument.ensureIds()` is the
   * explicit way in.
   */
  assignMissingIds?: boolean;
  /** Injectable for deterministic tests. Defaults to `crypto.randomUUID`. */
  idFactory?: () => string;
}

/** Result of assigning missing ids. */
export interface EnsureIdsResult {
  /** Number of elements that received a new id. */
  assigned: number;
  /** Ids created, in document order. */
  ids: string[];
}
