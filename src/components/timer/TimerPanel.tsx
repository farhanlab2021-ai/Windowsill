"use client";

import { BarChart3, Bell, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useMemo, useState } from "react";
import { useCurrentPageId, useOpenView } from "@/hooks/useNavigation";
import { usePages } from "@/hooks/usePages";
import { unlockAudio } from "@/lib/audio/chime";
import { flattenTree } from "@/lib/db/tree";
import { formatClock, PHASE_LABELS, remainingMs, type Phase, type PresetId } from "@/lib/timer/engine";
import { notificationPermission, requestNotificationPermission } from "@/lib/timer/notify";
import { useTimer } from "@/stores/timer";

const PHASES: Phase[] = ["focus", "shortBreak", "longBreak"];

/** The circular progress ring around the clock. */
function Ring({ progress, phase }: { progress: number; phase: Phase }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="6" className="stroke-hover" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${phase === "focus" ? "stroke-accent" : "stroke-sky-500 dark:stroke-sky-300"}`}
      />
    </svg>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  unit = "min",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = Math.round(Number(e.target.value));
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          className="w-16 rounded-lg border border-line bg-canvas px-2 py-1 text-right tabular-nums outline-none focus:border-accent"
        />
        <span className="w-7 text-xs text-faint">{unit}</span>
      </span>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--c-accent)]" />
    </label>
  );
}

/** Polite, one-time question about notifications (shown after the first Start). */
function NotifyPrompt() {
  const dismissed = useTimer((s) => s.notifyPromptDismissed);
  const dismiss = useTimer((s) => s.dismissNotifyPrompt);
  const enabled = useTimer((s) => s.settings.notifications);
  const started = useTimer((s) => s.timer.phaseStartedAt !== null);
  const [permission, setPermission] = useState(notificationPermission);

  if (dismissed || !enabled || !started || permission !== "default") return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-accent-soft p-3 text-sm">
      <Bell className="mt-0.5 size-4 shrink-0 text-accent" />
      <div className="flex-1">
        <p>Want a gentle notification when a session ends, even if this tab is in the background?</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={async () => {
              setPermission(await requestNotificationPermission());
              dismiss();
            }}
            className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-accent-ink"
          >
            Allow
          </button>
          <button type="button" onClick={dismiss} className="rounded-lg px-3 py-1 text-xs text-muted hover:bg-hover">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

/** What the session is for: a page and/or a short task name. */
function TaskPicker() {
  const task = useTimer((s) => s.task);
  const setTask = useTimer((s) => s.setTask);
  const pages = usePages();
  const currentPageId = useCurrentPageId();
  const options = useMemo(() => {
    if (!pages) return [];
    const all = new Set(pages.map((p) => p.id)); // show every level
    return flattenTree(pages, all);
  }, [pages]);
  const current = pages?.find((p) => p.id === currentPageId && p.deletedAt === null);

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm font-medium">What are you working on?</legend>
      <input
        type="text"
        value={task.label ?? ""}
        onChange={(e) => setTask({ label: e.target.value })}
        placeholder="e.g. Read chapter 3"
        aria-label="Task"
        className="w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm outline-none placeholder:text-faint focus:border-accent"
      />
      <select
        value={task.pageId ?? ""}
        onChange={(e) => setTask({ pageId: e.target.value || null })}
        aria-label="Link to a page"
        className="w-full rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm outline-none focus:border-accent"
      >
        <option value="">No page linked</option>
        {options.map(({ page, depth }) => (
          <option key={page.id} value={page.id}>
            {"  ".repeat(depth)}
            {page.icon ? `${page.icon} ` : ""}
            {page.title || "Untitled"}
          </option>
        ))}
      </select>
      {current && task.pageId !== current.id && (
        <button type="button" onClick={() => setTask({ pageId: current.id })} className="text-xs text-accent hover:underline">
          Link to “{current.title || "Untitled"}”
        </button>
      )}
    </fieldset>
  );
}

function Settings() {
  const settings = useTimer((s) => s.settings);
  const update = useTimer((s) => s.updateSettings);
  const choosePreset = useTimer((s) => s.choosePreset);
  const presets: { id: PresetId; label: string }[] = [
    { id: "classic", label: "Classic 25/5" },
    { id: "deep", label: "Deep 50/10" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <details className="group rounded-xl border border-line">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium select-none">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span> Timer settings
      </summary>
      <div className="space-y-3 border-t border-line p-3">
        <div role="radiogroup" aria-label="Preset" className="grid grid-cols-3 gap-1 rounded-lg bg-hover p-1">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={settings.preset === p.id}
              onClick={() => choosePreset(p.id)}
              className={`rounded-md px-1 py-1 text-xs ${settings.preset === p.id ? "bg-surface font-medium text-ink shadow-sm" : "text-muted"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {settings.preset === "custom" && (
          <>
            <NumberField label="Focus" value={settings.focusMinutes} min={1} max={180} onChange={(n) => update({ focusMinutes: n })} />
            <NumberField label="Short break" value={settings.shortBreakMinutes} min={1} max={60} onChange={(n) => update({ shortBreakMinutes: n })} />
          </>
        )}
        <NumberField label="Long break" value={settings.longBreakMinutes} min={5} max={60} onChange={(n) => update({ longBreakMinutes: n })} />
        <NumberField label="Long break after" unit="focus" value={settings.longBreakEvery} min={2} max={10} onChange={(n) => update({ longBreakEvery: n })} />
        <Toggle label="Auto-start next session" checked={settings.autoStart} onChange={(v) => update({ autoStart: v })} />
        <Toggle label="Chime" checked={settings.sound} onChange={(v) => update({ sound: v })} />
        <Toggle label="Notifications" checked={settings.notifications} onChange={(v) => update({ notifications: v })} />
        {settings.notifications && notificationPermission() === "denied" && (
          <p className="text-xs text-faint">Notifications are blocked for this site in your browser settings.</p>
        )}
      </div>
    </details>
  );
}

