import { describe, expect, it } from "vitest";
import {
  applySettings,
  createTimer,
  DEFAULT_SETTINGS,
  formatClock,
  nextPhase,
  pause,
  remainingMs,
  reset,
  skip,
  start,
  tick,
  type TimerSettings,
  type TimerState,
} from "@/lib/timer/engine";

const MIN = 60_000;
const classic: TimerSettings = { ...DEFAULT_SETTINGS };
const T0 = 1_000_000;

/** Runs a whole focus session to the end and returns the result. */
function finishFocus(state: TimerState, settings = classic, at = T0) {
  return tick(start(state, at), settings, at + settings.focusMinutes * MIN);
}

describe("timer engine", () => {
  it("starts idle with the full focus length", () => {
    const t = createTimer(classic);
    expect(t).toMatchObject({ phase: "focus", status: "idle" });
    expect(remainingMs(t, T0)).toBe(25 * MIN);
  });

  it("counts down from timestamps, not ticks", () => {
    const t = start(createTimer(classic), T0);
    // No ticks at all for 10 minutes (e.g. a background tab) — still exact.
    expect(remainingMs(t, T0 + 10 * MIN)).toBe(15 * MIN);
    expect(tick(t, classic, T0 + 10 * MIN).state).toBe(t); // nothing to do yet
  });

  it("pauses and resumes without losing or gaining time", () => {
    let t = start(createTimer(classic), T0);
    t = pause(t, T0 + 5 * MIN);
    expect(remainingMs(t, T0 + 60 * MIN)).toBe(20 * MIN); // frozen while paused
    t = start(t, T0 + 60 * MIN);
    expect(remainingMs(t, T0 + 61 * MIN)).toBe(19 * MIN);
  });

  it("finishes a focus session, records it, and moves to a short break", () => {
    const result = finishFocus(createTimer(classic));
    expect(result.finished).toBe("focus");
    expect(result.record).toMatchObject({
      kind: "focus",
      startedAt: T0,
      endedAt: T0 + 25 * MIN,
      plannedMinutes: 25,
      actualMinutes: 25,
      completed: true,
    });
    expect(result.state).toMatchObject({ phase: "shortBreak", status: "idle", focusCount: 1 });
  });

  it("records the real end time even if the tab noticed late", () => {
    const t = start(createTimer(classic), T0);
    const result = tick(t, classic, T0 + 90 * MIN); // laptop was asleep
    expect(result.record?.endedAt).toBe(T0 + 25 * MIN);
    expect(result.record?.actualMinutes).toBe(25);
  });

  it("gives a long break after every 4 focus sessions, then starts over", () => {
    expect(nextPhase("focus", 0, classic)).toEqual({ phase: "shortBreak", focusCount: 1 });
    expect(nextPhase("focus", 3, classic)).toEqual({ phase: "longBreak", focusCount: 4 });
    expect(nextPhase("shortBreak", 2, classic)).toEqual({ phase: "focus", focusCount: 2 });
    expect(nextPhase("longBreak", 4, classic)).toEqual({ phase: "focus", focusCount: 0 });

    const every2 = { ...classic, longBreakEvery: 2 };
    expect(nextPhase("focus", 1, every2).phase).toBe("longBreak");
  });

  it("uses the long-break length after the 4th session", () => {
    const fourth = createTimer(classic, "focus", 3);
    const { state } = finishFocus(fourth);
    expect(state.phase).toBe("longBreak");
    expect(remainingMs(state, 0)).toBe(15 * MIN);
  });

  it("auto-starts the next session when enabled", () => {
    const auto = { ...classic, autoStart: true };
    const end = T0 + 25 * MIN;
    const { state } = tick(start(createTimer(auto), T0), auto, end + 2000);
    expect(state).toMatchObject({ phase: "shortBreak", status: "running" });
    expect(remainingMs(state, end + 2000)).toBe(5 * MIN);
  });

  it("supports the Deep 50/10 preset", () => {
    const deep: TimerSettings = { ...classic, preset: "deep", focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 20 };
    const { state, record } = finishFocus(createTimer(deep), deep);
    expect(record?.plannedMinutes).toBe(50);
    expect(remainingMs(state, 0)).toBe(10 * MIN);
  });

  it("skip moves on and saves a partial focus session (if over a minute)", () => {
    const t = start(createTimer(classic), T0);
    const result = skip(t, classic, T0 + 10 * MIN);
    expect(result.state.phase).toBe("shortBreak");
    expect(result.record).toMatchObject({ actualMinutes: 10, completed: false });

    const tooShort = skip(start(createTimer(classic), T0), classic, T0 + 30_000);
    expect(tooShort.record).toBeUndefined();
  });

  it("does not count paused time as studied time", () => {
    let t = start(createTimer(classic), T0);
    t = pause(t, T0 + 5 * MIN);
    t = start(t, T0 + 30 * MIN);
    const { record } = skip(t, classic, T0 + 32 * MIN);
    expect(record?.actualMinutes).toBe(7);
    expect(record?.startedAt).toBe(T0);
  });

  it("reset restarts the same phase and keeps the cycle position", () => {
    const t = start(createTimer(classic, "focus", 2), T0);
    const { state, record } = reset(t, classic, T0 + 3 * MIN);
    expect(state).toMatchObject({ phase: "focus", status: "idle", focusCount: 2 });
    expect(remainingMs(state, 0)).toBe(25 * MIN);
    expect(record?.actualMinutes).toBe(3);
  });

  it("applies new settings to an idle timer but not a running one", () => {
    const deep = { ...classic, focusMinutes: 50 };
    expect(remainingMs(applySettings(createTimer(classic), deep), 0)).toBe(50 * MIN);
    const running = start(createTimer(classic), T0);
    expect(applySettings(running, deep)).toBe(running);
  });

  it("formats the clock", () => {
    expect(formatClock(25 * MIN)).toBe("25:00");
    expect(formatClock(25 * MIN - 1)).toBe("25:00"); // rounds up
    expect(formatClock(61_000)).toBe("01:01");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65 * MIN)).toBe("1:05:00");
  });
});
