import { describe, expect, it } from "vitest";
import { BREAK_SOUND, getScene, resolveTimeOfDay, SCENES, sceneVideoPath } from "@/lib/focus/scenes";

const at = (h: number, m = 0) => new Date(2026, 10, 19, h, m);

describe("focus scenes", () => {
  it("has a beach and a mountain scene with three sounds each", () => {
    expect(SCENES.map((s) => s.id)).toEqual(["beach", "mountain"]);
    expect(getScene("beach").sounds.map((s) => s.label)).toEqual(["Waves", "Seagulls", "Light wind"]);
    expect(getScene("mountain").sounds.map((s) => s.label)).toEqual(["Wind", "Birds", "Distant stream"]);
  });

  it("uses unique sound ids and files inside /public/sounds/<scene>/", () => {
    const sounds = [...SCENES.flatMap((s) => s.sounds), BREAK_SOUND];
    expect(new Set(sounds.map((s) => s.id)).size).toBe(sounds.length);
    for (const scene of SCENES) {
      for (const sound of scene.sounds) {
        expect(sound.file.startsWith(`/sounds/${scene.id}/`)).toBe(true);
        expect(sound.defaultVolume).toBeGreaterThan(0);
        expect(sound.defaultVolume).toBeLessThanOrEqual(1);
      }
    }
  });

  it("builds video paths per scene and time of day", () => {
    expect(sceneVideoPath("beach", "sunset")).toEqual({ video: "/scenes/beach/sunset.mp4", poster: "/scenes/beach/sunset.jpg" });
  });

  it("picks the time of day automatically from the local time", () => {
    expect(resolveTimeOfDay("auto", at(10))).toBe("day");
    expect(resolveTimeOfDay("auto", at(16, 59))).toBe("day");
    expect(resolveTimeOfDay("auto", at(17))).toBe("sunset");
    expect(resolveTimeOfDay("auto", at(19, 30))).toBe("sunset");
    expect(resolveTimeOfDay("auto", at(20))).toBe("night");
    expect(resolveTimeOfDay("auto", at(2))).toBe("night");
    expect(resolveTimeOfDay("auto", at(6))).toBe("sunset"); // dawn
    expect(resolveTimeOfDay("auto", at(7))).toBe("day");
  });

  it("respects a fixed choice", () => {
    expect(resolveTimeOfDay("night", at(12))).toBe("night");
  });
});
