/**
 * Full-text search across pages, using MiniSearch (runs entirely in the
 * browser, so it works offline). Matches titles and page text, tolerates small
 * typos ("mitocondria") and finds words as you type them ("mito").
 */
import MiniSearch from "minisearch";
import type { Page } from "../db/types";

export interface Snippet {
  before: string;
  match: string;
  after: string;
}

export interface SearchResult {
  page: Page;
  /** A short piece of the page text around the first match, if the match was in the text. */
  snippet: Snippet | null;
}

interface SearchDoc {
  id: string;
  title: string;
  text: string;
}

/**
 * Builds a search function for the given pages.
 * `texts` maps a page id to its plain text (from the `contents` table).
 */
export function createPageSearch(pages: Page[], texts: Map<string, string>) {
  const live = pages.filter((p) => p.deletedAt === null);
  const byId = new Map(live.map((p) => [p.id, p]));

  const index = new MiniSearch<SearchDoc>({
    fields: ["title", "text"],
    searchOptions: {
      boost: { title: 3 }, // a match in the title counts more
      prefix: true,
      fuzzy: (term) => (term.length > 3 ? 0.2 : false), // allow typos in longer words only
      combineWith: "AND", // every word must match
    },
  });
  index.addAll(live.map((p) => ({ id: p.id, title: p.title || "Untitled", text: texts.get(p.id) ?? "" })));

  return function search(query: string, limit = 20): SearchResult[] {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return index
      .search(trimmed)
      .slice(0, limit)
      .flatMap((hit) => {
        const page = byId.get(String(hit.id));
        if (!page) return [];
        const inText = hit.terms.some((term) => hit.match[term]?.includes("text"));
        const snippet = inText ? makeSnippet(texts.get(page.id) ?? "", hit.terms) : null;
        return [{ page, snippet }];
      });
  };
}

/**
 * Cuts out ~`radius` characters on each side of the first matching word, so
 * results can show the match in context: "…the mitochondria is the power…".
 */
export function makeSnippet(text: string, terms: string[], radius = 50): Snippet | null {
  const lower = text.toLowerCase();
  let best = -1;
  let length = 0;
  for (const term of terms) {
    const at = lower.indexOf(term.toLowerCase());
    if (at !== -1 && (best === -1 || at < best)) {
      best = at;
      length = term.length;
    }
  }
  if (best === -1) return null;

  // Expand the match to the whole word it's part of ("mito" → "mitochondria").
  let end = best + length;
  while (end < text.length && /[\p{L}\p{N}]/u.test(text[end])) end++;

  // Start and stop on word boundaries so the snippet doesn't begin mid-word.
  let start = Math.max(0, best - radius);
  if (start > 0) {
    const space = text.indexOf(" ", start);
    start = space !== -1 && space < best ? space + 1 : start;
  }
  let stop = Math.min(text.length, end + radius);
  if (stop < text.length) {
    const space = text.lastIndexOf(" ", stop);
    stop = space > end ? space : stop;
  }
  const clean = (s: string) => s.replace(/\s+/g, " ");
  return {
    before: (start > 0 ? "…" : "") + clean(text.slice(start, best)).trimStart(),
    match: text.slice(best, end),
    after: clean(text.slice(end, stop)).trimEnd() + (stop < text.length ? "…" : ""),
  };
}
