/**
 * Light / dark mode.
 *
 * The choice ("light", "dark" or "system") is kept in localStorage. A tiny
 * script in <head> (THEME_SCRIPT) applies it before the page paints, so there
 * is no white flash when a student who prefers dark mode opens the app.
 */
export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "windowsill-theme";

export function readThemeChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // localStorage can be blocked (e.g. some private modes) — fall back.
  }
  return "system";
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {}
  document.documentElement.setAttribute("data-theme", resolveTheme(choice));
}

/** Runs in <head> before anything is drawn. Keep it tiny and dependency-free. */
export const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_STORAGE_KEY}");var d=c==="dark"||((!c||c==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;
