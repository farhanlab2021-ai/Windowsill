import { describe, expect, it } from "vitest";
import { getAllFocusSessions, getFocusSessionsSince, saveSession } from "@/lib/db/sessions";
import type { FocusSession, Page } from "@/lib/db/types";
import { formatMinutes, minutesBySubject, startOfWeek, streakDays, summarize } from "@/lib/timer/stats";

// Thursday 19 Nov 2026, 3 pm local time.
const NOW = new Date(2026, 10, 19, 15, 0);
const at = (day: number, hour = 10) => new Date(2026, 10, day, hour).getTime();

function session(day: number, minutes: number, extra: Partial<FocusSession> = {}): FocusSession {
  const startedAt = at(day);
  return {
    id: `focus-${startedAt}-${Math.random()}`,
    kind: "focus",
    startedAt,
    endedAt: startedAt + minutes * 60_000,
    plannedMinutes: 25,
    actualMinutes: minutes,
    pageId: null,
    label: null,
    completed: true,
    ...extra,
  };
}

const page = (id: string, title: string, icon: string | null = null): Page => ({
  id, title, icon, parentId: null, order: "a0", cover: null, isFavorite: false,
  templateId: null, createdAt: 0, updatedAt: 0, deletedAt: null,
});

describe("stats", () => {
  it("weeks start on Monday", () => {
    expect(startOfWeek(NOW)).toEqual(new Date(2026, 10, 16)); // Mon 16 Nov
    expect(startOfWeek(new Date(2026, 10, 22))).toEqual(new Date(2026, 10, 16)); // Sunday
  });

  it("sums today and this week", () => {
    const sessions = [
      session(19, 25), session(19, 10, { completed: false }), // today
      session(17, 50), // Tuesday this week
      session(15, 25), // last Sunday: previous week
    ];
    const s = summarize(sessions, NOW);
    expect(s.todayMinutes).toBe(35);
    expect(s.todaySessions).toBe(1); // only completed ones
    expect(s.weekMinutes).toBe(85);
    // 13th … 19th: the 15th (25 min), 17th (50 min) and today (35 min).
    expect(s.last7Days.map((d) => d.minutes)).toEqual([0, 0, 25, 0, 50, 0, 35]);
    expect(s.last7Days[6].date).toBe("2026-11-19");
  });

  it("counts a streak of consecutive days", () => {
    expect(streakDays([session(19, 25), session(18, 25), session(17, 25), session(15, 25)], NOW)).toBe(3);
  });

  it("keeps yesterday's streak alive until today is over", () => {
    expect(streakDays([session(18, 25), session(17, 25)], NOW)).toBe(2);
    expect(streakDays([session(16, 25)], NOW)).toBe(0);
  });

  it("only completed sessions count towards a streak", () => {
    expect(streakDays([session(19, 10, { completed: false })], NOW)).toBe(0);
  });

  it("groups minutes by page, then by task name", () => {
    const pages = [page("bio", "Biology 101", "🧪")];
    const result = minutesBySubject(
      [
        session(19, 25, { pageId: "bio" }),
        session(18, 50, { pageId: "bio" }),
        session(18, 25, { label: "Essay" }),
        session(17, 20, { label: "essay" }),
        session(17, 15),
      ],
      pages,
    );
    expect(result.map((r) => [r.title, r.minutes])).toEqual([
      ["Biology 101", 75],
      ["Essay", 45],
      ["Not linked", 15],
    ]);
    expect(result[0].icon).toBe("🧪");
  });

  it("formats minutes", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(85.4)).toBe("1 h 25 min");
  });
});

describe("sessions repository", () => {
  it("saves sessions once even if recorded twice (two open tabs)", async () => {
    const record = { kind: "focus" as const, startedAt: at(19), endedAt: at(19) + 25 * 60_000, plannedMinutes: 25, actualMinutes: 25, completed: true };
    await saveSession(record, { pageId: "bio", label: "  " });
    await saveSession(record, { pageId: "bio", label: null });
    const all = await getAllFocusSessions();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ pageId: "bio", label: null });
    expect(await getFocusSessionsSince(at(20))).toEqual([]);
  });
});
