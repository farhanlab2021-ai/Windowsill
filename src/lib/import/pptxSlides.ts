/**
 * PowerPoint (.pptx) → one picture per slide, showing each slide as it looks
 * in PowerPoint (layout, colours, shapes, pictures, charts).
 *
 * Browsers can't open .pptx files themselves, so the free `pptx-preview`
 * library draws the slides into a hidden part of the page, and `html-to-image`
 * turns each drawn slide into a JPEG that is saved on the device. Both load
 * only when a PowerPoint is imported. Each slide's words are kept with it so
 * search still finds them.
 *
 * Fonts: slides use the fonts installed on the device doing the import, so a
 * deck made with an unusual font may look slightly different (as in any
 * PowerPoint viewer).
 */
import type { DocPageBlock } from "./pdf";
import { openDeck, slideTexts, withoutMissingParts } from "./pptx";

/** Slides are drawn this wide (in CSS pixels) and saved at 1.5×: sharp but not huge. */
const SLIDE_WIDTH = 960;

/** Waits until every picture inside `root` has loaded (or failed). */
async function imagesLoaded(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          }),
    ),
  );
}

export async function pptxToSlideImages(
  data: ArrayBuffer,
  storeImage: (blob: Blob) => Promise<string | null>,
  onProgress?: (done: number, total: number) => void,
): Promise<DocPageBlock[]> {
  const [{ init }, { toBlob }] = await Promise.all([import("pptx-preview"), import("html-to-image")]);
  const { aspect } = await openDeck(data.slice(0));
  const texts = await slideTexts(data.slice(0));
  const height = Math.round(SLIDE_WIDTH / aspect);

  // A stage on the page but invisible and behind everything: the library only draws slides that
  // are actually laid out on screen, and they must be drawn to be photographed.
  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  Object.assign(stage.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${SLIDE_WIDTH}px`,
    height: `${height}px`,
    opacity: "0",
    zIndex: "-1",
    pointerEvents: "none",
    overflow: "hidden",
  });
  document.body.appendChild(stage);

  try {
    // "slide" mode shows one slide at a time; we draw each in turn and photograph it.
    const previewer = init(stage, { width: SLIDE_WIDTH, height, mode: "slide" });
    await previewer.load(await withoutMissingParts(data.slice(0)));
    const count = previewer.slideCount;
    if (!count) throw new Error("No slides found");

    const blocks: DocPageBlock[] = [];
    for (let i = 0; i < count; i++) {
      onProgress?.(i + 1, count);
      previewer.removeCurrentSlide();
      previewer.renderSingleSlide(i);
      const slide = stage.querySelector<HTMLElement>(".pptx-preview-slide-wrapper");
      if (!slide) throw new Error("A slide wasn't drawn");
      await imagesLoaded(slide);
      await new Promise((r) => setTimeout(r, 120)); // let charts finish drawing
      const blob = await toBlob(slide, {
        width: SLIDE_WIDTH,
        height,
        pixelRatio: 1.5,
        backgroundColor: "#ffffff",
        type: "image/jpeg",
        quality: 0.88,
        style: { margin: "0", opacity: "1" },
      });
      const url = blob ? await storeImage(blob) : null;
      if (url) blocks.push({ type: "docPage", props: { url, label: `Slide ${i + 1}`, text: texts[i] ?? "", aspect } });
    }
    previewer.destroy();
    return blocks;
  } finally {
    stage.remove();
  }
}
