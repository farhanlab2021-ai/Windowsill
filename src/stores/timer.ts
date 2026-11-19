/**
 * The Pomodoro timer's shared state (zustand).
 *
 * - The running timer and the "working on" link are saved to localStorage, so
 *   a refresh (or closing the tab) doesn't lose a session in progress.
 * - Timer settings are saved in IndexedDB with the other settings.
 * - The actual rules live in `lib/timer/engine.ts`; this file just wires them
 *   to the UI and to side effects (saving sessions, chime, notification).
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { playChime } from "@/lib/audio/chime";
import { getSetting, setSetting } from "@/lib/db/settings";
import { saveSession, type SessionLink } from "@/lib/db/sessions";
import {
  applySettings,
  createTimer,
  DEFAULT_SETTINGS,
  pause,
  PRESETS,
  reset,
  skip,
  start,
  tick,
  type Phase,
  type PresetId,
  type StepResult,
  type TimerSettings,
  type TimerState,
} from "@/lib/timer/engine";
import { showNotification } from "@/lib/timer/notify";
import { useUI } from "./ui";

const SETTINGS_KEY = "timerSettings";

interface TimerStore {
  timer: TimerState;
  settings: TimerSettings;
  task: SessionLink;
  /** Updated every tick so the clock on screen re-renders. */
  now: number;
  notifyPromptDismissed: boolean;

  loadSettings: () => Promise<void>;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  skip: () => void;
  reset: () => void;
  tick: () => void;
  setPhase: (phase: Phase) => void;
  setTask: (patch: Partial<SessionLink>) => void;
  updateSettings: (patch: Partial<TimerSettings>) => void;
  choosePreset: (preset: PresetId) => void;
  dismissNotifyPrompt: () => void;
}

const MESSAGES: Record<Phase, (next: Phase, settings: TimerSettings) => [string, string]> = {
  focus: (next, s) => [
    "Focus session complete 🌿",
    next === "longBreak"
      ? `Great work — enjoy a ${s.longBreakMinutes}-minute long break.`
      : `Nice work — take a ${s.shortBreakMinutes}-minute break.`,
  ],
  shortBreak: () => ["Break's over", "Ready for the next focus session?"],
  longBreak: () => ["Long break's over", "Ready to start a new round?"],
};

/** Chime + notification + toast when a phase runs out (unless it ended long ago). */
function announce(finished: Phase, next: Phase, settings: TimerSettings, endedAt: number) {
  if (Date.now() - endedAt > 60_000) return; // e.g. reopening the app the next day
  if (settings.sound) playChime(finished === "focus" ? "down" : "up");
  const [title, body] = MESSAGES[finished](next, settings);
  if (settings.notifications && (document.visibilityState !== "visible" || !document.hasFocus())) {
    void showNotification(title, body);
  }
  useUI.getState().showToast({ message: `${title} — ${body}` });
}

export const useTimer = create<TimerStore>()(
  persist(
    (set, get) => {
      /** Applies an engine result: new state, save the session, announce the end. */
      const handle = (result: StepResult) => {
        set({ timer: result.state, now: Date.now() });
        if (result.record?.kind === "focus") void saveSession(result.record, get().task);
        if (result.finished && result.record) {
          announce(result.finished, result.state.phase, get().settings, result.record.endedAt);
        }
      };

      const saveSettings = (settings: TimerSettings) => {
        set({ settings, timer: applySettings(get().timer, settings) });
        void setSetting(SETTINGS_KEY, settings);
      };

      return {
        timer: createTimer(DEFAULT_SETTINGS),
        settings: DEFAULT_SETTINGS,
        task: { pageId: null, label: null },
        now: Date.now(),
        notifyPromptDismissed: false,

        loadSettings: async () => {
          const saved = await getSetting<Partial<TimerSettings>>(SETTINGS_KEY, {});
          const settings = { ...DEFAULT_SETTINGS, ...saved };
          set({ settings, timer: applySettings(get().timer, settings) });
        },

        start: () => set({ timer: start(get().timer, Date.now()), now: Date.now() }),
        pause: () => set({ timer: pause(get().timer, Date.now()), now: Date.now() }),
        toggle: () => (get().timer.status === "running" ? get().pause() : get().start()),
        skip: () => handle(skip(get().timer, get().settings, Date.now())),
        reset: () => handle(reset(get().timer, get().settings, Date.now())),
        tick: () => {
          const result = tick(get().timer, get().settings, Date.now());
          if (result.state !== get().timer) handle(result);
          else set({ now: Date.now() });
        },

        setPhase: (phase) => {
          const { timer, settings } = get();
          if (timer.status !== "idle") return;
          set({ timer: createTimer(settings, phase, timer.focusCount) });
        },

        setTask: (patch) => set({ task: { ...get().task, ...patch } }),

        updateSettings: (patch) => saveSettings({ ...get().settings, ...patch }),

        choosePreset: (preset) =>
          saveSettings(preset === "custom" ? { ...get().settings, preset } : { ...get().settings, preset, ...PRESETS[preset] }),

        dismissNotifyPrompt: () => set({ notifyPromptDismissed: true }),
      };
    },
    {
      name: "windowsill-timer",
      storage: createJSONStorage(() => localStorage),
      // Only these are saved; settings live in IndexedDB.
      partialize: (s) => ({ timer: s.timer, task: s.task, notifyPromptDismissed: s.notifyPromptDismissed }),
      // We load saved state ourselves after the page appears (avoids server/browser mismatches).
      skipHydration: true,
    },
  ),
);
