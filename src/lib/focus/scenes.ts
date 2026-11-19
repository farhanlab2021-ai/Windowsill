/**
 * Focus Mode scenes and their sounds.
 *
 * Every scene works out of the box: the view is drawn in code and the sounds
 * are generated in the browser. If you add real media files at the paths
 * below (see README → "Adding real scenery and sounds"), they're used instead.
 */

export type SceneId = "beach" | "mountain";
export type TimeOfDay = "day" | "sunset" | "night";
export type TimeMode = "auto" | TimeOfDay;

/** How a sound is generated when there's no recording for it. */
export type SynthKind = "waves" | "wind" | "breeze" | "seagulls" | "birds" | "stream" | "rain";

export interface SoundDef {
  /** Unique across scenes, e.g. "beach.waves". */
  id: string;
  label: string;
  /** Optional recording; used instead of the generated sound if the file exists. */
  file: string;
  synth: SynthKind;
  defaultVolume: number;
}

export interface SceneDef {
  id: SceneId;
  name: string;
  description: string;
  sounds: SoundDef[];
}

export const SCENES: SceneDef[] = [
  {
    id: "beach",
    name: "Beach",
    description: "Waves rolling onto the sand under an open sky.",
    sounds: [
      { id: "beach.waves", label: "Waves", file: "/sounds/beach/waves.mp3", synth: "waves", defaultVolume: 0.75 },
      { id: "beach.seagulls", label: "Seagulls", file: "/sounds/beach/seagulls.mp3", synth: "seagulls", defaultVolume: 0.25 },
      { id: "beach.wind", label: "Light wind", file: "/sounds/beach/wind.mp3", synth: "breeze", defaultVolume: 0.3 },
    ],
  },
  {
    id: "mountain",
    name: "Mountain cliff",
    description: "From a cliff edge over valleys, ridges and drifting clouds.",
    sounds: [
      { id: "mountain.wind", label: "Wind", file: "/sounds/mountain/wind.mp3", synth: "wind", defaultVolume: 0.55 },
      { id: "mountain.birds", label: "Birds", file: "/sounds/mountain/birds.mp3", synth: "birds", defaultVolume: 0.35 },
      { id: "mountain.stream", label: "Distant stream", file: "/sounds/mountain/stream.mp3", synth: "stream", defaultVolume: 0.3 },
    ],
  },
];

/** Optional calm sound played during breaks instead of the scene's sounds. */
export const BREAK_SOUND: SoundDef = {
  id: "break.rain",
  label: "Soft rain",
  file: "/sounds/breaks/rain.mp3",
  synth: "rain",
  defaultVolume: 0.5,
};

export type BreakSoundMode = "scene" | "rain" | "silence";

export function getScene(id: SceneId): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}

/** Optional looping video for a scene and time of day, e.g. /scenes/beach/sunset.mp4. */
export function sceneVideoPath(scene: SceneId, time: TimeOfDay) {
  return { video: `/scenes/${scene}/${time}.mp4`, poster: `/scenes/${scene}/${time}.jpg` };
}

/**
 * Picks day / sunset / night from the student's local time:
 * 7:00–17:00 day, 17:00–20:00 sunset, 20:00–5:00 night, 5:00–7:00 dawn (shown as "sunset").
 */
export function resolveTimeOfDay(mode: TimeMode, now: Date = new Date()): TimeOfDay {
  if (mode !== "auto") return mode;
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour >= 7 && hour < 17) return "day";
  if ((hour >= 17 && hour < 20) || (hour >= 5 && hour < 7)) return "sunset";
  return "night";
}

export const TIME_LABELS: Record<TimeMode, string> = {
  auto: "Auto",
  day: "Day",
  sunset: "Sunset",
  night: "Night",
};
