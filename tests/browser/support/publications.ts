import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { FrwdDocument } from "@frwd/format";
import { apply, type Operation } from "@frwd/operations";
import { publish } from "@frwd/publisher";

/**
 * Publications for the browser suite.
 *
 * Real `.frwd.html` files on disk, opened over `file://`. Not `setContent`:
 * the claim under test is that someone can be emailed a document and open it,
 * and a page assembled by the test harness would not be that document.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repository = resolve(here, "..", "..", "..");
const outputDirectory = join(repository, "test-results", "publications");

function load(name: string): FrwdDocument {
  return FrwdDocument.parse(readFileSync(join(repository, "fixtures", `${name}.frwd`), "utf8"));
}

function emit(document: FrwdDocument, fileName: string): string {
  const result = publish(document);
  if (!result.ok || result.html === undefined) {
    throw new Error(`Refused to publish ${fileName}: ${result.errors.map((error) => error.code).join(", ")}`);
  }

  const target = join(outputDirectory, `${fileName}.frwd.html`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, result.html, "utf8");
  return pathToFileURL(target).href;
}

export function publishFixture(name: string): string {
  return emit(load(name), name.replace(/[\\/]/g, "-"));
}

/**
 * Publish a fixture after running one semantic edit operation over it.
 *
 * The edit goes through the real transaction machinery, so what the browser
 * loads is a document the operations layer produced and both conformance layers
 * accepted - which is the point when the claim under test is that content can
 * change without anyone repositioning anything.
 */
export function publishEditedFixture(name: string, operation: Operation): string {
  const document = load(name);
  const result = apply(document, {
    protocol: "frwd-ops",
    version: "0.1",
    documentId: document.documentId ?? "",
    baseRevision: 0,
    operations: [operation],
  });

  if (!result.ok) {
    throw new Error(`Edit of ${name} was rejected: ${result.errors.map((error) => error.code).join(", ")}`);
  }

  return emit(document, `${name.replace(/[\\/]/g, "-")}-edited`);
}
