"use client";

import { Menu as MenuIcon } from "lucide-react";
import { FocusModeButton } from "@/components/focus/FocusModeButton";
import { TimerButton } from "@/components/timer/TimerButton";
import { useUI } from "@/stores/ui";

/** Top bar for Home and Stats: sidebar button (phones) on the left, timer on the right. */
export function SimpleTopBar({ title }: { title?: string }) {
  const setSidebarOpen = useUI((s) => s.setSidebarOpen);
  return (
    <div className="sticky top-0 z-20 flex h-12 items-center gap-2 bg-canvas/85 px-3 backdrop-blur md:px-4">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
        className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink md:hidden"
      >
        <MenuIcon className="size-5" />
      </button>
      <span className="flex-1 truncate px-1.5 text-sm text-ink">{title}</span>
      <FocusModeButton />
      <TimerButton />
    </div>
  );
}
