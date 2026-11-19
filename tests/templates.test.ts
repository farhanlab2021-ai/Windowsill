import { describe, expect, it } from "vitest";
import { daysUntil } from "@/lib/dates";
import { createPage, getContent, getPage } from "@/lib/db/pages";
import type { BlockJson } from "@/lib/templates/blocks";
import { applyTemplateToPage, createPageFromTemplate, renderTemplate, TEMPLATES } from "@/lib/templates";

/** Block types the editor knows (see components/editor/schema.tsx). */
const KNOWN_BLOCKS = new Set([
  "paragraph", "heading", "bulletListItem", "numberedListItem", "checkListItem", "toggleListItem",
  "quote", "callout", "codeBlock", "divider", "image", "table",
]);

function allBlocks(blocks: BlockJson[]): BlockJson[] {
  return blocks.flatMap((b) => [b, ...allBlocks(b.children ?? [])]);
}

function dateChips(blocks: BlockJson[]): string[] {
  return JSON.stringify(blocks).match(/"date":"\d{4}-\d{2}-\d{2}"/g)?.map((m) => m.slice(8, 18)) ?? [];
}

const today = new Date(2026, 10, 19);

describe("student templates", () => {
  it("offers the five templates", () => {
    expect(TEMPLATES.map((t) => t.name)).toEqual([
      "Class Notes", "Assignment Tracker", "Exam Planner", "Weekly Timetable", "Reading List",
    ]);
  });

  it.each(TEMPLATES)("$name only uses blocks the editor supports, with tidy tables", (template) => {
    const { blocks } = template.build(today);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of allBlocks(blocks)) {
      expect(KNOWN_BLOCKS.has(block.type), block.type).toBe(true);
      if (block.type === "table" && block.content && !Array.isArray(block.content)) {
        const [header, ...rows] = block.content.rows;
        for (const row of rows) expect(row.cells).toHaveLength(header.cells.length);
      }
    }
  });

  it("puts dates relative to today", () => {
    const tracker = TEMPLATES.find((t) => t.id === "assignment-tracker")!;
    const days = dateChips(tracker.build(today).blocks).map((d) => daysUntil(d, today));
    expect(days).toEqual([2, 6, 13, -1]);

    const exams = TEMPLATES.find((t) => t.id === "exam-planner")!;
    expect(dateChips(exams.build(today).blocks).every((d) => daysUntil(d, today) > 0)).toBe(true);
  });

  it("produces searchable text", () => {
    const classNotes = renderTemplate(TEMPLATES[0], today);
    expect(classNotes.plainText).toContain("Questions to ask");
    expect(classNotes.plainText).toContain("2026-11-19"); // the date chip
  });

  it("creates a page from a template", async () => {
    const page = await createPageFromTemplate(TEMPLATES[2]);
    expect(page).toMatchObject({ title: "Exam Planner", icon: "📚", templateId: "exam-planner" });
    expect((await getContent(page.id))?.plainText).toContain("Syllabus checklist");
  });

  it("fills an empty page but keeps its own title and icon", async () => {
    const page = await createPage({ title: "CHEM 201 lecture", icon: "🧪" });
    await applyTemplateToPage(page, TEMPLATES[0]);
    expect(await getPage(page.id)).toMatchObject({
      title: "CHEM 201 lecture",
      icon: "🧪",
      cover: "gradient:sage",
      templateId: "class-notes",
    });
    expect((await getContent(page.id))?.blocks.length).toBeGreaterThan(5);
  });
});
