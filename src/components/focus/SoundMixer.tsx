"use client";

import { Volume2, VolumeX } from "lucide-react";
import type { SourceStatus } from "@/lib/audio/ambient";
import { getScene, type BreakSoundMode } from "@/lib/focus/scenes";
import { useFocus } from "@/stores/focus";
import { SoundToggle } from "./SoundToggle";

function Slider({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      aria-label={label}
      aria-valuetext={`${Math.round(value * 100)}%`}
      disabled={disabled}
      className="h-1.5 w-full cursor-pointer accent-[var(--c-accent)] disabled:opacity-40"
    />
  );
}

/** Per-sound volumes, master volume and mute, and the break-time sound. */
export function SoundMixer({ status, blocked, onUnlock }: { status: SourceStatus; blocked: boolean; onUnlock: () => void }) {
  const prefs = useFocus();
  const scene = getScene(prefs.scene);

  return (
    <div className="w-[min(92vw,20rem)] space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold">Sounds</h2>
        <SoundToggle className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90" />
      </div>
      {!prefs.soundOn && <p className="-mt-2 text-xs text-muted">Sounds are paused. You can still set the volumes.</p>}

      {prefs.soundOn && blocked && (
        <button type="button" onClick={onUnlock} className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-ink">
          Tap to start the sounds
        </button>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Master</span>
          <button
            type="button"
            onClick={() => prefs.update({ muted: !prefs.muted })}
            aria-pressed={prefs.muted}
            aria-label={prefs.muted ? "Unmute" : "Mute"}
            className="rounded-md p-1 text-muted hover:bg-hover hover:text-ink"
          >
            {prefs.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
        <Slider label="Master volume" value={prefs.master} onChange={(v) => prefs.update({ master: v, muted: false })} />
      </div>

      <div className="space-y-3 border-t border-line pt-3">
        <p className="text-xs font-semibold tracking-wider text-faint uppercase">{scene.name}</p>
        {scene.sounds.map((sound) => (
          <div key={sound.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>{sound.label}</span>
              {status[sound.id] && (
                <span className="text-[11px] text-faint" title={status[sound.id] === "generated" ? "Made in the browser — add a recording to replace it" : undefined}>
                  {status[sound.id] === "recording" ? "recording" : status[sound.id] === "generated" ? "generated" : "loading…"}
                </span>
              )}
            </div>
            <Slider
              label={`${sound.label} volume`}
              value={prefs.volumes[sound.id] ?? sound.defaultVolume}
              onChange={(v) => prefs.setVolume(sound.id, v)}
            />
          </div>
        ))}
      </div>

      <label className="flex items-center justify-between gap-2 border-t border-line pt-3 text-sm">
        <span>During breaks</span>
        <select
          value={prefs.breakSound}
          onChange={(e) => prefs.update({ breakSound: e.target.value as BreakSoundMode })}
          className="rounded-lg border border-line bg-canvas px-2 py-1 text-sm outline-none focus:border-accent"
        >
          <option value="rain">Soft rain</option>
          <option value="scene">Keep scene sounds</option>
          <option value="silence">Silence</option>
        </select>
      </label>
    </div>
  );
}
