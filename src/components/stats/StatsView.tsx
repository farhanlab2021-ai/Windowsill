"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, Clock, FileText, Flame } from "lucide-react";
import { useMemo, useState } from "react";
import { SimpleTopBar } from "@/components/workspace/SimpleTopBar";
import { useOpenPage } from "@/hooks/useNavigation";
import { getAllFocusSessions } from "@/lib/db/sessions";
import type { Page } from "@/lib/db/types";
import { formatMinutes, minutesBySubject, startOfWeek, summarize } from "@/lib/timer/stats";

function StatTile({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-faint">{note}</p>}
    </div>
  );
}

const weekday = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short" });
};
const longDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

/** Minutes per day for the last 7 days: one series, thin bars, a tooltip on hover/focus. */
function Last7DaysChart({ days }: { days: { date: string; minutes: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(30, ...days.map((d) => d.minutes)); // at least a 30-min scale so small days don't look huge
  const today = days.length - 1;

  return (
    <figure>
      <div className="relative flex h-44 items-end gap-0.5 border-b border-line px-1" onMouseLeave={() => setActive(null)}>
        {days.map((day, i) => {
          const height = day.minutes ? Math.max(4, (day.minutes / max) * 100) : 0;
          return (
            <div
              key={day.date}
              tabIndex={0}
              role="img"
              aria-label={`${longDay(day.date)}: ${formatMinutes(day.minutes)}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full flex-1 cursor-default items-end justify-center rounded-md outline-offset-0 hover:bg-hover/50"
            >
              {/* Direct label on today's bar only; other values appear on hover. */}
              {i === today && day.minutes > 0 && active === null && (
                <span className="absolute text-xs font-medium text-ink" style={{ bottom: `calc(${height}% + 4px)` }}>
                  {formatMinutes(day.minutes)}
                </span>
              )}
              <span
                className="w-full max-w-9 rounded-t bg-accent transition-[height]"
                style={{ height: `${height}%`, opacity: active === null || active === i ? 1 : 0.55 }}
              />
              {active === i && (
                <span className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-pop">
                  <span className="block text-muted">{longDay(day.date)}</span>
                  <span className="block font-medium text-ink tabular-nums">{formatMinutes(day.minutes)}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-0.5 px-1 pt-1.5" aria-hidden>
        {days.map((day, i) => (
          <span key={day.date} className={`flex-1 text-center text-xs ${i === today ? "font-medium text-ink" : "text-faint"}`}>
            {i === today ? "Today" : weekday(day.date)}
          </span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted">Show as table</summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Focus time</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date} className="border-t border-line">
                <td className="py-1">{longDay(day.date)}</td>
                <td className="py-1 text-right tabular-nums">{formatMinutes(day.minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Minutes per subject/page as labelled rows with a thin bar each. */
function SubjectList({ sessions, pages }: { sessions: Parameters<typeof minutesBySubject>[0]; pages: Page[] }) {
  const openPage = useOpenPage();
  const rows = minutesBySubject(sessions, pages);
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">No focus time in this period yet.</p>;
  const max = rows[0].minutes;

  return (
    <ul className="space-y-3">
      {rows.slice(0, 10).map((row) => (
        <li key={row.key}>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex w-5 justify-center">{row.icon ?? <FileText className="size-4 text-faint" />}</span>
            {row.pageId ? (
              <button type="button" onClick={() => openPage(row.pageId)} className="min-w-0 flex-1 truncate text-left hover:underline">
                {row.title}
              </button>
            ) : (
              <span className={`min-w-0 flex-1 truncate ${row.key === "none" ? "text-muted italic" : ""}`}>{row.title}</span>
            )}
            <span className="text-muted tabular-nums">{formatMinutes(row.minutes)}</span>
          </div>
          <div className="mt-1 ml-7 h-1.5 rounded-full bg-hover" aria-hidden>
            <div className="h-full rounded-full bg-accent" style={{ width: `${(row.minutes / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The focus stats screen (`/?view=stats`). */
export function StatsView({ pages }: { pages: Page[] }) {
  const sessions = useLiveQuery(getAllFocusSessions, []);
  const [range, setRange] = useState<"week" | "all">("week");
  // Recalculated when sessions change; "now" is taken at that moment.
  const summary = useMemo(() => (sessions ? summarize(sessions, new Date()) : null), [sessions]);
  const ranged = useMemo(() => {
    if (!sessions) return [];
    if (range === "all") return sessions;
    const weekStart = startOfWeek(new Date()).getTime();
    return sessions.filter((s) => s.startedAt >= weekStart);
  }, [sessions, range]);

  return (
    <>
      <SimpleTopBar title="Focus stats" />
      <div className="mx-auto w-full max-w-3xl px-5 pt-4 pb-24 md:px-14 md:pt-10">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Focus stats</h1>
        <p className="mt-2 text-muted">Every Pomodoro you finish (or stop after a minute or more) is counted here.</p>

        {summary && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                icon={<Clock className="size-3.5" />}
                label="Today"
                value={formatMinutes(summary.todayMinutes)}
                note={`${summary.todaySessions} session${summary.todaySessions === 1 ? "" : "s"} completed`}
              />
              <StatTile icon={<CalendarDays className="size-3.5" />} label="This week" value={formatMinutes(summary.weekMinutes)} note="Since Monday" />
              <StatTile
                icon={<Flame className="size-3.5" />}
                label="Streak"
                value={`${summary.streak} day${summary.streak === 1 ? "" : "s"}`}
                note={summary.streak ? "Days in a row with a finished session" : "Finish a session to start one"}
              />
            </div>

            <section className="mt-10">
              <h2 className="mb-4 font-serif text-xl font-semibold">Focus time, last 7 days</h2>
              <Last7DaysChart days={summary.last7Days} />
            </section>

            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-serif text-xl font-semibold">By subject</h2>
                <div role="radiogroup" aria-label="Time range" className="flex rounded-lg bg-hover p-0.5 text-xs">
                  {(["week", "all"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={range === r}
                      onClick={() => setRange(r)}
                      className={`rounded-md px-2.5 py-1 ${range === r ? "bg-surface font-medium text-ink shadow-sm" : "text-muted"}`}
                    >
                      {r === "week" ? "This week" : "All time"}
                    </button>
                  ))}
                </div>
              </div>
              <SubjectList sessions={ranged} pages={pages} />
              <p className="mt-4 text-xs text-faint">
                Subjects come from the page or task you link in the timer under “What are you working on?”.
              </p>
            </section>
          </>
        )}
      </div>
    </>
  );
}
