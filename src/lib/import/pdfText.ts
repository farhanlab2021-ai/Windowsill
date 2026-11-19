/**
 * Turns the text pieces pdf.js finds on a PDF page into page blocks.
 *
 * A PDF has no paragraphs or headings, only bits of text at positions. So we
 * rebuild them: pieces at the same height form a line, lines close together
 * form a paragraph, and noticeably bigger text becomes a heading. Lines that
 * start with "•", "-" or "1." become list items. Pure function: easy to test.
 */

export interface PdfTextItem {
  str: string;
  /** Left edge, in PDF units. */
  x: number;
  /** Baseline height from the bottom of the page (PDF y grows upwards). */
  y: number;
  /** Font size (text height). */
  size: number;
  /** Text width. */
  width: number;
}

type Block = { type: string; props?: Record<string, unknown>; content: string };

interface Line {
  text: string;
  y: number;
  size: number;
}

/** Groups text pieces into lines, top of the page first. */
export function itemsToLines(items: PdfTextItem[]): Line[] {
  const pieces = items.filter((i) => i.str.trim() || i.str === " ").sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; size: number; items: PdfTextItem[] }[] = [];
  for (const item of pieces) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= Math.max(l.size, item.size) * 0.4);
    if (line) {
      line.items.push(item);
      line.size = Math.max(line.size, item.size);
    } else lines.push({ y: item.y, size: item.size, items: [item] });
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((l) => {
      const sorted = l.items.sort((a, b) => a.x - b.x);
      let text = "";
      let end = -Infinity;
      for (const it of sorted) {
        // Add a space where there's a visible gap and the pieces don't already have one.
        const gap = it.x - end;
        if (text && gap > l.size * 0.15 && !text.endsWith(" ") && !it.str.startsWith(" ")) text += " ";
        text += it.str;
        end = it.x + it.width;
      }
      return { text: text.replace(/\s+/g, " ").trim(), y: l.y, size: l.size };
    })
    .filter((l) => l.text);
}

const BULLET = /^[•◦▪▫‣●○■□\-–*]\s+/;
const NUMBERED = /^\d{1,3}[.)]\s+/;

/** One page's text pieces → headings, paragraphs and list items. */
export function pdfItemsToBlocks(items: PdfTextItem[]): Block[] {
  const lines = itemsToLines(items);
  if (lines.length === 0) return [];
  const sizes = lines.map((l) => l.size).sort((a, b) => a - b);
  const body = sizes[Math.floor(sizes.length / 2)]; // the most typical text size

  const blocks: Block[] = [];
  let paragraph: Line[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", content: joinLines(paragraph.map((l) => l.text)) });
    paragraph = [];
  };

  for (const line of lines) {
    const prev = paragraph.at(-1);
    if (line.size >= body * 1.25 && line.text.length <= 120) {
      flush();
      // Merge a heading that wraps onto a second line.
      const last = blocks.at(-1);
      if (last?.type === "heading" && Math.abs((last.props!.size as number) - line.size) < 0.5) last.content += ` ${line.text}`;
      else blocks.push({ type: "heading", props: { level: line.size >= body * 1.7 ? 2 : 3, size: line.size }, content: line.text });
      continue;
    }
    if (BULLET.test(line.text) || NUMBERED.test(line.text)) {
      flush();
      const numbered = NUMBERED.test(line.text);
      blocks.push({
        type: numbered ? "numberedListItem" : "bulletListItem",
        content: line.text.replace(numbered ? NUMBERED : BULLET, ""),
      });
      continue;
    }
    // A big vertical gap starts a new paragraph.
    if (prev && prev.y - line.y > Math.max(prev.size, line.size) * 1.7) flush();
    paragraph.push(line);
  }
  flush();
  // `size` was only needed while merging headings.
  for (const b of blocks) if (b.props) delete b.props.size;
  return blocks;
}

/** Joins wrapped lines into one paragraph, re-joining words split with a hyphen. */
export function joinLines(lines: string[]): string {
  return lines.reduce((text, line) => (!text ? line : /[a-z]-$/i.test(text) ? text.slice(0, -1) + line : `${text} ${line}`), "");
}

/** PDF "Title" metadata is often junk like "Microsoft Word - essay.docx"; tidy it or drop it. */
export function cleanPdfTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw.replace(/^Microsoft (Word|PowerPoint) - /, "").replace(/\.(docx?|pptx?|pdf)$/i, "").trim();
  return title && !/^untitled$/i.test(title) ? title : null;
}
