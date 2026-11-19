/** True on Mac/iPhone/iPad, where shortcuts use ⌘ instead of Ctrl. */
export function isApple(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/** The label for the main shortcut key: "⌘" on Apple devices, "Ctrl" elsewhere. */
export function modKeyLabel(): string {
  return isApple() ? "⌘" : "Ctrl";
}
