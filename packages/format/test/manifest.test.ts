import { describe, expect, it } from "vitest";
import { FrwdDocument, stringifyManifest, validateManifest } from "../src/index.js";
import { DOCUMENT_ID, MINIMAL } from "./fixtures.js";

const VALID = {
  format: "frwd" as const,
  version: "0.1",
  documentId: DOCUMENT_ID,
  title: "Minimal FRWD",
  created: "2026-08-09T09:00:00Z",
  modified: "2026-08-09T09:00:00Z",
};

describe("manifest", () => {
  it("reads the required fields", () => {
    const manifest = FrwdDocument.parse(MINIMAL).manifest;
    expect(manifest).toMatchObject(VALID);
  });

  it("accepts a valid manifest", () => {
    expect(validateManifest(VALID)).toEqual([]);
  });

  it("reports every missing required field", () => {
    const codes = validateManifest({ format: "frwd" }).map((d) => d.code);
    expect(codes.filter((code) => code === "manifest-missing-field")).toHaveLength(5);
  });

  it("rejects a non-FRWD format marker", () => {
    const diagnostics = validateManifest({ ...VALID, format: "docx" });
    expect(diagnostics.map((d) => d.code)).toContain("manifest-bad-format");
  });

  it("warns about a timestamp that is not RFC 3339", () => {
    const diagnostics = validateManifest({ ...VALID, modified: "yesterday" });
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "manifest-bad-timestamp", severity: "warning" }),
    ]);
  });

  it("reports a manifest that is not JSON", () => {
    const document = FrwdDocument.parse(MINIMAL.replace('"format": "frwd",', '"format": frwd,'));
    expect(document.errors.map((error) => error.code)).toContain("manifest-not-json");
  });

  it("reports a document with no manifest at all", () => {
    const document = FrwdDocument.parse(MINIMAL.replace('id="frwd-manifest"', 'id="something-else"'));
    expect(document.errors.map((error) => error.code)).toContain("missing-manifest");
  });

  it("serializes keys in a canonical order regardless of insertion order", () => {
    const scrambled = {
      modified: VALID.modified,
      title: VALID.title,
      description: "later",
      documentId: VALID.documentId,
      zzz: 1,
      created: VALID.created,
      version: VALID.version,
      format: VALID.format,
      language: "en",
    };

    expect(Object.keys(JSON.parse(stringifyManifest(scrambled)) as object)).toEqual([
      "format",
      "version",
      "documentId",
      "title",
      "created",
      "modified",
      "language",
      "description",
      "zzz",
    ]);
  });

  it("round-trips an updated manifest", () => {
    const document = FrwdDocument.parse(MINIMAL);
    document.manifest = { ...VALID, title: "Renamed", revision: 2 };

    const saved = FrwdDocument.parse(document.toHtml());
    expect(saved.title).toBe("Renamed");
    expect(saved.manifest?.["revision"]).toBe(2);
    expect(saved.isConforming).toBe(true);
  });

  it("touch updates only the modified timestamp", () => {
    const document = FrwdDocument.parse(MINIMAL);
    document.touch(new Date("2026-12-25T10:30:00Z"));

    const manifest = FrwdDocument.parse(document.toHtml()).manifest;
    expect(manifest?.modified).toBe("2026-12-25T10:30:00Z");
    expect(manifest?.created).toBe(VALID.created);
  });

  it("warns when the document-id meta tag disagrees with the manifest", () => {
    const document = FrwdDocument.parse(MINIMAL.replace(`content="${DOCUMENT_ID}"`, 'content="other"'));
    expect(document.diagnostics.map((d) => d.code)).toContain("document-id-mismatch");
  });
});
