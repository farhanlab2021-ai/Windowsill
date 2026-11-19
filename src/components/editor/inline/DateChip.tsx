"use client";

import { createReactInlineContentSpec } from "@blocknote/react";
import { CalendarDays } from "lucide-react";
import { useRef } from "react";
import { daysUntil, describeDaysUntil, formatShortDate, isValidISODate, toISODate } from "@/lib/dates";

/**
 * Date chip: an inline date that shows how far away it is, e.g.
 * "Fri, Dec 5 · in 12 days". Works in text and inside table cells, so it's
 * used for due dates (Assignment Tracker) and exam countdowns (Exam Planner).
 * Saved in the page as { type: "dateChip", props: { date: "2026-12-05" } }.
 */
export const DateChip = createReactInlineContentSpec(
  {
    type: "dateChip",
    propSchema: { date: { default: "" } },
    content: "none",
  },
  {
    render: function DateChipView({ inlineContent, updateInlineContent }) {
      const input = useRef<HTMLInputElement>(null);
      const date = inlineContent.props.date;
      const valid = isValidISODate(date);
      const days = valid ? daysUntil(date) : null;

      const tone =
        days === null ? "text-faint"
        : days < 0 ? "bg-hover text-muted"
        : days <= 3 ? "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"
        : "bg-accent-soft text-ink";

      const openPicker = () => {
        const el = input.current;
        if (!el) return;
        try {
          el.showPicker();
        } catch {
          el.focus(); // older browsers: focus the field instead
        }
      };

      return (
        <span className="relative inline-flex align-baseline" contentEditable={false}>
          <button
            type="button"
            onClick={openPicker}
            title="Change date"
            className={`inline-flex items-center gap-1 rounded-md px-1.5 text-[0.9em] leading-6 whitespace-nowrap ${tone}`}
          >
            <CalendarDays className="size-3.5 opacity-70" aria-hidden />
            {valid ? (
              <>
                {formatShortDate(date)}
                <span className="opacity-70">· {describeDaysUntil(days!)}</span>
              </>
            ) : (
              "Pick a date"
            )}
          </button>
          <input
            ref={input}
            type="date"
            aria-label="Date"
            value={valid ? date : ""}
            onChange={(e) => updateInlineContent({ type: "dateChip", props: { date: e.target.value } })}
            className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
            tabIndex={-1}
          />
        </span>
      );
    },
  },
);

/** The inline content to insert for "today". */
export function todayDateChip() {
  return { type: "dateChip" as const, props: { date: toISODate() } };
}
