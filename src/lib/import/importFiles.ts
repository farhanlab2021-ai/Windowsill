/**
 * Imports files as new pages: Markdown, plain text, web pages (HTML) and Word
 * documents (.docx). A Windowsill backup file (.json) is restored instead.
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
import { htmlTitle, importKind, MAX_IMPORT_BYTES, splitMarkdownTitle, textToBlocks, titleFromFileName } from "./fileTypes";

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

/** Converts one file into a page title and editor blocks. */
async function convert(file: File, kind: Exclude<ReturnType<typeof importKind>, "backup" | null>) {
  const fallbackTitle = titleFromFileName(file.name);
  if (kind === "text") return { title: fallbackTitle, blocks: textToBlocks(await file.text()) as unknown[] };
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
export async function importFiles(files: File[], parentId: string | null = null): Promise<ImportResult> {
  const result: ImportResult = { pages: [], restoredPages: 0, skipped: [] };

  for (const file of files) {
    const kind = importKind(file.name, file.type);
    if (!kind) {
      result.skipped.push({ name: file.name, reason: "this file type isn't supported" });
      continue;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      result.skipped.push({ name: file.name, reason: "it's larger than 10 MB" });
      continue;
    }
    try {
      if (kind === "backup") {
        result.restoredPages += (await restoreBackup(parseBackup(await file.text()))).pages;
        continue;
      }
      const { title, blocks } = await convert(file, kind);
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
