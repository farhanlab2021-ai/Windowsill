import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { cleanPdfTitle, joinLines, pdfItemsToBlocks, type PdfTextItem } from "@/lib/import/pdfText";
import { parseSlideXml, pptxToBlocks, resolvePath } from "@/lib/import/pptx";

// ---------------------------------------------------------------------------
// PowerPoint
// ---------------------------------------------------------------------------

const ns = 'xmlns:a="a" xmlns:p="p" xmlns:r="r"';
const sp = (inner: string, ph = "") => `<p:sp><p:nvSpPr><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:txBody>${inner}</p:txBody></p:sp>`;
const para = (text: string, lvl?: number) => `<a:p>${lvl ? `<a:pPr lvl="${lvl}"/>` : ""}<a:r><a:t>${text}</a:t></a:r></a:p>`;

const slide1 = `<p:sld ${ns}><p:cSld><p:spTree>
  ${sp(para("Cell biology"), '<p:ph type="ctrTitle"/>')}
  ${sp(para("Lecture 3 &amp; 4"))}
  ${sp(para("4"), '<p:ph type="sldNum"/>')}
</p:spTree></p:cSld></p:sld>`;

const slide2 = `<p:sld ${ns}><p:cSld><p:spTree>
  ${sp(para("Organelles"), '<p:ph type="title"/>')}
  ${sp(para("Nucleus") + para("Holds DNA", 1) + para("Mitochondria"))}
  <p:pic><p:blipFill><a:blip r:embed="rId2"/></p:blipFill></p:pic>
  <p:graphicFrame><a:tbl><a:tr><a:tc>${para("Part")}</a:tc><a:tc>${para("Job")}</a:tc></a:tr><a:tr><a:tc>${para("Ribosome")}</a:tc><a:tc>${para("Makes proteins")}</a:tc></a:tr></a:tbl></p:graphicFrame>
</p:spTree></p:cSld></p:sld>`;

async function makePptx(): Promise<Uint8Array> {
  const zip = new JSZip();
  // The deck lists slide2.xml FIRST, so file numbers must not decide the order.
  zip.file("ppt/presentation.xml", `<p:presentation ${ns}><p:sldIdLst><p:sldId id="256" r:id="rId8"/><p:sldId id="257" r:id="rId7"/></p:sldIdLst></p:presentation>`);
  zip.file("ppt/_rels/presentation.xml.rels", `<Relationships><Relationship Id="rId7" Target="slides/slide1.xml"/><Relationship Id="rId8" Target="slides/slide2.xml"/></Relationships>`);
  zip.file("ppt/slides/slide1.xml", slide1);
  zip.file("ppt/slides/slide2.xml", slide2);
  zip.file("ppt/slides/_rels/slide2.xml.rels", `<Relationships><Relationship Id="rId2" Target="../media/image1.png"/><Relationship Id="rId3" Target="../notesSlides/notesSlide2.xml"/></Relationships>`);
  zip.file("ppt/notesSlides/notesSlide2.xml", `<p:notes ${ns}>${sp(para("2"), '<p:ph type="sldNum"/>')}${sp(para("Mention the exam question"), '<p:ph type="body"/>')}</p:notes>`);
  zip.file("ppt/media/image1.png", new Uint8Array([137, 80, 78, 71]));
  return zip.generateAsync({ type: "uint8array" });
}

describe("PowerPoint import", () => {
  it("reads a slide's title, text and pictures, skipping the slide number", () => {
    expect(parseSlideXml(slide1)).toEqual({
      title: "Cell biology",
      paragraphs: [{ text: "Lecture 3 & 4", level: 0 }],
      imageRelIds: [],
    });
    const s2 = parseSlideXml(slide2);
    expect(s2.paragraphs.map((p) => `${p.level}:${p.text}`)).toEqual([
      "0:Nucleus", "1:Holds DNA", "0:Mitochondria", "0:Part | Job", "0:Ribosome | Makes proteins",
    ]);
    expect(s2.imageRelIds).toEqual(["rId2"]);
  });

  it("resolves paths inside the file", () => {
    expect(resolvePath("ppt/slides/slide2.xml", "../media/image1.png")).toBe("ppt/media/image1.png");
    expect(resolvePath("ppt/presentation.xml", "slides/slide1.xml")).toBe("ppt/slides/slide1.xml");
  });

  it("converts a whole deck in presentation order, with nested bullets, pictures and notes", async () => {
    const stored: Blob[] = [];
    const { title, blocks } = await pptxToBlocks(await makePptx(), async (blob) => {
      stored.push(blob);
      return "asset:test-image";
    });
    expect(title).toBe("Organelles"); // the first slide in presentation order
    expect(blocks.map((b) => `${b.type}:${typeof b.content === "string" ? b.content : ""}`)).toEqual([
      "heading:Slide 1: Organelles",
      "bulletListItem:Nucleus",
      "bulletListItem:Mitochondria",
      "bulletListItem:Part | Job",
      "bulletListItem:Ribosome | Makes proteins",
      "image:",
      "quote:Speaker notes: Mention the exam question",
      "heading:Slide 2: Cell biology",
      "bulletListItem:Lecture 3 & 4",
    ]);
    expect(blocks[1].children?.map((c) => c.content)).toEqual(["Holds DNA"]);
    expect(blocks[5].props).toEqual({ url: "asset:test-image" });
    expect(stored[0].type).toBe("image/png");
  });
});

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const item = (str: string, x: number, y: number, size = 11, width = str.length * size * 0.5): PdfTextItem => ({ str, x, y, size, width });

describe("PDF text import", () => {
  it("rebuilds headings, paragraphs and list items from positioned text", () => {
    const blocks = pdfItemsToBlocks([
      item("Week 5: Thermodynamics", 72, 760, 20),
      item("Energy cannot be created", 72, 720),
      item("or destroyed.", 210, 720), // same line, second piece
      item("It only changes form.", 72, 706),
      item("Key laws", 72, 670, 14),
      item("• First law: conservation", 72, 650),
      item("2. Second law: entropy rises", 72, 636),
      item("A new paragraph after a gap.", 72, 600),
    ]);
    expect(blocks).toEqual([
      { type: "heading", props: { level: 2 }, content: "Week 5: Thermodynamics" },
      { type: "paragraph", content: "Energy cannot be created or destroyed. It only changes form." },
      { type: "heading", props: { level: 3 }, content: "Key laws" },
      { type: "bulletListItem", content: "First law: conservation" },
      { type: "numberedListItem", content: "Second law: entropy rises" },
      { type: "paragraph", content: "A new paragraph after a gap." },
    ]);
  });

  it("returns nothing for a page without text (a scanned page)", () => {
    expect(pdfItemsToBlocks([])).toEqual([]);
    expect(pdfItemsToBlocks([item("   ", 10, 10)])).toEqual([]);
  });

  it("re-joins words split across lines with a hyphen", () => {
    expect(joinLines(["The mito-", "chondria is", "here."])).toBe("The mitochondria is here.");
  });

  it("tidies PDF titles", () => {
    expect(cleanPdfTitle("Microsoft Word - Essay plan.docx")).toBe("Essay plan");
    expect(cleanPdfTitle("untitled")).toBeNull();
    expect(cleanPdfTitle(undefined)).toBeNull();
    expect(cleanPdfTitle("Lecture 5 slides")).toBe("Lecture 5 slides");
  });
});
