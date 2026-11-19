"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getAllPages, getPage } from "@/lib/db/pages";

/**
 * All pages, kept live: whenever a page is created, renamed or moved anywhere
 * in the app, components using this hook re-render automatically.
 * Returns `undefined` while the database is still loading.
 */
export function usePages() {
  return useLiveQuery(getAllPages, []);
}

/** One page, kept live. `null` means "doesn't exist", `undefined` means "loading". */
export function usePage(id: string | null) {
  return useLiveQuery(async () => (id ? ((await getPage(id)) ?? null) : null), [id]);
}
