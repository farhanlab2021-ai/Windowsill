/**
 * The mountain cliff scene: standing on a cliff edge, looking over valleys and
 * layered ridges, with mist drifting through the valley and clouds overhead.
 */
import type { TimeOfDay } from "../scenes";
import {
  drawClouds,
  drawGlowDisc,
  drawStars,
  makeClouds,
  makeLayer,
  makeStars,
  ridgeNoise,
  seededRandom,
  verticalGradient,
  type SceneFactory,
} from "./common";

interface MountainPalette {
  sky: [number, string][];
  /** Ridge colours from farthest to nearest. */
  ridges: string[];
  haze: string;
  mist: string;
  cliff: [string, string];
  grass: string;
  cloud: string;
  cloudAlpha: number;
  body: { color: string; glow: string; x: number; y: number; r: number };
  stars: boolean;
  birds: string | null;
}

const PALETTES: Record<TimeOfDay, MountainPalette> = {
  day: {
    sky: [[0, "#5b97cc"], [0.7, "#a9cfe8"], [1, "#e3f0f5"]],
    ridges: ["#a7bfd0", "#88a6b8", "#6d8c96", "#58766e"],
    haze: "rgba(225,238,245,0.55)",
    mist: "rgba(255,255,255,0.55)",
    cliff: ["#4d5a45", "#2f382c"],
    grass: "#6f8a4f",
    cloud: "#ffffff",
    cloudAlpha: 0.85,
    body: { color: "#fffbe8", glow: "rgba(255,246,210,0.45)", x: 0.22, y: 0.16, r: 0.04 },
    stars: false,
    birds: "rgba(40,50,60,0.75)",
  },
  sunset: {
    sky: [[0, "#36457a"], [0.45, "#a87199"], [0.8, "#ee9a73"], [1, "#fbd08f"]],
    ridges: ["#b9879a", "#8f6c8c", "#68577a", "#4a4262"],
    haze: "rgba(250,190,160,0.4)",
    mist: "rgba(255,214,200,0.45)",
    cliff: ["#3a3046", "#221c2c"],
    grass: "#5b4a5e",
    cloud: "#f6b49d",
    cloudAlpha: 0.7,
    body: { color: "#ffe2a6", glow: "rgba(255,200,120,0.55)", x: 0.62, y: 0.4, r: 0.06 },
    stars: false,
    birds: "rgba(45,30,50,0.7)",
  },
  night: {
    sky: [[0, "#070e24"], [0.7, "#17264b"], [1, "#263a66"]],
    ridges: ["#2b3a62", "#222f52", "#1a2442", "#131a32"],
    haze: "rgba(60,80,130,0.35)",
    mist: "rgba(150,170,220,0.22)",
    cliff: ["#121828", "#0a0e19"],
    grass: "#1d2638",
    cloud: "#34446c",
    cloudAlpha: 0.5,
    body: { color: "#f3f1e4", glow: "rgba(200,215,255,0.25)", x: 0.78, y: 0.15, r: 0.03 },
    stars: true,
    birds: null,
  },
};

