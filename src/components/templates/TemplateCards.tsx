"use client";

import { gradientCss } from "@/lib/covers";
import { gradientCoverValue } from "@/lib/covers";
import { TEMPLATES, type Template } from "@/lib/templates";

/** A grid of template cards (used in the template dialog and on Home). */
export function TemplateCards({ onPick, compact = false }: { onPick: (t: Template) => void; compact?: boolean }) {
  return (
    <ul className={`grid gap-3 ${compact ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
      {TEMPLATES.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onPick(t)}
            className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-line bg-surface text-left transition-shadow hover:shadow-pop"
          >
            <span className="h-2 w-full" style={{ background: gradientCss(gradientCoverValue(t.cover)) ?? undefined }} />
            <span className="flex flex-1 gap-3 p-3">
              <span className="text-2xl leading-none">{t.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink [overflow-wrap:anywhere]">{t.name}</span>
                {!compact && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t.description}</span>}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** A compact row of template chips, shown on a brand-new empty page. */
export function TemplateChips({ onPick }: { onPick: (t: Template) => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-4">
      <p className="mb-3 text-sm text-muted">Start with a template, or just start writing below.</p>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            title={t.description}
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:border-accent hover:bg-accent-soft"
          >
            <span aria-hidden>{t.icon}</span>
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
