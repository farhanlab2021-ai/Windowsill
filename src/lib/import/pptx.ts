/**
 * PowerPoint (.pptx) → page blocks.
 *
 * A .pptx file is a ZIP of XML files: one per slide, plus "relationship"
 * files that say which picture belongs where. We open it with JSZip, read the
 * slides in presentation order, and turn each into:
 *   ## Slide 3: <slide title>
 *   • bullet points (indent levels kept)
 *   [pictures]
 *   > Speaker notes: …
 *
 * The XML parts are read with small regular expressions instead of a full XML
 * parser, so this also runs (and is tested) outside the browser.
 */
import JSZip from "jszip";

export interface SlideParagraph {
  text: string;
  level: number;
}

export interface ParsedSlide {
  title: string | null;
  paragraphs: SlideParagraph[];
  /** Relationship ids of the pictures on the slide, in order. */
  imageRelIds: string[];
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

/** All the text in one <a:p> paragraph (runs joined, line breaks as spaces). */
function paragraphText(p: string): string {
  const parts = [...p.matchAll(/<a:t>([^<]*)<\/a:t>|<a:br\s*\/>/g)].map((m) => (m[1] === undefined ? " " : decode(m[1])));
  return parts.join("").replace(/\s+/g, " ").trim();
}

function paragraphsOf(xml: string): SlideParagraph[] {
  return [...xml.matchAll(/<a:p>[\s\S]*?<\/a:p>/g)]
    .map((m) => ({ text: paragraphText(m[0]), level: Number(m[0].match(/<a:pPr[^>]*\blvl="(\d)"/)?.[1] ?? 0) }))
    .filter((p) => p.text);
}

/** Reads one slide's XML: its title, its text (in reading order) and its pictures. */
export function parseSlideXml(xml: string): ParsedSlide {
  const slide: ParsedSlide = { title: null, paragraphs: [], imageRelIds: [] };
  const shapes = xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>|<p:pic\b[\s\S]*?<\/p:pic>|<p:graphicFrame\b[\s\S]*?<\/p:graphicFrame>/g);
  for (const [shape] of shapes) {
    if (shape.startsWith("<p:pic")) {
      const rel = shape.match(/<a:blip\b[^>]*r:embed="([^"]+)"/)?.[1];
      if (rel) slide.imageRelIds.push(rel);
      continue;
    }
    if (shape.startsWith("<p:graphicFrame")) {
      // A table: one line per row, cells separated by " | ".
      for (const [row] of shape.matchAll(/<a:tr\b[\s\S]*?<\/a:tr>/g)) {
        const cells = [...row.matchAll(/<a:tc\b[\s\S]*?<\/a:tc>/g)].map(([cell]) =>
          paragraphsOf(cell).map((p) => p.text).join(" "),
        );
        if (cells.some(Boolean)) slide.paragraphs.push({ text: cells.join(" | "), level: 0 });
      }
      continue;
    }
    if (/<p:ph\b[^>]*type="(sldNum|dt|ftr)"/.test(shape)) continue; // slide number, date, footer
    const paragraphs = paragraphsOf(shape);
    if (/<p:ph\b[^>]*type="(title|ctrTitle)"/.test(shape) && slide.title === null && paragraphs.length) {
      slide.title = paragraphs.map((p) => p.text).join(" ");
    } else {
      slide.paragraphs.push(...paragraphs);
    }
  }
  return slide;
}

/** Speaker notes: the text of the notes page's body placeholder. */
export function parseNotesXml(xml: string): string[] {
  const body = [...xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)].map((m) => m[0]).find((s) => /<p:ph\b[^>]*type="body"/.test(s));
  return body ? paragraphsOf(body).map((p) => p.text) : [];
}

/** A relationships file → { rId: target path }. */
export function parseRels(xml: string): Record<string, string> {
  const rels: Record<string, string> = {};
  for (const m of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = m[1].match(/\bId="([^"]+)"/)?.[1];
    const target = m[1].match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) rels[id] = target;
  }
  return rels;
}

/** Resolves "../media/image1.png" relative to "ppt/slides/slide1.xml" → "ppt/media/image1.png". */
export function resolvePath(fromFile: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = fromFile.split("/").slice(0, -1);
  for (const piece of target.split("/")) {
    if (piece === "..") parts.pop();
    else if (piece !== ".") parts.push(piece);
  }
  return parts.join("/");
}

/** "ppt/slides/slide1.xml" → "ppt/slides/_rels/slide1.xml.rels". */
const relsPathOf = (file: string) => file.replace(/([^/]+)$/, "_rels/$1.rels");

const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

type Block = { type: string; props?: Record<string, unknown>; content?: unknown; children?: Block[] };

/** Bullet points with indent levels → nested list blocks. */
function bulletsToBlocks(paragraphs: SlideParagraph[]): Block[] {
  const root: Block[] = [];
  const stack: { level: number; children: Block[] }[] = [{ level: -1, children: root }];
  for (const p of paragraphs) {
    const block: Block = { type: "bulletListItem", content: p.text, children: [] };
    while (stack.length > 1 && stack.at(-1)!.level >= p.level) stack.pop();
    stack.at(-1)!.children.push(block);
    stack.push({ level: p.level, children: block.children! });
  }
  return root;
}

