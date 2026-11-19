/**
 * The pages "repository": every read/write of pages goes through here.
 *
 * Why a repository? The UI just calls `createPage()`, `movePage()`, etc. and
 * doesn't know they're stored in IndexedDB. When cloud sync is added later, it
 * can hook in here (or listen to these tables) without changing the UI.
 */
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import { newId } from "../id";
import { db } from "./database";
import { compareByOrder, descendantIds } from "./tree";
import type { Page, PageContent } from "./types";

export type DropPosition = "before" | "after" | "inside";

export interface CreatePageInput {
  parentId?: string | null;
  title?: string;
  icon?: string | null;
  cover?: string | null;
  templateId?: string | null;
  blocks?: unknown[];
  plainText?: string;
}

/** Live (not trashed) siblings under `parentId`, sorted. */
async function siblings(parentId: string | null, excludeId?: string): Promise<Page[]> {
  const list =
    parentId === null
      ? await db.pages.filter((p) => p.parentId === null).toArray()
      : await db.pages.where("parentId").equals(parentId).toArray();
  return list.filter((p) => p.deletedAt === null && p.id !== excludeId).sort(compareByOrder);
}

/**
 * Returns an order key for a new position between `prev` and `next`.
 * If two siblings ever ended up with the same key (possible after a future
 * sync merge), the siblings are re-numbered first so the move still works.
 */
