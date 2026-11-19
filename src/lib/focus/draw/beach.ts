/**
 * The beach scene: open sky, the sea, and gentle waves rolling onto the sand.
 * Static parts are painted once; clouds, glitter on the water, waves and
 * stars move slowly each frame.
 */
import type { TimeOfDay } from "../scenes";
import {
  drawClouds,
  drawGlowDisc,
  drawStars,
  makeClouds,
  makeLayer,
  makeStars,
  seededRandom,
  verticalGradient,
  type SceneFactory,
} from "./common";

interface BeachPalette {
  sky: [number, string][];
  sea: [string, string];
  sand: [string, string];
  foam: string;
  cloud: string;
  cloudAlpha: number;
  body: { color: string; glow: string; x: number; y: number; r: number } | null;
  glitter: string | null;
  stars: boolean;
}

const PALETTES: Record<TimeOfDay, BeachPalette> = {
  day: {
    sky: [[0, "#5d9bd0"], [0.6, "#9cc8e6"], [1, "#d8ecf4"]],
    sea: ["#3d86a8", "#6fbcc8"],
    sand: ["#ead7b0", "#d9bf8f"],
    foam: "rgba(255,255,255,0.85)",
    cloud: "#ffffff",
    cloudAlpha: 0.85,
    body: { color: "#fffbe8", glow: "rgba(255,246,210,0.45)", x: 0.74, y: 0.17, r: 0.04 },
    glitter: "rgba(255,255,240,0.7)",
    stars: false,
  },
  sunset: {
    sky: [[0, "#3c4a7d"], [0.45, "#b9779a"], [0.8, "#f19c74"], [1, "#fbd08f"]],
    sea: ["#6b5f8c", "#d79a86"],
    sand: ["#d4a989", "#b48469"],
    foam: "rgba(255,236,220,0.8)",
    cloud: "#f8b9a2",
    cloudAlpha: 0.7,
    body: { color: "#ffe2a6", glow: "rgba(255,200,120,0.55)", x: 0.5, y: 0.45, r: 0.065 },
    glitter: "rgba(255,214,150,0.8)",
    stars: false,
  },
  night: {
    sky: [[0, "#081028"], [0.7, "#1a2a52"], [1, "#2c3f6c"]],
    sea: ["#14223f", "#26395e"],
    sand: ["#5d5a66", "#45434f"],
    foam: "rgba(205,220,255,0.55)",
    cloud: "#3a4a70",
    cloudAlpha: 0.55,
    body: { color: "#f3f1e4", glow: "rgba(200,215,255,0.25)", x: 0.76, y: 0.16, r: 0.03 },
    glitter: "rgba(220,230,255,0.45)",
    stars: true,
  },
};

