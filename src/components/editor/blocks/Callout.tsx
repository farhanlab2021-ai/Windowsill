"use client";

import { createReactBlockSpec } from "@blocknote/react";

/**
 * Callout block: a soft, coloured box for tips, warnings and key points.
 * Clicking the emoji cycles through the styles below.
 */
export const CALLOUT_STYLES = [
  { tone: "note", emoji: "💡", label: "Idea" },
  { tone: "info", emoji: "📌", label: "Note" },
  { tone: "warning", emoji: "⚠️", label: "Warning" },
  { tone: "success", emoji: "✅", label: "Done" },
  { tone: "question", emoji: "❓", label: "Question" },
] as const;

type Tone = (typeof CALLOUT_STYLES)[number]["tone"];

const TONE_CLASSES: Record<Tone, string> = {
  note: "bg-amber-50 border-amber-200/70 dark:bg-amber-400/10 dark:border-amber-300/20",
  info: "bg-sky-50 border-sky-200/70 dark:bg-sky-400/10 dark:border-sky-300/20",
  warning: "bg-rose-50 border-rose-200/70 dark:bg-rose-400/10 dark:border-rose-300/20",
  success: "bg-emerald-50 border-emerald-200/70 dark:bg-emerald-400/10 dark:border-emerald-300/20",
  question: "bg-violet-50 border-violet-200/70 dark:bg-violet-400/10 dark:border-violet-300/20",
};

export const createCalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      tone: { default: "note" as Tone, values: CALLOUT_STYLES.map((s) => s.tone) },
    },
    content: "inline",
  },
  {
    render: ({ block, editor, contentRef }) => {
      const tone = block.props.tone as Tone;
      const index = CALLOUT_STYLES.findIndex((s) => s.tone === tone);
      const style = CALLOUT_STYLES[index] ?? CALLOUT_STYLES[0];
      const next = CALLOUT_STYLES[(index + 1) % CALLOUT_STYLES.length];

      return (
        <div className={`my-1 flex w-full gap-3 rounded-xl border px-4 py-3 ${TONE_CLASSES[style.tone]}`}>
          <button
            type="button"
            contentEditable={false}
            onClick={() => editor.updateBlock(block, { props: { tone: next.tone } })}
            title={`${style.label} — click to change`}
            aria-label={`Callout style: ${style.label}. Click to change.`}
            className="h-7 shrink-0 cursor-pointer rounded-md text-lg leading-7 select-none hover:scale-110"
          >
            {style.emoji}
          </button>
          <div ref={contentRef} className="min-w-0 flex-1 self-center" />
        </div>
      );
    },
  },
);
