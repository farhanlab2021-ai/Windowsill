"use client";

import { useEffect, useState } from "react";
import { mediaExists } from "@/lib/focus/media";
import { sceneVideoPath, type SceneId, type TimeOfDay } from "@/lib/focus/scenes";
import { SceneCanvas } from "./SceneCanvas";

/**
 * The view through the window: a looping video if you've added one
 * (public/scenes/<scene>/<time>.mp4), otherwise the hand-drawn scene.
 * Fades in gently when the scene or time of day changes.
 */
export function SceneView({ scene, time }: { scene: SceneId; time: TimeOfDay }) {
  const { video, poster } = sceneVideoPath(scene, time);
  const [found, setFound] = useState<{ url: string; poster: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([mediaExists(video), mediaExists(poster)]).then(([hasVideo, hasPoster]) => {
      if (!cancelled) setFound(hasVideo ? { url: video, poster: hasPoster ? poster : null } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [video, poster]);

  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div key={`${scene}-${time}-${found ? "video" : "canvas"}`} className="absolute inset-0 animate-[scene-fade_1.2s_ease-out]">
      {found ? (
        <video
          src={found.url}
          poster={found.poster ?? undefined}
          autoPlay={!reduceMotion}
          muted
          loop
          playsInline
          preload="auto"
          // Offline (videos aren't saved for offline use) or a broken file: show the drawn scene instead.
          onError={() => setFound(null)}
          className="h-full w-full object-cover"
          aria-hidden
        />
      ) : (
        <SceneCanvas scene={scene} time={time} />
      )}
    </div>
  );
}
