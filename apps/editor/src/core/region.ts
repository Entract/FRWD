import { Schema, type Node as PmNode } from "prosemirror-model";

/**
 * The rich-text region.
 *
 * ADR 0001: the FRWD DOM is the document. This schema is deliberately the
 * smallest thing that can edit ordinary prose, and it is scoped to the inline
 * content of a single block.
 *
 * Everything it does not understand becomes an **opaque atom**: preserved
 * exactly, moved around freely, never looked inside and never rewritten. That
 * one escape hatch is what stops the schema growing every time FRWD gains an
 * element - inline MathML, an inline SVG, an unknown inline custom element all
 * arrive here and leave unchanged.
 *
 * Unsupported valid content becomes uneditable-but-preserved. It is never
 * silently normalised away.
 */
export const regionSchema = new Schema({
  nodes: {
    // Inline-only top level: a region is the inside of one block, never a
    // document.
    doc: { content: "inline*" },
    text: { group: "inline" },
    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      toDOM: () => ["br"],
    },
    opaque: {
      inline: true,
      group: "inline",
      atom: true,
      selectable: true,
      draggable: true,
      attrs: { html: { default: "" }, label: { default: "object" } },
      toDOM: (node) => ["span", { "data-frwd-opaque": node.attrs["label"] as string }],
    },
  },
  // Every mark remembers the element it came from - its tag and its full
  // attribute list - because a mark that only remembers its *role* rewrites the
  // author's markup. <b> would come back as <strong>, and an <a> carrying a
  // stable id would come back without one. Both are silent normalisation, which
  // is the thing this architecture exists to prevent.
  marks: {
    strong: {
      attrs: { tag: { default: "strong" }, attributes: { default: "" } },
      toDOM: (mark) => [mark.attrs["tag"] as string],
    },
    em: {
      attrs: { tag: { default: "em" }, attributes: { default: "" } },
      toDOM: (mark) => [mark.attrs["tag"] as string],
    },
    link: {
      attrs: { href: {}, tag: { default: "a" }, attributes: { default: "" } },
      inclusive: false,
      toDOM: (mark) => ["a", { href: mark.attrs["href"] as string }],
    },
  },
});

const KNOWN_WRAPPERS = new Map<string, "strong" | "em" | "link">([
  ["strong", "strong"],
  ["b", "strong"],
  ["em", "em"],
  ["i", "em"],
  ["a", "link"],
]);

/** Schemes a link may use. Anything else is not a link the editor will create. */
function isSafeHref(href: string): boolean {
  const value = href.trim().toLowerCase();
  if (value.startsWith("#") || value.startsWith("mailto:") || value.startsWith("tel:")) return true;
  return value.startsWith("https://") || value.startsWith("http://");
}

/**
 * Read a block's inline children into a region document.
 *
 * Written by hand rather than delegating to ProseMirror's DOM parser, because
 * the whole point of the architecture is that *we* decide what crosses this
 * boundary. A parser configured with rules drops what it has no rule for; this
 * one preserves it.
 */
export function parseRegion(block: Element): PmNode {
  const nodes: PmNode[] = [];

  const walk = (node: Node, marks: readonly import("prosemirror-model").Mark[]): void => {
    if (node.nodeType === 3) {
      const text = node.nodeValue ?? "";
      if (text.length > 0) nodes.push(regionSchema.text(text, marks));
      return;
    }
    if (node.nodeType !== 1) return;

    const element = node as Element;
    const tag = element.tagName.toLowerCase();

    if (tag === "br") {
      nodes.push(regionSchema.nodes["hard_break"]!.create());
      return;
    }

    const wrapper = KNOWN_WRAPPERS.get(tag);
    if (wrapper === "link") {
      const href = element.getAttribute("href") ?? "";
      // A link the editor cannot vouch for is preserved as an object rather
      // than turned into an editable link with a scheme we would not create.
      if (!isSafeHref(href)) {
        nodes.push(opaqueFrom(element));
        return;
      }
      const mark = regionSchema.marks["link"]!.create({ href, tag: tag, attributes: snapshot(element) });
      for (const child of Array.from(element.childNodes)) walk(child, mark.addToSet(marks));
      return;
    }

    if (wrapper) {
      const mark = regionSchema.marks[wrapper]!.create({ tag, attributes: snapshot(element) });
      for (const child of Array.from(element.childNodes)) walk(child, mark.addToSet(marks));
      return;
    }

    nodes.push(opaqueFrom(element));
  };

  for (const child of Array.from(block.childNodes)) walk(child, []);
  return regionSchema.nodes["doc"]!.create(null, nodes);
}

/**
 * The element's attributes, in a stable order.
 *
 * Stable because ProseMirror compares mark attributes by value: two runs of
 * text with the same formatting must produce equal marks, or they will not
 * merge and the serialization will not be deterministic.
 */
function snapshot(element: Element): string {
  const pairs = Array.from(element.attributes)
    .map((attribute) => [attribute.name, attribute.value] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return pairs.length === 0 ? "" : JSON.stringify(pairs);
}

function restore(target: Element, attributes: string): void {
  if (attributes === "") return;
  for (const [name, value] of JSON.parse(attributes) as [string, string][]) target.setAttribute(name, value);
}

function opaqueFrom(element: Element): PmNode {
  return regionSchema.nodes["opaque"]!.create({
    html: element.outerHTML,
    label: element.tagName.toLowerCase(),
  });
}

/**
 * Write a region document back out as inline DOM.
 *
 * Marks are emitted in a fixed order - link outermost, then em, then strong -
 * so the same region always serializes the same way. Without that, two edits
 * producing identical content could produce different markup, and the format's
 * round-trip guarantee would start depending on the order someone applied
 * formatting in.
 */
export function serializeRegion(doc: PmNode, target: Document): DocumentFragment {
  const fragment = target.createDocumentFragment();

  doc.forEach((node) => {
    if (node.type.name === "hard_break") {
      fragment.appendChild(target.createElement("br"));
      return;
    }

    if (node.type.name === "opaque") {
      // Restored from its own source, so it comes back exactly as it went in.
      const holder = target.createElement("div");
      holder.innerHTML = node.attrs["html"] as string;
      while (holder.firstChild) fragment.appendChild(holder.firstChild);
      return;
    }

    let child: Node = target.createTextNode(node.text ?? "");
    const find = (name: string) => node.marks.find((mark) => mark.type.name === name);

    const strong = find("strong");
    if (strong) child = wrap(target, strong.attrs["tag"] as string, strong.attrs["attributes"] as string, child);

    const em = find("em");
    if (em) child = wrap(target, em.attrs["tag"] as string, em.attrs["attributes"] as string, child);

    const link = find("link");
    if (link) {
      const anchor = wrap(target, link.attrs["tag"] as string, link.attrs["attributes"] as string, child);
      anchor.setAttribute("href", link.attrs["href"] as string);
      child = anchor;
    }

    fragment.appendChild(child);
  });

  return fragment;
}

function wrap(target: Document, tag: string, attributes: string, child: Node): Element {
  const element = target.createElement(tag);
  restore(element, attributes);
  element.appendChild(child);
  return element;
}

/** Replace a block's inline children, leaving the block element itself alone. */
export function writeRegionInto(block: Element, doc: PmNode): void {
  const fragment = serializeRegion(doc, block.ownerDocument);
  while (block.firstChild) block.removeChild(block.firstChild);
  block.appendChild(fragment);
}
