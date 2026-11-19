"use client";

import { FileText, RotateCcw, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { deletePageForever, emptyTrash, restorePage } from "@/lib/db/pages";
import { trashRoots } from "@/lib/db/tree";
import type { Page } from "@/lib/db/types";

function timeAgo(ms: number) {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(ms).toLocaleDateString();
}

/** Lists trashed pages with Restore / Delete forever. */
export function TrashDialog({ open, onClose, pages }: { open: boolean; onClose: () => void; pages: Page[] }) {
  const items = trashRoots(pages);

  return (
    <Dialog open={open} onClose={onClose} title="Trash">
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">The trash is empty.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1">
            {items.map((page) => (
              <li key={page.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover">
                <span className="flex w-5 justify-center">{page.icon ?? <FileText className="size-4 text-faint" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{page.title || "Untitled"}</span>
                  <span className="block text-xs text-faint">Deleted {timeAgo(page.deletedAt!)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => restorePage(page.id)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface hover:text-ink"
                >
                  <RotateCcw className="size-3.5" /> Restore
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete “${page.title || "Untitled"}” and its sub-pages forever? This can't be undone.`)) {
                      void deletePageForever(page.id);
                    }
                  }}
                  aria-label={`Delete ${page.title || "Untitled"} forever`}
                  className="rounded-md p-1.5 text-danger hover:bg-surface"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end border-t border-line pt-4">
            <button
              type="button"
              onClick={() => {
                if (confirm("Permanently delete everything in the trash? This can't be undone.")) void emptyTrash();
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-danger hover:bg-hover"
            >
              Empty trash
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
