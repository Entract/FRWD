/**
 * The native safety profile, as data.
 *
 * A native `.frwd` is data, not software: it executes nothing and fetches
 * nothing. Every rule below follows from those two sentences, and keeping them
 * as tables rather than scattered conditionals means the profile can be read
 * without reading the code that applies it.
 */

/** Script types that carry inert FRWD document data. Anything else is executable. */
export const INERT_SCRIPT_TYPES: ReadonlySet<string> = new Set([
  "application/frwd+json",
  "application/frwd-asset+json",
]);

/**
 * Elements a native document may never contain.
 *
 * Each either executes code, loads a remote document, or rewrites how every
 * other URL in the file resolves.
 */
export const FORBIDDEN_ELEMENTS: ReadonlySet<string> = new Set([
  "iframe",
  "object",
  "embed",
  "applet",
  "frame",
  "frameset",
  "base",
]);

/**
 * Attributes that make a browser fetch something on its own, with no user
 * action. In a self-contained document every one of these must be a data URL.
 */
export const FETCHING_ATTRIBUTES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["img", new Set(["src", "srcset"])],
  ["source", new Set(["src", "srcset"])],
  ["video", new Set(["src", "poster"])],
  ["audio", new Set(["src"])],
  ["track", new Set(["src"])],
  ["input", new Set(["src"])],
  ["script", new Set(["src"])],
  ["link", new Set(["href"])],
  ["image", new Set(["href", "xlink:href"])],
  ["use", new Set(["href", "xlink:href"])],
  ["object", new Set(["data"])],
  ["embed", new Set(["src"])],
  ["iframe", new Set(["src", "srcdoc"])],
]);

/** Attributes the user must act on before anything is fetched. */
export const NAVIGATIONAL_ATTRIBUTES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["a", new Set(["href"])],
  ["area", new Set(["href"])],
  ["form", new Set(["action"])],
]);

/** URL schemes that execute rather than locate. */
export const EXECUTABLE_SCHEMES: ReadonlySet<string> = new Set(["javascript", "vbscript", "livescript", "mocha"]);

/**
 * Schemes that reach outside the file even though they are not executable.
 * `blob:` and `filesystem:` are unavailable to a document opened from disk and
 * only appear in an attempt to smuggle something in.
 */
export const OPAQUE_SCHEMES: ReadonlySet<string> = new Set(["blob", "filesystem"]);

/** Media types that turn a data URL into a program. */
export const EXECUTABLE_MEDIA_TYPES: ReadonlySet<string> = new Set([
  "text/html",
  "application/xhtml+xml",
  "text/javascript",
  "application/javascript",
  "application/ecmascript",
  "text/ecmascript",
  "application/x-javascript",
]);

/** The FRWD custom-element vocabulary of spec section 8. */
export const KNOWN_CUSTOM_ELEMENTS: ReadonlySet<string> = new Set([
  "frwd-video",
  "frwd-audio",
  "frwd-chart",
  "frwd-gallery",
  "frwd-disclosure",
  "frwd-callout",
  "frwd-dataset",
  "frwd-page-break",
]);

/**
 * Default ceiling for a single embedded data URL.
 *
 * Spec section 9.3 accepts base64 overhead for portability, but an asset large
 * enough to exhaust memory on open is a denial-of-service vector rather than a
 * document. A warning, not an error: the number is a policy, and callers with
 * different constraints should set their own.
 */
export const DEFAULT_MAX_DATA_URL_BYTES = 8 * 1024 * 1024;

export function isEventHandlerAttribute(name: string): boolean {
  return /^on[a-z]/i.test(name);
}

export function isCustomElement(tagName: string): boolean {
  return tagName.includes("-");
}
