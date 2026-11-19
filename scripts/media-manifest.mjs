// Lists the optional scene videos and sound recordings in /public, so the app
// knows which ones exist without asking the server for missing files.
// Runs automatically before `npm run dev` and `npm run build` (see package.json).
// Run it yourself with `npm run media` after adding files while the server is running.
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = join(process.cwd(), "public");
const folders = ["scenes", "sounds"];
const extensions = /\.(mp4|webm|jpg|jpeg|webp|mp3|ogg|m4a|wav)$/i;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : extensions.test(name) ? [path] : [];
  });
}

const files = folders
  .flatMap((folder) => walk(join(root, folder)))
  .map((path) => "/" + relative(root, path).split(sep).join("/"))
  .sort();

writeFileSync(join(root, "media-manifest.json"), JSON.stringify({ files }, null, 2) + "\n");
console.log(`media-manifest.json: ${files.length} optional media file(s) found`);
