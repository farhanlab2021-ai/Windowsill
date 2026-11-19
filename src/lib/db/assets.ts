/**
 * Images and files added to pages are stored as Blobs in IndexedDB so they
 * work offline. Inside a page they're referenced by a short string like
 * `asset:1234-...`, which `resolveAssetUrl` turns into a displayable URL.
 */
import { newId } from "../id";
import { db } from "./database";

export const ASSET_PREFIX = "asset:";

export function isAssetRef(value: string): boolean {
  return value.startsWith(ASSET_PREFIX);
}

/** Saves a file and returns its reference string (e.g. "asset:abc"). */
export async function saveAsset(file: Blob): Promise<string> {
  const id = newId();
  await db.assets.add({ id, blob: file, mimeType: file.type, createdAt: Date.now() });
  return ASSET_PREFIX + id;
}

// Object URLs are cached so the same image isn't turned into many URLs.
const urlCache = new Map<string, string>();

/**
 * Turns a stored reference into a URL the browser can display.
 * Normal URLs (https://...) are returned unchanged.
 */
export async function resolveAssetUrl(ref: string): Promise<string> {
  if (!isAssetRef(ref)) return ref;
  const cached = urlCache.get(ref);
  if (cached) return cached;

  const asset = await db.assets.get(ref.slice(ASSET_PREFIX.length));
  if (!asset) return "";
  const url = URL.createObjectURL(asset.blob);
  urlCache.set(ref, url);
  return url;
}
