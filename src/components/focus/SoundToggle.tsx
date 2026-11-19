"use client";

import { Pause, Play } from "lucide-react";
import { unlockAudio } from "@/lib/audio/chime";
import { useFocus } from "@/stores/focus";

/**
 * Play / pause the ambient sounds. Focus Mode always opens silent; sounds
 * only play after this is pressed, and fade in/out smoothly.
 */
export function SoundToggle({ className = "", showLabel = true }: { className?: string; showLabel?: boolean }) {
  const soundOn = useFocus((s) => s.soundOn);
  const toggleSound = useFocus((s) => s.toggleSound);

  return (
    <button
      type="button"
      onClick={() => {
        unlockAudio(); // this click is what allows the browser to play sound
        toggleSound();
      }}
      aria-pressed={soundOn}
      title={soundOn ? "Pause sounds (M)" : "Play sounds (M)"}
      className={className}
    >
      {soundOn ? <Pause className="size-4" /> : <Play className="size-4" />}
      {showLabel && <span>{soundOn ? "Pause sounds" : "Play sounds"}</span>}
    </button>
  );
}