async function keyBetween(list: Page[], index: number): Promise<string> {
  const prev = list[index - 1]?.order ?? null;
  const next = list[index]?.order ?? null;
  if (prev === null || next === null || prev < next) {
    return generateKeyBetween(prev, next);
  }
  const keys = generateNKeysBetween(null, null, list.length);
  const now = Date.now();
  await Promise.all(
    list.map((p, i) => {
      p.order = keys[i];
      return db.pages.update(p.id, { order: keys[i], updatedAt: now });
    }),
  );
  return generateKeyBetween(list[index - 1]?.order ?? null, list[index]?.order ?? null);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export function getPage(id: string): Promise<Page | undefined> {
  return db.pages.get(id);
}

/** All pages, including trashed ones. The sidebar filters what it needs. */
export function getAllPages(): Promise<Page[]> {
  return db.pages.toArray();
}

export function getContent(pageId: string): Promise<PageContent | undefined> {
  return db.contents.get(pageId);
}

/** Every page's plain text (page id → text), for building the search index. */
export async function getAllPlainTexts(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await db.contents.each((c) => map.set(c.pageId, c.plainText));
  return map;
}

// ---------------------------------------------------------------------------
// Creating and editing
// ---------------------------------------------------------------------------

/** Creates a page at the end of its parent's children. */
export async function createPage(input: CreatePageInput = {}): Promise<Page> {
  const parentId = input.parentId ?? null;
  return db.transaction("rw", db.pages, db.contents, async () => {
    const list = await siblings(parentId);
    const now = Date.now();
    const page: Page = {
      id: newId(),
      parentId,
      order: await keyBetween(list, list.length),
      title: input.title ?? "",
      icon: input.icon ?? null,
      cover: input.cover ?? null,
      isFavorite: false,
      templateId: input.templateId ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await db.pages.add(page);
    await db.contents.add({
      pageId: page.id,
      blocks: input.blocks ?? [],
      plainText: input.plainText ?? "",
      updatedAt: now,
    });
    return page;
  });
}

export type PagePatch = Partial<Pick<Page, "title" | "icon" | "cover" | "isFavorite" | "templateId">>;

export async function updatePage(id: string, patch: PagePatch): Promise<void> {
  await db.pages.update(id, { ...patch, updatedAt: Date.now() });
}

export async function toggleFavorite(id: string): Promise<void> {
  const page = await db.pages.get(id);
  if (page) await updatePage(id, { isFavorite: !page.isFavorite });
}

/** Saves the editor body (called by autosave). */
export async function saveContent(pageId: string, blocks: unknown[], plainText: string) {
  const now = Date.now();
  await db.transaction("rw", db.pages, db.contents, async () => {
    await db.contents.put({ pageId, blocks, plainText, updatedAt: now });
    await db.pages.update(pageId, { updatedAt: now });
  });
}

// ---------------------------------------------------------------------------
// Moving (drag and drop + keyboard-friendly menu actions)
// ---------------------------------------------------------------------------

/**
 * Moves page `id` relative to `targetId`:
 * - "before"/"after": becomes a sibling of the target, just above/below it.
 * - "inside": becomes the target's last child.
 * Returns false (and does nothing) if the move is impossible, e.g. dropping a
 * page inside one of its own sub-pages.
 */
export async function movePage(id: string, targetId: string, position: DropPosition): Promise<boolean> {
  if (id === targetId) return false;
  return db.transaction("rw", db.pages, async () => {
    const [page, target] = await Promise.all([db.pages.get(id), db.pages.get(targetId)]);
    if (!page || !target) return false;

    const all = await db.pages.toArray();
    if (descendantIds(all, id).includes(targetId)) return false;

    const parentId = position === "inside" ? target.id : target.parentId;
    const list = await siblings(parentId, id);
    let index: number;
    if (position === "inside") index = list.length;
    else {
      const targetIndex = list.findIndex((p) => p.id === targetId);
      index = position === "before" ? targetIndex : targetIndex + 1;
    }

    const order = await keyBetween(list, index);
    await db.pages.update(id, { parentId, order, updatedAt: Date.now() });
    return true;
  });
}

/** Moves a page one step up among its siblings. */
export async function moveUp(id: string): Promise<boolean> {
  const page = await db.pages.get(id);
  if (!page) return false;
  const list = await siblings(page.parentId);
  const i = list.findIndex((p) => p.id === id);
  return i > 0 ? movePage(id, list[i - 1].id, "before") : false;
}

/** Moves a page one step down among its siblings. */
export async function moveDown(id: string): Promise<boolean> {
  const page = await db.pages.get(id);
  if (!page) return false;
  const list = await siblings(page.parentId);
  const i = list.findIndex((p) => p.id === id);
  return i >= 0 && i < list.length - 1 ? movePage(id, list[i + 1].id, "after") : false;
}

/** Nests a page inside the sibling right above it. */
export async function indent(id: string): Promise<boolean> {
  const page = await db.pages.get(id);
  if (!page) return false;
  const list = await siblings(page.parentId);
  const i = list.findIndex((p) => p.id === id);
  return i > 0 ? movePage(id, list[i - 1].id, "inside") : false;
}

/** Moves a page out of its parent, placing it right after the parent. */
export async function outdent(id: string): Promise<boolean> {
  const page = await db.pages.get(id);
  if (!page?.parentId) return false;
  return movePage(id, page.parentId, "after");
}

/** Moves a page to the end of the top level. */
export async function moveToTopLevel(id: string): Promise<boolean> {
  return db.transaction("rw", db.pages, async () => {
    const list = await siblings(null, id);
    const order = await keyBetween(list, list.length);
    await db.pages.update(id, { parentId: null, order, updatedAt: Date.now() });
    return true;
  });
}

// ---------------------------------------------------------------------------
// Trash
// ---------------------------------------------------------------------------

/** Moves a page and all its sub-pages to the trash. Returns the ids that were trashed. */
export async function trashPage(id: string): Promise<string[]> {
  return db.transaction("rw", db.pages, async () => {
    const all = await db.pages.toArray();
    const ids = [id, ...descendantIds(all, id)].filter(
      (pid) => all.find((p) => p.id === pid)?.deletedAt === null,
    );
    const now = Date.now();
    await db.pages.bulkUpdate(ids.map((key) => ({ key, changes: { deletedAt: now, updatedAt: now } })));
    return ids;
  });
}

/**
 * Restores a trashed page together with the sub-pages that were trashed with it.
 * If its old parent is gone or still in the trash, it returns to the top level.
 */
export async function restorePage(id: string): Promise<void> {
  await db.transaction("rw", db.pages, async () => {
    const all = await db.pages.toArray();
    const page = all.find((p) => p.id === id);
    if (!page || page.deletedAt === null) return;

    const trashedAt = page.deletedAt;
    const ids = [id, ...descendantIds(all, id)].filter(
      (pid) => all.find((p) => p.id === pid)?.deletedAt === trashedAt,
    );
    const now = Date.now();
    await db.pages.bulkUpdate(ids.map((key) => ({ key, changes: { deletedAt: null, updatedAt: now } })));

    const parent = page.parentId ? all.find((p) => p.id === page.parentId) : undefined;
    if (page.parentId && (!parent || parent.deletedAt !== null)) {
      const list = await siblings(null, id);
      await db.pages.update(id, { parentId: null, order: await keyBetween(list, list.length) });
    }
  });
}

/** Permanently deletes a page, its sub-pages and their content. Cannot be undone. */
export async function deletePageForever(id: string): Promise<void> {
  await db.transaction("rw", db.pages, db.contents, async () => {
    const all = await db.pages.toArray();
    const ids = [id, ...descendantIds(all, id)];
    await db.pages.bulkDelete(ids);
    await db.contents.bulkDelete(ids);
  });
}

/** Permanently deletes everything in the trash. */
export async function emptyTrash(): Promise<void> {
  await db.transaction("rw", db.pages, db.contents, async () => {
    const trashed = await db.pages.filter((p) => p.deletedAt !== null).primaryKeys();
    await db.pages.bulkDelete(trashed);
    await db.contents.bulkDelete(trashed);
  });
}
