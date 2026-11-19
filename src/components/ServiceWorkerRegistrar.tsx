"use client";

import { useEffect } from "react";

/** Build files this page has already downloaded (so the service worker can save them too). */
function loadedBuildFiles(): string[] {
  return performance
    .getEntriesByType("resource")
    .map((entry) => new URL(entry.name))
    .filter((url) => url.origin === location.origin && url.pathname.startsWith("/_next/static/"))
    .map((url) => url.pathname);
}

/**
 * Registers the service worker (public/sw.js) that makes Windowsill work
 * offline. Only in the production build: in development it would keep serving
 * old code while you edit.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    const shareLoadedFiles = (worker: ServiceWorker | null | undefined) =>
      worker?.postMessage({ type: "CACHE_URLS", urls: loadedBuildFiles() });

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        shareLoadedFiles((await navigator.serviceWorker.ready).active);
      } catch {
        // Offline support is a bonus; the app works without it.
      }
    };
    // When an updated service worker takes over, tell it what this page has loaded too.
    const onControllerChange = () => shareLoadedFiles(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    // Wait until the page has finished loading, so registering doesn't slow it down.
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });

    // When installed as an app, ask the browser to never clear our storage
    // automatically (installed apps get this without a prompt).
    if (window.matchMedia("(display-mode: standalone)").matches) void navigator.storage?.persist?.();

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
