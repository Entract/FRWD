import { ASSET_ID_ATTR, ASSET_TYPE } from "./constants.js";
import { findElements, getAttr, textContent } from "./dom.js";
import type { Diagnostic, FrwdAsset, Node } from "./types.js";

/**
 * Asset metadata blocks.
 *
 * Spec section 9.2: significant assets carry an inert JSON description
 * alongside the media, which stays reachable through ordinary HTML. This reads
 * the descriptions; the bytes themselves live in the markup as data URLs and
 * need no special handling here.
 */
export function readAssets(root: Node): { assets: FrwdAsset[]; diagnostics: Diagnostic[] } {
  const assets: FrwdAsset[] = [];
  const diagnostics: Diagnostic[] = [];

  const elements = findElements(
    root,
    (element) => element.tagName === "script" && getAttr(element, "type") === ASSET_TYPE,
  );

  for (const element of elements) {
    const declaredId = getAttr(element, ASSET_ID_ATTR);
    let parsed: unknown;
    try {
      parsed = JSON.parse(textContent(element).trim());
    } catch (error) {
      diagnostics.push({
        severity: "warning",
        code: "asset-not-json",
        message: `Asset metadata for ${declaredId ?? "an unnamed asset"} is not valid JSON: ${
          (error as Error).message
        }`,
      });
      continue;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      diagnostics.push({
        severity: "warning",
        code: "asset-not-object",
        message: `Asset metadata for ${declaredId ?? "an unnamed asset"} must be a JSON object.`,
      });
      continue;
    }

    const asset = parsed as FrwdAsset;
    if (typeof asset.id !== "string") {
      diagnostics.push({
        severity: "warning",
        code: "asset-missing-id",
        message: `Asset metadata is missing a string "id".`,
      });
      continue;
    }

    if (declaredId !== undefined && declaredId !== asset.id) {
      diagnostics.push({
        severity: "warning",
        code: "asset-id-mismatch",
        message: `${ASSET_ID_ATTR}="${declaredId}" does not match the asset's own id "${asset.id}".`,
      });
    }

    assets.push(asset);
  }

  return { assets, diagnostics };
}
