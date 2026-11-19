/**
 * Small, pure helpers for importing files (no browser or editor needed, so
 * they're easy to test): which kind of file is it, what should the page be
 * called, and how plain text becomes paragraphs.
 */

export type ImportKind = "markdown" | "text" | "html" | "docx" | "backup";

/** Files bigger than this are skipped (a note this large is almost certainly not a note). */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

/**
 * What the file picker offers. File types (text/*, the Word type) are listed
 * as well as extensions, because iPhones sometimes grey out ".md" files when
 * only extensions are given.
 */
export const IMPORT_ACCEPT = [
  ".md,.markdown,.txt,.html,.htm,.docx,.json",
  "text/*,application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

/** Decides how to read a file, from its name (and type as a fallback). Null = not supported. */
export function importKind(name: string, mimeType = ""): ImportKind | null {
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "txt" || ext === "text") return "text";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "docx") return "docx";
  if (ext === "json") return "backup";
  if (mimeType === "text/markdown") return "markdown";
  if (mimeType === "text/html") return "html";
  if (mimeType.startsWith("text/")) return "text";
  return null;
}

/** "Lecture 3 - Cells.md" → "Lecture 3 - Cells"; "my_notes_v2.txt" → "my notes v2". */
export function titleFromFileName(name: string): string {
  const base = name.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "");
  const spaced = base.includes(" ") ? base : base.replace(/[_]+/g, " ");
  return spaced.trim() || "Imported note";
}

/**
 * Markdown often starts with optional "front matter" (--- … ---) and a
 * "# Title" line. Returns that title (if any) and the rest, so the title
 * becomes the page title instead of a duplicate heading.
 */
export function splitMarkdownTitle(markdown: string): { title: string | null; body: string } {
  let text = markdown.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  text = text.replace(/^---\n[\s\S]*?\n---\n/, ""); // front matter
  const match = text.match(/^\s*#\s+(.+?)\s*#*\s*(?:\n|$)/);
  if (!match) return { title: null, body: text };
  return { title: match[1].trim(), body: text.slice(match[0].length).replace(/^\n+/, "") };
}

/** Plain text → one paragraph per line; blank lines between groups are kept as one empty line. */
export function textToBlocks(text: string): { type: "paragraph"; content: string }[] {
  const lines = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: { type: "paragraph"; content: string }[] = [];
  for (const line of lines) {
    const content = line.replace(/\s+$/, "");
    if (!content && (blocks.length === 0 || blocks.at(-1)!.content === "")) continue;
    blocks.push({ type: "paragraph", content });
  }
  while (blocks.length && blocks.at(-1)!.content === "") blocks.pop();
  return blocks;
}

/** The <title> or first <h1> of an HTML document, if it has one. */
export function htmlTitle(html: string): string | null {
  const pick = (re: RegExp) => html.match(re)?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() || null;
  return pick(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
}
