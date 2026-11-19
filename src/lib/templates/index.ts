/**
 * The student templates, in the order they're shown.
 * To add one: create a file like classNotes.ts and add it to this list.
 */
import { gradientCoverValue } from "../covers";
import { createPage, saveContent, updatePage } from "../db/pages";
import type { Page } from "../db/types";
import { blocksToPlainText } from "../editor/plainText";
import { assignmentTracker } from "./assignmentTracker";
import { classNotes } from "./classNotes";
import { examPlanner } from "./examPlanner";
import { readingList } from "./readingList";
import type { Template } from "./types";
import { weeklyTimetable } from "./weeklyTimetable";

export type { Template };

export const TEMPLATES: Template[] = [classNotes, assignmentTracker, examPlanner, weeklyTimetable, readingList];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** What a template turns into: everything needed to fill a page. */
export function renderTemplate(template: Template, today = new Date()) {
  const { title, blocks } = template.build(today);
  return {
    title,
    icon: template.icon,
    cover: gradientCoverValue(template.cover),
    templateId: template.id,
    blocks,
    plainText: blocksToPlainText(blocks),
  };
}

/** Creates a new page from a template. */
export function createPageFromTemplate(template: Template, parentId: string | null = null): Promise<Page> {
  return createPage({ parentId, ...renderTemplate(template) });
}

/**
 * Fills an existing (empty) page with a template. Keeps the page's own title,
 * icon and cover if the student already set them.
 */
export async function applyTemplateToPage(page: Page, template: Template): Promise<unknown[]> {
  const t = renderTemplate(template);
  await saveContent(page.id, t.blocks, t.plainText);
  await updatePage(page.id, {
    title: page.title || t.title,
    icon: page.icon ?? t.icon,
    cover: page.cover ?? t.cover,
    templateId: t.templateId,
  });
  return t.blocks;
}
