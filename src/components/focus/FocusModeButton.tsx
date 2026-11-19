"use client";

import { AppWindow } from "lucide-react";
import { AppLink } from "@/components/ui/AppLink";

/** "Focus mode" button for the top bars. Remembers the page you were on. */
export function FocusModeButton({ fromPageId }: { fromPageId?: string }) {
  return (
    <AppLink
      href={fromPageId ? `/focus?from=${encodeURIComponent(fromPageId)}` : "/focus"}
      title="Focus Mode — study by the window"
      aria-label="Open Focus Mode"
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm text-muted hover:bg-hover hover:text-ink"
    >
      <AppWindow className="size-4" />
      <span className="max-md:hidden">Focus mode</span>
    </AppLink>
  );
}
