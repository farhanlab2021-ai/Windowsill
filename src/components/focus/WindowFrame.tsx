"use client";

import type { ReactNode } from "react";
import type { TimeOfDay } from "@/lib/focus/scenes";

/** Colours of the "room" around the window, matched to the light outside. */
export const ROOM: Record<TimeOfDay, { wall: string; glow: string; frame: string; sill: string; ink: string }> = {
  day: { wall: "#e9e2d5", glow: "rgba(255,255,250,0.75)", frame: "#f8f5ef", sill: "#efe9de", ink: "#2a2925" },
  sunset: { wall: "#dfc8b6", glow: "rgba(255,196,150,0.6)", frame: "#f6eee5", sill: "#eadccd", ink: "#2e2621" },
  night: { wall: "#191c24", glow: "rgba(120,140,200,0.18)", frame: "#2c303b", sill: "#262a34", ink: "#e9e6e0" },
};

/** A small potted plant and a mug of tea sitting on the windowsill. */
function SillDecor({ time }: { time: TimeOfDay }) {
  const dark = time === "night";
  return (
    <>
      <svg viewBox="0 0 60 70" className="absolute bottom-full left-[8%] h-[clamp(40px,8vh,80px)]" aria-hidden>
        <path d="M30 40 C 26 28 16 22 8 24 C 14 30 22 34 30 40Z" fill={dark ? "#3f5a48" : "#6f9a6a"} />
        <path d="M30 40 C 33 26 44 18 54 20 C 48 28 40 34 30 40Z" fill={dark ? "#456352" : "#7fae76"} />
        <path d="M30 42 C 29 30 30 18 34 8 C 37 18 35 30 30 42Z" fill={dark ? "#3a5444" : "#5f8c5c"} />
        <path d="M14 42 H46 L42 68 H18 Z" fill={dark ? "#7a5446" : "#c8795a"} />
        <rect x="12" y="40" width="36" height="6" rx="2" fill={dark ? "#8a6052" : "#d88b6b"} />
      </svg>
      <svg viewBox="0 0 50 60" className="absolute right-[10%] bottom-full h-[clamp(30px,6vh,60px)]" aria-hidden>
        <g className="motion-safe:animate-[steam_4s_ease-in-out_infinite]" stroke={dark ? "#9aa3b8" : "#ffffff"} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7">
          <path d="M18 18 C 14 12 22 8 18 2" />
          <path d="M27 18 C 23 12 31 8 27 2" />
        </g>
        <path d="M8 24 H38 V48 a8 8 0 0 1 -8 8 H16 a8 8 0 0 1 -8 -8 Z" fill={dark ? "#d9d4c8" : "#fbf7f0"} />
        <path d="M38 30 h4 a6 6 0 0 1 0 12 h-4" stroke={dark ? "#d9d4c8" : "#fbf7f0"} strokeWidth="3.5" fill="none" />
        <path d="M8 24 H38 V28 H8 Z" fill={dark ? "#8a6e5a" : "#a67c5b"} opacity="0.5" />
      </svg>
    </>
  );
}

/**
 * The window: a painted frame with glazing bars, glass with a faint
 * reflection, and a sill with a plant and a mug. `children` is the view.
 */
export function WindowFrame({ time, children, overlay }: { time: TimeOfDay; children: ReactNode; overlay?: ReactNode }) {
  const room = ROOM[time];
  const bar = "clamp(6px, 0.9vw, 12px)";

  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-0 rounded-[clamp(12px,1.6vw,22px)] transition-colors duration-1000"
        style={{
          background: room.frame,
          padding: "clamp(10px, 1.5vw, 22px)",
          boxShadow: "0 40px 80px -30px rgba(0,0,0,0.45), 0 2px 0 rgba(255,255,255,0.4) inset, 0 -3px 0 rgba(0,0,0,0.08) inset",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[6px]" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.12)" }}>
          {children}
          {/* Glass: soft inner shadow and a faint diagonal reflection. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              boxShadow: "inset 0 0 50px rgba(0,0,0,0.25)",
              background:
                "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.06) 72%, rgba(255,255,255,0) 82%)",
            }}
          />
          {/* Glazing bars: one upright, one across the top panes. */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 max-sm:hidden" style={{ width: bar, background: room.frame, boxShadow: "0 0 6px rgba(0,0,0,0.25)" }} />
          <div className="pointer-events-none absolute inset-x-0 top-[34%]" style={{ height: bar, background: room.frame, boxShadow: "0 0 6px rgba(0,0,0,0.25)" }} />
          {overlay}
        </div>
      </div>
      {/* The sill sticks out a little on both sides. */}
      <div
        className="absolute -right-[2.5vw] -left-[2.5vw] top-full h-[clamp(14px,2.6vh,26px)] rounded-md transition-colors duration-1000"
        style={{ background: room.sill, boxShadow: "0 14px 24px -10px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.5) inset" }}
      >
        <SillDecor time={time} />
      </div>
    </div>
  );
}
