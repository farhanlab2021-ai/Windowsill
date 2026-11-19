import { afterEach, describe, expect, it, vi } from "vitest";

describe("optional media manifest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("uses only files listed in media-manifest.json, fetching it once", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ files: ["/sounds/beach/waves.mp3"] })));
    vi.stubGlobal("fetch", fetchMock);
    const { mediaExists } = await import("@/lib/focus/media");

    expect(await mediaExists("/sounds/beach/waves.mp3")).toBe(true);
    expect(await mediaExists("/scenes/beach/day.mp4")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a missing manifest as 'no optional media'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    const { mediaExists } = await import("@/lib/focus/media");
    expect(await mediaExists("/sounds/beach/waves.mp3")).toBe(false);
  });
});
