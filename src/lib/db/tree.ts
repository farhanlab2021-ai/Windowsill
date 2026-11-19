/**
 * Pure helper functions for working with the page tree.
 * "Pure" means they only take data in and return data out (no database, no React),
 * which makes them easy to test and reuse.
 */
import type { Page } from "./types";

/** Sorts pages the way they appear in the sidebar. */
export function compareByOrder(a: Page, b: Page): number {
  // Plain `<` comparison on purpose: fractional-index keys are ASCII and must
  // NOT be compared with localeCompare (which ignores case).
  if (a.order < b.order) return -1;
  if (a.order > b.order) return 1;
  return a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1);
}

/** Live (not trashed) children of `parentId`, sorted. */
export function childrenOf(pages: Page[], parentId: string | null): Page[] {
  return pages
    .filter((p) => p.parentId === parentId && p.deletedAt === null)
    .sort(compareByOrder);
}

/** Ids of every page nested under `id` (children, grandchildren, ...). */
export function descendantIds(pages: Page[], id: string): string[] {
  const byParent = new Map<string, Page[]>();
  for (const p of pages) {
    if (!p.parentId) continue;
    const list = byParent.get(p.parentId) ?? [];
    list.push(p);
    byParent.set(p.parentId, list);
  }
  const result: string[] = [];
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    for (const child of byParent.get(current) ?? []) {
      result.push(child.id);
      stack.push(child.id);
    }
  }
  return result;
}

export interface TreeRow {
  page: Page;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

/**
 * Turns the tree into a flat list of visible rows (what the sidebar renders).
 * Children are only included when their parent is in `expandedIds`.
 */
export function flattenTree(pages: Page[], expandedIds: ReadonlySet<string>): TreeRow[] {
  const live = pages.filter((p) => p.deletedAt === null);
  const rows: TreeRow[] = [];

  const visit = (parentId: string | null, depth: number) => {
    for (const page of childrenOf(live, parentId)) {
      const hasChildren = live.some((p) => p.parentId === page.id);
      const isExpanded = hasChildren && expandedIds.has(page.id);
      rows.push({ page, depth, hasChildren, isExpanded });
      if (isExpanded) visit(page.id, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
}

/** The chain of ancestors from the top level down to (not including) `id`. */
export function ancestorsOf(pages: Page[], id: string): Page[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const chain: Page[] = [];
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.parentId)) {
    seen.add(current.parentId);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/**
 * Pages to list in the Trash: the page the student actually deleted, not each
 * of its sub-pages (they were trashed together and are restored together).
 */
export function trashRoots(pages: Page[]): Page[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  return pages
    .filter((p) => {
      if (p.deletedAt === null) return false;
      const parent = p.parentId ? byId.get(p.parentId) : undefined;
      return !parent || parent.deletedAt !== p.deletedAt;
    })
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}
