import { EXECUTABLE_MEDIA_TYPES, EXECUTABLE_SCHEMES, OPAQUE_SCHEMES } from "./rules.js";

/**
 * URL classification.
 *
 * The question a native document asks of every URL is not "where does this
 * point" but "what happens if I do nothing" - so URLs are sorted by what a
 * browser would do with them unprompted.
 */
export type UrlKind =
  /** `#section-3`. Resolves inside the document. */
  | "fragment"
  /** Empty or whitespace only. */
  | "empty"
  /** `data:...`. Self-contained. */
  | "data"
  /** `javascript:`, `vbscript:` and friends. */
  | "executable"
  /** `blob:`, `filesystem:`. */
  | "opaque"
  /** `http:`, `https:`, `//host/path`. */
  | "remote"
  /** `logo.png`, `/assets/x.css`. Local to the sender, absent from the file. */
  | "relative"
  /** Anything else with a scheme: `mailto:`, `tel:`, `ftp:`. */
  | "other-scheme";

export interface ClassifiedUrl {
  kind: UrlKind;
  scheme?: string;
  /** Media type of a data URL, lower-cased and without parameters. */
  mediaType?: string;
  /** Decoded byte length of a data URL payload. */
  bytes?: number;
}

const TAB = 0x09;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;
const SPACE = 0x20;

/**
 * Normalize a URL the way a browser would before deciding what it means.
 *
 * Browsers strip tab, line feed and carriage return from *anywhere* in a URL,
 * which is how a scheme split across a line - `java`, newline, `script:` - slips
 * past a naive prefix check. Leading and trailing C0 controls and spaces are
 * then trimmed. Written with explicit code points rather than a character-class
 * range so the control characters never appear in this file.
 */
function normalize(raw: string): string {
  let stripped = "";
  for (const character of raw) {
    const code = character.codePointAt(0) ?? 0;
    if (code === TAB || code === LINE_FEED || code === CARRIAGE_RETURN) continue;
    stripped += character;
  }

  let start = 0;
  let end = stripped.length;
  while (start < end && (stripped.codePointAt(start) ?? 0) <= SPACE) start += 1;
  while (end > start && (stripped.codePointAt(end - 1) ?? 0) <= SPACE) end -= 1;

  return stripped.slice(start, end);
}

export function classifyUrl(raw: string): ClassifiedUrl {
  const value = normalize(raw);
  if (value === "") return { kind: "empty" };
  if (value.startsWith("#")) return { kind: "fragment" };
  if (value.startsWith("//")) return { kind: "remote" };

  const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (!match) return { kind: "relative" };

  const scheme = (match[1] ?? "").toLowerCase();

  if (EXECUTABLE_SCHEMES.has(scheme)) return { kind: "executable", scheme };
  if (OPAQUE_SCHEMES.has(scheme)) return { kind: "opaque", scheme };
  if (scheme === "http" || scheme === "https") return { kind: "remote", scheme };
  if (scheme === "data") return describeDataUrl(value);

  return { kind: "other-scheme", scheme };
}

function describeDataUrl(value: string): ClassifiedUrl {
  const comma = value.indexOf(",");
  const header = comma === -1 ? value.slice(5) : value.slice(5, comma);
  const payload = comma === -1 ? "" : value.slice(comma + 1);

  const base64 = /;base64\s*$/i.test(header);
  const mediaType = (header.split(";")[0] ?? "").trim().toLowerCase() || "text/plain";

  // Base64 encodes three bytes as four characters; padding trims one or two.
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  const bytes = base64 ? Math.max(0, Math.floor((payload.length * 3) / 4) - padding) : payload.length;

  return { kind: "data", scheme: "data", mediaType, bytes };
}

/** A data URL whose media type makes it a program rather than an asset. */
export function isExecutableDataUrl(url: ClassifiedUrl): boolean {
  return url.kind === "data" && url.mediaType !== undefined && EXECUTABLE_MEDIA_TYPES.has(url.mediaType);
}

/**
 * Would a browser fetch this without the user doing anything?
 *
 * Relative URLs count: a self-contained document that references `logo.png`
 * still depends on a file the recipient does not have.
 */
export function requiresNetworkOrExternalFile(url: ClassifiedUrl): boolean {
  return url.kind === "remote" || url.kind === "relative" || url.kind === "other-scheme";
}

/**
 * Split a `srcset` into its candidate URLs.
 *
 * The format is a comma-separated list of "url descriptor" pairs, and a data
 * URL contains commas of its own - so candidates are read as leading
 * non-whitespace runs and the descriptor that follows is skipped, rather than
 * splitting the whole string on commas.
 */
export function parseSrcset(value: string): string[] {
  const urls: string[] = [];
  let index = 0;

  while (index < value.length) {
    while (index < value.length && /[\s,]/.test(value[index] ?? "")) index += 1;
    if (index >= value.length) break;

    const start = index;
    while (index < value.length && !/\s/.test(value[index] ?? "")) index += 1;
    const candidate = value.slice(start, index).replace(/,+$/, "");

    // Skip the descriptor, if any, up to the next candidate.
    while (index < value.length && value[index] !== ",") index += 1;
    index += 1;

    if (candidate !== "") urls.push(candidate);
  }

  return urls;
}
