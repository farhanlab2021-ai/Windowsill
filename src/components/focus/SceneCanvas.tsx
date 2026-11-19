"use client";

import { useEffect, useRef } from "react";
import { createBeach } from "@/lib/focus/draw/beach";
import type { SceneFactory } from "@/lib/focus/draw/common";
import { createMountain } from "@/lib/focus/draw/mountain";
import type { SceneId, TimeOfDay } from "@/lib/focus/scenes";

const FACTORIES: Record<SceneId, SceneFactory> = { beach: createBeach, mountain: createMountain };
const FPS = 30; // plenty for slow, gentle motion — and kinder to laptop batteries

/**
 * The hand-drawn, animated view (used when there's no video file).
 * Pauses while the tab is hidden; shows a still picture with "reduce motion".
 */
export function SceneCanvas({ scene, time, className = "" }: { scene: SceneId; time: TimeOfDay; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: ReturnType<SceneFactory> | null = null;
    let frame = 0;
    let last = 0;
    let started = performance.now();

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      renderer = FACTORIES[scene](ctx, canvas.width, canvas.height, time);
      renderer.draw(0, 0);
    };

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < 1000 / FPS) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      renderer?.draw((now - started) / 1000, dt);
    };

    const startLoop = () => {
      cancelAnimationFrame(frame);
      if (reduceMotion.matches || document.hidden) return;
      last = 0;
      frame = requestAnimationFrame(loop);
    };

    build();
    startLoop();
    started = performance.now();

    const observer = new ResizeObserver(() => build());
    observer.observe(canvas);
    document.addEventListener("visibilitychange", startLoop);
    reduceMotion.addEventListener("change", startLoop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", startLoop);
      reduceMotion.removeEventListener("change", startLoop);
    };
  }, [scene, time]);

  return <canvas ref={canvasRef} className={`block h-full w-full ${className}`} aria-hidden />;
}
