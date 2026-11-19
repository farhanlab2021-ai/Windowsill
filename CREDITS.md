# Credits

Every third-party asset used by Windowsill, with its source, author and license.
**Add a row here for every photo, video or sound you put in `public/`.**

## Scenes and sounds

Windowsill currently ships **no third-party media**. Everything in Focus Mode is original
and made in code for this project:

| What | How it's made | License |
| --- | --- | --- |
| Beach and mountain scenes (day / sunset / night) | Drawn on a `<canvas>` in `src/lib/focus/draw/` | Part of this project |
| Waves, seagulls, wind, birds, stream, rain | Generated with the Web Audio API in `src/lib/audio/synths.ts` | Part of this project |
| End-of-session chime | Generated with the Web Audio API in `src/lib/audio/chime.ts` | Part of this project |
| Logo, windowsill plant and mug | Hand-written SVG | Part of this project |

### Optional media you add

Copy this table and fill in one row per file you add to `public/scenes/` or `public/sounds/`:

| File | Source (link) | Author | License |
| --- | --- | --- | --- |
| _e.g._ `public/sounds/beach/waves.mp3` | _https://freesound.org/s/…_ | _username_ | _CC0 1.0_ |

Only use media that is free for commercial use: **CC0**, the **Pexels License** or the
**Pixabay Content License**. Avoid "CC BY-NC" (non-commercial) and anything marked "editorial".

## Software and fonts

| Name | Use | License |
| --- | --- | --- |
| [Inter](https://rsms.me/inter/) (Rasmus Andersson) | Interface font | SIL Open Font License 1.1 |
| [Newsreader](https://github.com/productiontype/Newsreader) (Production Type) | Heading font | SIL Open Font License 1.1 |
| [Lucide](https://lucide.dev) | Icons | ISC |
| [BlockNote](https://www.blocknotejs.org) | Block editor | MPL 2.0 |
| [Next.js](https://nextjs.org), [React](https://react.dev) | App framework | MIT |
| [Dexie](https://dexie.org) | IndexedDB storage | Apache 2.0 |
| [dnd-kit](https://dndkit.com) | Drag and drop | MIT |
| [cmdk](https://cmdk.paco.me), [MiniSearch](https://lucaong.github.io/minisearch/) | Search palette and search | MIT |
| [frimousse](https://frimousse.liveblocks.io) / [Emojibase](https://emojibase.dev) data | Emoji picker | MIT |
| [zustand](https://zustand.docs.pmnd.rs), [fractional-indexing](https://github.com/rocicorp/fractional-indexing) | State, page ordering | MIT / CC0 |
| [Tailwind CSS](https://tailwindcss.com) | Styling | MIT |
| [mammoth](https://github.com/mwilliamson/mammoth.js) | Importing Word (.docx) files | BSD 2-Clause |
| [pdf.js](https://mozilla.github.io/pdf.js/) (Mozilla) | Importing PDF files | Apache 2.0 |
| [JSZip](https://stuk.github.io/jszip/) | Reading PowerPoint (.pptx) files | MIT |
| [pptx-preview](https://www.npmjs.com/package/pptx-preview) | Drawing PowerPoint slides | ISC (npm package free for personal and commercial use) |
| [html-to-image](https://github.com/bubkoo/html-to-image) | Saving drawn slides as pictures | MIT |

Emoji are drawn by your operating system's emoji font.
