"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useCurrentPageId } from "@/hooks/useNavigation";
import { moveToTopLevel, movePage, type DropPosition } from "@/lib/db/pages";
import { descendantIds, flattenTree } from "@/lib/db/tree";
import type { Page } from "@/lib/db/types";
import { useUI } from "@/stores/ui";
import { TreeItem } from "./TreeItem";

const ROOT_DROP_ID = "__top-level__";

/** Where the pointer is on screen, worked out from the drag's start point + movement. */
function pointerY(event: DragMoveEvent): number {
  const start = event.activatorEvent as MouseEvent | TouchEvent;
  const startY = "touches" in start ? (start.touches[0] ?? start.changedTouches[0]).clientY : start.clientY;
  return startY + event.delta.y;
}

/** Top 25% of a row = drop above, bottom 25% = below, middle = nest inside. */
function positionFor(y: number, rect: { top: number; height: number }): DropPosition {
  const ratio = (y - rect.top) / rect.height;
  if (ratio < 0.25) return "before";
  if (ratio > 0.75) return "after";
  return "inside";
}

export function PageTree({ pages }: { pages: Page[] }) {
  const currentId = useCurrentPageId();
  const expandedIds = useUI((s) => s.expandedIds);
  const setExpanded = useUI((s) => s.setExpanded);
  const rows = useMemo(() => flattenTree(pages, expandedIds), [pages, expandedIds]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; position: DropPosition } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  // Mouse: start dragging after moving 6px (so normal clicks still work).
  // Touch: press and hold briefly (so scrolling the sidebar still works).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  // A page can't be dropped onto itself or into its own sub-pages.
  const blocked = useMemo(
    () => (activeId ? new Set([activeId, ...descendantIds(pages, activeId)]) : new Set<string>()),
    [activeId, pages],
  );

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragMove = (e: DragMoveEvent) => {
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || overId === ROOT_DROP_ID || blocked.has(overId)) {
      setDrop(overId === ROOT_DROP_ID ? { id: ROOT_DROP_ID, position: "after" } : null);
      return;
    }
    const position = positionFor(pointerY(e), e.over!.rect);
    if (drop?.id !== overId || drop.position !== position) setDrop({ id: overId, position });
  };

  const onDragEnd = async () => {
    const id = activeId;
    const target = drop;
    setActiveId(null);
    setDrop(null);
    if (!id || !target) return;
    if (target.id === ROOT_DROP_ID) {
      await moveToTopLevel(id);
    } else {
      const moved = await movePage(id, target.id, target.position);
      if (moved && target.position === "inside") setExpanded(target.id, true);
    }
  };

  const activePage = activeId ? pages.find((p) => p.id === activeId) : undefined;

  if (rows.length === 0) {
    return <p className="px-3 py-2 text-sm text-faint">No pages yet.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setDrop(null);
      }}
    >
      <div role="list" aria-label="Pages" className="flex flex-col gap-px">
        {rows.map((row) => (
          <TreeItem
            key={row.page.id}
            row={row}
            isActive={row.page.id === currentId}
            isDragging={row.page.id === activeId}
            dropPosition={drop?.id === row.page.id ? drop.position : null}
            isRenaming={renamingId === row.page.id}
            onRename={setRenamingId}
          />
        ))}
      </div>
      <TopLevelDropZone visible={activeId !== null} active={drop?.id === ROOT_DROP_ID} />

      <DragOverlay dropAnimation={null}>
        {activePage && (
          <div className="flex h-8 items-center gap-2 rounded-lg bg-surface px-3 text-sm text-ink shadow-pop">
            <span className="text-base leading-none">{activePage.icon ?? <FileText className="size-4 text-faint" />}</span>
            <span className="max-w-48 truncate">{activePage.title || "Untitled"}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** Drop here to move a page back to the top level. Only shown while dragging. */
function TopLevelDropZone({ visible, active }: { visible: boolean; active: boolean }) {
  const { setNodeRef } = useDroppable({ id: ROOT_DROP_ID });
  return (
    <div
      ref={setNodeRef}
      aria-hidden
      className={`mt-1 flex h-9 items-center justify-center rounded-lg border border-dashed text-xs transition-opacity ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      } ${active ? "border-accent bg-accent-soft text-ink" : "border-line text-faint"}`}
    >
      Move to top level
    </div>
  );
}
