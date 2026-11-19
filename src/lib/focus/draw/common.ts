/**
 * Shared drawing helpers for the hand-drawn (canvas) scenes.
 *
 * Scenes are drawn in layers: anything that never moves (sky, sea, mountains)
 * is painted once onto an off-screen canvas, and each animation frame only
 * redraws the moving parts (clouds, waves, mist, birds, twinkling stars).
 */
import type { TimeOfDay } from "../scenes";

export interface SceneRenderer {
  /** Draws one frame. `t` is the time in seconds; `dt` the seconds since the last frame. */
  draw(t: number, dt: number): void;
}

export type SceneFactory = (ctx: CanvasRenderingContext2D, width: number, height: number, time: TimeOfDay) => SceneRenderer;

/** A small seeded random generator, so scenes look the same on every visit. */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1-D noise in [0, 1], built from several octaves (used for mountain ridges). */
export function ridgeNoise(seed: number, octaves = 5) {
  const random = seededRandom(seed);
  const table = Array.from({ length: 256 }, random);
  const smooth = (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return table[i & 255] * (1 - u) + table[(i + 1) & 255] * u;
  };
  return (x: number) => {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += smooth(x * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return sum / norm;
  };
}

export function makeLayer(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return { canvas, ctx: canvas.getContext("2d")! };
}

export function verticalGradient(ctx: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

/** Sun or moon with a soft glow. */
export function drawGlowDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, glow: string, glowSize = 6) {
  const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * glowSize);
  g.addColorStop(0, glow);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r * glowSize, y - r * glowSize, r * glowSize * 2, r * glowSize * 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

export function makeStars(width: number, maxY: number, count: number, seed: number): Star[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: Math.pow(random(), 1.4) * maxY, // more stars higher up
    r: 0.4 + random() * 1.1,
    phase: random() * Math.PI * 2,
    speed: 0.4 + random() * 1.2,
  }));
}

export function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], t: number, scale: number) {
  ctx.fillStyle = "#fffdf4";
  for (const s of stars) {
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * s.speed + s.phase);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export interface Cloud {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  speed: number;
}

/** A soft cloud made of overlapping blurred puffs, painted once onto its own small canvas. */
export function makeCloudSprite(width: number, height: number, color: string, seed: number): HTMLCanvasElement {
  const random = seededRandom(seed);
  const pad = height * 0.6;
  const { canvas, ctx } = makeLayer(width + pad * 2, height + pad * 2);
  ctx.filter = `blur(${Math.max(2, height * 0.12)}px)`;
  ctx.fillStyle = color;
  const puffs = 7 + Math.floor(random() * 5);
  for (let i = 0; i < puffs; i++) {
    const px = pad + width * (0.1 + 0.8 * (i / (puffs - 1))) + (random() - 0.5) * width * 0.08;
    const r = height * (0.35 + random() * 0.35) * (1 - Math.abs(i / (puffs - 1) - 0.5) * 0.9);
    const py = pad + height * 0.65 - r * 0.6;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Flat-ish base.
  ctx.fillRect(pad + width * 0.1, pad + height * 0.45, width * 0.8, height * 0.25);
  return canvas;
}

export function makeClouds(
  width: number,
  minY: number,
  maxY: number,
  count: number,
  color: string,
  seed: number,
  sizeScale = 1,
): Cloud[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const w = width * (0.16 + random() * 0.2) * sizeScale;
    const h = w * (0.22 + random() * 0.12);
    return {
      sprite: makeCloudSprite(w, h, color, seed * 31 + i),
      x: random() * width * 1.2 - width * 0.1,
      y: minY + random() * (maxY - minY),
      speed: (4 + random() * 7) * (width / 1200), // pixels per second
    };
  });
}

export function drawClouds(ctx: CanvasRenderingContext2D, clouds: Cloud[], width: number, dt: number, alpha: number) {
  ctx.globalAlpha = alpha;
  for (const c of clouds) {
    c.x += c.speed * dt;
    if (c.x > width + 20) c.x = -c.sprite.width;
    ctx.drawImage(c.sprite, c.x, c.y - c.sprite.height / 2);
  }
  ctx.globalAlpha = 1;
}