export const createMountain: SceneFactory = (ctx, w, h, time) => {
  const p = PALETTES[time];
  const scale = Math.max(1, Math.min(w, h) / 600);
  const body = { ...p.body, x: p.body.x * w, y: p.body.y * h, r: p.body.r * Math.min(w, h) };

  // Ridge lines: base height and how jagged each layer is (farthest first).
  const ridgeDefs = [
    { base: 0.42, amp: 0.16, freq: 3.2, seed: 1 },
    { base: 0.52, amp: 0.13, freq: 4.0, seed: 2 },
    { base: 0.62, amp: 0.1, freq: 5.0, seed: 3 },
    { base: 0.72, amp: 0.08, freq: 6.5, seed: 4 },
  ];

  const paintRidge = (c: CanvasRenderingContext2D, i: number) => {
    const r = ridgeDefs[i];
    const noise = ridgeNoise(r.seed);
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w; x += 3) {
      const n = noise((x / w) * r.freq);
      // Sharpen peaks a little so they read as mountains, not hills.
      c.lineTo(x, h * r.base - h * r.amp * Math.pow(n, 1.6) * 1.6);
    }
    c.lineTo(w, h);
    c.closePath();
    c.fillStyle = p.ridges[i];
    c.fill();
    // Haze in front of each farther layer (things far away look paler).
    if (i < ridgeDefs.length - 1) {
      c.fillStyle = verticalGradient(c, h * (r.base - r.amp), h * (r.base + 0.12), [
        [0, "rgba(0,0,0,0)"],
        [1, p.haze],
      ]);
      c.fillRect(0, h * (r.base - r.amp), w, h * 0.3);
    }
  };

  // --- Back layer: sky, sun/moon, the two farthest ridges ---
  const back = makeLayer(w, h);
  back.ctx.fillStyle = verticalGradient(back.ctx, 0, h * 0.6, p.sky);
  back.ctx.fillRect(0, 0, w, h);
  drawGlowDisc(back.ctx, body.x, body.y, body.r, p.body.color, p.body.glow, time === "sunset" ? 7 : 6);
  paintRidge(back.ctx, 0);
  paintRidge(back.ctx, 1);

  // --- Front layer: nearer ridges and the cliff we're standing on ---
  const front = makeLayer(w, h);
  paintRidge(front.ctx, 2);
  paintRidge(front.ctx, 3);
  const fc = front.ctx;
  const random = seededRandom(9);
  const edge: [number, number][] = [];
  // The cliff rises from the bottom-left and ends in a rocky edge.
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const x = f * w * 0.5;
    const y = h * (0.74 + 0.08 * Math.pow(f, 2.2)) + (random() - 0.5) * h * 0.012;
    edge.push([x, y]);
  }
  fc.beginPath();
  fc.moveTo(0, h);
  fc.lineTo(0, edge[0][1]);
  for (const [x, y] of edge) fc.lineTo(x, y);
  fc.lineTo(w * 0.52, h * 0.86);
  fc.lineTo(w * 0.56, h);
  fc.closePath();
  fc.fillStyle = verticalGradient(fc, h * 0.72, h, [[0, p.cliff[0]], [1, p.cliff[1]]]);
  fc.fill();
  // Grass tufts along the top of the cliff.
  fc.strokeStyle = p.grass;
  fc.lineWidth = 1.4 * scale;
  for (let i = 0; i < 90; i++) {
    const f = random();
    const idx = Math.min(edge.length - 2, Math.floor(f * (edge.length - 1)));
    const [x0, y0] = edge[idx];
    const [x1, y1] = edge[idx + 1];
    const k = random();
    const x = x0 + (x1 - x0) * k;
    const y = y0 + (y1 - y0) * k;
    const len = (4 + random() * 9) * scale;
    fc.beginPath();
    fc.moveTo(x, y + 1);
    fc.lineTo(x + (random() - 0.5) * len * 0.8, y - len);
    fc.stroke();
  }

  const clouds = makeClouds(w, h * 0.05, h * 0.3, 5, p.cloud, 21);
  const stars = p.stars ? makeStars(w, h * 0.5, Math.round((w * h) / 8000), 5) : [];

  // Mist banks drifting slowly through the valley (between far and near ridges).
  const mistRandom = seededRandom(33);
  const mist = Array.from({ length: 5 }, () => ({
    x: mistRandom() * w,
    y: h * (0.58 + mistRandom() * 0.1),
    rx: w * (0.25 + mistRandom() * 0.2),
    ry: h * (0.025 + mistRandom() * 0.03),
    speed: (3 + mistRandom() * 4) * (w / 1200),
  }));

  const birdRandom = seededRandom(44);
  const birds = p.birds
    ? Array.from({ length: 3 }, () => ({
        x: birdRandom() * w,
        y: h * (0.2 + birdRandom() * 0.15),
        speed: (12 + birdRandom() * 10) * (w / 1200),
        size: (5 + birdRandom() * 4) * scale,
        phase: birdRandom() * Math.PI * 2,
      }))
    : [];

  return {
    draw(t, dt) {
      ctx.drawImage(back.canvas, 0, 0);
      if (stars.length) drawStars(ctx, stars, t, scale);
      drawClouds(ctx, clouds, w, dt, p.cloudAlpha);

      for (const m of mist) {
        m.x += m.speed * dt;
        if (m.x - m.rx > w) m.x = -m.rx;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.rx);
        g.addColorStop(0, p.mist);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.scale(1, m.ry / m.rx);
        ctx.translate(-m.x, -m.y);
        ctx.fillRect(m.x - m.rx, m.y - m.rx, m.rx * 2, m.rx * 2);
        ctx.restore();
      }

      ctx.drawImage(front.canvas, 0, 0);

      // A few birds gliding far away, with a slow wing beat.
      if (p.birds) {
        ctx.strokeStyle = p.birds;
        ctx.lineWidth = 1.3 * scale;
        for (const b of birds) {
          b.x += b.speed * dt;
          if (b.x > w + 20) b.x = -20;
          const flap = Math.sin(t * 4 + b.phase) * b.size * 0.35;
          const y = b.y + Math.sin(t * 0.3 + b.phase) * h * 0.01;
          ctx.beginPath();
          ctx.moveTo(b.x - b.size, y - flap);
          ctx.quadraticCurveTo(b.x - b.size * 0.4, y - b.size * 0.3, b.x, y);
          ctx.quadraticCurveTo(b.x + b.size * 0.4, y - b.size * 0.3, b.x + b.size, y - flap);
          ctx.stroke();
        }
      }
    },
  };
};
