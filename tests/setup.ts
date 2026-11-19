// Gives Node a fake in-memory IndexedDB so the real Dexie code can be tested.
import "fake-indexeddb/auto";
import { beforeEach } from "vitest";
import { db } from "@/lib/db/database";

// Start every test with an empty database.
beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});
