"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  CornerDownRight,
  CornerUpLeft,
  FilePlus2,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Menu } from "@/components/ui/Menu";
import { usePageActions } from "@/hooks/usePageActions";
import { indent, moveDown, moveUp, outdent, toggleFavorite, updatePage } from "@/lib/db/pages";
import type { TreeRow } from "@/lib/db/tree";
import { useUI } from "@/stores/ui";
import type { DropPosition } from "@/lib/db/pages";

interface TreeItemProps {
  row: TreeRow;
  isActive: boolean;
  isDragging: boolean;
  dropPosition: DropPosition | null;
  isRenaming: boolean;
  onRename: (id: string | null) => void;
}

const INDENT_PX = 14;

/** One row in the page tree: expand arrow, icon, title and hover actions. */
export function TreeItem({ row, isActive, isDragging, dropPosition, isRenaming, onRename }: TreeItemProps) {
  const { page, depth, hasChildren, isExpanded } = row;
  const setExpanded = useUI((s) => s.setExpanded);
  const { createAndOpen, trashWithUndo, openPage } = usePageActions();

  const { setNodeRef: setDragRef, listeners: dragListeners, attributes: dragAttributes } = useDraggable({ id: page.id });
  const { setNodeRef: setDropRef } = useDroppable({ id: page.id });
  const title = page.title || "Untitled";

  return (
    <div
      ref={setDropRef}
      role="listitem"
      className={`group relative flex h-8 items-center rounded-lg pr-1 text-sm transition-colors ${
        isActive ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover/70 hover:text-ink"
      } ${isDragging ? "opacity-40" : ""} ${dropPosition === "inside" ? "bg-accent-soft ring-1 ring-accent" : ""}`}
      style={{ paddingLeft: 4 + depth * INDENT_PX }}
    >
      {/* Drop indicators for "above" / "below". */}
      {dropPosition === "before" && <span className="absolute -top-px right-1 left-2 h-0.5 rounded bg-accent" />}
      {dropPosition === "after" && <span className="absolute right-1 -bottom-px left-2 h-0.5 rounded bg-accent" />}

      {hasChildren ? (
        <button
          type="button"
          onClick={() => setExpanded(page.id, !isExpanded)}
          aria-expanded={isExpanded}
          aria-label={`Sub-pages of ${title}`}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-faint hover:bg-hover hover:text-ink"
        >
          <ChevronRight className={`size-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </button>
      ) : (
        <span className="size-6 shrink-0" />
      )}

      {isRenaming ? (
        <RenameInput
          initial={page.title}
          onDone={(value) => {
            if (value !== null) void updatePage(page.id, { title: value });
            onRename(null);
          }}
        />
      ) : (
        <button
          ref={setDragRef}
          {...dragListeners}
          {...dragAttributes}
          type="button"
          onClick={() => openPage(page.id)}
          onDoubleClick={() => onRename(page.id)}
          aria-current={isActive ? "page" : undefined}
          className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-1 text-left outline-offset-0"
        >
          <span className="flex w-5 shrink-0 justify-center text-base leading-none">
            {page.icon ?? <FileText className="size-4 text-faint" />}
          </span>
          <span className="truncate">{title}</span>
        </button>
      )}

      {!isRenaming && (
        <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 max-md:opacity-100">
          <Menu
            label={`Actions for ${title}`}
            trigger={(props) => (
              <button {...props} type="button" aria-label={`Actions for ${title}`} className="rounded-md p-1 text-faint hover:bg-hover hover:text-ink">
                <MoreHorizontal className="size-4" />
              </button>
            )}
            items={[
              { label: "Add sub-page", icon: <FilePlus2 />, onSelect: () => void createAndOpen(page.id) },
              { label: "Rename", icon: <Pencil />, onSelect: () => onRename(page.id) },
              {
                label: page.isFavorite ? "Remove from favourites" : "Add to favourites",
                icon: <Star />,
                onSelect: () => void toggleFavorite(page.id),
              },
              "separator",
              { label: "Move up", icon: <ArrowUp />, onSelect: () => void moveUp(page.id) },
              { label: "Move down", icon: <ArrowDown />, onSelect: () => void moveDown(page.id) },
              { label: "Nest in page above", icon: <CornerDownRight />, onSelect: () => void indent(page.id) },
              { label: "Move out of parent", icon: <CornerUpLeft />, disabled: !page.parentId, onSelect: () => void outdent(page.id) },
              "separator",
              { label: "Move to trash", icon: <Trash2 />, danger: true, onSelect: () => void trashWithUndo(page) },
            ]}
          />
          <button
            type="button"
            onClick={() => void createAndOpen(page.id)}
            aria-label={`Add a page inside ${title}`}
            title="Add a page inside"
            className="rounded-md p-1 text-faint hover:bg-hover hover:text-ink"
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (value: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = (value: string | null) => {
    if (finished.current) return;
    finished.current = true;
    onDone(value);
  };

  return (
    <input
      ref={ref}
      defaultValue={initial}
      aria-label="Page name"
      onBlur={(e) => finish(e.target.value.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(e.currentTarget.value.trim());
        if (e.key === "Escape") finish(null);
      }}
      className="mr-1 h-6 min-w-0 flex-1 rounded-md border border-accent bg-surface px-1.5 text-sm text-ink outline-none"
    />
  );
}
