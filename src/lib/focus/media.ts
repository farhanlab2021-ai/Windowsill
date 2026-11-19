/**
 * Which optional media files (scene videos, sound recordings) exist in /public.
 *
 * `scripts/media-manifest.mjs` writes the list to /media-manifest.json before
 * every `npm run dev` / `npm run build`, so we load that one small file instead
 * of asking the server for each (possibly missing) video or sound.
 */
let manifest: Promise<Set<string>> | null = null;

function loadManifest(): Promise<Set<string>> {
  manifest ??= fetch("/media-manifest.json", { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : { files: [] }))
    .then((data: { files?: string[] }) => new Set(data.files ?? []))
    .catch(() => new Set<string>());
  return manifest;
}

export async function mediaExists(url: string): Promise<boolean> {
  return (await loadManifest()).has(url);
}
