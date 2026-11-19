/**
 * Focus Mode preferences (scene, time of day, sound levels, notes panel),
 * saved in IndexedDB like the other settings.
 */
import { create } from "zustand";
import { getSetting, setSetting } from "@/lib/db/settings";
import type { BreakSoundMode, SceneId, TimeMode } from "@/lib/focus/scenes";

export interface FocusPrefs {
  scene: SceneId;
  timeMode: TimeMode;
  /**
   * Whether the ambient sounds are playing right now. Not saved: Focus Mode
   * always opens silent, and sounds only play after pressing "Play sounds".
   */
  soundOn: boolean;
  master: number;
  muted: boolean;
  /** Volume per sound id, 0–1. Missing = the sound's default. */
  volumes: Record<string, number>;
  breakSound: BreakSoundMode;
  notesOpen: boolean;
}

const DEFAULTS: FocusPrefs = {
  scene: "beach",
  timeMode: "auto",
  soundOn: false,
  master: 0.7,
  muted: false,
  volumes: {},
  breakSound: "rain",
  notesOpen: false,
};

const KEY = "focusMode";

interface FocusStore extends FocusPrefs {
  loaded: boolean;
  load: () => Promise<void>;
  /** Play or pause the ambient sounds (they fade in/out). */
  toggleSound: () => void;
  update: (patch: Partial<FocusPrefs>) => void;
  setVolume: (id: string, volume: number) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useFocus = create<FocusStore>((set, get) => {
  /** Saves a moment after the last change (sliders change many times per second). */
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { scene, timeMode, master, muted, volumes, breakSound, notesOpen } = get();
      void setSetting<Omit<FocusPrefs, "soundOn">>(KEY, { scene, timeMode, master, muted, volumes, breakSound, notesOpen });
    }, 400);
  };

  return {
    ...DEFAULTS,
    loaded: false,
    load: async () => {
      if (get().loaded) return;
      const saved = await getSetting<Partial<FocusPrefs>>(KEY, {});
      // soundOn is ignored even if an older version saved it: always open silent.
      set({ ...DEFAULTS, ...saved, soundOn: false, loaded: true });
    },
    toggleSound: () => set({ soundOn: !get().soundOn }),
    update: (patch) => {
      set(patch);
      save();
    },
    setVolume: (id, volume) => {
      set({ volumes: { ...get().volumes, [id]: volume } });
      save();
    },
  };
});
