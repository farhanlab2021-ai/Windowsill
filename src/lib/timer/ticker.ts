/**
 * Calls `onTick` about once a second, even in a background tab.
 *
 * Browsers throttle `setInterval` on the main page when a tab is hidden (in
 * Chrome, down to once a minute after a while). Timers inside a Web Worker
 * aren't throttled that hard, so the worker sends us a message every second.
 * The timer's *accuracy* never depends on this (it uses timestamps); the
 * ticker only decides how quickly we notice that a session has ended.
 */
export function startTicker(onTick: () => void): () => void {
  try {
    const source = "setInterval(function(){postMessage(0)},1000)";
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const worker = new Worker(url);
    worker.onmessage = onTick;
    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    // Workers unavailable: fall back to a normal interval.
    const id = setInterval(onTick, 1000);
    return () => clearInterval(id);
  }
}
