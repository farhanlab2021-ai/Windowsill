import { describe, expect, it } from "vitest";
import { blocksToPlainText } from "@/lib/editor/plainText";

describe("blocksToPlainText", () => {
  it("extracts text from paragraphs, links, nested blocks and tables", () => {
    const blocks = [
      {
        type: "heading",
        content: [{ type: "text", text: "Lecture 3" }],
        children: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "See " },
          { type: "link", href: "https://x", content: [{ type: "text", text: "notes" }] },
        ],
      },
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: [[{ type: "text", text: "Essay" }], { type: "tableCell", content: [{ type: "text", text: "Due" }] }] },
          ],
        },
      },
      { type: "image", props: { caption: "diagram" } },
      { type: "divider" },
    ];

    expect(blocksToPlainText(blocks)).toBe("Lecture 3\nnested\nSee notes\nEssay | Due\ndiagram");
  });

  it("includes the hidden words of imported PDF pages and slides", () => {
    expect(blocksToPlainText([{ type: "docPage", props: { url: "asset:x", label: "Page 1", text: "Iron carbide diagram" } }])).toBe(
      "Iron carbide diagram",
    );
  });

  it("ignores junk safely", () => {
    expect(blocksToPlainText([null, 3, "x", {}])).toBe("");
  });
});
