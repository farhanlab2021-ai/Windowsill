"use client";

import { FileText, Plus, Upload } from "lucide-react";
import { useImportFiles } from "@/hooks/useImportFiles";
import { TemplateCards } from "@/components/templates/TemplateCards";
import { SimpleTopBar } from "./SimpleTopBar";
import { usePageActions } from "@/hooks/usePageActions";
import { createPageFromTemplate } from "@/lib/templates";
import { gradientCss } from "@/lib/covers";
import type { Page } from "@/lib/db/types";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Shown when no page is open: a greeting and recently edited pages. */
export function Home({ pages }: { pages: Page[] }) {
  const { createAndOpen, openPage } = usePageActions();
  const importFiles = useImportFiles();
  const recent = pages
    .filter((p) => p.deletedAt === null)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);

  return (
    <>
    <SimpleTopBar />
    <div className="mx-auto w-full max-w-3xl px-5 pt-4 pb-6 md:px-14 md:pt-10 md:pb-16">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">{greeting()}.</h1>
      <p className="mt-2 text-muted">Pick up where you left off, or start something new.</p>

      <button
        type="button"
        onClick={() => void createAndOpen(null)}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink shadow-sm hover:opacity-90"
      >
        <Plus className="size-4" /> New page
      </button>
      <button
        type="button"
        onClick={() => importFiles(null)}
        className="mt-8 ml-2 inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-hover"
      >
        <Upload className="size-4" /> Import file
      </button>
      <p className="mt-2 text-xs text-muted">Import PDF, PowerPoint (.pptx), Word (.docx), Markdown (.md), text or web-page files as pages.</p>

      <section className="mt-12">
        <h2 className="mb-3 text-xs font-semibold tracking-wider text-faint uppercase">Start from a template</h2>
        <TemplateCards
          compact
          onPick={async (template) => openPage((await createPageFromTemplate(template)).id)}
        />
      </section>

      {recent.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-xs font-semibold tracking-wider text-faint uppercase">Recently edited</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((page) => (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => openPage(page.id)}
                  className="flex w-full flex-col overflow-hidden rounded-xl border border-line bg-surface text-left transition-shadow hover:shadow-pop"
                >
                  <span
                    className="h-12 w-full bg-accent-soft"
                    style={page.cover && gradientCss(page.cover) ? { background: gradientCss(page.cover)! } : undefined}
                  />
                  <span className="flex items-center gap-2 px-3 py-2.5">
                    <span className="text-lg leading-none">{page.icon ?? <FileText className="size-4 text-faint" />}</span>
                    <span className="truncate text-sm font-medium">{page.title || "Untitled"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
    </>
  );
}