export const createBeach: SceneFactory = (ctx, w, h, time) => {
  const p = PALETTES[time];
  const horizon = h * 0.5;
  const shore = h * 0.72;
  const scale = Math.max(1, Math.min(w, h) / 600);
  const body = p.body ? { ...p.body, x: p.body.x * w, y: p.body.y * h, r: p.body.r * Math.min(w, h) } : null;

  // --- Static background, painted once ---
  const back = makeLayer(w, h);
  back.ctx.fillStyle = verticalGradient(back.ctx, 0, horizon, p.sky);
  back.ctx.fillRect(0, 0, w, horizon + 1);
  if (body) drawGlowDisc(back.ctx, body.x, body.y, body.r, p.body!.color, p.body!.glow, time === "sunset" ? 7 : 6);
  back.ctx.fillStyle = verticalGradient(back.ctx, horizon, shore, [[0, p.sea[0]], [1, p.sea[1]]]);
  back.ctx.fillRect(0, horizon, w, shore - horizon + h * 0.05);
  // A soft haze along the horizon.
  back.ctx.fillStyle = verticalGradient(back.ctx, horizon - h * 0.03, horizon + h * 0.02, [
    [0, "rgba(255,255,255,0)"],
    [0.6, "rgba(255,255,255,0.18)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  back.ctx.fillRect(0, horizon - h * 0.03, w, h * 0.05);
  back.ctx.fillStyle = verticalGradient(back.ctx, shore - h * 0.02, h, [[0, p.sand[0]], [1, p.sand[1]]]);
  back.ctx.fillRect(0, shore - h * 0.02, w, h - shore + h * 0.02);

  const clouds = makeClouds(w, h * 0.06, horizon * 0.7, 6, p.cloud, 7);
  const stars = p.stars ? makeStars(w, horizon * 0.95, Math.round((w * h) / 9000), 3) : [];

  // Glitter on the water below the sun/moon.
  const random = seededRandom(11);
  const glitter = Array.from({ length: 70 }, () => {
    const d = random();
    return {
      y: horizon + 4 + Math.pow(d, 1.5) * (shore - horizon - 10),
      spread: 0.3 + Math.pow(d, 1.5) * 1.5,
      offset: random() * 2 - 1,
      len: 4 + random() * 14,
      phase: random() * Math.PI * 2,
    };
  });

  /** One wave: rolls up the sand and slides back, every `period` seconds. */
  const drawWave = (t: number, offset: number, seed: number) => {
    const period = 11;
    const phase = (t / period + offset) % 1;
    const reach = phase < 0.42 ? Math.sin((phase / 0.42) * (Math.PI / 2)) : Math.cos(((phase - 0.42) / 0.58) * (Math.PI / 2));
    const edge = shore - h * 0.015 + reach * h * 0.075;
    const top = shore - h * 0.05;
    const wiggle = (x: number) =>
      h * 0.008 * Math.sin((x / w) * 7 + seed + t * 0.25) + h * 0.004 * Math.sin((x / w) * 17 + seed * 2 - t * 0.4);

    // Wet sand left behind as the wave pulls back.
    if (phase > 0.42) {
      ctx.fillStyle = `rgba(60,50,40,${0.12 * (1 - (phase - 0.42) / 0.58)})`;
      ctx.fillRect(0, shore, w, shore - h * 0.015 + h * 0.075 - shore);
    }

    ctx.beginPath();
    ctx.moveTo(0, top);
    for (let x = 0; x <= w; x += w / 48) ctx.lineTo(x, edge + wiggle(x));
    ctx.lineTo(w, top);
    ctx.closePath();
    ctx.fillStyle = verticalGradient(ctx, top, edge + h * 0.01, [
      [0, p.sea[1]],
      [1, p.sea[1] + "99"], // the thin edge of the wave is see-through
    ]);
    ctx.fill();

    // Foam along the wave's edge.
    ctx.strokeStyle = p.foam;
    ctx.globalAlpha = 0.35 + 0.65 * reach;
    ctx.lineWidth = (1.5 + 2.5 * (phase < 0.42 ? 1 : reach)) * scale;
    ctx.beginPath();
    for (let x = 0; x <= w; x += w / 48) {
      const y = edge + wiggle(x);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  return {
    draw(t, dt) {
      ctx.drawImage(back.canvas, 0, 0);
      if (stars.length) drawStars(ctx, stars, t, scale);
      drawClouds(ctx, clouds, w, dt, p.cloudAlpha);

      // Glitter on the sea.
      if (body && p.glitter) {
        ctx.strokeStyle = p.glitter;
        ctx.lineWidth = 1.2 * scale;
        for (const g of glitter) {
          const a = 0.5 + 0.5 * Math.sin(t * 1.6 + g.phase);
          if (a < 0.35) continue;
          ctx.globalAlpha = a * 0.8;
          const x = body.x + g.offset * body.r * 2.2 * g.spread;
          ctx.beginPath();
          ctx.moveTo(x - g.len / 2, g.y);
          ctx.lineTo(x + g.len / 2, g.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Two waves, half a cycle apart, so there's always one coming in.
      drawWave(t, 0.5, 2.1);
      drawWave(t, 0, 5.3);
    },
  };
};
