import type { MetadataRoute } from "next";

/**
 * The web app manifest: what lets students "install" Windowsill on a phone's
 * home screen or as a desktop app (its name, icons and colours).
 * Next.js serves this at /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Windowsill — calm study space",
    short_name: "Windowsill",
    description: "Notes, a Pomodoro timer and a view through the window, for calm studying. Works offline.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#3c6b5e",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Focus Mode", url: "/focus", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Focus stats", url: "/?view=stats", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
