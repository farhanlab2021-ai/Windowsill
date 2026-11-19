/**
 * PDF → page blocks, in the browser, using Mozilla's pdf.js (the PDF reader
 * built into Firefox). pdf.js and its background worker (served from
 * /pdfjs/pdf.worker.min.mjs, copied there by scripts/copy-emoji.mjs) load only
 * when someone imports a PDF.
 *
 * Pages with selectable text → headings, paragraphs and lists (see pdfText.ts).
 * Pages without text (scanned paper, photos) → the page as a picture, so
 * nothing is lost. Pages are separated by a divider.
 */
import { cleanPdfTitle, pdfItemsToBlocks, type PdfTextItem } from "./pdfText";

/** Very long PDFs are cut off here, so a 1000-page book doesn't freeze the phone. */
export const MAX_PDF_PAGES = 300;
/** At most this many pages are turned into pictures (they take far more space than text). */
export const MAX_PDF_PAGE_IMAGES = 60;

type Block = { type: string; props?: Record<string, unknown>; content?: string };

export interface PdfResult {
  title: string | null;
  blocks: Block[];
  /** True if the PDF had more pages than were imported. */
  truncated: boolean;
}

/** Draws one page onto a canvas and returns it as a JPEG. */
async function renderPage(
  page: { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: unknown) => { promise: Promise<void> } },
): Promise<Blob | null> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2, 1400 / base.width); // sharp enough to read, small enough to store
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvas, viewport }).promise;
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

export async function pdfToBlocks(
  data: ArrayBuffer,
  storeImage: (blob: Blob) => Promise<string | null>,
): Promise<PdfResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  const loading = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await loading.promise;

  let title: string | null = null;
  try {
    const meta = await doc.getMetadata();
    title = cleanPdfTitle((meta.info as Record<string, unknown> | undefined)?.Title);
  } catch {
    // no metadata: the file name is used instead
  }

  const blocks: Block[] = [];
  const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
  let images = 0;

  for (let n = 1; n <= pageCount; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = [];
    for (const it of content.items) {
      if (!("str" in it)) continue;
      const [a, b, , , x, y] = it.transform as number[];
      items.push({ str: it.str, x, y, size: it.height || Math.hypot(a, b), width: it.width });
    }

    let pageBlocks: Block[] = pdfItemsToBlocks(items);
    if (pageBlocks.length === 0 && images < MAX_PDF_PAGE_IMAGES) {
      const blob = await renderPage(page as never);
      const url = blob ? await storeImage(blob) : null;
      if (url) {
        images++;
        pageBlocks = [{ type: "image", props: { url, caption: `Page ${n}` } }];
      }
    }
    if (pageBlocks.length === 0) continue;
    if (blocks.length) blocks.push({ type: "divider" });
    blocks.push(...pageBlocks);
    page.cleanup();
  }

  // The first heading usually names the document when there's no metadata title.
  title ??= (blocks.find((b) => b.type === "heading")?.content as string | undefined) ?? null;
  const truncated = doc.numPages > MAX_PDF_PAGES;
  await loading.destroy(); // frees the worker's memory
  return { title, blocks, truncated };
}
