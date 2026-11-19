/**
 * Ambient sounds generated in the browser (no files needed). Each one is built
 * from filtered noise and slow "LFOs" (very slow oscillators that gently move
 * the volume or tone), which is how synthesisers fake wind, water and waves.
 * Birds and seagulls are short tones with pitch slides, scheduled at random.
 *
 * Every generator connects into `out` and returns a `stop()` function.
 */
import type { SynthKind } from "../focus/scenes";

type Generator = (ctx: AudioContext, out: AudioNode) => () => void;

// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------

type NoiseColor = "white" | "pink" | "brown";
const noiseCache = new WeakMap<AudioContext, Partial<Record<NoiseColor, AudioBuffer>>>();

/** 8 seconds of stereo noise (left and right differ, so it sounds wide). Loops seamlessly. */
function noiseBuffer(ctx: AudioContext, color: NoiseColor): AudioBuffer {
  const cached = noiseCache.get(ctx) ?? {};
  if (cached[color]) return cached[color]!;
  const length = ctx.sampleRate * 8;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (color === "white") data[i] = white * 0.5;
      else if (color === "pink") {
        // Paul Kellet's pink-noise filter.
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }
    // Fade the very ends together so the loop point is inaudible.
    const fade = 2048;
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      data[length - fade + i] = data[length - fade + i] * (1 - k) + data[i] * k;
    }
  }
  noiseCache.set(ctx, { ...cached, [color]: buffer });
  return buffer;
}

function noiseSource(ctx: AudioContext, color: NoiseColor) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, color);
  src.loop = true;
  src.loopEnd = src.buffer.duration;
  // Start at a random point so two sounds using the same noise don't line up.
  src.start(0, Math.random() * 7);
  return src;
}

function filter(ctx: AudioContext, type: BiquadFilterType, frequency: number, Q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  return f;
}

/** A slow sine wave that adds `±depth` to an AudioParam (e.g. volume or filter frequency). */
function lfo(ctx: AudioContext, rate: number, depth: number, target: AudioParam) {
  const osc = ctx.createOscillator();
  osc.frequency.value = rate;
  osc.start();
  const gain = ctx.createGain();
  gain.gain.value = depth;
  osc.connect(gain).connect(target);
  return osc;
}

function gainNode(ctx: AudioContext, value: number) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

const stopAll = (nodes: (AudioScheduledSourceNode | undefined)[]) => () => {
  for (const n of nodes) {
    try {
      n?.stop();
    } catch {
      // already stopped
    }
  }
};

// ---------------------------------------------------------------------------
// Continuous sounds
// ---------------------------------------------------------------------------

/** Waves: low rumbling surf that swells and fades every ~10 s, with a hiss of foam. */
const waves: Generator = (ctx, out) => {
  const surf = noiseSource(ctx, "brown");
  const surfGain = gainNode(ctx, 0.3);
  surf.connect(filter(ctx, "lowpass", 520)).connect(surfGain).connect(out);
  const l1 = lfo(ctx, 0.095, 0.17, surfGain.gain);
  const l2 = lfo(ctx, 0.061, 0.09, surfGain.gain);

  const foam = noiseSource(ctx, "pink");
  const foamGain = gainNode(ctx, 0.05);
  foam.connect(filter(ctx, "highpass", 1800)).connect(foamGain).connect(out);
  const l3 = lfo(ctx, 0.095, 0.05, foamGain.gain);
  return stopAll([surf, foam, l1, l2, l3]);
};

/** Wind: noise through a moving band-pass filter, gusting slowly. */
function windLike(frequency: number, level: number): Generator {
  return (ctx, out) => {
    const src = noiseSource(ctx, "pink");
    const band = filter(ctx, "bandpass", frequency, 0.9);
    const g = gainNode(ctx, level);
    src.connect(band).connect(g).connect(out);
    const l1 = lfo(ctx, 0.05, frequency * 0.45, band.frequency);
    const l2 = lfo(ctx, 0.073, level * 0.5, g.gain);
    const l3 = lfo(ctx, 0.031, level * 0.3, g.gain);
    return stopAll([src, l1, l2, l3]);
  };
}

