"use client";

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import { getDefaultReactSlashMenuItems, type DefaultReactSuggestionItem } from "@blocknote/react";
import { CalendarDays, Lightbulb } from "lucide-react";
import { createCalloutBlock } from "./blocks/Callout";
import { DateChip, todayDateChip } from "./inline/DateChip";

/**
 * Which blocks the editor offers. We start from BlockNote's defaults, drop
 * audio/video/file blocks (big files don't belong in offline notes), and add
 * our own callout block and date chip.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { audio, video, file, ...blocks } = defaultBlockSpecs;

export const schema = BlockNoteSchema.create({
  blockSpecs: { ...blocks, callout: createCalloutBlock() },
  inlineContentSpecs: { ...defaultInlineContentSpecs, dateChip: DateChip },
});

export type WindowsillEditor = typeof schema.BlockNoteEditor;

/** The "/" menu: BlockNote's items plus our callout (after "Quote") and date. */
export function getSlashMenuItems(editor: WindowsillEditor, query: string): DefaultReactSuggestionItem[] {
  const items = getDefaultReactSlashMenuItems(editor);
  const quoteIndex = items.findIndex((item) => item.title === "Quote");
  const basicGroup = quoteIndex >= 0 ? items[quoteIndex].group : "Basic blocks";

  const callout: DefaultReactSuggestionItem = {
    title: "Callout",
    subtext: "Highlight a tip, warning or key point",
    aliases: ["callout", "note", "tip", "info", "warning", "box"],
    group: basicGroup,
    icon: <Lightbulb size={18} />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout" }),
  };
  const date: DefaultReactSuggestionItem = {
    title: "Date",
    subtext: "A date that shows how many days are left",
    aliases: ["date", "due", "deadline", "countdown", "days", "today"],
    group: basicGroup,
    icon: <CalendarDays size={18} />,
    onItemClick: () => editor.insertInlineContent([todayDateChip(), " "]),
  };

  items.splice(quoteIndex >= 0 ? quoteIndex + 1 : items.length, 0, callout, date);
  return filterSuggestionItems(items, query);
}
