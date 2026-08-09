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
   * Whether the file on disk already matches reference canonical serialization.
   *
   * True for every fixture we author. It is a property of `@frwd/format`'s
   * writer, not a conformance rule (spec section 21) - a document produced
   * elsewhere with different attribute order or indentation is equally
   * conforming and would carry false here.
   */
  canonical: boolean;
  /** Exact set of distinct structural diagnostic codes the document should produce. */
  expectedDiagnostics: string[];

  /**
   * Whether the document should satisfy the native safety profile. Defaults to
   * true, so every fixture is held to it unless it exists to violate it.
   */
  profileConforming: boolean;
  /** Exact set of distinct safety-profile diagnostic codes. Defaults to none. */
  expectedProfileDiagnostics: string[];
  /**
   * Options for the profile inspection, so a fixture can exercise a
   * configurable limit without shipping a file large enough to trip the
   * default one.
   */
  inspectOptions?: { maxDataUrlBytes?: number };
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
    profileConforming: parsed.profileConforming ?? true,
    expectedProfileDiagnostics: parsed.expectedProfileDiagnostics ?? [],
    ...(parsed.inspectOptions === undefined ? {} : { inspectOptions: parsed.inspectOptions }),
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
