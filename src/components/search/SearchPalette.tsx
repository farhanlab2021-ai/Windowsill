"use client";

import { Command } from "cmdk";
import { FilePlus2, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOpenPage } from "@/hooks/useNavigation";
import { createPage, getAllPlainTexts } from "@/lib/db/pages";
import { ancestorsOf } from "@/lib/db/tree";
import type { Page } from "@/lib/db/types";
import { createPageSearch, type Snippet } from "@/lib/search/searchPages";
import { useUI } from "@/stores/ui";

const ITEM =
  "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-hover";

function PageIcon({ page }: { page: Page }) {
  return (
    <span className="mt-0.5 flex w-5 shrink-0 justify-center text-base leading-5">
      {page.icon ?? <FileText className="size-4 text-faint" />}
    </span>
  );
}

function SnippetText({ snippet }: { snippet: Snippet }) {
  return (
    <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
      {snippet.before}
      <mark className="rounded bg-accent-soft px-0.5 text-ink">{snippet.match}</mark>
      {snippet.after}
    </span>
  );
}

/**
 * The Ctrl/Cmd + K search palette. Searches titles and page text; with an
 * empty box it shows recently edited pages. Arrow keys + Enter to open.
 */
export function SearchPalette({ pages }: { pages: Page[] }) {
  const open = useUI((s) => s.searchOpen);
  const setOpen = useUI((s) => s.setSearchOpen);
  const openPage = useOpenPage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [texts, setTexts] = useState<Map<string, string> | null>(null);

  // Open/close the native <dialog>, and load fresh page text each time it opens.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      el.querySelector("input")?.focus(); // type straight away

      void getAllPlainTexts().then(setTexts);
    }
    if (!open && el.open) el.close();
  }, [open]);

  const search = useMemo(() => (texts ? createPageSearch(pages, texts) : null), [pages, texts]);
  const results = query.trim() && search ? search(query) : [];
  const recent = useMemo(
    () => pages.filter((p) => p.deletedAt === null).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [pages],
  );

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const go = (id: string) => {
    close();
    openPage(id);
  };
  const path = (page: Page) => ancestorsOf(pages, page.id).map((p) => p.title || "Untitled").join(" / ");

  return (
    <dialog
      ref={dialog}
      onClose={close}
      onClick={(e) => e.target === dialog.current && close()}
      aria-label="Search"
      className="mx-auto mt-[12vh] w-[min(92vw,36rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
    >
      {open && (
        <Command shouldFilter={false} label="Search pages" loop>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-4 shrink-0 text-faint" aria-hidden />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search your pages…"
              className="h-13 flex-1 bg-transparent text-base outline-none placeholder:text-faint focus-visible:outline-none"
            />
            <kbd className="rounded border border-line px-1.5 font-sans text-[11px] text-faint">Esc</kbd>
          </div>

          <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
            {query.trim() ? (
              <>
                {results.length === 0 && search && (
                  <p className="px-3 py-6 text-center text-sm text-muted">No pages match “{query.trim()}”.</p>
                )}
                {results.length > 0 && (
                  <Command.Group heading="Pages" className="search-group">
                    {results.map(({ page, snippet }) => (
                      <Command.Item key={page.id} value={page.id} onSelect={() => go(page.id)} className={ITEM}>
                        <PageIcon page={page} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{page.title || "Untitled"}</span>
                          {path(page) && <span className="block truncate text-xs text-faint">{path(page)}</span>}
                          {snippet && <SnippetText snippet={snippet} />}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                <Command.Group heading="Actions" className="search-group">
                  <Command.Item
                    value="__create__"
                    onSelect={async () => go((await createPage({ title: query.trim() })).id)}
                    className={ITEM}
                  >
                    <FilePlus2 className="mt-0.5 size-4 shrink-0 text-accent" />
                    <span>
                      Create page “<span className="font-medium">{query.trim()}</span>”
                    </span>
                  </Command.Item>
                </Command.Group>
              </>
            ) : (
              <Command.Group heading="Recently edited" className="search-group">
                {recent.map((page) => (
                  <Command.Item key={page.id} value={page.id} onSelect={() => go(page.id)} className={ITEM}>
                    <PageIcon page={page} />
                    <span className="min-w-0 flex-1 truncate">{page.title || "Untitled"}</span>
                    {path(page) && <span className="max-w-[40%] truncate text-xs text-faint">{path(page)}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      )}
    </dialog>
  );
}
