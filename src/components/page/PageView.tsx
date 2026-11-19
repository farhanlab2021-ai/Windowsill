"use client";

import { ImageIcon, SmilePlus } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus } from "@/components/editor/Editor";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Popover } from "@/components/ui/Popover";
import { TemplateChips } from "@/components/templates/TemplateCards";
import { getContent, updatePage } from "@/lib/db/pages";
import type { Page } from "@/lib/db/types";
import { applyTemplateToPage, type Template } from "@/lib/templates";
import { Cover, CoverPicker } from "./Cover";
import { PageTopBar } from "./PageTopBar";

// The editor needs the browser (it can't render on the server), so load it client-side only.
const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

function EditorSkeleton() {
  return (
    <div className="space-y-3 pt-2" aria-hidden>
      <div className="h-4 w-3/4 animate-pulse rounded bg-hover" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-hover" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-hover" />
    </div>
  );
}

/** The title field. Saves as you type and follows renames made in the sidebar. */
function TitleInput({ page, onEnter }: { page: Page; onEnter: () => void }) {
  const [value, setValue] = useState(page.title);
  const focused = useRef(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!focused.current) setValue(page.title);
  }, [page.title]);

  // A brand-new (untitled) page puts the cursor in the title, ready to type.
  const isUntitled = page.title === "";
  useEffect(() => {
    if (isUntitled) ref.current?.focus();
    // Only when switching pages, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  // Grow the textarea to fit long titles.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label="Page title"
      placeholder="Untitled"
      onFocus={() => (focused.current = true)}
      onBlur={() => (focused.current = false)}
      onChange={(e) => {
        const title = e.target.value.replace(/\n/g, "");
        setValue(title);
        void updatePage(page.id, { title });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        }
      }}
      className="w-full resize-none overflow-hidden bg-transparent focus-visible:outline-none font-serif text-4xl leading-tight font-semibold tracking-tight text-ink outline-none placeholder:text-faint/70 md:text-[2.75rem]"
    />
  );
}

export function PageView({ page }: { page: Page }) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  // Load the page body once per page (the editor then owns it until we switch pages).
  // `version` goes up when a template replaces the body, which re-creates the editor.
  const [initialBlocks, setInitialBlocks] = useState<{ id: string; blocks: unknown[]; version: number } | null>(null);
  // Which page the student has typed in (hides the template suggestions).
  const [editedPageId, setEditedPageId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getContent(page.id).then((content) => {
      if (!cancelled) setInitialBlocks({ id: page.id, blocks: content?.blocks ?? [], version: 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [page.id]);

  const handleStatus = useCallback(
    (next: SaveStatus) => {
      setStatus(next);
      if (next === "unsaved") setEditedPageId(page.id);
    },
    [page.id],
  );

  const pickTemplate = async (template: Template) => {
    const blocks = await applyTemplateToPage(page, template);
    setInitialBlocks((prev) => ({ id: page.id, blocks, version: (prev?.version ?? 0) + 1 }));
  };

  const showTemplates =
    initialBlocks?.id === page.id &&
    initialBlocks.blocks.length === 0 &&
    !page.templateId &&
    editedPageId !== page.id;

  const focusEditor = useCallback(() => {
    document.querySelector<HTMLElement>(".windowsill-editor [contenteditable=true]")?.focus();
  }, []);

  const iconPicker = (trigger: Parameters<typeof Popover>[0]["trigger"]) => (
    <Popover label="Choose an icon" trigger={trigger}>
      {(close) => (
        <EmojiPicker
          onSelect={(icon) => {
            void updatePage(page.id, { icon });
            close();
          }}
          onRemove={
            page.icon
              ? () => {
                  void updatePage(page.id, { icon: null });
                  close();
                }
              : undefined
          }
        />
      )}
    </Popover>
  );

  return (
    <div className="flex min-h-full flex-col">
      <PageTopBar page={page} status={status} />
      {page.cover && <Cover pageId={page.id} cover={page.cover} />}

      <article className="mx-auto w-full max-w-3xl flex-1 px-5 pb-40 md:px-14">
        <div className={`group ${page.cover ? (page.icon ? "-mt-10" : "pt-6") : "pt-10 md:pt-16"}`}>
          {page.icon &&
            iconPicker((props) => (
              <button
                {...props}
                type="button"
                aria-label="Change icon"
                className="relative mb-2 rounded-xl text-6xl leading-none transition-transform hover:scale-105"
              >
                {page.icon}
              </button>
            ))}

          {/* "Add icon / Add cover" appear on hover (always visible on phones). */}
          <div className="flex h-8 items-center gap-1 text-sm text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
            {!page.icon &&
              iconPicker((props) => (
                <button {...props} type="button" className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-hover hover:text-ink">
                  <SmilePlus className="size-4" /> Add icon
                </button>
              ))}
            {!page.cover && (
              <Popover
                label="Add a cover"
                trigger={(props) => (
                  <button {...props} type="button" className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-hover hover:text-ink">
                    <ImageIcon className="size-4" /> Add cover
                  </button>
                )}
              >
                {(close) => <CoverPicker pageId={page.id} hasCover={false} onDone={close} />}
              </Popover>
            )}
          </div>

          {/* key: a fresh title field per page, so text never carries over between pages. */}
          <TitleInput key={page.id} page={page} onEnter={focusEditor} />
        </div>

        {showTemplates && (
          <div className="mt-6">
            <TemplateChips onPick={pickTemplate} />
          </div>
        )}

        <div className="mt-4">
          {initialBlocks?.id === page.id ? (
            <Editor
              key={`${page.id}:${initialBlocks.version}`}
              pageId={page.id}
              initialBlocks={initialBlocks.blocks}
              onStatusChange={handleStatus}
            />
          ) : (
            <EditorSkeleton />
          )}
        </div>
      </article>
    </div>
  );
}
