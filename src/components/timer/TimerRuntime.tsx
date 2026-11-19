"use client";

import { useEffect } from "react";
import { formatClock, PHASE_LABELS, remainingMs } from "@/lib/timer/engine";
import { startTicker } from "@/lib/timer/ticker";
import { useTimer } from "@/stores/timer";

const BASE_TITLE = "Windowsill";

/**
 * Invisible component (mounted once in the root layout) that keeps the timer
 * alive: loads saved state, ticks every second, and shows the time left in
 * the browser tab's title.
 */
export function TimerRuntime() {
  useEffect(() => {
    void useTimer.persist.rehydrate();
    void useTimer.getState().loadSettings();

    const stopTicker = startTicker(() => useTimer.getState().tick());
    // Catch up immediately when the tab becomes visible again.
    const onVisible = () => useTimer.getState().tick();
    document.addEventListener("visibilitychange", onVisible);
    // Another tab changed the timer: load its version.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "windowsill-timer") void useTimer.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      stopTicker();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Tab title: "▶ 24:13 · Focus" while running, "⏸ 24:13 · Focus" while paused.
  useEffect(
    () =>
      useTimer.subscribe(({ timer, now }) => {
        if (timer.status === "idle") {
          document.title = BASE_TITLE;
          return;
        }
        const icon = timer.status === "running" ? "▶" : "⏸";
        document.title = `${icon} ${formatClock(remainingMs(timer, now))} · ${PHASE_LABELS[timer.phase]} — ${BASE_TITLE}`;
      }),
    [],
  );

  return null;
}
