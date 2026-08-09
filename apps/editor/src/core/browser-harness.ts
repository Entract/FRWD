import { mountRegion } from "./mount.js";
import { parseRegion, writeRegionInto } from "./region.js";

/**
 * Test harness.
 *
 * Bundled and injected into a page showing a published FRWD, so the region
 * model can be exercised against real documents in a real browser rather than
 * against strings in a simulated DOM. Not shipped with the editor.
 */

const EDITABLE = "p, h1, h2, h3, h4, h5, h6, li, figcaption, dt, dd, td, th";

function editableBlocks(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`main[data-frwd-document] ${EDITABLE}`)).filter((element) =>
    element.hasAttribute("data-frwd-id"),
  );
}

function roundTripAll() {
  return editableBlocks().map((block) => {
    const before = block.innerHTML;
    const holder = block.cloneNode(false) as HTMLElement;
    holder.innerHTML = before;
    writeRegionInto(holder, parseRegion(holder));
    const after = holder.innerHTML;

    return {
      id: block.getAttribute("data-frwd-id") ?? "",
      tag: block.tagName.toLowerCase(),
      before,
      after,
      equal: before === after,
    };
  });
}

function mountAndUnmount(id: string) {
  const block = document.querySelector<HTMLElement>(`[data-frwd-id="${id}"]`);
  if (!block) throw new Error(`no block ${id}`);

  const attributesBefore = new Map<string, string>();
  for (const attribute of Array.from(block.attributes)) attributesBefore.set(attribute.name, attribute.value);
  const htmlBefore = block.innerHTML;

  const region = mountRegion(block);
  region.commit();

  const attributesAfter = new Map<string, string>();
  for (const attribute of Array.from(block.attributes)) attributesAfter.set(attribute.name, attribute.value);

  const added = [...attributesAfter.keys()].filter((name) => !attributesBefore.has(name));
  const same =
    added.length === 0 &&
    attributesBefore.size === attributesAfter.size &&
    [...attributesBefore].every(([name, value]) => attributesAfter.get(name) === value);

  return { attributesPreserved: same, htmlPreserved: block.innerHTML === htmlBefore, added };
}

function editText(id: string, replacement: string) {
  const block = document.querySelector<HTMLElement>(`[data-frwd-id="${id}"]`);
  if (!block) throw new Error(`no block ${id}`);

  const doc = parseRegion(block);
  let opaqueCount = 0;
  doc.forEach((node) => {
    if (node.type.name === "opaque") opaqueCount += 1;
  });

  // Replace the first run of text and leave everything else - including every
  // opaque atom - exactly where it was.
  let replaced = false;
  const rebuilt = doc.type.schema.nodes["doc"]!.create(
    null,
    doc.content.content.map((node) => {
      if (node.isText && !replaced) {
        replaced = true;
        return doc.type.schema.text(replacement, node.marks);
      }
      return node;
    }),
  );

  const holder = block.cloneNode(false) as HTMLElement;
  writeRegionInto(holder, rebuilt);
  return { html: holder.innerHTML, opaqueCount };
}

(window as unknown as { frwdHarness: unknown }).frwdHarness = { roundTripAll, mountAndUnmount, editText };
