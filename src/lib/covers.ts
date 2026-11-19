/**
 * Built-in page covers: soft gradients that need no image files (so they work
 * offline and look calm). Stored on a page as "gradient:<id>".
 */
export const GRADIENT_COVERS = [
  { id: "dawn", label: "Dawn", css: "linear-gradient(120deg, #f6d5c3 0%, #f3e6d0 45%, #cfe0e8 100%)" },
  { id: "sage", label: "Sage", css: "linear-gradient(120deg, #cfdfd4 0%, #e6eadf 50%, #b9cfc4 100%)" },
  { id: "sea", label: "Sea", css: "linear-gradient(160deg, #bcd9e6 0%, #8fb8cc 55%, #e8dcc4 100%)" },
  { id: "dusk", label: "Dusk", css: "linear-gradient(170deg, #f2b8a2 0%, #c99bb5 50%, #7d7fb0 100%)" },
  { id: "meadow", label: "Meadow", css: "linear-gradient(140deg, #e9edc9 0%, #b5cfa0 60%, #8db08f 100%)" },
  { id: "night", label: "Night", css: "linear-gradient(170deg, #2c3550 0%, #1d2238 60%, #3b3a5c 100%)" },
] as const;

const GRADIENT_PREFIX = "gradient:";

export function gradientCoverValue(id: string) {
  return GRADIENT_PREFIX + id;
}

/** Returns the CSS gradient for a cover value, or null if it's not a gradient. */
export function gradientCss(cover: string): string | null {
  if (!cover.startsWith(GRADIENT_PREFIX)) return null;
  const id = cover.slice(GRADIENT_PREFIX.length);
  return GRADIENT_COVERS.find((g) => g.id === id)?.css ?? GRADIENT_COVERS[0].css;
}
