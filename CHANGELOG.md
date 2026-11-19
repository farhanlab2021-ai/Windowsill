# Changelog

What was built in each phase of Windowsill.

## Phase 5 — Installable, offline, polish, deployment (2026-11-19)

### Added
- **Installable app (PWA):** a web app manifest (`src/app/manifest.ts`) with name, colours,
  shortcuts to Focus Mode and stats, and new **app icons**: a window with a sunset and a sill
  on sage green. They come in normal and "maskable" (phone) versions, plus an iPhone home-screen
  icon and a browser-tab icon, generated from `scripts/icon-art.mjs` with `npm run icons`.
- **Works offline:** a hand-written service worker (`public/sw.js`, ~150 commented lines).
  It saves both screens and the build files they use, opens pages from the network when online
  and from the saved copy when offline, and refreshes everything in the background after an
  update. Tested by stopping the server entirely: notes, editor, new pages, emoji picker, timer
  and Focus Mode all keep working.
- **Instant page switching** inside the notes (`history.pushState`), which also works offline.
  Links between the notes and Focus Mode are now normal page loads, which the service worker
  serves offline.
- **Emoji picker data is served from the app itself** (copied from `emojibase-data`), so the
  full emoji list works offline.
- **Settings & backup** (sidebar, or press `?`): theme; **Download backup** / **Restore from
  backup** (everything incl. images as one JSON file; restoring merges and never deletes);
  **Keep my data safe** (asks the browser not to clear storage; automatic when installed);
  install instructions; keyboard shortcut list.
- Timer notifications now go through the service worker (needed on Android), and tapping one
  brings Windowsill to the front.
- **Accessibility:** "Skip to content" link; the faint and muted text colours now meet WCAG AA
  contrast (4.5:1) on every background in light and dark mode.
- Basic security headers; `sw.js` is never cached by the browser, so updates arrive quickly.
- **README:** full guide to running, testing offline/install, deploying to Vercel (GitHub or
  CLI), adding media, backups and troubleshooting.
- **Tests:** backup round-trip (including images), merge rules, and rejecting invalid files.

### Changed
- The timer button says "Timer" when idle (it was "Focus", easy to confuse with "Focus mode").
- Template cards on Home use two columns until the screen is wide enough for three.
- If a scene video can't load (e.g. offline), Focus Mode falls back to the drawn scene.

## Phase 4 — Focus Mode (2026-11-19)

### Added
- **Focus Mode** at `/focus` (button in every top bar and the sidebar): a full-screen view through
  a painted window frame with glazing bars, glass reflection, and a windowsill with a plant and a
  steaming mug. The room's colours follow the light outside.
- **Two scenes**, hand-drawn and animated on a canvas (no files needed):
  - **Beach:** open sky with drifting clouds, the sea with glittering light, and two waves that roll
    up the sand and slide back, leaving wet sand.
  - **Mountain cliff:** four layers of ridges with haze, mist drifting through the valley, clouds,
    distant birds, and a grassy cliff edge in front.
  - Each in **day, sunset and night** (sun, moon, twinkling stars). **Auto** switches with your local
    time (day 7–17, sunset 17–20 and 5–7, night otherwise).
  - Movement is slow and subtle, runs at 30 fps, pauses in hidden tabs, and becomes a still picture
    with "reduce motion".
- **Timer on the glass:** large, frosted and readable over any scene, with the current task and page.
  Space or Alt + T starts/pauses.
- **Ambient sound mixer:** beach (waves, seagulls, light wind) and mountain (wind, birds, distant
  stream), each with its own volume slider, plus master volume and mute. Sounds are generated in the
  browser; recordings you add replace them and loop with no gap. Everything fades in and out.
- **Break sounds:** during breaks, play soft rain, keep the scene sounds, or go silent.
- **Notes panel** inside Focus Mode (side panel on large screens, bottom sheet on phones), opening
  the page you came from or the page linked to the timer, or a new "Focus notes" page.
- Controls fade away after 4 seconds without activity; full-screen toggle; Esc leaves.
- **Drop-in media:** add `public/scenes/<scene>/<time>.mp4` or `public/sounds/<scene>/<sound>.mp3`
  and it's used automatically. `scripts/media-manifest.mjs` lists them before dev/build, so the app
  never requests files that don't exist. Nothing is loaded until Focus Mode is opened.
- `CREDITS.md`, and a guide to finding and compressing free media in the README.
- **Tests:** scene definitions, automatic time of day, and the media manifest.

### Changed
- Toasts now live in the root layout, so timer messages also show in Focus Mode.
- **Sounds are opt-in:** Focus Mode always opens silent. A **Play sounds / Pause sounds** button in
  the control bar (also in the mixer, and the **M** key) starts and stops them with a fade. The
  "Sounds" button is now **Mixer** (volumes, mute, break sound), and volumes can be set while paused.

## Phase 3 — Pomodoro timer and stats (2026-11-19)

### Added
- **Pomodoro timer** (`src/lib/timer/engine.ts`): Classic 25/5 and Deep 50/10 presets plus Custom;
  a long break (default 15 min, or 20 with Deep; adjustable) after every 4 focus sessions (adjustable);
  Start / Pause / Resume, Skip, Reset; optional auto-start of the next session; pick the session type
  manually while stopped.
