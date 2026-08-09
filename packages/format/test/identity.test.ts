import { describe, expect, it } from "vitest";
import { FrwdDocument, findDuplicateIds, getAttr, ID_ATTR, requiresStableId } from "../src/index.js";
import { MINIMAL, WITHOUT_IDS, sequentialIds } from "./fixtures.js";

describe("stable identity", () => {
  it("does not touch the document on parse", () => {
    const document = FrwdDocument.parse(WITHOUT_IDS);
    expect(document.identified.size).toBe(1);
    expect(document.toHtml()).not.toContain("id-1");
  });

  it("assigns ids only where they are missing", () => {
    const document = FrwdDocument.parse(WITHOUT_IDS);
    const result = document.ensureIds(sequentialIds());

    // article, h1 and the first p - the second p already had one.
    expect(result.assigned).toBe(3);
    expect(result.ids).toEqual(["id-1", "id-2", "id-3"]);
    expect(document.getElementById("keep-me")).toBeDefined();
  });

  it("never reassigns an existing id", () => {
    const document = FrwdDocument.parse(MINIMAL);
    const before = [...document.identified.keys()];

    expect(document.ensureIds(sequentialIds()).assigned).toBe(0);
    expect([...document.identified.keys()]).toEqual(before);
  });

  it("can assign during parse when asked explicitly", () => {
    const document = FrwdDocument.parse(WITHOUT_IDS, {
      assignMissingIds: true,
      idFactory: sequentialIds(),
    });

    expect(document.identified.size).toBe(4);
    expect(document.toHtml()).toContain(`${ID_ATTR}="id-1"`);
  });

  it("resolves an element by id", () => {
    const document = FrwdDocument.parse(MINIMAL);
    const heading = document.getElementById("22222222-2222-4222-8222-222222222222");

    expect(heading?.tagName).toBe("h1");
    expect(getAttr(heading!, ID_ATTR)).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("reports duplicate ids as an error", () => {
    const document = FrwdDocument.parse(MINIMAL.replaceAll("22222222-2222-4222-8222-222222222222", "dup").replaceAll("33333333-3333-4333-8333-333333333333", "dup"));

    expect(document.isConforming).toBe(false);
    expect(document.errors.map((error) => error.code)).toContain("duplicate-stable-id");
    expect([...findDuplicateIds(document.root!).keys()]).toEqual(["dup"]);
  });

  it("warns about block objects that carry no id", () => {
    const document = FrwdDocument.parse(WITHOUT_IDS);
    const codes = document.diagnostics.filter((d) => d.code === "missing-stable-id");

    expect(codes).toHaveLength(3);
    expect(codes.every((d) => d.severity === "warning")).toBe(true);
  });

  it("knows which elements need an id", () => {
    expect(requiresStableId("p")).toBe(true);
    expect(requiresStableId("figure")).toBe(true);
    expect(requiresStableId("frwd-chart")).toBe(true);
    expect(requiresStableId("em")).toBe(false);
    expect(requiresStableId("span")).toBe(false);
  });
});
