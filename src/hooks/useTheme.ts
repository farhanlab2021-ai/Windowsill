"use client";

import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { applyTheme, readThemeChoice, type ResolvedTheme, type ThemeChoice } from "@/lib/theme";

/**
 * `useSyncExternalStore` lets React read a value that lives outside React
 * (here: an attribute on <html>) and re-render when it changes.
 */
function subscribeToThemeAttribute(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readThemeAttribute(): ResolvedTheme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** The light/dark theme currently on screen. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeToThemeAttribute, readThemeAttribute, () => "light");
}

/** Read and change the theme choice ("light", "dark" or "system"). */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(() =>
    typeof window === "undefined" ? "system" : readThemeChoice(),
  );
  const resolved = useResolvedTheme();

  // Re-apply after mount (React's dev mode can reset attributes on <html>).
  useLayoutEffect(() => applyTheme(choice), [choice]);

  // While "system" is chosen, follow the operating system's dark-mode switch.
  useLayoutEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  const setTheme = useCallback((next: ThemeChoice) => setChoice(next), []);
  return { choice, resolved, setTheme };
}
