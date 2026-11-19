"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Popover } from "./Popover";

export type MenuItem =
  | { label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean; shortcut?: string }
  | "separator";

interface MenuProps {
  label: string;
  items: MenuItem[];
  trigger: Parameters<typeof Popover>[0]["trigger"];
  align?: "start" | "end";
}

/** A dropdown menu with arrow-key navigation. */
export function Menu({ label, items, trigger, align = "end" }: MenuProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const options = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])"),
    );
    const i = options.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home" ? 0
      : e.key === "End" ? options.length - 1
      : e.key === "ArrowDown" ? (i + 1) % options.length
      : (i - 1 + options.length) % options.length;
    options[next]?.focus();
  };

  return (
    <Popover label={label} trigger={trigger} align={align} kind="menu" className="min-w-52 p-1">
      {(close) => (
        <div onKeyDown={onKeyDown}>
          {items.map((item, i) =>
            item === "separator" ? (
              <div key={`sep-${i}`} role="separator" className="my-1 h-px bg-line" />
            ) : (
              <div
                key={item.label}
                role="menuitem"
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                onClick={() => {
                  if (item.disabled) return;
                  close();
                  item.onSelect();
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !item.disabled) {
                    e.preventDefault();
                    close();
                    item.onSelect();
                  }
                }}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none hover:bg-hover focus:bg-hover aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent ${
                  item.danger ? "text-danger" : ""
                }`}
              >
                <span className="flex size-4 items-center justify-center text-muted [&>svg]:size-4">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <kbd className="font-sans text-xs text-faint">{item.shortcut}</kbd>}
              </div>
            ),
          )}
        </div>
      )}
    </Popover>
  );
}
