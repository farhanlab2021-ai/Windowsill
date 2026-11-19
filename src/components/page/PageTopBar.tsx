"use client";

import { FilePlus2, Menu as MenuIcon, MoreHorizontal, Star, Trash2, Upload } from "lucide-react";
import { useImportFiles } from "@/hooks/useImportFiles";
import { Fragment } from "react";
import type { SaveStatus } from "@/components/editor/Editor";
import { FocusModeButton } from "@/components/focus/FocusModeButton";
import { TimerButton } from "@/components/timer/TimerButton";
import { Menu } from "@/components/ui/Menu";
import { usePageActions } from "@/hooks/usePageActions";
import { usePages } from "@/hooks/usePages";
import { toggleFavorite } from "@/lib/db/pages";
import { ancestorsOf } from "@/lib/db/tree";
import type { Page } from "@/lib/db/types";
import { useUI } from "@/stores/ui";

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Editing…",
};

/** Sticky bar above a page: breadcrumbs, save status, favourite and actions. */
export function PageTopBar({ page, status }: { page: Page; status: SaveStatus }) {
  const pages = usePages() ?? [];
  const { createAndOpen, trashWithUndo, openPage } = usePageActions();
  const setSidebarOpen = useUI((s) => s.setSidebarOpen);
  const importFiles = useImportFiles();
  const crumbs = ancestorsOf(pages, page.id);

  return (
    <div className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-transparent bg-canvas/85 px-3 backdrop-blur md:px-4">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
        className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink md:hidden"
      >
        <MenuIcon className="size-5" />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted">
        {crumbs.map((p) => (
          <Fragment key={p.id}>
            <button
              type="button"
              onClick={() => openPage(p.id)}
              className="max-w-40 truncate rounded-md px-1.5 py-0.5 hover:bg-hover hover:text-ink max-sm:hidden"
            >
              {p.icon && <span className="mr-1">{p.icon}</span>}
              {p.title || "Untitled"}
            </button>
            <span className="text-faint max-sm:hidden">/</span>
          </Fragment>
        ))}
        <span className="truncate px-1.5 text-ink" aria-current="page">
          {page.icon && <span className="mr-1">{page.icon}</span>}
          {page.title || "Untitled"}
        </span>
      </nav>

      <span className="text-xs text-faint max-sm:hidden" aria-live="polite">
        {STATUS_TEXT[status]}
      </span>

      <FocusModeButton fromPageId={page.id} />
      <TimerButton />

      <button
        type="button"
        onClick={() => toggleFavorite(page.id)}
        aria-pressed={page.isFavorite}
        aria-label={page.isFavorite ? "Remove from favourites" : "Add to favourites"}
        title={page.isFavorite ? "Remove from favourites" : "Add to favourites"}
        className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink"
      >
        <Star className={`size-4 ${page.isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
      </button>

      <Menu
        label="Page actions"
        trigger={(props) => (
          <button {...props} type="button" aria-label="Page actions" className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink">
            <MoreHorizontal className="size-4" />
          </button>
        )}
        items={[
          { label: "Add sub-page", icon: <FilePlus2 />, onSelect: () => void createAndOpen(page.id) },
          { label: "Import files as sub-pages", icon: <Upload />, onSelect: () => importFiles(page.id) },
          "separator",
          { label: "Move to trash", icon: <Trash2 />, danger: true, onSelect: () => void trashWithUndo(page) },
        ]}
      />
    </div>
  );
}
