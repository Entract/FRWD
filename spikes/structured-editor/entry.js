/**
 * Spike: what survives a round trip through a structured editor's document
 * model?
 *
 * ProseMirror is the fair representative of that whole class - Tiptap is a
 * wrapper over it, and every schema-constrained editor makes the same trade.
 * The question is not whether ProseMirror is good; it is whether FRWD's
 * canonical model can be *represented* by an editor library's schema without
 * FRWD having to narrow itself to fit.
 *
 * So this parses a real FRWD document root with a generous schema, serializes
 * it straight back with no edit, and reports what came out the other side.
 * Bundled to an IIFE and injected into a browser page, because ProseMirror's
 * DOM parser needs a real DOM.
 */
import { DOMParser, DOMSerializer, Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

/**
 * A deliberately generous schema: the basic one plus lists, which is what a
 * real editor would start from. Being generous is the point - a stingy schema
 * would make the result look worse than the honest case.
 */
const schema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: basicSchema.spec.marks,
});

function roundTrip(root) {
  const parsed = DOMParser.fromSchema(schema).parse(root);
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(parsed.content, {
    document: window.document,
  });
  const host = window.document.createElement("div");
  host.appendChild(fragment);
  return host;
}

function census(node) {
  const ids = [];
  const tags = {};
  let classed = 0;
  let dataAttributes = 0;

  const walk = (element) => {
    const tag = element.tagName.toLowerCase();
    tags[tag] = (tags[tag] ?? 0) + 1;
    const id = element.getAttribute("data-frwd-id");
    if (id) ids.push(id);
    if (element.getAttribute("class")) classed += 1;
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.startsWith("data-") && attribute.name !== "data-frwd-id") dataAttributes += 1;
    }
    for (const child of Array.from(element.children)) walk(child);
  };
  walk(node);

  return {
    ids,
    tags,
    classed,
    dataAttributes,
    text: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
  };
}

const INTERESTING = [
  "math",
  "mfrac",
  "msup",
  "svg",
  "path",
  "table",
  "thead",
  "tbody",
  "caption",
  "th",
  "figure",
  "figcaption",
  "video",
  "audio",
  "source",
  "img",
  "section",
  "article",
  "header",
  "aside",
  "details",
  "summary",
  "dl",
  "dt",
  "dd",
  "frwd-callout",
  "frwd-chart",
  "frwd-disclosure",
  "frwd-video",
  "frwd-audio",
  "frwd-gallery",
];

window.frwdSpike = function frwdSpike() {
  const root = window.document.querySelector("main[data-frwd-document]");
  if (!root) throw new Error("no FRWD document root on this page");

  const before = census(root);
  let after;
  let error = null;
  try {
    after = census(roundTrip(root));
  } catch (caught) {
    error = String(caught && caught.message ? caught.message : caught).slice(0, 200);
    after = { ids: [], tags: {}, classed: 0, dataAttributes: 0, text: "" };
  }

  const lostIds = before.ids.filter((id) => !after.ids.includes(id));
  const survivingInteresting = {};
  for (const tag of INTERESTING) {
    const had = before.tags[tag] ?? 0;
    if (had === 0) continue;
    survivingInteresting[tag] = { before: had, after: after.tags[tag] ?? 0 };
  }

  return {
    error,
    ids: { before: before.ids.length, after: after.ids.length, lost: lostIds.length },
    classes: { before: before.classed, after: after.classed },
    dataAttributes: { before: before.dataAttributes, after: after.dataAttributes },
    elements: survivingInteresting,
    textPreserved: before.text === after.text,
    textBeforeLength: before.text.length,
    textAfterLength: after.text.length,
  };
};
