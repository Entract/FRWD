/**
 * @frwd/publisher - emit a `.frwd.html` publication.
 *
 * ```text
 * native .frwd  +  trusted runtime  =  .frwd.html
 * ```
 *
 * One physical file: the semantic document, its CSS, its embedded assets, and
 * the standard FRWD runtime. No server, no CDN, no network. A recipient who has
 * never heard of FRWD opens it in a browser and reads it.
 */

export { publish, PROFILE_META, RUNTIME_SCRIPT_ID, RUNTIME_STYLE_ID, RUNTIME_VERSION_META } from "./publish.js";
export type { PublicationProfile, PublishOptions, PublishResult } from "./publish.js";

export { inspectPublication } from "./inspect.js";
export type { PublicationReport } from "./inspect.js";

export { RUNTIME_VERSION } from "@frwd/runtime";
