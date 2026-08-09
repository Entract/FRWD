/**
 * Rewrite every fixture into canonical form.
 *
 * Fixtures are stored canonically so the conformance harness can assert that a
 * no-op open/save produces no diff, against a real file rather than a string in
 * a test. That assertion only means something if the file on disk is already
 * what the serializer would write — so after hand-editing a fixture, run this.
 *
 *   pnpm fixtures:canonicalize
 *
 * Requires a build first (`pnpm build`), because it uses the published entry
 * point rather than reaching into source.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FrwdDocument } from "@frwd/format";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDir = join(root, "fixtures");

let changed = 0;
let checked = 0;

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!entry.endsWith(".frwd")) continue;

    checked += 1;
    const source = readFileSync(path, "utf8");
    const canonical = FrwdDocument.parse(source).toHtml();
    if (canonical === source) continue;

    writeFileSync(path, canonical, "utf8");
    changed += 1;
    console.log(`canonicalized ${relative(root, path)}`);
  }
}

walk(fixturesDir);
console.log(`${checked} fixture${checked === 1 ? "" : "s"} checked, ${changed} rewritten.`);
