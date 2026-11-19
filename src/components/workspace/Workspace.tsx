"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { PageView } from "@/components/page/PageView";
import { SearchPalette } from "@/components/search/SearchPalette";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { TemplateDialog } from "@/components/templates/TemplateDialog";
import { StatsView } from "@/components/stats/StatsView";
import { useCurrentPageId, useCurrentView } from "@/hooks/useNavigation";
import { unlockAudio } from "@/lib/audio/chime";
import { useTimer } from "@/stores/timer";
import { usePageActions } from "@/hooks/usePageActions";
import { usePages } from "@/hooks/usePages";
import { restorePage } from "@/lib/db/pages";
import { seedWelcomePage } from "@/lib/welcome";
import { useUI } from "@/stores/ui";
import { Home } from "./Home";

/** The whole notes app: sidebar on the left, the open page (or Home) on the right. */
export function Workspace() {
  const pages = usePages();
  const currentId = useCurrentPageId();
  const view = useCurrentView();
  const { createAndOpen, openPage } = usePageActions();
  const hydrateExpanded = useUI((s) => s.hydrateExpanded);
  const setSearchOpen = useUI((s) => s.setSearchOpen);

  useEffect(() => hydrateExpanded(), [hydrateExpanded]);

  // First visit on this device: create and open the welcome page.
  useEffect(() => {
    if (pages && pages.length === 0) {
      void seedWelcomePage().then((id) => id && openPage(id));
    }
  }, [pages, openPage]);

  // Keyboard shortcuts: Alt + N = new page, Alt + T = start/pause timer, Ctrl/Cmd + K = search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyN") {
        e.preventDefault();
        void createAndOpen(null);
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyT") {
        e.preventDefault();
        unlockAudio();
        useTimer.getState().toggle();
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        // With text selected in the editor, Ctrl/Cmd + K adds a link instead (BlockNote's shortcut).
        const selection = window.getSelection();
        const inEditor = (e.target as HTMLElement | null)?.closest?.(".windowsill-editor");
        if (inEditor && selection && !selection.isCollapsed) return;
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(!useUI.getState().searchOpen);
      }
      // "?" opens Settings, which lists every shortcut (not while typing).
      const target = e.target as HTMLElement | null;
      const typing = target?.closest?.("input, textarea, select, [contenteditable=true]");
      if (e.key === "?" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        useUI.getState().setSettingsOpen(true);
      }
    };
    // "capture" so we see the key before the editor does.
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [createAndOpen, setSearchOpen]);

  if (!pages) return <WorkspaceSkeleton />;

  const page = currentId ? pages.find((p) => p.id === currentId) : undefined;

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Lets keyboard and screen-reader users jump past the sidebar. */}
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Sidebar pages={pages} />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto focus:outline-none">
        {view === "stats" ? (
          <StatsView pages={pages} />
        ) : !currentId ? (
          <Home pages={pages} />
        ) : !page ? (
          <Message title="Page not found" body="It may have been deleted forever." action={{ label: "Go home", run: () => openPage(null) }} />
        ) : page.deletedAt !== null ? (
          <Message
            title="This page is in the trash"
            body="Restore it to keep editing."
            action={{ label: "Restore page", run: () => void restorePage(page.id), icon: <RotateCcw className="size-4" /> }}
          />
        ) : (
          <PageView page={page} />
        )}
      </main>
      <SearchPalette pages={pages} />
      <TemplateDialog />
      <SettingsDialog />
    </div>
  );
}

function Message({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { label: string; run: () => void; icon?: React.ReactNode };
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="font-serif text-2xl font-semibold">{title}</h1>
      <p className="text-muted">{body}</p>
      <button
        type="button"
        onClick={action.run}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90"
      >
        {action.icon}
        {action.label}
      </button>
    </div>
  );
}

/** Shown for a split second while the local database opens. */
export function WorkspaceSkeleton() {
  return (
    <div className="flex h-dvh" aria-busy="true" aria-label="Loading Windowsill">
      <div className="hidden w-64 shrink-0 border-r border-line bg-sidebar md:block" />
      <div className="flex-1" />
    </div>
  );
}
