"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useUI } from "@/stores/ui";

/**
 * What's open is kept in the URL, so the browser's back button and refreshing
 * the tab both work as expected:
 * - `/?page=<id>` — a page
 * - `/?view=stats` — the focus stats
 * - `/` — Home
 */
export type View = "stats";

export function useCurrentPageId(): string | null {
  return useSearchParams().get("page");
}

export function useCurrentView(): View | null {
  return useSearchParams().get("view") === "stats" ? "stats" : null;
}

/**
 * Goes to a URL inside the notes workspace. Everything there is the same page
 * ("/") with a different `?page=` / `?view=`, so we just update the address
 * bar with `history.pushState` (Next.js keeps `useSearchParams` in sync). That's
 * instant and needs no network, so it works offline too.
 */
function useGo() {
  const setSidebarOpen = useUI((s) => s.setSidebarOpen);
  return useCallback(
    (href: string) => {
      if (window.location.pathname === "/") window.history.pushState(null, "", href);
      else window.location.assign(href); // from another screen: full page load (works offline)
      setSidebarOpen(false); // close the drawer on phones
    },
    [setSidebarOpen],
  );
}

export function useOpenPage() {
  const go = useGo();
  return useCallback((id: string | null) => go(id ? `/?page=${encodeURIComponent(id)}` : "/"), [go]);
}

export function useOpenView() {
  const go = useGo();
  return useCallback((view: View) => go(`/?view=${view}`), [go]);
}
