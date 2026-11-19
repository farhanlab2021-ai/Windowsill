/**
 * The Focus Mode sound mixer.
 *
 *   sound → its own volume (channel gain) → master volume → speakers
 *
 * Each sound plays a recording from /public/sounds if one exists (looped
 * sample-accurately, so there's no gap), otherwise a generated version.
 * Every change fades smoothly instead of jumping.
 *
 * Nothing here runs until Focus Mode opens, so sounds never load on other pages.
 */
import { mediaExists } from "../focus/media";
import type { SoundDef } from "../focus/scenes";
import { getAudioContext } from "./chime";
import { SYNTHS } from "./synths";

const FADE = 1.5; // seconds

interface Channel {
  def: SoundDef;
  gain: GainNode;
  volume: number;
  source: "recording" | "generated" | "loading";
  stop: () => void;
}

const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

/** Loads and decodes a recording, or returns null if there isn't one. */
function loadRecording(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  let result = bufferCache.get(url);
  if (!result) {
    result = mediaExists(url).then(async (exists) => {
      if (!exists) return null;
      try {
        const res = await fetch(url);
        return await ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    });
    bufferCache.set(url, result);
  }
  return result;
}

function ramp(param: AudioParam, ctx: AudioContext, to: number, seconds = FADE) {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(to, now + seconds);
}

export type SourceStatus = Record<string, Channel["source"]>;

export class AmbientMixer {
  private ctx: AudioContext;
  private master: GainNode;
  private group: GainNode; // the scene sounds (faded out during breaks if chosen)
  private channels = new Map<string, Channel>();
  private masterVolume = 0.8;
  private muted = false;
  private onStatus: (status: SourceStatus) => void;

  constructor(onStatus: (status: SourceStatus) => void = () => {}) {
    const ctx = getAudioContext();
    if (!ctx) throw new Error("Web Audio isn't supported in this browser.");
    this.ctx = ctx;
    this.onStatus = onStatus;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.group = ctx.createGain();
    this.group.connect(this.master);
  }

  get isSuspended() {
    return this.ctx.state !== "running";
  }

  /** Needed once after a click/tap, because browsers block sound until the page is interacted with. */
  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  private reportStatus() {
    this.onStatus(Object.fromEntries([...this.channels].map(([id, c]) => [id, c.source])));
  }

  /** Starts a sound (if it isn't already playing) at the given volume. */
  private addChannel(def: SoundDef, volume: number, destination: AudioNode) {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(destination);
    const channel: Channel = { def, gain, volume, source: "loading", stop: () => {} };
    this.channels.set(def.id, channel);
    this.reportStatus();

    void loadRecording(this.ctx, def.file).then((buffer) => {
      if (this.channels.get(def.id) !== channel) return; // removed while loading
      if (buffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(gain);
        src.start(0, Math.random() * buffer.duration); // random start so it doesn't always begin the same way
        channel.stop = () => src.stop();
        channel.source = "recording";
      } else {
        channel.stop = SYNTHS[def.synth](this.ctx, gain);
        channel.source = "generated";
      }
      ramp(gain.gain, this.ctx, channel.volume);
      this.reportStatus();
    });
  }

  private removeChannel(id: string) {
    const channel = this.channels.get(id);
    if (!channel) return;
    this.channels.delete(id);
    ramp(channel.gain.gain, this.ctx, 0);
    setTimeout(() => {
      channel.stop();
      channel.gain.disconnect();
    }, FADE * 1000 + 100);
    this.reportStatus();
  }

  /** Plays exactly these scene sounds (cross-fading from whatever was playing). */
  setSceneSounds(sounds: SoundDef[], volumes: Record<string, number>) {
    const wanted = new Set(sounds.map((s) => s.id));
    for (const id of [...this.channels.keys()]) {
      if (!wanted.has(id) && !id.startsWith("break.")) this.removeChannel(id);
    }
    for (const def of sounds) {
      if (!this.channels.has(def.id)) this.addChannel(def, volumes[def.id] ?? def.defaultVolume, this.group);
    }
  }

  setVolume(id: string, volume: number) {
    const channel = this.channels.get(id);
    if (!channel) return;
    channel.volume = volume;
    if (channel.source !== "loading") ramp(channel.gain.gain, this.ctx, volume, 0.15);
  }

  setMaster(volume: number, muted: boolean) {
    this.masterVolume = volume;
    this.muted = muted;
    ramp(this.master.gain, this.ctx, muted ? 0 : volume, 0.4);
  }

  /**
   * During a break, optionally swap the scene sounds for a calm break sound
   * (or silence). `breakSound` null = keep the scene sounds.
   */
  setBreak(active: boolean, breakSound: SoundDef | "silence" | null) {
    const swap = active && breakSound !== null;
    ramp(this.group.gain, this.ctx, swap ? 0 : 1, 2.5);
    const breakDef = breakSound && breakSound !== "silence" ? breakSound : null;
    for (const id of [...this.channels.keys()]) {
      if (id.startsWith("break.") && (!swap || id !== breakDef?.id)) this.removeChannel(id);
    }
    if (swap && breakDef && !this.channels.has(breakDef.id)) {
      this.addChannel(breakDef, breakDef.defaultVolume, this.master);
    }
  }

  /** Fades everything in (call once after creating). */
  start() {
    ramp(this.master.gain, this.ctx, this.muted ? 0 : this.masterVolume, 2);
  }

  /** Fades everything out and releases it (when leaving Focus Mode). */
  dispose() {
    ramp(this.master.gain, this.ctx, 0, 0.8);
    const channels = [...this.channels.values()];
    this.channels.clear();
    setTimeout(() => {
      for (const c of channels) c.stop();
      this.master.disconnect();
    }, 1000);
  }
}
