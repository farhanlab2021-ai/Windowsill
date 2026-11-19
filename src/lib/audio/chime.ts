/**
 * A soft bell chime, generated with the Web Audio API (no sound file needed).
 *
 * Browsers only allow sound after the user has interacted with the page, so
 * `unlockAudio()` is called when the student presses Start.
 */

let context: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    context = new Ctx();
  }
  return context;
}

/** Call from a click/tap handler so later sounds are allowed to play. */
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") void ctx.resume();
}

/** One bell-like note: a sine tone plus a quiet overtone, fading out slowly. */
function bell(ctx: AudioContext, frequency: number, at: number, volume: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
  gain.connect(ctx.destination);

  for (const [mult, level] of [
    [1, 1],
    [2.76, 0.18], // a bell's characteristic overtone
  ]) {
    const osc = ctx.createOscillator();
    const partialGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency * mult;
    partialGain.gain.value = level;
    osc.connect(partialGain).connect(gain);
    osc.start(at);
    osc.stop(at + 2.3);
  }
}

/**
 * "down" (focus over → rest) plays two falling notes; "up" (break over → focus)
 * plays two rising notes.
 */
export function playChime(direction: "down" | "up", volume = 0.22) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime + 0.05;
  const [first, second] = direction === "down" ? [783.99, 523.25] : [523.25, 783.99]; // G5/C5
  bell(ctx, first, now, volume);
  bell(ctx, second, now + 0.45, volume);
}
