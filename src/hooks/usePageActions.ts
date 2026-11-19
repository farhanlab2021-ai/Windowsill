"use client";

import { useCallback } from "react";
import { createPage, restorePage, trashPage } from "@/lib/db/pages";
import type { Page } from "@/lib/db/types";
import { useUI } from "@/stores/ui";
import { useCurrentPageId, useOpenPage } from "./useNavigation";

/** Common page actions that also update the UI (open the page, show a toast…). */
export function usePageActions() {
  const openPage = useOpenPage();
  const currentId = useCurrentPageId();
  const setExpanded = useUI((s) => s.setExpanded);
  const showToast = useUI((s) => s.showToast);

  /** Creates a page (optionally inside another) and opens it. */
  const createAndOpen = useCallback(
    async (parentId: string | null = null) => {
      const page = await createPage({ parentId });
      if (parentId) setExpanded(parentId, true);
      openPage(page.id);
      return page;
    },
    [openPage, setExpanded],
  );

  /** Moves a page to the trash, with an "Undo" button in a toast. */
  const trashWithUndo = useCallback(
    async (page: Page) => {
      const ids = await trashPage(page.id);
      if (currentId && ids.includes(currentId)) openPage(null);
      showToast({
        message: `Moved “${page.title || "Untitled"}” to the trash`,
        action: { label: "Undo", run: () => void restorePage(page.id) },
      });
    },
    [currentId, openPage, showToast],
  );

  return { createAndOpen, trashWithUndo, openPage };
}
