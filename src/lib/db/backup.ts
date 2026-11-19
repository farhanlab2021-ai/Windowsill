/**
 * Backup and restore: everything in the database as one JSON file.
 *
 * Because notes live only in this browser, a backup file is the student's
 * safety net (and the way to move notes to another device until cloud sync
 * exists). Images are included, encoded as text (base64).
 */
import { db } from "./database";
import type { FocusSession, Page, PageContent, Setting } from "./types";

export const BACKUP_APP = "windowsill";
export const BACKUP_VERSION = 1;

interface BackupAsset {
  id: string;
  mimeType: string;
  createdAt: number;
  base64: string;
}

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  pages: Page[];
  contents: PageContent[];
  focusSessions: FocusSession[];
  settings: Setting[];
  assets: BackupAsset[];
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function createBackup(): Promise<Backup> {
  const [pages, contents, focusSessions, settings, assets] = await Promise.all([
    db.pages.toArray(),
    db.contents.toArray(),
    db.focusSessions.toArray(),
    db.settings.toArray(),
    db.assets.toArray(),
  ]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    pages,
    contents,
    focusSessions,
    settings,
    assets: await Promise.all(
      assets.map(async (a) => ({ id: a.id, mimeType: a.mimeType, createdAt: a.createdAt, base64: await blobToBase64(a.blob) })),
    ),
  };
}

export class BackupError extends Error {}

/** Checks that a parsed file really is a Windowsill backup. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError("This file isn't a Windowsill backup (it isn't valid JSON).");
  }
  const b = data as Partial<Backup>;
  if (b?.app !== BACKUP_APP || typeof b.version !== "number" || !Array.isArray(b.pages) || !Array.isArray(b.contents)) {
    throw new BackupError("This file isn't a Windowsill backup.");
  }
  if (b.version > BACKUP_VERSION) {
    throw new BackupError("This backup was made by a newer version of Windowsill. Please update the app first.");
  }
  return {
    ...b,
    focusSessions: b.focusSessions ?? [],
    settings: b.settings ?? [],
    assets: b.assets ?? [],
  } as Backup;
}

/**
 * Restores a backup by merging it into the current data: everything in the
 * backup is added, and items that exist in both are replaced by the backup's
 * version only if the backup's copy is newer. Nothing is deleted.
 */
export async function restoreBackup(backup: Backup): Promise<{ pages: number }> {
  await db.transaction("rw", [db.pages, db.contents, db.focusSessions, db.settings, db.assets], async () => {
    const existingPages = new Map((await db.pages.toArray()).map((p) => [p.id, p]));
    const newerPages = backup.pages.filter((p) => !existingPages.has(p.id) || existingPages.get(p.id)!.updatedAt < p.updatedAt);
    await db.pages.bulkPut(newerPages);

    const existingContents = new Map((await db.contents.toArray()).map((c) => [c.pageId, c]));
    await db.contents.bulkPut(
      backup.contents.filter((c) => !existingContents.has(c.pageId) || existingContents.get(c.pageId)!.updatedAt < c.updatedAt),
    );

    await db.focusSessions.bulkPut(backup.focusSessions); // ids are stable, so this never duplicates
    const existingSettings = new Set(await db.settings.toCollection().primaryKeys());
    await db.settings.bulkPut(backup.settings.filter((s) => !existingSettings.has(s.key))); // keep this device's settings
    await db.assets.bulkPut(
      backup.assets.map((a) => ({ id: a.id, mimeType: a.mimeType, createdAt: a.createdAt, blob: base64ToBlob(a.base64, a.mimeType) })),
    );
  });
  return { pages: backup.pages.length };
}

/** Saves the backup as a file named like "windowsill-backup-2026-11-19.json". */
export async function downloadBackup() {
  const backup = await createBackup();
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `windowsill-backup-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
