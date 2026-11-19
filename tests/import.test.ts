import { describe, expect, it } from "vitest";
import { getAllPages, getContent } from "@/lib/db/pages";
import { htmlTitle, importKind, splitMarkdownTitle, textToBlocks, titleFromFileName } from "@/lib/import/fileTypes";
import { describeImport, importFiles } from "@/lib/import/importFiles";

describe("importFiles (plain text, no editor needed)", () => {
  it("creates one page per text file and skips unsupported or empty files", async () => {
    const files = [
      new File(["First line\nSecond line"], "Week 1 notes.txt", { type: "text/plain" }),
      new File(["\n\n"], "empty.txt", { type: "text/plain" }),
      new File(["x"], "photo.png", { type: "image/png" }),
    ];
    const result = await importFiles(files);
    expect(result.pages.map((p) => p.title)).toEqual(["Week 1 notes"]);
    expect(result.skipped.map((s) => s.name)).toEqual(["empty.txt", "photo.png"]);
    expect((await getContent(result.pages[0].id))?.plainText).toBe("First line\nSecond line");
    expect((await getAllPages()).length).toBe(1);
    expect(describeImport(result)).toBe("Imported 1 page; skipped 2 files (e.g. “empty.txt”: it's empty).");
  });

  it("restores a Windowsill backup file instead of making a page", async () => {
    const backup = { app: "windowsill", version: 1, pages: [], contents: [] };
    const result = await importFiles([new File([JSON.stringify(backup)], "windowsill-backup.json")]);
    expect(result).toMatchObject({ pages: [], restoredPages: 0, skipped: [] });
  });

  it("explains a JSON file that isn't a backup", async () => {
    const result = await importFiles([new File(["{}"], "settings.json")]);
    expect(result.skipped[0].reason).toMatch(/isn't a Windowsill backup/);
  });
});

describe("file import helpers", () => {
  it("recognises the supported file types", () => {
    expect(importKind("notes.md")).toBe("markdown");
    expect(importKind("Notes.MARKDOWN")).toBe("markdown");
    expect(importKind("list.txt")).toBe("text");
    expect(importKind("page.htm")).toBe("html");
    expect(importKind("Essay.docx")).toBe("docx");
    expect(importKind("windowsill-backup-2026-11-20.json")).toBe("backup");
    expect(importKind("no-extension", "text/plain")).toBe("text");
    expect(importKind("photo.png", "image/png")).toBeNull();
    expect(importKind("old.doc")).toBeNull();
  });

  it("makes a page title from the file name", () => {
    expect(titleFromFileName("Lecture 3 - Cells.md")).toBe("Lecture 3 - Cells");
    expect(titleFromFileName("my_notes_v2.txt")).toBe("my notes v2");
    expect(titleFromFileName("C:\\Users\\me\\Desktop\\Essay.docx")).toBe("Essay");
    expect(titleFromFileName(".md")).toBe("Imported note");
  });

  it("uses a Markdown '# Title' as the page title, skipping front matter", () => {
    expect(splitMarkdownTitle("# Biology 101\n\n- cells\n")).toEqual({ title: "Biology 101", body: "- cells\n" });
    expect(splitMarkdownTitle("---\ntags: [bio]\n---\n# Cells #\nText")).toEqual({ title: "Cells", body: "Text" });
    expect(splitMarkdownTitle("## Not a title\nText").title).toBeNull();
    expect(splitMarkdownTitle("Plain start\n# Later heading").title).toBeNull();
  });

  it("turns plain text into paragraphs, collapsing extra blank lines", () => {
    expect(textToBlocks("Line one\r\nLine two\n\n\n\nAfter gap\n\n")).toEqual([
      { type: "paragraph", content: "Line one" },
      { type: "paragraph", content: "Line two" },
      { type: "paragraph", content: "" },
      { type: "paragraph", content: "After gap" },
    ]);
    expect(textToBlocks("\n\n")).toEqual([]);
  });

  it("finds an HTML page's title", () => {
    expect(htmlTitle("<html><head><title> My  notes </title></head></html>")).toBe("My notes");
    expect(htmlTitle("<body><h1>Week <b>3</b></h1></body>")).toBe("Week 3");
    expect(htmlTitle("<p>none</p>")).toBeNull();
  });
});