/** Opens a .pptx: its files, the slides in presentation order, and the slide shape (width ÷ height). */
export async function openDeck(data: ArrayBuffer | Uint8Array) {
  const zip = await JSZip.loadAsync(data);
  const read = async (path: string) => (await zip.file(path)?.async("string")) ?? null;

  // Slide order comes from presentation.xml; fall back to slide numbers.
  let slidePaths: string[] = [];
  const presentation = await read("ppt/presentation.xml");
  const presRels = await read("ppt/_rels/presentation.xml.rels");
  if (presentation && presRels) {
    const rels = parseRels(presRels);
    slidePaths = [...presentation.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)]
      .map((m) => rels[m[1]])
      .filter(Boolean)
      .map((target) => resolvePath("ppt/presentation.xml", target));
  }
  if (slidePaths.length === 0) {
    slidePaths = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
  }

  // Slide size in EMUs, e.g. 12192000 × 6858000 for 16:9 (the usual default).
  const size = presentation?.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
  const aspect = size ? Number(size[1]) / Number(size[2]) : 16 / 9;
  return { zip, read, slidePaths, aspect };
}

/**
 * Some tools (and some PowerPoint exports) list parts in the file's index,
 * [Content_Types].xml, that aren't actually in the file. PowerPoint ignores
 * them, but the slide-drawing library stops at the first one. This returns a
 * copy of the deck with those dangling entries removed (or the original if
 * there were none).
 */
export async function withoutMissingParts(data: ArrayBuffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(data);
  const index = await zip.file("[Content_Types].xml")?.async("string");
  if (!index) return data;
  let removed = 0;
  const cleaned = index.replace(/<Override\b[^>]*PartName="\/([^"]+)"[^>]*\/>/g, (entry, part: string) => {
    if (zip.file(decodeURIComponent(part))) return entry;
    removed++;
    return "";
  });
  if (!removed) return data;
  zip.file("[Content_Types].xml", cleaned);
  return zip.generateAsync({ type: "arraybuffer" });
}

/** Each slide's words (title, text, speaker notes), in order — kept with the slide pictures for search. */
export async function slideTexts(data: ArrayBuffer | Uint8Array): Promise<string[]> {
  const { read, slidePaths } = await openDeck(data);
  const texts: string[] = [];
  for (const path of slidePaths) {
    const xml = await read(path);
    if (!xml) {
      texts.push("");
      continue;
    }
    const slide = parseSlideXml(xml);
    const rels = parseRels((await read(relsPathOf(path))) ?? "");
    const notesTarget = Object.entries(rels).find(([, t]) => /notesSlide\d+\.xml$/.test(t))?.[1];
    const notesXml = notesTarget ? await read(resolvePath(path, notesTarget)) : null;
    texts.push([slide.title, ...slide.paragraphs.map((p) => p.text), ...(notesXml ? parseNotesXml(notesXml) : [])].filter(Boolean).join("\n"));
  }
  return texts;
}

export interface PptxResult {
  title: string | null;
  blocks: Block[];
}

/**
 * Converts a .pptx file. `storeImage` saves a picture and returns the URL to
 * use for it (Windowsill saves it on the device); return null to skip it.
 */
export async function pptxToBlocks(
  data: ArrayBuffer | Uint8Array,
  storeImage: (blob: Blob) => Promise<string | null>,
): Promise<PptxResult> {
  const { zip, read, slidePaths } = await openDeck(data);
  const blocks: Block[] = [];
  let deckTitle: string | null = null;

  for (const [index, path] of slidePaths.entries()) {
    const xml = await read(path);
    if (!xml) continue;
    const slide = parseSlideXml(xml);
    const rels = parseRels((await read(relsPathOf(path))) ?? "");
    deckTitle ??= slide.title;

    blocks.push({ type: "heading", props: { level: 2 }, content: slide.title ? `Slide ${index + 1}: ${slide.title}` : `Slide ${index + 1}` });
    blocks.push(...bulletsToBlocks(slide.paragraphs));

    for (const relId of slide.imageRelIds) {
      const target = rels[relId];
      if (!target) continue;
      const mediaPath = resolvePath(path, target);
      const type = IMAGE_TYPES[mediaPath.split(".").pop()!.toLowerCase()];
      const file = zip.file(mediaPath);
      if (!type || !file) continue; // e.g. old Windows .emf drawings, which browsers can't show
      const url = await storeImage(new Blob([await file.async("arraybuffer")], { type }));
      if (url) blocks.push({ type: "image", props: { url } });
    }

    const notesTarget = Object.entries(rels).find(([, t]) => /notesSlide\d+\.xml$/.test(t))?.[1];
    const notesXml = notesTarget ? await read(resolvePath(path, notesTarget)) : null;
    const notes = notesXml ? parseNotesXml(notesXml) : [];
    if (notes.length) blocks.push({ type: "quote", content: `Speaker notes: ${notes.join(" ")}` });
  }

  return { title: deckTitle, blocks };
}
