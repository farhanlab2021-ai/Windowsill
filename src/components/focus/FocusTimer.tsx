"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { usePage } from "@/hooks/usePages";
import { unlockAudio } from "@/lib/audio/chime";
import { formatClock, PHASE_LABELS, remainingMs } from "@/lib/timer/engine";
import { useTimer } from "@/stores/timer";

/**
 * The timer shown on the glass: large, calm and readable over any scene
 * (frosted backing + white text). Buttons fade out while you're focusing.
 */
export function FocusTimer({ idle }: { idle: boolean }) {
  const timer = useTimer((s) => s.timer);
  const now = useTimer((s) => s.now);
  const task = useTimer((s) => s.task);
  const every = useTimer((s) => s.settings.longBreakEvery);
  const linkedPage = usePage(task.pageId);
  const { toggle, reset, skip } = useTimer.getState();

  const running = timer.status === "running";
  const hideButtons = idle && running;
  const taskText = [task.label?.trim(), linkedPage ? `${linkedPage.icon ?? ""} ${linkedPage.title || "Untitled"}`.trim() : null]
    .filter(Boolean)
    .join(" · ");
  const subtitle =
    timer.phase === "focus" ? `Focus · ${(timer.focusCount % every) + 1} of ${every}` : PHASE_LABELS[timer.phase];

  return (
    <div className="flex flex-col items-center rounded-[28px] bg-black/25 px-[clamp(20px,4vw,44px)] py-[clamp(12px,2.4vh,24px)] text-center text-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.4)] backdrop-blur-md [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">
      <p className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-85">{subtitle}</p>
      <p role="timer" aria-live="off" className="font-serif text-[clamp(2.8rem,min(9vw,11vh),6.5rem)] leading-none font-semibold tabular-nums">
        {formatClock(remainingMs(timer, now))}
      </p>
      {taskText && <p className="mt-2 max-w-[60vw] truncate text-sm opacity-90">{taskText}</p>}
      <div
        className={`mt-3 flex items-center gap-2 transition-opacity duration-700 ${hideButtons ? "opacity-0 focus-within:opacity-100" : "opacity-100"}`}
      >
        <button type="button" onClick={reset} aria-label="Reset" className="rounded-full p-2 opacity-80 hover:bg-white/15 hover:opacity-100">
          <RotateCcw className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            unlockAudio();
            toggle();
          }}
          className="flex items-center gap-1.5 rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-[#1d2a25] [text-shadow:none] hover:bg-white"
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {running ? "Pause" : timer.status === "paused" ? "Resume" : "Start"}
        </button>
        <button type="button" onClick={skip} aria-label="Skip to next session" className="rounded-full p-2 opacity-80 hover:bg-white/15 hover:opacity-100">
          <SkipForward className="size-4" />
        </button>
      </div>
    </div>
  );
}
