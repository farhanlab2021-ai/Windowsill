"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { useCallback, useEffect, useRef } from "react";
import { useResolvedTheme } from "@/hooks/useTheme";
import { resolveAssetUrl, saveAsset } from "@/lib/db/assets";
import { saveContent } from "@/lib/db/pages";
import { blocksToPlainText } from "@/lib/editor/plainText";
import { getSlashMenuItems, schema } from "./schema";

export type SaveStatus = "saved" | "saving" | "unsaved";

interface EditorProps {
  pageId: string;
  initialBlocks: unknown[];
  onStatusChange?: (status: SaveStatus) => void;
}

const AUTOSAVE_DELAY_MS = 600;

/**
 * The block editor for one page. It's re-created whenever the open page
 * changes (the parent gives it `key={pageId}`), which keeps things simple.
 *
 * Autosave: every change starts a short timer; when typing pauses for
 * AUTOSAVE_DELAY_MS the document is written to IndexedDB. Pending changes are
 * also flushed when switching pages or hiding/closing the tab.
 */
export default function Editor({ pageId, initialBlocks, onStatusChange }: EditorProps) {
  const theme = useResolvedTheme();

  const editor = useCreateBlockNote({
    schema,
    // BlockNote requires a non-empty array, or undefined for a blank page.
    initialContent: initialBlocks.length ? (initialBlocks as never) : undefined,
    // Images are stored in IndexedDB (works offline) and shown via blob URLs.
    uploadFile: (file: File) => saveAsset(file),
    resolveFileUrl: resolveAssetUrl,
    placeholders: { default: "Type '/' for blocks, or just start writing…" },
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    onStatusChange?.("saving");
    const blocks = editor.document;
    await saveContent(pageId, blocks, blocksToPlainText(blocks));
    if (!dirty.current) onStatusChange?.("saved");
  }, [editor, pageId, onStatusChange]);

  const handleChange = useCallback(() => {
    dirty.current = true;
    onStatusChange?.("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, AUTOSAVE_DELAY_MS);
  }, [save, onStatusChange]);

  // Flush pending changes when the tab is hidden or this editor unmounts.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void save();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", save);
      void save();
    };
  }, [save]);

  return (
    <div className="windowsill-editor">
      <BlockNoteView editor={editor} theme={theme} onChange={handleChange} slashMenu={false}>
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => getSlashMenuItems(editor, query)}
        />
      </BlockNoteView>
    </div>
  );
}
