/**
 * Groups the text pieces pdf.js finds on a PDF page into lines, top of the
 * page first. Used to keep each imported page's words for search. Pure
 * function: easy to test.
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

export interface PdfLine {
  text: string;
  y: number;
  size: number;
}

/** Pieces at the same height form a line; lines are returned top to bottom. */
export function itemsToLines(items: PdfTextItem[]): PdfLine[] {
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
