"use client";

import { Coffee, Timer } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { formatClock, remainingMs } from "@/lib/timer/engine";
import { useTimer } from "@/stores/timer";
import { TimerPanel } from "./TimerPanel";

/**
 * The small timer button in the top bar. Shows the countdown while a session
 * is active; click it to open the full timer panel.
 */
export function TimerButton() {
  const timer = useTimer((s) => s.timer);
  const now = useTimer((s) => s.now);
  const active = timer.status !== "idle";
  const Icon = timer.phase === "focus" ? Timer : Coffee;

  return (
    <Popover
      label="Pomodoro timer"
      align="end"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={active ? `Timer: ${formatClock(remainingMs(timer, now))} left` : "Pomodoro timer"}
          title="Pomodoro timer (Alt + T to start/pause)"
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm tabular-nums transition-colors ${
            active
              ? timer.phase === "focus"
                ? "bg-accent-soft text-ink"
                : "bg-sky-100 text-sky-950 dark:bg-sky-400/15 dark:text-sky-100"
              : "text-muted hover:bg-hover hover:text-ink"
          } ${timer.status === "paused" ? "opacity-70" : ""}`}
        >
          <Icon className="size-4" />
          {active ? formatClock(remainingMs(timer, now)) : <span className="max-sm:hidden">{timer.phase === "focus" ? "Timer" : "Break"}</span>}
        </button>
      )}
    >
      {(close) => <TimerPanel onNavigate={close} />}
    </Popover>
  );
}
