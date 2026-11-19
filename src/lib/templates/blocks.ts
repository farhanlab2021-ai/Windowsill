/**
 * Tiny helpers for writing editor blocks in code, so templates read like an
 * outline instead of deeply nested JSON. They produce the same JSON format
 * BlockNote saves.
 */
import { toISODate } from "../dates";

export type Inline =
  | { type: "text"; text: string; styles: Record<string, boolean> }
  | { type: "dateChip"; props: { date: string } };

export interface BlockJson {
  type: string;
  props?: Record<string, unknown>;
  content?: Inline[] | TableJson;
  children?: BlockJson[];
}

interface TableJson {
  type: "tableContent";
  headerRows?: number;
  columnWidths?: (number | undefined)[];
  rows: { cells: Inline[][] }[];
}

type InlineInput = string | Inline;

const toInline = (items: InlineInput[]): Inline[] =>
  items.map((item) => (typeof item === "string" ? text(item) : item));

export const text = (t: string, styles: Record<string, boolean> = {}): Inline => ({ type: "text", text: t, styles });
export const bold = (t: string) => text(t, { bold: true });
export const date = (day: Date): Inline => ({ type: "dateChip", props: { date: toISODate(day) } });

export const paragraph = (...items: InlineInput[]): BlockJson => ({ type: "paragraph", content: toInline(items) });
export const heading = (level: 1 | 2 | 3, ...items: InlineInput[]): BlockJson => ({
  type: "heading",
  props: { level },
  content: toInline(items),
});
export const bullet = (...items: InlineInput[]): BlockJson => ({ type: "bulletListItem", content: toInline(items) });
export const numbered = (...items: InlineInput[]): BlockJson => ({ type: "numberedListItem", content: toInline(items) });
export const todo = (checked: boolean, ...items: InlineInput[]): BlockJson => ({
  type: "checkListItem",
  props: { checked },
  content: toInline(items),
});
export const toggle = (label: string, children: BlockJson[]): BlockJson => ({
  type: "toggleListItem",
  content: [text(label)],
  children,
});
export const callout = (tone: "note" | "info" | "warning" | "success" | "question", ...items: InlineInput[]): BlockJson => ({
  type: "callout",
  props: { tone },
  content: toInline(items),
});
export const quote = (...items: InlineInput[]): BlockJson => ({ type: "quote", content: toInline(items) });
export const divider = (): BlockJson => ({ type: "divider" });

/** A table whose first row is a header. Each cell is a string, a date, or a list of both. */
export function table(header: string[], rows: (InlineInput | InlineInput[])[][], columnWidths?: number[]): BlockJson {
  const cell = (value: InlineInput | InlineInput[]) => toInline(Array.isArray(value) ? value : [value]);
  return {
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      columnWidths: columnWidths ?? header.map(() => undefined),
      rows: [{ cells: header.map((h) => [bold(h)]) }, ...rows.map((row) => ({ cells: row.map(cell) }))],
    },
  };
}
