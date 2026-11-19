/**
 * Study statistics, calculated from saved focus sessions.
 * Pure functions (data in, numbers out) so they're easy to test.
 * A session counts on the day it started, in the student's local time.
 */
import { addDays, toISODate } from "../dates";
import type { FocusSession, Page } from "../db/types";

const dayOf = (ts: number) => toISODate(new Date(ts));

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday of the week containing `date` (weeks start on Monday). */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7; // Monday → 0, Sunday → 6
  return addDays(day, -offset);
}

function sumMinutes(sessions: FocusSession[]): number {
  return Math.round(sessions.reduce((total, s) => total + s.actualMinutes, 0));
}

/** Minutes studied per day, keyed by "YYYY-MM-DD". */
export function minutesByDay(sessions: FocusSession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) map.set(dayOf(s.startedAt), (map.get(dayOf(s.startedAt)) ?? 0) + s.actualMinutes);
  return map;
}

/**
 * Days in a row with at least one completed focus session, ending today.
 * If today has none *yet*, the streak counts up to yesterday (it isn't broken until the day is over).
 */
export function streakDays(sessions: FocusSession[], now: Date): number {
  const days = new Set(sessions.filter((s) => s.completed).map((s) => dayOf(s.startedAt)));
  let cursor = startOfDay(now);
  if (!days.has(toISODate(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(toISODate(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface SubjectMinutes {
  key: string;
  title: string;
  icon: string | null;
  minutes: number;
  pageId: string | null;
}

/**
 * Minutes per subject: grouped by linked page, or by the typed task name when
 * no page was linked, or "Not linked".
 */
export function minutesBySubject(sessions: FocusSession[], pages: Page[]): SubjectMinutes[] {
  const pagesById = new Map(pages.map((p) => [p.id, p]));
  const groups = new Map<string, SubjectMinutes>();

  for (const s of sessions) {
    const page = s.pageId ? pagesById.get(s.pageId) : undefined;
    const key = page ? `page:${page.id}` : s.label ? `label:${s.label.toLowerCase()}` : "none";
    const group = groups.get(key) ?? {
      key,
      title: page ? page.title || "Untitled" : (s.label ?? "Not linked"),
      icon: page?.icon ?? null,
      minutes: 0,
      pageId: page?.id ?? null,
    };
    group.minutes += s.actualMinutes;
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, minutes: Math.round(g.minutes) }))
    .filter((g) => g.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

export interface StatsSummary {
  todayMinutes: number;
  todaySessions: number;
  weekMinutes: number;
  streak: number;
  /** The last 7 days, oldest first, for the bar chart. */
  last7Days: { date: string; minutes: number }[];
}

export function summarize(sessions: FocusSession[], now: Date): StatsSummary {
  const today = startOfDay(now).getTime();
  const week = startOfWeek(now).getTime();
  const todays = sessions.filter((s) => s.startedAt >= today);
  const perDay = minutesByDay(sessions);
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = toISODate(addDays(startOfDay(now), i - 6));
    return { date, minutes: Math.round(perDay.get(date) ?? 0) };
  });

  return {
    todayMinutes: sumMinutes(todays),
    todaySessions: todays.filter((s) => s.completed).length,
    weekMinutes: sumMinutes(sessions.filter((s) => s.startedAt >= week)),
    streak: streakDays(sessions, now),
    last7Days,
  };
}

/** "1 h 25 min", "45 min", "0 min". */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}
