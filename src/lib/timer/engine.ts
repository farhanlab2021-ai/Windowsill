/**
 * The Pomodoro timer's logic, with no React and no browser APIs, so it can be
 * tested precisely.
 *
 * Accuracy: we never count seconds. While running we store `endsAt` (a
 * timestamp) and the time left is always `endsAt - now`. Browsers slow down
 * timers in background tabs, but the clock itself is always right, so the
 * timer is too.
 *
 * Every function takes the current state and returns a new one (it never
 * changes the old object). Functions that end a session also return a
 * `record` to save in the session history.
 */

export type Phase = "focus" | "shortBreak" | "longBreak";
export type PresetId = "classic" | "deep" | "custom";

export interface TimerSettings {
  preset: PresetId;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  /** A long break comes after this many focus sessions. */
  longBreakEvery: number;
  /** Start the next session automatically when one ends. */
  autoStart: boolean;
  sound: boolean;
  notifications: boolean;
}

export const PRESETS: Record<Exclude<PresetId, "custom">, Pick<TimerSettings, "focusMinutes" | "shortBreakMinutes" | "longBreakMinutes">> = {
  classic: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 },
  deep: { focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 20 },
};

export const DEFAULT_SETTINGS: TimerSettings = {
  preset: "classic",
  ...PRESETS.classic,
  longBreakEvery: 4,
  autoStart: false,
  sound: true,
  notifications: true,
};

export interface TimerState {
  phase: Phase;
  status: "idle" | "running" | "paused";
  /** Full length of the current phase. */
  durationMs: number;
  /** Time left while idle/paused (while running, use `endsAt`). */
  remainingMs: number;
  /** When the current phase will end (only while running). */
  endsAt: number | null;
  /** When the current stretch of running began (only while running). */
  runningSince: number | null;
  /** Time actually spent running in this phase before the last pause. */
  activeMs: number;
  /** When this phase was first started (used as the session's start time and id). */
  phaseStartedAt: number | null;
  /** Focus sessions finished since the last long break. */
  focusCount: number;
}

/** A finished (or cut-short) session, ready to save. */
export interface SessionRecord {
  kind: Phase;
  startedAt: number;
  endedAt: number;
  plannedMinutes: number;
  actualMinutes: number;
  completed: boolean;
}

export interface StepResult {
  state: TimerState;
  record?: SessionRecord;
  /** Set when a phase ran out on its own (time for a chime/notification). */
  finished?: Phase;
}

const MINUTE = 60_000;

/** Partial focus sessions shorter than this aren't saved. */
export const MIN_SAVED_MS = MINUTE;

export function durationFor(phase: Phase, settings: TimerSettings): number {
  const minutes =
    phase === "focus" ? settings.focusMinutes
    : phase === "shortBreak" ? settings.shortBreakMinutes
    : settings.longBreakMinutes;
  return Math.max(1, minutes) * MINUTE;
}

/** Which phase comes next, and the updated focus count. */
export function nextPhase(phase: Phase, focusCount: number, settings: TimerSettings) {
  if (phase === "focus") {
    const count = focusCount + 1;
    return { phase: (count % settings.longBreakEvery === 0 ? "longBreak" : "shortBreak") as Phase, focusCount: count };
  }
  // After a long break the cycle starts over.
  return { phase: "focus" as Phase, focusCount: phase === "longBreak" ? 0 : focusCount };
}

/** A fresh, idle timer for `phase`. */
export function createTimer(settings: TimerSettings, phase: Phase = "focus", focusCount = 0): TimerState {
  const durationMs = durationFor(phase, settings);
  return {
    phase,
    status: "idle",
    durationMs,
    remainingMs: durationMs,
    endsAt: null,
    runningSince: null,
    activeMs: 0,
    phaseStartedAt: null,
    focusCount,
  };
}

export function remainingMs(state: TimerState, now: number): number {
  if (state.status === "running" && state.endsAt !== null) return Math.max(0, state.endsAt - now);
  return state.remainingMs;
}

/** How much of the current phase has actually been spent running. */
export function activeMs(state: TimerState, now: number): number {
  const running = state.status === "running" && state.runningSince !== null ? now - state.runningSince : 0;
  return state.activeMs + Math.max(0, running);
}

export function start(state: TimerState, now: number): TimerState {
  if (state.status === "running") return state;
  return {
    ...state,
    status: "running",
    endsAt: now + state.remainingMs,
    runningSince: now,
    phaseStartedAt: state.phaseStartedAt ?? now,
  };
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== "running") return state;
  return {
    ...state,
    status: "paused",
    remainingMs: remainingMs(state, now),
    activeMs: activeMs(state, now),
    endsAt: null,
    runningSince: null,
  };
}

function makeRecord(state: TimerState, endedAt: number, active: number, completed: boolean): SessionRecord {
  return {
    kind: state.phase,
    startedAt: state.phaseStartedAt ?? endedAt - active,
    endedAt,
    plannedMinutes: Math.round(state.durationMs / MINUTE),
    actualMinutes: Math.round((active / MINUTE) * 10) / 10,
    completed,
  };
}

/** Records a focus session that was cut short, if enough time was spent on it. */
function partialRecord(state: TimerState, now: number): SessionRecord | undefined {
  const active = activeMs(state, now);
  if (state.phase !== "focus" || active < MIN_SAVED_MS) return undefined;
  return makeRecord(state, now, active, false);
}

/** Moves to the phase after this one; running straight away if `autoStart` is on. */
function advance(state: TimerState, settings: TimerSettings, now: number): TimerState {
  const next = nextPhase(state.phase, state.focusCount, settings);
  const fresh = createTimer(settings, next.phase, next.focusCount);
  return settings.autoStart ? start(fresh, now) : fresh;
}

/**
 * Call this regularly (every second). When the time is up it finishes the
 * phase, returns a record of it, and moves on to the next phase.
 */
export function tick(state: TimerState, settings: TimerSettings, now: number): StepResult {
  if (state.status !== "running" || state.endsAt === null || now < state.endsAt) return { state };
  const endedAt = state.endsAt; // the real end time, even if we noticed late (e.g. a sleeping tab)
  const active = state.activeMs + (endedAt - (state.runningSince ?? endedAt));
  return {
    state: advance(state, settings, now),
    record: makeRecord(state, endedAt, active, true),
    finished: state.phase,
  };
}

/** Ends the current phase early and moves to the next one. */
export function skip(state: TimerState, settings: TimerSettings, now: number): StepResult {
  return { state: advance(state, settings, now), record: partialRecord(state, now) };
}

/** Starts the current phase over (stopped). */
export function reset(state: TimerState, settings: TimerSettings, now: number): StepResult {
  return { state: createTimer(settings, state.phase, state.focusCount), record: partialRecord(state, now) };
}

/** After settings change: an untouched idle timer picks up the new length right away. */
export function applySettings(state: TimerState, settings: TimerSettings): TimerState {
  if (state.status !== "idle") return state;
  return createTimer(settings, state.phase, state.focusCount);
}

/** "24:59" (or "1:05:00" for an hour or more). Rounds up, so it reads 25:00 at the start. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h ? `${h}:` : ""}${pad(m)}:${pad(s)}`;
}

export const PHASE_LABELS: Record<Phase, string> = {
  focus: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};
