"use client";

import { Clock, Maximize, Minimize, Moon, NotebookPen, SlidersHorizontal, Sun, Sunset, Volume2, VolumeX, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AppLink } from "@/components/ui/AppLink";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Popover } from "@/components/ui/Popover";
import { useAmbient } from "@/hooks/useAmbient";
import { unlockAudio } from "@/lib/audio/chime";
import { resolveTimeOfDay, SCENES, TIME_LABELS, type TimeMode } from "@/lib/focus/scenes";
import { useFocus } from "@/stores/focus";
import { useTimer } from "@/stores/timer";
import { FocusTimer } from "./FocusTimer";
import { NotesPanel } from "./NotesPanel";
import { SceneView } from "./SceneView";
import { SoundMixer } from "./SoundMixer";
import { SoundToggle } from "./SoundToggle";
import { ROOM, WindowFrame } from "./WindowFrame";

const TIME_ICONS: Record<TimeMode, typeof Sun> = { auto: Clock, day: Sun, sunset: Sunset, night: Moon };

/** True after a few seconds without mouse/keyboard/touch activity (used to fade the controls). */
function useIdle(ms: number) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), ms);
    };
    wake();
    const events = ["pointermove", "pointerdown", "keydown", "wheel"] as const;
    for (const e of events) window.addEventListener(e, wake, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, wake);
    };
  }, [ms]);
  return idle;
}

/** The current minute, so "Auto" time of day updates as evening comes. */
function useMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const subscribeFullscreen = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};

function useFullscreen() {
  const isFull = useSyncExternalStore(subscribeFullscreen, () => !!document.fullscreenElement, () => false);
  const supported = useSyncExternalStore(subscribeFullscreen, () => !!document.fullscreenEnabled, () => false);
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };
  return { isFull, supported, toggle };
}

const BAR_BUTTON = "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink hover:bg-hover aria-pressed:bg-accent-soft";

/**
 * Focus Mode: a calm, full-screen view through a window, with the Pomodoro
 * timer on the glass, ambient sounds, and an optional notes panel.
 */