- **Accurate in the background:** the timer stores when a session *ends* and works out the time left
  from the clock, so it never drifts. A small Web Worker ticks every second so a hidden tab still
  notices the end promptly. If the computer was asleep, the session is recorded with its real end time.
- **Survives refreshes:** the running timer is saved in localStorage; several open tabs stay in sync
  and never record the same session twice.
- **Tab title** shows the time left: `▶ 24:13 · Focus — Windowsill` (⏸ while paused).
- **Soft chime** generated with Web Audio (falling notes = break time, rising notes = back to focus),
  plus a toast, plus a **browser notification** when the tab is in the background. Permission is asked
  politely inside the timer panel after the first Start, never on page load.
- **"What are you working on?"**: a task name and/or a linked page (one click to link the open page).
- **Focus stats** (`/?view=stats`, also in the sidebar): today, this week (from Monday), day streak,
  a last-7-days bar chart (hover/focus for values, "Show as table" alternative), and minutes per
  subject for this week or all time. Only completed sessions extend a streak; a streak isn't broken
  until the day is over. Focus sessions stopped after at least 1 minute count their real minutes.
- **Timer button** in the top bar of every screen; **Alt + T** starts/pauses from anywhere.
- **Tests:** timer engine (timestamps, pause, long-break cycle, auto-start, presets, skip/reset,
  settings, sleeping tabs) and stats (days, weeks, streaks, subjects, duplicate-safe saving).

## Phase 2 — Templates and search (2026-11-19)

### Added
- **Five student templates** (`src/lib/templates/`), each with its own icon and cover:
  - **Class Notes:** course, date, lecture topic, key points, notes, questions to ask, summary.
  - **Assignment Tracker:** table of assignment / course / due date / status / priority, with examples.
  - **Exam Planner:** overview table plus a section per exam with its date, days remaining,
    a syllabus checklist and a study plan.
  - **Weekly Timetable:** Mon–Sat grid from 8:00 to 17:00 and a "this week's focus" list.
  - **Reading List:** title / author / course / status / notes table and reading notes.
  - Example dates are relative to the day you create the page.
- **Three ways to use a template:** suggestions on a new empty page (keeps the title you typed),
  "New from template" in the sidebar, and template cards on the Home screen.
- **Date chip** (new inline element): shows a date and how far away it is ("Fri, Dec 5 · in 12 days").
  Amber when 3 days or less, grey once past. Click to change the date. Works in tables. Insert with
  `/` → **Date**.
- **Search (Ctrl/Cmd + K, or "Search" in the sidebar):** searches page titles and text, offline,
  with partial words ("mito") and small typos ("mitocondria"). Shows where each page lives and a
  highlighted snippet. Empty box = recently edited pages. "Create page …" if nothing fits.
  With text selected in the editor, Ctrl/Cmd + K still adds a link.
- **Tests:** templates (valid blocks, tidy tables, relative dates, create/apply), search
  (title/text, typos, prefixes, trash, snippets) and date maths (incl. daylight-saving changes).

### Fixed
- The title field could keep the previous page's title after switching pages while it was focused.
- Custom classes couldn't override the global keyboard focus ring.

## Phase 1 — Notes workspace (2026-11-19)

### Added
- **Project setup:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, Vitest for tests.
- **Local-first storage** with Dexie (IndexedDB). Tables: `pages`, `contents`, `assets`, `focusSessions`, `settings`.
  - All reads/writes go through repository files in `src/lib/db/` so cloud sync can be added later.
  - Every record has a random id and `updatedAt`; page order uses fractional indexing (sync-friendly).
- **Sidebar page tree:** create, rename (menu or double-click), nest, reorder by drag and drop
  (top/bottom quarter = above/below, middle = inside), "Move to top level" drop zone, favourites section.
  Keyboard-friendly alternatives in each page's "…" menu: move up/down, nest, move out.
- **Trash:** deleting moves a page (and its sub-pages) to the trash with an **Undo** toast;
  the Trash dialog restores pages or deletes them forever.
- **Block editor (BlockNote):** headings, paragraphs, bullet/numbered lists, to-dos, toggles, quotes,
  code blocks, dividers, images, tables, plus a custom **callout** block (click its emoji to change style).
  "/" slash menu and Markdown shortcuts (`# `, `- `, `1. `, `[] `, ```` ``` ````).
- **Images** pasted/uploaded into pages are stored in IndexedDB, so they work offline.
- **Page icon** (emoji picker with student quick-picks) and **cover** (6 built-in gradients or your own image).
- **Autosave** (0.6 s after you stop typing, and when switching pages or hiding the tab) with a status indicator.
- **Light / dark / system theme**, applied before first paint (no flash).
- **Responsive layout:** sidebar becomes a drawer on phones.
- **Home screen** with greeting and recently edited pages; a welcome page on first launch.
- **Shortcut:** `Alt + N` creates a new page.
- **Tests:** page repository (create, update, move, nest, cycle protection, trash/restore, delete) and
  plain-text extraction.

### Notes for later phases
- The full emoji list in the picker is downloaded from a CDN the first time it opens; the quick-picks
  work offline. Phase 5 will cache or self-host the emoji data for full offline use.
