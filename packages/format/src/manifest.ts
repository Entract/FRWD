import { MANIFEST_ID, MANIFEST_TYPE } from "./constants.js";
import { findElement, getAttr, setTextContent, textContent } from "./dom.js";
import type { Diagnostic, Document, Element, FrwdManifest, Node } from "./types.js";

/** Required manifest keys, in the order spec section 5 lists them. */
const REQUIRED_KEYS = ["format", "version", "documentId", "title", "created", "modified"] as const;

/** Recommended keys, in spec order, emitted after the required ones. */
const RECOMMENDED_KEYS = [
  "language",
  "authors",
  "description",
  "keywords",
  "generator",
  "generatorVersion",
  "license",
  "subject",
  "revision",
] as const;

const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function findManifestElement(root: Node): Element | undefined {
  return findElement(
    root,
    (element) =>
      element.tagName === "script" &&
      getAttr(element, "type") === MANIFEST_TYPE &&
      getAttr(element, "id") === MANIFEST_ID,
  );
}

/**
 * Read the manifest, reporting rather than throwing.
 *
 * A document whose manifest is missing or malformed is still readable - the
 * content is in the HTML, not the manifest - so callers get diagnostics and a
 * possibly-undefined manifest instead of an exception.
 */
export function readManifest(root: Node): {
  manifest: FrwdManifest | undefined;
  diagnostics: Diagnostic[];
} {
  const element = findManifestElement(root);
  if (!element) {
    return {
      manifest: undefined,
      diagnostics: [
        {
          severity: "error",
          code: "missing-manifest",
          message: `No <script type="${MANIFEST_TYPE}" id="${MANIFEST_ID}"> found.`,
        },
      ],
    };
  }

  const raw = textContent(element).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      manifest: undefined,
      diagnostics: [
        {
          severity: "error",
          code: "manifest-not-json",
          message: `Manifest is not valid JSON: ${(error as Error).message}`,
        },
      ],
    };
  }

  const diagnostics = validateManifest(parsed);
  const usable = !diagnostics.some((diagnostic) => diagnostic.severity === "error");
  return {
    manifest: usable ? (parsed as FrwdManifest) : undefined,
    diagnostics,
  };
}

export function validateManifest(value: unknown): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [
      {
        severity: "error",
        code: "manifest-not-object",
        message: "Manifest must be a JSON object.",
      },
    ];
  }

  const record = value as Record<string, unknown>;

  for (const key of REQUIRED_KEYS) {
    if (!(key in record)) {
      diagnostics.push({
        severity: "error",
        code: "manifest-missing-field",
        message: `Manifest is missing required field "${key}".`,
      });
    }
  }

  if ("format" in record && record["format"] !== "frwd") {
    diagnostics.push({
      severity: "error",
      code: "manifest-bad-format",
      message: `Manifest "format" must be "frwd", found ${JSON.stringify(record["format"])}.`,
    });
  }

  for (const key of ["version", "documentId", "title"] as const) {
    if (key in record && typeof record[key] !== "string") {
      diagnostics.push({
        severity: "error",
        code: "manifest-bad-type",
        message: `Manifest "${key}" must be a string.`,
      });
    }
  }

  for (const key of ["created", "modified"] as const) {
    const timestamp = record[key];
    if (typeof timestamp === "string" && !RFC3339.test(timestamp)) {
      diagnostics.push({
        severity: "warning",
        code: "manifest-bad-timestamp",
        message: `Manifest "${key}" should be an RFC 3339 timestamp, found ${JSON.stringify(timestamp)}.`,
      });
    }
  }

  return diagnostics;
}

/**
 * Serialize a manifest with a canonical key order.
 *
 * Required keys first in spec order, then recommended keys in spec order, then
 * anything else alphabetically. Without this, two saves of the same document
 * could differ only in key order and produce a meaningless diff.
 */
export function stringifyManifest(manifest: FrwdManifest): string {
  const seen = new Set<string>();
  const ordered: Record<string, unknown> = {};

  const take = (key: string): void => {
    if (key in manifest && !seen.has(key)) {
      ordered[key] = manifest[key];
      seen.add(key);
    }
  };

  for (const key of REQUIRED_KEYS) take(key);
  for (const key of RECOMMENDED_KEYS) take(key);
  for (const key of Object.keys(manifest).sort()) take(key);

  return JSON.stringify(ordered, null, 2);
}

/**
 * Write the manifest back into the document.
 *
 * Returns false when there is no manifest element to write into; creating one
 * is `FrwdDocument`'s job, since it knows where `<head>` is.
 */
export function writeManifest(root: Document | Node, manifest: FrwdManifest): boolean {
  const element = findManifestElement(root);
  if (!element) return false;
  setTextContent(element, `\n${stringifyManifest(manifest)}\n`);
  return true;
}
