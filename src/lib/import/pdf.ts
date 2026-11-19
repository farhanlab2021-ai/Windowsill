/**
 * PDF → page blocks, in the browser, using Mozilla's pdf.js (the PDF reader
 * built into Firefox). pdf.js and its background worker (served from
 * /pdfjs/pdf.worker.min.mjs, copied there by scripts/copy-emoji.mjs) load only
 * when someone imports a PDF.
 *
 * Every page is drawn exactly as it looks in the PDF and saved as a picture
 * (a "docPage" block), like a PDF viewer. The page's words are kept with it,
 * hidden, so search still finds them.
 */
import { itemsToLines, type PdfTextItem } from "./pdfText";

/** Very long PDFs are cut off here, so a 1000-page book doesn't fill the phone. */
export const MAX_PDF_PAGES = 300;
/** Pictures are drawn about this wide: sharp on phones and laptops, ~100–250 KB a page. */
const TARGET_WIDTH = 1240;

export type DocPageBlock = {
  type: "docPage";
  props: { url: string; label: string; text: string; aspect: number };
};

export interface PdfResult {
  blocks: DocPageBlock[];
  /** True if the PDF had more pages than were imported. */
  truncated: boolean;
}

type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: unknown) => { promise: Promise<void> };
};

/** Draws one page onto a canvas and returns it as a JPEG. */
async function renderPage(page: PdfPage): Promise<{ blob: Blob | null; aspect: number }> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, TARGET_WIDTH / base.width);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // PDFs assume white paper; transparent areas would turn black in a JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // intent "print" draws straight through instead of waiting for the screen to refresh, so the
  // import keeps going even if the tab is in the background (e.g. the student switches apps).
  await page.render({ canvas, viewport, intent: "print" }).promise;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  canvas.width = canvas.height = 0; // free the memory straight away (matters on phones)
  return { blob, aspect: base.width / base.height };
}

export async function pdfToBlocks(
  data: ArrayBuffer,
  storeImage: (blob: Blob) => Promise<string | null>,
  onProgress?: (done: number, total: number) => void,
): Promise<PdfResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  const loading = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await loading.promise;

  const blocks: DocPageBlock[] = [];
  const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);

  for (let n = 1; n <= pageCount; n++) {
    onProgress?.(n, pageCount);
    const page = await doc.getPage(n);

    // The page's words, for search.
    const content = await page.getTextContent();
    const items: PdfTextItem[] = [];
    for (const it of content.items) {
      if (!("str" in it)) continue;
      const [a, b, , , x, y] = it.transform as number[];
      items.push({ str: it.str, x, y, size: it.height || Math.hypot(a, b), width: it.width });
    }
    const text = itemsToLines(items).map((l) => l.text).join("\n");

    const { blob, aspect } = await renderPage(page as unknown as PdfPage);
    const url = blob ? await storeImage(blob) : null;
    if (url) blocks.push({ type: "docPage", props: { url, label: `Page ${n}`, text, aspect } });
    page.cleanup();
  }

  const truncated = doc.numPages > MAX_PDF_PAGES;
  await loading.destroy(); // frees the worker's memory
  return { blocks, truncated };
}
