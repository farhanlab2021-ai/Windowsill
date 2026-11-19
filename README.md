# Windowsill

A calm study workspace for university and college students:

- **Notes** in a block editor: headings, lists, to-dos, toggles, callouts, tables, images, and
  a "/" menu, plus a page tree with drag and drop, favourites and a trash.
- **Student templates:** Class Notes, Assignment Tracker, Exam Planner, Weekly Timetable,
  Reading List, with dates that count down ("in 5 days").
- **Search** across everything with `Ctrl/Cmd + K`.
- **A Pomodoro timer** (25/5, 50/10 or custom) with a chime, notifications and focus stats.
- **Focus Mode:** a view through a window (beach or mountain cliff, day/sunset/night) with
  optional ambient sounds and a notes panel.
- **Local-first:** no account needed. Everything is saved on your device and it works
  offline, and you can install it like an app.

See [CHANGELOG.md](CHANGELOG.md) for what was built in each phase.

---

## 1. Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer (check with `node -v` in PowerShell).

```powershell
cd windowsill
npm install        # first time only: downloads the libraries
npm run dev        # starts the app
```

Open <http://localhost:3000>. Code changes appear instantly. Stop the server with `Ctrl + C`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (hot reload, **no offline mode**) |
| `npm test` | Runs the automated tests once (`npm run test:watch` to keep re-running) |
| `npm run lint` | Checks the code for common mistakes |
| `npm run build` then `npm start` | Builds and runs the production version, the same as when deployed (offline mode on) |
| `npm run icons` | Re-creates the app icons after editing `scripts/icon-art.mjs` |
| `npm run media` | Re-scans `public/scenes` and `public/sounds` for media files you added |

**Try it on your phone:** while `npm run dev` runs, find your computer's IP with `ipconfig`
("IPv4 Address") and open `http://<that-ip>:3000` on a phone on the same Wi-Fi.
(Installing and offline mode need HTTPS, so test those on the deployed site.)

## 2. Test offline mode and installing

Offline support uses a **service worker** (`public/sw.js`): a small background script that
saves the app's files so it opens without internet. It only runs in the production build:

1. `npm run build` then `npm start`, and open <http://localhost:3000>.
2. Wait a few seconds, then open a page and Focus Mode once.
3. Stop the server (`Ctrl + C`) and reload the browser tab. Windowsill still opens, and
   you can read and write notes, use the timer, and open Focus Mode.
4. To **install**, use the install icon at the right of Chrome/Edge's address bar (or, on the
   deployed site, Share → *Add to Home Screen* on iPhone, browser menu → *Install app* on Android).

Your notes themselves never need the network: they're saved in the browser's database
(IndexedDB) as you type.

## 3. Deploy to Vercel (free)

