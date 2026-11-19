/**
 * Data types stored in the browser's database (IndexedDB).
 *
 * Every record has a random `id` and an `updatedAt` timestamp. Those two fields
 * are what a future cloud sync (e.g. Supabase) needs to merge changes, so keep
 * them on any new table you add.
 */

/** A note page in the sidebar tree. Holds metadata only; the body lives in `PageContent`. */
export interface Page {
  id: string;
  /** Parent page id, or `null` for a top-level page. */
  parentId: string | null;
  /**
   * Sort key among siblings (a "fractional index" string such as "a0", "a0V").
   * Moving a page only rewrites this one value, which keeps sync conflicts small.
   */
  order: string;
  title: string;
  /** An emoji, or `null` for the default icon. */
  icon: string | null;
  /** A cover: `"gradient:<name>"` for a built-in gradient, an asset ref, or `null`. */
  cover: string | null;
  isFavorite: boolean;
  /** Which student template the page was created from, if any. */
  templateId: string | null;
  createdAt: number;
  updatedAt: number;
  /** When the page was moved to the trash, or `null` if it's not in the trash. */
  deletedAt: number | null;
}

/**
 * The body of a page (the editor's blocks). Kept in its own table so that
 * autosaving a long note doesn't make the sidebar reload all page metadata.
 */
export interface PageContent {
  pageId: string;
  /** BlockNote's JSON document (an array of blocks). */
  blocks: unknown[];
  /** Plain text version of the blocks, used for search. */
  plainText: string;
  updatedAt: number;
}

/** An image (or other file) pasted or uploaded into a page, stored offline. */
export interface Asset {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

/** One Pomodoro session (used from Phase 3). */
export interface FocusSession {
  id: string;
  kind: "focus" | "shortBreak" | "longBreak";
  startedAt: number;
  endedAt: number;
  plannedMinutes: number;
  actualMinutes: number;
  pageId: string | null;
  label: string | null;
  completed: boolean;
}

/** A simple key/value setting. */
export interface Setting {
  key: string;
  value: unknown;
  updatedAt: number;
}
