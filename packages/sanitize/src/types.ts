import type { Diagnostic } from "@frwd/format";

export type { Diagnostic };

export interface InspectOptions {
  /**
   * Warn about a single embedded data URL larger than this many decoded bytes.
   * Defaults to `DEFAULT_MAX_DATA_URL_BYTES`.
   */
  maxDataUrlBytes?: number;
}

export type SanitizeAction =
  | "removed-element"
  | "removed-attribute"
  | "cleared-script-content"
  | "rewrote-css";

/** One edit made by `sanitize`, so a caller can tell the user what changed. */
export interface SanitizeChange {
  action: SanitizeAction;
  /** The diagnostic code that justified the edit. */
  code: string;
  /** Human-readable account of the specific change. */
  detail: string;
  /** Stable id of the affected element, or its nearest identified ancestor. */
  elementId?: string;
}

export interface SanitizeReport {
  changes: SanitizeChange[];
  /** Diagnostics still outstanding after sanitization. Should be empty. */
  remaining: Diagnostic[];
}

/**
 * The composed verdict.
 *
 * A native FRWD conforms when it is *both* structurally valid and inside the
 * safety profile. Either alone is a half-answer: a flawless document tree that
 * carries an executable script is not a conforming native FRWD, and a perfectly
 * inert file with no manifest is not one either.
 */
export interface NativeConformance {
  /** Structural diagnostics, from `@frwd/format`. */
  structural: Diagnostic[];
  /** Safety-profile diagnostics, from this package. */
  profile: Diagnostic[];
  /** Both, in that order. */
  diagnostics: Diagnostic[];
  /** True when neither layer reports an error. */
  isConforming: boolean;
}
