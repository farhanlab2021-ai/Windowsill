/** Saved Pomodoro sessions (the history that stats are built from). */
import type { SessionRecord } from "../timer/engine";
import { db } from "./database";
import type { FocusSession } from "./types";

export interface SessionLink {
  pageId: string | null;
  label: string | null;
}

/**
 * Saves a session. The id is derived from the start time, so if two open tabs
 * both notice the same session ending, it's still saved only once.
 */
export async function saveSession(record: SessionRecord, link: SessionLink): Promise<FocusSession> {
  const session: FocusSession = {
    id: `${record.kind}-${record.startedAt}`,
    ...record,
    pageId: link.pageId,
    label: link.label?.trim() || null,
  };
  await db.focusSessions.put(session);
  return session;
}

/** Focus sessions that started at or after `since` (a timestamp). */
export function getFocusSessionsSince(since: number): Promise<FocusSession[]> {
  return db.focusSessions
    .where("startedAt")
    .aboveOrEqual(since)
    .filter((s) => s.kind === "focus")
    .toArray();
}

export function getAllFocusSessions(): Promise<FocusSession[]> {
  return db.focusSessions.filter((s) => s.kind === "focus").toArray();
}
