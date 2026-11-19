"use client";

import { FilePlus2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { usePages } from "@/hooks/usePages";
import { formatShortDate, toISODate } from "@/lib/dates";
import { createPage, getContent } from "@/lib/db/pages";
import { flattenTree } from "@/lib/db/tree";

const Editor = dynamic(() => import("@/components/editor/Editor"), { ssr: false });

/** Loads a page's content, then shows the editor for it. */
function PageEditor({ pageId }: { pageId: string }) {
  const [blocks, setBlocks] = useState<{ id: string; blocks: unknown[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getContent(pageId).then((c) => !cancelled && setBlocks({ id: pageId, blocks: c?.blocks ?? [] }));
    return () => {
      cancelled = true;
    };
  }, [pageId]);
  if (blocks?.id !== pageId) return <p className="p-2 text-sm text-muted">Loading…</p>;
  return <Editor key={pageId} pageId={pageId} initialBlocks={blocks.blocks} />;
}

/**
 * A notes panel inside Focus Mode, so you can write while looking at the view.
 * Starts on the page you came from (or the one linked to the timer).
 */
export function NotesPanel({ initialPageId, onClose }: { initialPageId: string | null; onClose: () => void }) {
  const pages = usePages();
  const [pageId, setPageId] = useState<string | null>(initialPageId);
  const options = useMemo(() => (pages ? flattenTree(pages, new Set(pages.map((p) => p.id))) : []), [pages]);
  const valid = pageId && pages?.some((p) => p.id === pageId && p.deletedAt === null) ? pageId : null;

  return (
    <aside
      aria-label="Notes"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface/95 text-ink shadow-pop backdrop-blur"
    >
      <div className="flex items-center gap-2 border-b border-line p-2.5">
        <select
          value={valid ?? ""}
          onChange={(e) => setPageId(e.target.value || null)}
          aria-label="Page to write in"
          className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm outline-none focus:border-accent"
        >
          <option value="">Choose a page…</option>
          {options.map(({ page, depth }) => (
            <option key={page.id} value={page.id}>
              {"  ".repeat(depth)}
              {page.icon ? `${page.icon} ` : ""}
              {page.title || "Untitled"}
            </option>
          ))}
        </select>
        <button type="button" onClick={onClose} aria-label="Close notes" className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <div className="focus-notes flex-1 overflow-x-hidden overflow-y-auto py-4">
        {valid ? (
          <PageEditor pageId={valid} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted">
            <p>Pick a page above, or start a fresh one for this session.</p>
            <button
              type="button"
              onClick={async () => {
                const page = await createPage({ title: `Focus notes — ${formatShortDate(toISODate())}`, icon: "📝" });
                setPageId(page.id);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink"
            >
              <FilePlus2 className="size-4" /> New notes page
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
