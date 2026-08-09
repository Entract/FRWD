/**
 * @frwd/sanitize - the FRWD native safety profile.
 *
 * A native `.frwd` is data, not software. This package decides whether a given
 * document honours that, and - separately, and only when asked - repairs one
 * that does not.
 *
 * ```ts
 * import { FrwdDocument } from "@frwd/format";
 * import { checkNativeConformance, inspect, sanitize } from "@frwd/sanitize";
 *
 * const document = FrwdDocument.parse(untrustedSource);
 *
 * inspect(document.tree);                 // reports; changes nothing
 * checkNativeConformance(document);       // structural + profile, composed
 * sanitize(document.tree);                // repairs, and says what it changed
 * ```
 */

export { inspect } from "./inspect.js";
export { sanitize } from "./sanitize.js";
export { checkNativeConformance } from "./conformance.js";

export { inspectCss, stripRemoteCss, type CssFinding, type CssFindingKind } from "./css.js";

export {
  classifyUrl,
  isExecutableDataUrl,
  parseSrcset,
  requiresNetworkOrExternalFile,
  type ClassifiedUrl,
  type UrlKind,
} from "./urls.js";

export {
  DEFAULT_MAX_DATA_URL_BYTES,
  EXECUTABLE_MEDIA_TYPES,
  EXECUTABLE_SCHEMES,
  FETCHING_ATTRIBUTES,
  FORBIDDEN_ELEMENTS,
  INERT_SCRIPT_TYPES,
  KNOWN_CUSTOM_ELEMENTS,
  NAVIGATIONAL_ATTRIBUTES,
  OPAQUE_SCHEMES,
  isCustomElement,
  isEventHandlerAttribute,
} from "./rules.js";

export type {
  Diagnostic,
  InspectOptions,
  NativeConformance,
  SanitizeAction,
  SanitizeChange,
  SanitizeReport,
} from "./types.js";
