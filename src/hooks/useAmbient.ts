"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AmbientMixer, type SourceStatus } from "@/lib/audio/ambient";
import { BREAK_SOUND, getScene } from "@/lib/focus/scenes";
import { useFocus, type FocusPrefs } from "@/stores/focus";
import { useTimer } from "@/stores/timer";

function breakSoundFor(mode: FocusPrefs["breakSound"]) {
  return mode === "scene" ? null : mode === "silence" ? "silence" : BREAK_SOUND;
}

/**
 * Runs the ambient sound mixer while Focus Mode is open. The mixer listens to
 * the saved preferences (scene, volumes, mute) and to the Pomodoro phase
 * (break sounds) directly, and fades everything out when you leave.
 */
export function useAmbient() {
  const loaded = useFocus((s) => s.loaded);
  const soundOn = useFocus((s) => s.soundOn);
  const mixerRef = useRef<AmbientMixer | null>(null);
  const [status, setStatus] = useState<SourceStatus>({});
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!loaded || !soundOn) return;
    let mixer: AmbientMixer;
    try {
      mixer = new AmbientMixer(setStatus);
    } catch {
      return; // no Web Audio support in this browser
    }
    mixerRef.current = mixer;

    const applyBreak = () =>
      mixer.setBreak(useTimer.getState().timer.phase !== "focus", breakSoundFor(useFocus.getState().breakSound));

    // Initial state.
    const prefs = useFocus.getState();
    mixer.setMaster(prefs.master, prefs.muted);
    mixer.setSceneSounds(getScene(prefs.scene).sounds, prefs.volumes);
    applyBreak();
    mixer.start();
    void mixer.resume().then(() => setBlocked(mixer.isSuspended));

    // Follow changes.
    const offFocus = useFocus.subscribe((next, prev) => {
      if (next.scene !== prev.scene) mixer.setSceneSounds(getScene(next.scene).sounds, next.volumes);
      if (next.volumes !== prev.volumes) for (const [id, v] of Object.entries(next.volumes)) mixer.setVolume(id, v);
      if (next.master !== prev.master || next.muted !== prev.muted) mixer.setMaster(next.master, next.muted);
      if (next.breakSound !== prev.breakSound) applyBreak();
    });
    const offTimer = useTimer.subscribe((next, prev) => {
      if (next.timer.phase !== prev.timer.phase) applyBreak();
    });

    return () => {
      offFocus();
      offTimer();
      mixer.dispose();
      mixerRef.current = null;
      setStatus({});
    };
  }, [loaded, soundOn]);

  /** Browsers block audio until a click; this is called from a button. */
  const unlock = useCallback(async () => {
    await mixerRef.current?.resume();
    setBlocked(false);
  }, []);

  return { status, blocked, unlock };
}
