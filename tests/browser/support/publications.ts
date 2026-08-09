import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { FrwdDocument } from "@frwd/format";
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

export function publishFixture(name: string): string {
  const source = readFileSync(join(repository, "fixtures", `${name}.frwd`), "utf8");
  const result = publish(FrwdDocument.parse(source));

  if (!result.ok || result.html === undefined) {
    throw new Error(`Refused to publish ${name}: ${result.errors.map((error) => error.code).join(", ")}`);
  }

  const target = join(outputDirectory, `${name.replace(/[\\/]/g, "-")}.frwd.html`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, result.html, "utf8");
  return pathToFileURL(target).href;
}
