/**
 * Imports files as new pages: Markdown, plain text, web pages (HTML), Word
 * documents (.docx), PDFs and PowerPoint decks (.pptx). A Windowsill backup
 * file (.json) is restored instead.
 *
 * Markdown and HTML are converted by BlockNote itself, so headings, lists,
 * to-dos, quotes, code and tables come through as real blocks. Word files are
 * first turned into HTML by the `mammoth` library. Pictures embedded in a file
 * are saved on the device like any other image. The converters are loaded only
 * when someone imports, so they don't slow down the app.
 */
import { saveAsset } from "../db/assets";
import { parseBackup, restoreBackup } from "../db/backup";
import { createPage } from "../db/pages";
import type { Page } from "../db/types";
import { blocksToPlainText } from "../editor/plainText";
import {
  htmlTitle,
  importKind,
  maxImportBytes,
  splitMarkdownTitle,
  textToBlocks,
  titleFromFileName,
  unsupportedReason,
} from "./fileTypes";

/** Pictures found inside PDFs and slide decks are saved on the device like uploaded images. */
const storeImage = (blob: Blob) => saveAsset(blob);

export interface ImportResult {
  pages: Page[];
  restoredPages: number;
  skipped: { name: string; reason: string }[];
}

type Converter = {
  tryParseMarkdownToBlocks: (markdown: string) => unknown[];
  tryParseHTMLToBlocks: (html: string) => unknown[];
};

let converter: Promise<Converter> | null = null;

/** A hidden editor (never shown) used only for its Markdown/HTML converters. */
function getConverter(): Promise<Converter> {
  converter ??= Promise.all([import("@blocknote/core"), import("@/components/editor/schema")]).then(
    ([{ BlockNoteEditor }, { schema }]) => BlockNoteEditor.create({ schema }) as unknown as Converter,
  );
  return converter;
}