/** The full timer: clock, controls, task link and settings. */
export function TimerPanel({ onNavigate }: { onNavigate?: () => void }) {
  const timer = useTimer((s) => s.timer);
  const now = useTimer((s) => s.now);
  const settings = useTimer((s) => s.settings);
  const { toggle, reset, skip, setPhase } = useTimer.getState();
  const openView = useOpenView();

  const left = remainingMs(timer, now);
  const progress = timer.durationMs ? 1 - left / timer.durationMs : 0;
  const running = timer.status === "running";
  const sessionNumber = (timer.focusCount % settings.longBreakEvery) + 1;

  return (
    // Outer box scrolls on short screens; the inner column never squashes its items.
    <div className="max-h-[min(85vh,42rem)] w-[min(92vw,21rem)] overflow-y-auto">
    <div className="flex flex-col gap-4 p-4">
      <div role="radiogroup" aria-label="Session type" className="grid grid-cols-3 gap-1 rounded-lg bg-hover p-1">
        {PHASES.map((phase) => (
          <button
            key={phase}
            type="button"
            role="radio"
            aria-checked={timer.phase === phase}
            disabled={timer.status !== "idle" && timer.phase !== phase}
            onClick={() => setPhase(phase)}
            className={`rounded-md px-1 py-1 text-xs disabled:opacity-40 ${timer.phase === phase ? "bg-surface font-medium text-ink shadow-sm" : "text-muted"}`}
          >
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      <div className="relative mx-auto size-44">
        <Ring progress={progress} phase={timer.phase} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-4xl font-semibold tabular-nums" role="timer" aria-live="off">
            {formatClock(left)}
          </span>
          <span className="mt-1 text-xs text-muted">
            {timer.phase === "focus" ? `Session ${sessionNumber} of ${settings.longBreakEvery}` : PHASE_LABELS[timer.phase]}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={reset} aria-label="Reset" title="Reset" className="rounded-full p-2.5 text-muted hover:bg-hover hover:text-ink">
          <RotateCcw className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            unlockAudio(); // allows the end-of-session chime
            toggle();
          }}
          className="flex min-w-32 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-ink shadow-sm hover:opacity-90"
        >
          {running ? <Pause className="size-5" /> : <Play className="size-5" />}
          {running ? "Pause" : timer.status === "paused" ? "Resume" : "Start"}
        </button>
        <button type="button" onClick={skip} aria-label="Skip to next session" title="Skip" className="rounded-full p-2.5 text-muted hover:bg-hover hover:text-ink">
          <SkipForward className="size-5" />
        </button>
      </div>

      <NotifyPrompt />
      <TaskPicker />
      <Settings />

      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          openView("stats");
        }}
        className="flex items-center justify-center gap-2 rounded-lg py-1.5 text-sm text-accent hover:bg-hover"
      >
        <BarChart3 className="size-4" /> View focus stats
      </button>
    </div>
    </div>
  );
}
