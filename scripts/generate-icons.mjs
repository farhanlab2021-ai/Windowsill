// Generates the app icons from scripts/icon-art.mjs. Run once after changing the art:
//   npm run icons
// Uses `sharp`, which Next.js already installs for image optimisation.
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { iconSvg } from "./icon-art.mjs";

mkdirSync("public/icons", { recursive: true });

const normal = Buffer.from(iconSvg());
const maskable = Buffer.from(iconSvg({ scale: 0.78, rounded: false }));
const square = Buffer.from(iconSvg({ scale: 0.9, rounded: false }));

writeFileSync("public/icons/icon.svg", iconSvg());
writeFileSync("src/app/icon.svg", iconSvg()); // browser-tab icon (Next.js file convention)
await sharp(normal).resize(192).png().toFile("public/icons/icon-192.png");
await sharp(normal).resize(512).png().toFile("public/icons/icon-512.png");
await sharp(maskable).resize(512).png().toFile("public/icons/maskable-512.png");
await sharp(square).resize(180).png().toFile("src/app/apple-icon.png"); // iPhone/iPad home screen

console.log("Icons written to public/icons/ and src/app/");