/** A distant stream: bright, babbling water. */
const stream: Generator = (ctx, out) => {
  const src = noiseSource(ctx, "white");
  const hi = filter(ctx, "bandpass", 2600, 0.9);
  const g = gainNode(ctx, 0.35);
  src.connect(hi).connect(g).connect(out);
  const babble = lfo(ctx, 3.3, 0.06, g.gain);
  const shimmer = lfo(ctx, 0.4, 500, hi.frequency);

  const low = noiseSource(ctx, "pink");
  const lowGain = gainNode(ctx, 0.25);
  low.connect(filter(ctx, "bandpass", 700, 1.2)).connect(lowGain).connect(out);
  const gurgle = lfo(ctx, 1.7, 0.08, lowGain.gain);
  return stopAll([src, low, babble, shimmer, gurgle]);
};

/** Soft rain for breaks. */
const rain: Generator = (ctx, out) => {
  const src = noiseSource(ctx, "pink");
  const g = gainNode(ctx, 0.45);
  src.connect(filter(ctx, "highpass", 700)).connect(filter(ctx, "lowpass", 6500)).connect(g).connect(out);
  const swell = lfo(ctx, 0.04, 0.08, g.gain);
  return stopAll([src, swell]);
};

// ---------------------------------------------------------------------------
// Calls (scheduled at random times)
// ---------------------------------------------------------------------------

/** Repeatedly calls `play` after a random wait between `min` and `max` seconds. */
function scheduleRandomly(min: number, max: number, play: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const next = () => {
    timer = setTimeout(() => {
      play();
      next();
    }, (min + Math.random() * (max - min)) * 1000);
  };
  next();
  return () => clearTimeout(timer);
}

function panner(ctx: AudioContext, out: AudioNode) {
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.6 - 0.8;
  pan.connect(out);
  return pan;
}

/** Songbirds: short phrases of quick chirps, high and light. */
const birds: Generator = (ctx, out) =>
  scheduleRandomly(1.5, 6, () => {
    const pan = panner(ctx, out);
    const notes = 2 + Math.floor(Math.random() * 5);
    const base = 2600 + Math.random() * 1600;
    let at = ctx.currentTime + 0.05;
    for (let i = 0; i < notes; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const dur = 0.05 + Math.random() * 0.09;
      const from = base * (0.85 + Math.random() * 0.3);
      osc.frequency.setValueAtTime(from, at);
      osc.frequency.exponentialRampToValueAtTime(from * (Math.random() < 0.5 ? 1.35 : 0.75), at + dur);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.12, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(g).connect(pan);
      osc.start(at);
      osc.stop(at + dur + 0.02);
      at += dur + 0.03 + Math.random() * 0.08;
    }
  });

/** Seagulls: a few gliding "kyow" calls, softened as if far away. */
const seagulls: Generator = (ctx, out) =>
  scheduleRandomly(6, 16, () => {
    const pan = panner(ctx, out);
    const distance = filter(ctx, "lowpass", 2400);
    const body = filter(ctx, "bandpass", 1300, 2.5);
    body.connect(distance).connect(pan);
    const calls = 2 + Math.floor(Math.random() * 3);
    let at = ctx.currentTime + 0.05;
    const pitch = 1250 + Math.random() * 400;
    for (let i = 0; i < calls; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const g = ctx.createGain();
      const dur = 0.28 + Math.random() * 0.12;
      osc.frequency.setValueAtTime(pitch * 1.15, at);
      osc.frequency.linearRampToValueAtTime(pitch * 0.72, at + dur);
      const vibrato = lfo(ctx, 28, 25, osc.frequency);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.09, at + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(g).connect(body);
      osc.start(at);
      osc.stop(at + dur + 0.05);
      vibrato.stop(at + dur + 0.05);
      at += dur + 0.12 + Math.random() * 0.2;
    }
  });

export const SYNTHS: Record<SynthKind, Generator> = {
  waves,
  wind: windLike(480, 0.45),
  breeze: windLike(950, 0.25),
  stream,
  rain,
  birds,
  seagulls,
};
