"use client";

import { EmojiPicker as Frimousse } from "frimousse";

/** Emojis students reach for most — shown first and available even offline. */
const QUICK = ["📚", "📝", "✏️", "🧪", "📐", "🧮", "💻", "🗓️", "🎯", "💡", "🌿", "☕", "🎓", "🧠", "📖", "🔬"];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onRemove?: () => void;
}

/** Emoji picker panel (search + full list) built on the small `frimousse` library. */
export function EmojiPicker({ onSelect, onRemove }: EmojiPickerProps) {
  return (
    <div className="flex w-[19rem] flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-xs font-medium text-muted">Quick picks</span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="rounded-md px-2 py-0.5 text-xs text-muted hover:bg-hover hover:text-ink">
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-8 gap-0.5 px-2 pb-2">
        {QUICK.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            aria-label={emoji}
            className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-hover"
          >
            {emoji}
          </button>
        ))}
      </div>
      <Frimousse.Root
        className="flex h-72 flex-col border-t border-line"
        onEmojiSelect={({ emoji }) => onSelect(emoji)}
        // Emoji data is served from our own site (copied by scripts/copy-emoji.mjs), so it works offline.
        emojibaseUrl="/emoji"
        columns={8}
      >
        <Frimousse.Search
          placeholder="Search emoji…"
          className="mx-2 mt-2 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm outline-none focus:border-accent"
        />
        <Frimousse.Viewport className="relative flex-1 outline-none">
          <Frimousse.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            Loading…
          </Frimousse.Loading>
          <Frimousse.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            No emoji found
          </Frimousse.Empty>
          <Frimousse.List
            className="pb-2 select-none"
            components={{
              CategoryHeader: ({ category, ...props }) => (
                <div className="bg-surface px-3 pt-2 pb-1 text-xs font-medium text-muted" {...props}>
                  {category.label}
                </div>
              ),
              Row: ({ children, ...props }) => (
                <div className="scroll-my-1 px-2" {...props}>
                  {children}
                </div>
              ),
              Emoji: ({ emoji, ...props }) => (
                <button
                  className="flex size-8 items-center justify-center rounded-md text-lg data-[active]:bg-hover"
                  {...props}
                >
                  {emoji.emoji}
                </button>
              ),
            }}
          />
        </Frimousse.Viewport>
      </Frimousse.Root>
    </div>
  );
}
