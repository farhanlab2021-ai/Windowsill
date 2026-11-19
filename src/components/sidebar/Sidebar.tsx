"use client";

import { AppLink } from "@/components/ui/AppLink";
import { AppWindow, BarChart3, FileText, LayoutTemplate, Monitor, Moon, Plus, Search, Settings, Sun, Trash2, Upload, X } from "lucide-react";
import { useImportFiles } from "@/hooks/useImportFiles";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Menu } from "@/components/ui/Menu";
import { useCurrentPageId, useCurrentView, useOpenView } from "@/hooks/useNavigation";
import { usePageActions } from "@/hooks/usePageActions";
import { useTheme } from "@/hooks/useTheme";
import { compareByOrder } from "@/lib/db/tree";
import type { Page } from "@/lib/db/types";
import { modKeyLabel } from "@/lib/platform";
import { useUI } from "@/stores/ui";
import { PageTree } from "./PageTree";
import { TrashDialog } from "./TrashDialog";

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 pt-4 pb-1">
      <h2 className="text-[11px] font-semibold tracking-wider text-faint uppercase">{children}</h2>
      {action}
    </div>
  );
}

function ThemeMenu() {
  const { choice, setTheme } = useTheme();
  const Icon = choice === "dark" ? Moon : choice === "light" ? Sun : Monitor;
  return (
    <Menu
      label="Theme"
      trigger={(props) => (
        <button {...props} type="button" aria-label="Change theme" title="Theme" className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink">
          <Icon className="size-4" />
        </button>
      )}
      items={[
        { label: "Light", icon: <Sun />, onSelect: () => setTheme("light") },
        { label: "Dark", icon: <Moon />, onSelect: () => setTheme("dark") },
        { label: "Match system", icon: <Monitor />, onSelect: () => setTheme("system") },
      ]}
    />
  );
}

/** The left sidebar: favourites, the page tree and the trash. A drawer on phones. */
export function Sidebar({ pages }: { pages: Page[] }) {
  const open = useUI((s) => s.sidebarOpen);
  const setOpen = useUI((s) => s.setSidebarOpen);
  const currentId = useCurrentPageId();
  const { createAndOpen, openPage } = usePageActions();
  const [trashOpen, setTrashOpen] = useState(false);
  const setTemplateDialogOpen = useUI((s) => s.setTemplateDialogOpen);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const importFiles = useImportFiles();
  const view = useCurrentView();
  const openView = useOpenView();

  const favourites = pages.filter((p) => p.isFavorite && p.deletedAt === null).sort(compareByOrder);
  const trashCount = pages.filter((p) => p.deletedAt !== null).length;

  return (
    <>
      {/* Dimmed background behind the drawer on phones. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-sidebar transition-transform md:static md:w-64 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full max-md:invisible"
        }`}
      >
        <div className="flex h-12 items-center gap-2 px-3">
          <Logo />
          <span className="flex-1 font-serif text-lg font-semibold tracking-tight">Windowsill</span>
          <ThemeMenu />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-2">
          <button
            type="button"
            onClick={() => void createAndOpen(null)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-hover"
          >
            <Plus className="size-4 text-accent" /> New page
            <kbd className="ml-auto font-sans text-xs text-faint max-md:hidden">Alt N</kbd>
          </button>
          <button
            type="button"
            onClick={() => setTemplateDialogOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-hover hover:text-ink"
          >
            <LayoutTemplate className="size-4" /> New from template
          </button>
          <button
            type="button"
            onClick={() => importFiles(null)}
            title="Import PDF, PowerPoint, Word, Markdown, text or web-page files as pages (or a backup)"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-hover hover:text-ink"
          >
            <Upload className="size-4" /> Import file
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-hover hover:text-ink"
          >
            <Search className="size-4" /> Search
            <kbd className="ml-auto font-sans text-xs text-faint max-md:hidden">{modKeyLabel()} K</kbd>
          </button>
          <button
            type="button"
            onClick={() => openView("stats")}
            aria-current={view === "stats" ? "page" : undefined}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-hover hover:text-ink ${
              view === "stats" ? "bg-hover font-medium text-ink" : "text-muted"
            }`}
          >
            <BarChart3 className="size-4" /> Focus stats
          </button>
          <AppLink
            href={currentId ? `/focus?from=${encodeURIComponent(currentId)}` : "/focus"}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-hover hover:text-ink"
          >
            <AppWindow className="size-4" /> Focus mode
          </AppLink>
        </div>

        <nav aria-label="Pages" className="flex-1 overflow-y-auto px-2 pb-4">
          {favourites.length > 0 && (
            <>
              <SectionTitle>Favourites</SectionTitle>
              <ul className="flex flex-col gap-px">
                {favourites.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => openPage(p.id)}
                      aria-current={p.id === currentId ? "page" : undefined}
                      className={`flex h-8 w-full items-center gap-1.5 rounded-lg px-2 text-left text-sm ${
                        p.id === currentId ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover/70 hover:text-ink"
                      }`}
                    >
                      <span className="flex w-5 justify-center">{p.icon ?? <FileText className="size-4 text-faint" />}</span>
                      <span className="truncate">{p.title || "Untitled"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <SectionTitle
            action={
              <button
                type="button"
                onClick={() => void createAndOpen(null)}
                aria-label="Add a page"
                className="rounded-md p-0.5 text-faint hover:bg-hover hover:text-ink"
              >
                <Plus className="size-3.5" />
              </button>
            }
          >
            Pages
          </SectionTitle>
          <PageTree pages={pages} />
        </nav>

        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={() => setTrashOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-hover hover:text-ink"
          >
            <Trash2 className="size-4" /> Trash
            {trashCount > 0 && <span className="ml-auto text-xs text-faint">{trashCount}</span>}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-hover hover:text-ink"
          >
            <Settings className="size-4" /> Settings &amp; backup
          </button>
        </div>
      </aside>

      <TrashDialog open={trashOpen} onClose={() => setTrashOpen(false)} pages={pages} />
    </>
  );
}
