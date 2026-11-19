import Dexie, { type EntityTable } from "dexie";
import type { Asset, FocusSession, Page, PageContent, Setting } from "./types";

/**
 * The Dexie database. Only files inside `src/lib/db/` should import this:
 * the rest of the app goes through the repository functions (pages.ts, etc.),
 * so storage can later be swapped or synced without touching the UI.
 *
 * The strings below list each table's primary key followed by indexed fields.
 * To change them, add a new `this.version(2).stores({...})` instead of editing
 * version 1 — Dexie then upgrades existing users' data automatically.
 */
export class WindowsillDB extends Dexie {
  pages!: EntityTable<Page, "id">;
  contents!: EntityTable<PageContent, "pageId">;
  assets!: EntityTable<Asset, "id">;
  focusSessions!: EntityTable<FocusSession, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor(name = "windowsill") {
    super(name);
    this.version(1).stores({
      pages: "id, parentId, updatedAt, deletedAt",
      contents: "pageId",
      assets: "id",
      focusSessions: "id, startedAt, pageId",
      settings: "key",
    });
  }
}

export const db = new WindowsillDB();
