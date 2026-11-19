// Copies files the app serves from its own site, so they work offline:
//  - the emoji picker's data (from the `emojibase-data` package) → /public/emoji
//  - the PDF reader's background worker (from `pdfjs-dist`) → /public/pdfjs
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/emoji/en", { recursive: true });
for (const file of ["data.json", "messages.json"]) {
  copyFileSync(`node_modules/emojibase-data/en/${file}`, `public/emoji/en/${file}`);
}

mkdirSync("public/pdfjs", { recursive: true });
copyFileSync("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "public/pdfjs/pdf.worker.min.mjs");

console.log("Emoji data and PDF worker copied to public/");
