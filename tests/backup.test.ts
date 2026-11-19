import { describe, expect, it } from "vitest";
import { saveAsset } from "@/lib/db/assets";
import { BackupError, createBackup, parseBackup, restoreBackup } from "@/lib/db/backup";
import { db } from "@/lib/db/database";
import { createPage, getAllPages, getContent, updatePage } from "@/lib/db/pages";
import { saveSession } from "@/lib/db/sessions";
import { setSetting } from "@/lib/db/settings";

describe("backup and restore", () => {
  it("round-trips pages, content, sessions, settings and images", async () => {
    const page = await createPage({ title: "Biology", blocks: [{ type: "paragraph" }], plainText: "cells" });
    const ref = await saveAsset(new Blob(["hello image"], { type: "image/png" }));
    await saveSession(
      { kind: "focus", startedAt: 1, endedAt: 2, plannedMinutes: 25, actualMinutes: 25, completed: true },
      { pageId: page.id, label: null },
    );
    await setSetting("timerSettings", { focusMinutes: 50 });

    const text = JSON.stringify(await createBackup());
    await Promise.all(db.tables.map((t) => t.clear())); // "a new device"

    await restoreBackup(parseBackup(text));
    expect((await getAllPages()).map((p) => p.title)).toEqual(["Biology"]);
    expect((await getContent(page.id))?.plainText).toBe("cells");
    expect(await db.focusSessions.count()).toBe(1);
    expect((await db.settings.get("timerSettings"))?.value).toEqual({ focusMinutes: 50 });
    const asset = await db.assets.get(ref.slice("asset:".length));
    expect(await asset?.blob.text()).toBe("hello image");
  });

  it("merges: keeps newer local edits and adds missing pages", async () => {
    const page = await createPage({ title: "Old title" });
    const backup = await createBackup();
    await new Promise((r) => setTimeout(r, 2));
    await updatePage(page.id, { title: "Newer local title" });
    await createPage({ title: "Only on this device" });

    await restoreBackup(backup);
    const titles = (await getAllPages()).map((p) => p.title).sort();
    expect(titles).toEqual(["Newer local title", "Only on this device"]);
  });

  it("rejects files that aren't Windowsill backups", () => {
    expect(() => parseBackup("not json")).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ hello: "world" }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ app: "windowsill", version: 99, pages: [], contents: [] }))).toThrow(/newer version/);
  });
});
