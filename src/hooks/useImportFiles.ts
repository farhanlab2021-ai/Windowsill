"use client";

import { useCallback } from "react";
import { IMPORT_ACCEPT } from "@/lib/import/fileTypes";
import { useUI } from "@/stores/ui";
import { useOpenPage } from "./useNavigation";

/**
 * Returns a function that opens the device's file picker and imports the
 * chosen files as new pages (inside `parentId` if given), then opens the last
 * one and shows a short summary.
 */
export function useImportFiles() {
  const openPage = useOpenPage();
  const setExpanded = useUI((s) => s.setExpanded);
  const showToast = useUI((s) => s.showToast);

  return useCallback(
    (parentId: string | null = null) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = IMPORT_ACCEPT;
      input.hidden = true;
      // Some phones only open the picker for an input that's on the page.
      document.body.appendChild(input);
      input.addEventListener("cancel", () => input.remove());
      input.addEventListener("change", async () => {
        const files = Array.from(input.files ?? []);
        input.remove();
        if (files.length === 0) return;
        // The import code (and its converters) loads only now, when it's needed.
        const { importFiles, describeImport } = await import("@/lib/import/importFiles");
        const result = await importFiles(files, parentId);
        if (parentId && result.pages.length) setExpanded(parentId, true);
        showToast({ message: describeImport(result) });
        const last = result.pages.at(-1);
        if (last) openPage(last.id);
      });
      input.click();
    },
    [openPage, setExpanded, showToast],
  );
}