/** Word (.docx) → HTML, with mammoth loaded only when needed. */
async function docxToHtml(file: File): Promise<string> {
  const mod = (await import("mammoth")) as unknown as {
    convertToHtml?: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    default?: { convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
  };
  const convertToHtml = mod.convertToHtml ?? mod.default!.convertToHtml;
  return (await convertToHtml({ arrayBuffer: await file.arrayBuffer() })).value;
}

type Json = Record<string, unknown>;

/** Saves pictures that are embedded inside the file (data: URLs) to the device, like uploaded images. */
async function storeEmbeddedImages(blocks: unknown[]): Promise<void> {
  for (const raw of blocks) {
    const block = raw as Json;
    const props = block.props as Json | undefined;
    if (block.type === "image" && typeof props?.url === "string" && props.url.startsWith("data:")) {
      try {
        props.url = await saveAsset(await (await fetch(props.url)).blob());
      } catch {
        props.url = ""; // unreadable picture: leave an empty image block rather than fail the import
      }
    }
    if (Array.isArray(block.children)) await storeEmbeddedImages(block.children);
  }
}

/** Drops a first heading that only repeats the page title. */
function withoutRepeatedTitle(blocks: unknown[], title: string): unknown[] {
  const first = blocks[0] as Json | undefined;
  return first?.type === "heading" && blocksToPlainText([first]).trim() === title.trim() ? blocks.slice(1) : blocks;
}

/** Reports progress, e.g. "Importing Lecture 5.pdf — page 3 of 40". */
export type ImportProgress = (message: string) => void;

/** Converts one file into a page title and editor blocks. */
async function convert(file: File, kind: Exclude<ReturnType<typeof importKind>, "backup" | null>, onProgress?: ImportProgress) {
  const fallbackTitle = titleFromFileName(file.name);
  const progress = (what: string) => (done: number, total: number) => onProgress?.(`Importing “${file.name}” — ${what} ${done} of ${total}`);
  if (kind === "text") return { title: fallbackTitle, blocks: textToBlocks(await file.text()) as unknown[] };
  if (kind === "pptx") {
    // Slides are shown as they look in PowerPoint. If a deck can't be drawn, fall back to its text.
    const data = await file.arrayBuffer();
    try {
      const { pptxToSlideImages } = await import("./pptxSlides"); // loaded only when a deck is imported
      const slides = await pptxToSlideImages(data, storeImage, progress("slide"));
      if (slides.length) return { title: fallbackTitle, blocks: slides as unknown[] };
    } catch (err) {
      console.warn("Couldn't draw the slides; importing their text instead.", err);
    }
    const { pptxToBlocks } = await import("./pptx");
    const deck = await pptxToBlocks(data, storeImage);
    return { title: deck.title ?? fallbackTitle, blocks: deck.blocks as unknown[] };
  }
  if (kind === "pdf") {
    // Every page is shown exactly as it looks in the PDF.
    const { pdfToBlocks, MAX_PDF_PAGES } = await import("./pdf"); // loaded only when a PDF is imported
    const pdf = await pdfToBlocks(await file.arrayBuffer(), storeImage, progress("page"));
    const blocks: unknown[] = pdf.blocks;
    if (pdf.truncated) blocks.push({ type: "paragraph", content: `(Only the first ${MAX_PDF_PAGES} pages were imported.)` });
    return { title: fallbackTitle, blocks };
  }
  const editor = await getConverter();
  if (kind === "markdown") {
    const { title, body } = splitMarkdownTitle(await file.text());
    return { title: title ?? fallbackTitle, blocks: editor.tryParseMarkdownToBlocks(body) };
  }
  const html = kind === "docx" ? await docxToHtml(file) : await file.text();
  const title = (kind === "html" ? htmlTitle(html) : null) ?? fallbackTitle;
  return { title, blocks: withoutRepeatedTitle(editor.tryParseHTMLToBlocks(html), title) };
}

/** Imports the chosen files, one new page per file (inside `parentId` if given). */
export async function importFiles(
  files: File[],
  parentId: string | null = null,
  onProgress?: ImportProgress,
): Promise<ImportResult> {
  const result: ImportResult = { pages: [], restoredPages: 0, skipped: [] };

  for (const file of files) {
    onProgress?.(`Importing “${file.name}”…`);
    const kind = importKind(file.name, file.type);
    if (!kind) {
      result.skipped.push({ name: file.name, reason: unsupportedReason(file.name) });
      continue;
    }
    if (file.size > maxImportBytes(kind)) {
      result.skipped.push({ name: file.name, reason: `it's larger than ${maxImportBytes(kind) / 1024 / 1024} MB` });
      continue;
    }
    try {
      if (kind === "backup") {
        result.restoredPages += (await restoreBackup(parseBackup(await file.text()))).pages;
        continue;
      }
      const { title, blocks } = await convert(file, kind, onProgress);
      if (blocks.length === 0) {
        result.skipped.push({ name: file.name, reason: "it's empty" });
        continue;
      }
      await storeEmbeddedImages(blocks);
      result.pages.push(
        await createPage({ parentId, title, icon: "📄", blocks, plainText: blocksToPlainText(blocks) }),
      );
    } catch (err) {
      const reason = kind === "backup" && err instanceof Error ? err.message : "it couldn't be read";
      result.skipped.push({ name: file.name, reason });
    }
  }
  return result;
}

/** A short, friendly summary for the toast after importing. */
export function describeImport(r: ImportResult): string {
  const parts: string[] = [];
  if (r.pages.length) parts.push(`Imported ${r.pages.length} page${r.pages.length === 1 ? "" : "s"}`);
  if (r.restoredPages) parts.push(`restored ${r.restoredPages} page${r.restoredPages === 1 ? "" : "s"} from a backup`);
  if (r.skipped.length) {
    const first = r.skipped[0];
    parts.push(
      r.skipped.length === 1
        ? `skipped “${first.name}” because ${first.reason}`
        : `skipped ${r.skipped.length} files (e.g. “${first.name}”: ${first.reason})`,
    );
  }
  const text = parts.join("; ") || "Nothing was imported";
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}
