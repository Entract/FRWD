import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Fixture discovery.
 *
 * A fixture is a `.frwd` file anywhere under `fixtures/`, beside a `.json`
 * sidecar of the same basename declaring what it is meant to prove. Adding one
 * is two files and no wiring: the suites below pick it up automatically.
 *
 * The sidecar is required rather than optional. A fixture without stated
 * expectations tests nothing in particular, and would quietly pass whatever the
 * implementation happened to do.
 */

export interface FixtureExpectations {
  title: string;
  description: string;
  /** Whether the document should report itself structurally conforming. */
  conforming: boolean;
  /**
   * Whether the file on disk is already what the serializer would write. True
   * for every fixture we control; the flag exists for documents captured from
   * elsewhere.
   */
  canonical: boolean;
  /** Exact set of distinct diagnostic codes the document should produce. */
  expectedDiagnostics: string[];
}

export interface Fixture {
  /** Path relative to `fixtures/`, without extension, e.g. `invalid/missing-version`. */
  name: string;
  path: string;
  source: string;
  expectations: FixtureExpectations;
}

export const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures");

function* findFrwdFiles(directory: string): Generator<string> {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* findFrwdFiles(path);
    else if (entry.endsWith(".frwd")) yield path;
  }
}

function readExpectations(frwdPath: string): FixtureExpectations {
  const sidecar = frwdPath.replace(/\.frwd$/, ".json");
  let raw: string;
  try {
    raw = readFileSync(sidecar, "utf8");
  } catch {
    throw new Error(
      `Fixture ${relative(FIXTURES_DIR, frwdPath)} has no ${relative(FIXTURES_DIR, sidecar)} sidecar. ` +
        `Every fixture must state what it proves.`,
    );
  }

  const parsed = JSON.parse(raw) as Partial<FixtureExpectations>;
  if (typeof parsed.conforming !== "boolean" || !Array.isArray(parsed.expectedDiagnostics)) {
    throw new Error(
      `Fixture sidecar ${relative(FIXTURES_DIR, sidecar)} must declare "conforming" and "expectedDiagnostics".`,
    );
  }

  return {
    title: parsed.title ?? relative(FIXTURES_DIR, frwdPath),
    description: parsed.description ?? "",
    conforming: parsed.conforming,
    canonical: parsed.canonical ?? true,
    expectedDiagnostics: parsed.expectedDiagnostics,
  };
}

export function loadFixtures(): Fixture[] {
  return [...findFrwdFiles(FIXTURES_DIR)]
    .map((path) => ({
      name: relative(FIXTURES_DIR, path).replace(/\\/g, "/").replace(/\.frwd$/, ""),
      path,
      source: readFileSync(path, "utf8"),
      expectations: readExpectations(path),
    }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

/** Distinct diagnostic codes, sorted, for comparison against a fixture's expectations. */
export function distinctCodes(diagnostics: readonly { code: string }[]): string[] {
  return [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort();
}
