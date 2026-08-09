import { FrwdDocument, findElement, getAttr, textContent, walkElements, type Diagnostic, type Element } from "@frwd/format";
import { RUNTIME_SOURCE, RUNTIME_VERSION } from "@frwd/runtime";
import { inspect, INERT_SCRIPT_TYPES } from "@frwd/sanitize";
import { PROFILE_META, RUNTIME_SCRIPT_ID, RUNTIME_VERSION_META } from "./publish.js";

export interface PublicationReport {
  /** True when the file contains the document, the standard runtime, and nothing else executable. */
  isTrusted: boolean;
  diagnostics: Diagnostic[];
  /** Runtime version the file declares, if any. */
  declaredRuntimeVersion?: string;
}

/**
 * Check what a `.frwd.html` actually contains.
 *
 * A publication is ordinary HTML, and anyone can edit ordinary HTML. Nothing
 * about the file name makes it safe, and this function does not pretend
 * otherwise - it answers one narrow, checkable question: does this file contain
 * the standard FRWD runtime and nothing else that executes?
 *
 * A "yes" means the script in this file is byte-for-byte the runtime this
 * implementation ships, and the rest of the file still satisfies the native
 * safety profile. A "no" names what is extra. Treat an unknown `.html` with the
 * normal caution due to any web content either way.
 */
export function inspectPublication(html: string, options: { maxDataUrlBytes?: number } = {}): PublicationReport {
  const publication = FrwdDocument.parse(html);
  const diagnostics: Diagnostic[] = [];

  const runtimeScripts: Element[] = [];
  for (const element of walkElements(publication.tree)) {
    if (element.tagName !== "script") continue;

    const type = (getAttr(element, "type") ?? "").trim().toLowerCase();
    if (INERT_SCRIPT_TYPES.has(type)) continue;

    if (getAttr(element, "id") === RUNTIME_SCRIPT_ID && textContent(element).trim() === RUNTIME_SOURCE.trim()) {
      runtimeScripts.push(element);
      continue;
    }

    diagnostics.push({
      severity: "error",
      code: "untrusted-script",
      message:
        getAttr(element, "id") === RUNTIME_SCRIPT_ID
          ? `The script marked as the FRWD runtime is not the runtime this implementation ships (${RUNTIME_VERSION}).`
          : "This publication contains a script that is not the trusted FRWD runtime.",
    });
  }

  if (runtimeScripts.length > 1) {
    diagnostics.push({
      severity: "error",
      code: "duplicate-runtime",
      message: `A publication carries one runtime; this file has ${runtimeScripts.length}.`,
    });
  }

  // Everything the native profile forbids, it still forbids after publishing.
  // The runtime is the one exemption, and only because we just proved it is
  // the runtime.
  const exempt = new Set(runtimeScripts);
  diagnostics.push(
    ...inspect(publication.tree, {
      exempt,
      ...(options.maxDataUrlBytes === undefined ? {} : { maxDataUrlBytes: options.maxDataUrlBytes }),
    }),
  );

  const versionMeta = findElement(
    publication.tree,
    (element) => element.tagName === "meta" && getAttr(element, "name") === RUNTIME_VERSION_META,
  );
  const declaredRuntimeVersion = versionMeta ? getAttr(versionMeta, "content") : undefined;

  if (runtimeScripts.length > 0 && declaredRuntimeVersion === undefined) {
    diagnostics.push({
      severity: "warning",
      code: "missing-runtime-version",
      message: `Publication carries a runtime but declares no <meta name="${RUNTIME_VERSION_META}">.`,
    });
  }

  const profileMeta = findElement(
    publication.tree,
    (element) => element.tagName === "meta" && getAttr(element, "name") === PROFILE_META,
  );
  if (runtimeScripts.length > 0 && !profileMeta) {
    diagnostics.push({
      severity: "warning",
      code: "missing-publication-profile",
      message: `Publication declares no <meta name="${PROFILE_META}">.`,
    });
  }

  return {
    isTrusted: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
    diagnostics,
    ...(declaredRuntimeVersion === undefined ? {} : { declaredRuntimeVersion }),
  };
}
