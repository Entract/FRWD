import type { FrwdDocument } from "@frwd/format";
import { inspect } from "./inspect.js";
import type { InspectOptions, NativeConformance } from "./types.js";

/**
 * Is this a conforming native FRWD?
 *
 * The complete answer, composed from both layers that own part of it:
 * `@frwd/format` decides whether the document is structurally valid, this
 * package decides whether it stays inside the safety profile. Neither is
 * sufficient alone, and a caller asking the question should never have to know
 * that it has two halves.
 *
 * A structurally flawless document carrying an executable script is not a
 * conforming native FRWD.
 */
export function checkNativeConformance(
  document: FrwdDocument,
  options: InspectOptions = {},
): NativeConformance {
  const structural = document.validate();
  const profile = inspect(document.tree, options);
  const diagnostics = [...structural, ...profile];

  return {
    structural,
    profile,
    diagnostics,
    isConforming: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
  };
}
