import type { BlockJson } from "./blocks";

/** A student template: what a new page starts with. */
export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** A built-in gradient cover id (see lib/covers.ts). */
  cover: string;
  /** Builds the page. `today` is passed in so dates are relative to when it's used. */
  build: (today: Date) => { title: string; blocks: BlockJson[] };
}