[Vercel](https://vercel.com) is made by the creators of Next.js and hosts it with no setup.
Windowsill needs **no environment variables, database or API keys**.

> The free **Hobby** plan is for personal, non-commercial projects. If you later sell
> Windowsill or run it for an organisation, Vercel requires the paid Pro plan.

### Step 1: Put the code on GitHub

1. Install Git: run `winget install --id Git.Git -e` in PowerShell (or download it from
   <https://git-scm.com>), then close and reopen PowerShell.
2. Create a free account at <https://github.com> and a **new, empty repository** called
   `windowsill` (no README, no .gitignore — the project already has them).
3. In PowerShell, inside the `windowsill` folder (the one with `package.json`), run these one by one:

```powershell
git init
```
```powershell
git add .
```
```powershell
git commit -m "Windowsill: phases 1-5"
```
```powershell
git branch -M main
```
```powershell
git remote add origin https://github.com/YOUR-USERNAME/windowsill.git
```
```powershell
git push -u origin main
```

(Replace `YOUR-USERNAME`. The first push opens a GitHub sign-in window.)

### Step 2: Import it into Vercel

1. Go to <https://vercel.com/signup> and choose **Continue with GitHub**.
2. Click **Add New… → Project**, find `windowsill` and click **Import**.
3. Vercel detects **Next.js** automatically. Leave every setting as it is (Root Directory: `./`,
   no environment variables) and click **Deploy**.
4. After about a minute you get a link like `https://windowsill-xyz.vercel.app`. Open it on
   your phone and install it to your home screen.

### Step 3: Updating

Every `git push` to `main` deploys a new version automatically:

```powershell
git add .
```
```powershell
git commit -m "Describe your change"
```
```powershell
git push
```

Students get the new version the next time they open the app online (the service worker
fetches pages fresh when there's a connection and refreshes its saved copy in the background).
If you change `public/sw.js` itself, also bump its `VERSION` (e.g. `"windowsill-v3"`).

**Alternative without GitHub:** run `npx vercel` in the `windowsill` folder (it asks you to log
in, then deploys a preview) and `npx vercel --prod` for the live site.

## 4. How the code is organised

```
src/
  app/             Pages (/ = notes, /focus = Focus Mode), root layout, manifest, icons, global CSS
  components/
    editor/        BlockNote editor setup, slash menu, custom blocks (callout, date chip)
    focus/         Focus Mode: window frame, scene view, timer on the glass, sound mixer, notes
    page/          The open page: top bar, cover, icon, title
    search/        The Ctrl/Cmd + K search palette
    settings/      Settings: theme, backup/restore, storage safety, shortcuts
    sidebar/       Sidebar, page tree (drag and drop), trash dialog
    stats/         The focus stats screen
    templates/     Template cards, chips and the "New from template" dialog
    timer/         Timer button, timer panel, and TimerRuntime (keeps the timer ticking)
    workspace/     The overall layout and the Home screen
    ui/            Small reusable pieces: menu, popover, dialog, toasts, emoji picker, AppLink
    ServiceWorkerRegistrar.tsx   Turns on offline mode (production only)
  hooks/           React hooks (live page data, navigation, theme, page actions, sounds)
  lib/
    db/            The data layer: Dexie database + "repositories" (pages, assets, sessions,
                   settings, backup)
    editor/        Helpers for editor content (e.g. plain text for search)
    search/        The search engine (MiniSearch) and snippet maker
    templates/     The five student templates — one file each, plus helpers in blocks.ts
    timer/         Timer rules (engine.ts), stats maths, background ticker, notifications
    audio/         The chime, the ambient sound mixer, and the generated sounds
    focus/         Scene list, time-of-day rules, the canvas drawings (draw/), media manifest
  stores/          Shared state (zustand): UI, timer, Focus Mode preferences
public/
  sw.js            The service worker (offline mode)
  icons/           App icons (generated by `npm run icons`)
  scenes/ sounds/  Optional media files (see the READMEs inside)
scripts/           Small Node scripts run before dev/build (media list, emoji data, icons)
tests/             Automated tests (Vitest + a fake IndexedDB)
```

### The data layer, in one paragraph

Components never talk to the database directly. They call functions such as
`createPage()`, `movePage()` or `trashPage()` from `src/lib/db/pages.ts`, and read live data
with hooks like `usePages()`, which re-render automatically when data changes. Every record
has a random id and an `updatedAt` time, and page order uses sync-friendly "fractional
indexes". So adding cloud sync later (e.g. Supabase) means writing a sync layer behind these
functions; the screens don't change.

### How the timer stays accurate

The timer never counts seconds. When you press Start it saves the moment the session will
end (`endsAt`), and the time left is always `endsAt − now`. Browsers slow down background
tabs, but the clock stays right, so the countdown does too. See `src/lib/timer/engine.ts`
and `tests/timer.test.ts`.

### Adding your own template

1. Copy `src/lib/templates/readingList.ts` to a new file and change the `id`, name, icon and
   blocks. The helpers in `blocks.ts` (`heading`, `todo`, `table`, `date`, …) keep it short.
2. Add it to the `TEMPLATES` list in `src/lib/templates/index.ts`.
3. Run `npm test`: the template tests check every template automatically.

## 5. Keyboard shortcuts

Press `?` in the app to see this list.

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + K` | Search pages |
| `Alt + N` | New page |
| `Alt + T` | Start / pause the Pomodoro timer |
| `/` (in the editor) | Insert a block |
| `?` | Settings and the shortcut list |
| `Space` (Focus Mode) | Start / pause the timer |
| `M` (Focus Mode) | Play / pause the ambient sounds |
| `Esc` (Focus Mode) | Leave Focus Mode |

## 6. Adding real scenery and sounds

Focus Mode works without any media files: the scenes are drawn in code and the sounds are
generated in the browser. If you'd like real footage or recordings, drop files with these
**exact names** into `public/` and they're used automatically:

| Scene videos (MP4, loop, no audio) | Sounds (MP3, loopable) |
| --- | --- |
| `public/scenes/beach/day.mp4` | `public/sounds/beach/waves.mp3` |
| `public/scenes/beach/sunset.mp4` | `public/sounds/beach/seagulls.mp3` |
| `public/scenes/beach/night.mp4` | `public/sounds/beach/wind.mp3` |
| `public/scenes/mountain/day.mp4` | `public/sounds/mountain/wind.mp3` |
| `public/scenes/mountain/sunset.mp4` | `public/sounds/mountain/birds.mp3` |
| `public/scenes/mountain/night.mp4` | `public/sounds/mountain/stream.mp3` |
| _(optional stills: same names with `.jpg`)_ | `public/sounds/breaks/rain.mp3` |

You can add just some of them; anything missing keeps the built-in version. After adding
files, restart `npm run dev` (or run `npm run media`). In Focus Mode → **Mixer**, a sound shows
"recording" when your file is in use. Sounds are saved for offline use after they've played
once; videos aren't (too big), so offline you'll see the drawn scene.

**Where to find free files (OK for commercial use):**

- **Videos:** [Pexels Videos](https://www.pexels.com/videos/) or [Pixabay Videos](https://pixabay.com/videos/).
  Try "beach waves static shot", "ocean sunset timelapse", "beach night moon", "mountain valley
  clouds", "mountain sunset", "mountains night stars". Pick clips from a fixed camera (no camera
  moves), so they feel like a window.
- **Sounds:** [Freesound](https://freesound.org) (free account; filter by **License: Creative
  Commons 0**) or [Pixabay Sound Effects](https://pixabay.com/sound-effects/). Try "ocean waves
  loop", "seagulls distant", "wind ambience", "birdsong forest", "stream brook", "light rain".
- Record every file in [CREDITS.md](CREDITS.md) (source link, author, license).

**Make them small** with [ffmpeg](https://ffmpeg.org) (free). Aim for videos under ~6 MB and
sounds around 1 MB per minute:

```powershell
ffmpeg -i input.mp4 -an -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 28 -preset slow -movflags +faststart public/scenes/beach/day.mp4
```
```powershell
ffmpeg -i input.wav -ac 1 -b:a 128k public/sounds/beach/waves.mp3
```

Videos and sounds are only downloaded when someone opens Focus Mode (and sounds only when
they press **Play sounds**).

## 7. Your data

- **Where:** in the browser's IndexedDB for this site (DevTools → Application → IndexedDB →
  `windowsill`). Each browser and device has its own copy.
- **Backups:** **Settings & backup** (bottom of the sidebar) → **Download backup** saves everything,
  images included, as one `.json` file. **Restore from backup** merges a file back in. It never
  deletes anything and keeps whichever version of a page is newer, so it's also how you move
  notes to another device.
- **Keeping it safe:** browsers may clear site data when a device runs low on space. Installing
  the app, or pressing **Keep my data safe** in Settings, asks the browser not to.

## 8. Troubleshooting

- **A change doesn't show up while `npm run dev` is running:** this project lives in a OneDrive
  folder, and OneDrive sometimes hides file changes from the dev server. Stop it (`Ctrl + C`)
  and start it again. Moving the project out of OneDrive (e.g. to `C:\dev\windowsill`) avoids it.
- **No sound in Focus Mode:** sounds are off until you press **Play sounds** in the bottom bar
  (or `M`). Also check the master volume and mute in **Mixer**.
- **No timer notifications:** allow them when the timer panel asks, and check the browser's site
  settings. On iPhone, notifications only work for the installed app (iOS 16.4+).
- **The deployed site shows an old version:** reload once while online; the service worker
  fetches fresh pages whenever there's a connection.