export function FocusMode() {
  const fromPageId = useSearchParams().get("from");
  const prefs = useFocus();
  const taskPageId = useTimer((s) => s.task.pageId);
  const minute = useMinute();
  const idle = useIdle(4000);
  const fullscreen = useFullscreen();
  const ambient = useAmbient();

  useEffect(() => void useFocus.getState().load(), []);

  const time = resolveTimeOfDay(prefs.timeMode, minute);
  const room = ROOM[time];
  const exitHref = fromPageId ? `/?page=${encodeURIComponent(fromPageId)}` : "/";
  const TimeIcon = TIME_ICONS[prefs.timeMode];

  // Keyboard: Esc leaves (unless typing in notes or a menu is open), Space / Alt+T start or pause
  // the timer, M plays or pauses the sounds.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, select, [contenteditable=true], aside");
      if (e.key === "Escape" && !typing && !document.querySelector("[role=menu], [role=dialog]") && !document.fullscreenElement) {
        window.location.assign(exitHref); // full page load, so it also works offline (see AppLink)
      }
      if ((e.code === "Space" && !typing && !target.closest("button")) || (e.altKey && e.code === "KeyT")) {
        e.preventDefault();
        unlockAudio();
        useTimer.getState().toggle();
      }
      if (e.code === "KeyM" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        unlockAudio();
        useFocus.getState().toggleSound();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitHref]);

  if (!prefs.loaded) return <div className="fixed inset-0" style={{ background: room.wall }} />;

  return (
    <div
      className={`fixed inset-0 overflow-hidden transition-colors duration-1000 ${idle && !prefs.notesOpen ? "cursor-none" : ""}`}
      style={{ background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${room.glow}, transparent 70%), ${room.wall}`, color: room.ink }}
    >
      <h1 className="sr-only">Focus Mode — {SCENES.find((s) => s.id === prefs.scene)?.name}</h1>

      {/* The window. Leaves room on the right for the notes panel on large screens. */}
      <div
        className={`absolute top-[4vh] bottom-[19vh] left-[5vw] transition-[right] duration-500 sm:bottom-[16vh] ${
          prefs.notesOpen ? "right-[5vw] lg:right-[calc(min(30rem,40vw)+4vw)]" : "right-[5vw]"
        }`}
      >
        <WindowFrame
          time={time}
          overlay={
            <div className="absolute inset-x-0 bottom-[8%] flex justify-center px-3">
              <FocusTimer idle={idle} />
            </div>
          }
        >
          <SceneView scene={prefs.scene} time={time} />
        </WindowFrame>
      </div>

      {/* Notes: a side panel on large screens, a bottom sheet on phones. */}
      {prefs.notesOpen && (
        <div className="absolute inset-x-3 bottom-[calc(2.5vh+60px)] z-30 h-[58vh] lg:top-[4vh] lg:right-[3vw] lg:bottom-[10vh] lg:left-auto lg:h-auto lg:w-[min(30rem,40vw)]">
          <NotesPanel initialPageId={fromPageId ?? taskPageId} onClose={() => prefs.update({ notesOpen: false })} />
        </div>
      )}

      {/* Controls along the bottom; they fade away while you're focusing. */}
      <nav
        aria-label="Focus Mode controls"
        className={`absolute inset-x-0 bottom-[2.5vh] z-20 flex justify-center px-3 transition-opacity duration-700 ${
          idle ? "opacity-0 focus-within:opacity-100 hover:opacity-100" : "opacity-100"
        }`}
      >
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-line bg-surface/85 p-1 shadow-pop backdrop-blur">
          <div role="radiogroup" aria-label="Scene" className="flex">
            {SCENES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={prefs.scene === s.id}
                onClick={() => prefs.update({ scene: s.id })}
                title={s.description}
                className={`rounded-full px-3 py-1.5 text-sm ${prefs.scene === s.id ? "bg-accent font-medium text-accent-ink" : "text-ink hover:bg-hover"}`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <Popover
            label="Time of day"
            align="end"
            kind="menu"
            className="p-1"
            trigger={(props) => (
              <button {...props} type="button" className={BAR_BUTTON} title="Time of day">
                <TimeIcon className="size-4" />
                <span className="max-sm:hidden">{TIME_LABELS[prefs.timeMode]}</span>
              </button>
            )}
          >
            {(close) => (
              <div className="min-w-44">
                {(Object.keys(TIME_LABELS) as TimeMode[]).map((mode) => {
                  const Icon = TIME_ICONS[mode];
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="menuitemradio"
                      aria-checked={prefs.timeMode === mode}
                      onClick={() => {
                        prefs.update({ timeMode: mode });
                        close();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-hover aria-checked:font-medium"
                    >
                      <Icon className="size-4 text-muted" />
                      <span className="flex-1">{TIME_LABELS[mode]}</span>
                      {mode === "auto" && <span className="text-xs text-faint">now: {TIME_LABELS[resolveTimeOfDay("auto", minute)]}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </Popover>

          {/* Start/stop the ambient sounds. */}
          <SoundToggle className={`${BAR_BUTTON} [&>span]:max-sm:hidden`} />

          <Popover
            label="Sound mixer"
            align="end"
            trigger={(props) => (
              <button {...props} type="button" className={BAR_BUTTON} title="Sound mixer (volumes)">
                {prefs.muted ? <VolumeX className="size-4" /> : <SlidersHorizontal className="size-4" />}
                <span className="max-sm:hidden">Mixer</span>
              </button>
            )}
          >
            {() => <SoundMixer status={ambient.status} blocked={ambient.blocked} onUnlock={ambient.unlock} />}
          </Popover>

          <button
            type="button"
            aria-pressed={prefs.notesOpen}
            onClick={() => prefs.update({ notesOpen: !prefs.notesOpen })}
            className={BAR_BUTTON}
            title="Notes"
          >
            <NotebookPen className="size-4" />
            <span className="max-sm:hidden">Notes</span>
          </button>

          {fullscreen.supported && (
            <button type="button" onClick={fullscreen.toggle} className={BAR_BUTTON} aria-label={fullscreen.isFull ? "Exit full screen" : "Full screen"} title="Full screen">
              {fullscreen.isFull ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </button>
          )}

          <AppLink href={exitHref} className={BAR_BUTTON} aria-label="Leave Focus Mode" title="Leave Focus Mode (Esc)">
            <X className="size-4" />
          </AppLink>
        </div>
      </nav>

      {/* If the browser blocked sound until a click, offer a gentle button. */}
      {prefs.soundOn && ambient.blocked && (
        <button
          type="button"
          onClick={ambient.unlock}
          className="absolute top-[5vh] right-[6vw] z-20 flex items-center gap-1.5 rounded-full bg-surface/85 px-3 py-1.5 text-sm text-ink shadow-pop backdrop-blur"
        >
          <Volume2 className="size-4" /> Turn on sound
        </button>
      )}
    </div>
  );
}
