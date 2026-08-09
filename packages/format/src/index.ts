/**
 * @frwd/format - read and write FRWD documents.
 *
 * Semantic HTML is the canonical document, so this package parses to a
 * spec-compliant HTML tree and serializes back to one. There is no second
 * document model that could drift from the file.
 */

export { FrwdDocument, parseFragment } from "./document.js";

export {
  ASSET_ID_ATTR,
  ASSET_TYPE,
  CUSTOM_ELEMENT_PREFIX,
  DOCUMENT_ATTR,
  DOCUMENT_ID_META,
  FRWD_VERSION,
  ID_ATTR,
  IDENTIFIED_ELEMENTS,
  MANIFEST_ID,
  MANIFEST_TYPE,
  STYLE_ID,
  VERSION_ATTR,
  requiresStableId,
} from "./constants.js";

export {
  childNodes,
  findByTagName,
  findElement,
  findElements,
  getAttr,
  hasAttr,
  isElement,
  isTextNode,
  removeAttr,
  setAttr,
  setTextContent,
  textContent,
  walk,
  walkElements,
} from "./dom.js";

export {
  collectIdentified,
  diagnoseIdentity,
  ensureIds,
  findById,
  findDuplicateIds,
  findUnidentified,
} from "./identity.js";

export { findManifestElement, readManifest, stringifyManifest, validateManifest, writeManifest } from "./manifest.js";

export { readAssets } from "./assets.js";

export { findStyleElement, readDocumentStyle, writeDocumentStyle } from "./style.js";

export { canonicalizeAttributes, serializeDocument } from "./serialize.js";

export type {
  Attribute,
  ChildNode,
  Diagnostic,
  Document,
  DocumentFragment,
  Element,
  EnsureIdsResult,
  FrwdAsset,
  FrwdManifest,
  Node,
  ParentNode,
  ParseOptions,
  Severity,
  TextNode,
} from "./types.js";
