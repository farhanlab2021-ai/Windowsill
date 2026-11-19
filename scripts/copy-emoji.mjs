// Copies the emoji picker's data (from the `emojibase-data` package) into
// /public/emoji, so the picker loads it from our own site and works offline.
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/emoji/en", { recursive: true });
for (const file of ["data.json", "messages.json"]) {
  copyFileSync(`node_modules/emojibase-data/en/${file}`, `public/emoji/en/${file}`);
}
console.log("Emoji data copied to public/emoji/en/");
