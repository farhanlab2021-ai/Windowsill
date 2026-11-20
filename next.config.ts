import type { NextConfig } from "next";

/**
 * Lets phones and tablets on the same Wi-Fi use the development server
 * (`npm run dev`) at http://<this computer's IP>:3000. Next.js otherwise only
 * lets "localhost" use it. These are the private address ranges home, campus
 * and phone-hotspot networks use (each `*` stands for one number), so nothing
 * outside your own network is allowed. This only affects `npm run dev`, never
 * the deployed site.
 */
const lanOrigins = [
  "192.168.*.*",
  "10.*.*.*",
  // 172.16.0.0 – 172.31.255.255
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  "*.local", // e.g. my-laptop.local
];

const nextConfig: NextConfig = {
  allowedDevOrigins: lanOrigins,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Basic security headers for every page.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Always check for a new service worker, so updates reach students quickly.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
