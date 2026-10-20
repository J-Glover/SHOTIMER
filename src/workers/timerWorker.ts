// Inline Web Worker for drift-free background clock ticking.
// Bypasses browser tab throttling when minimized or backgrounded.

let timerId: any = null;

self.onmessage = (e: MessageEvent) => {
  const { command, interval = 50 } = e.data;

  if (command === 'start') {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      self.postMessage({ type: 'tick', timestamp: performance.now() });
    }, interval);
  } else if (command === 'stop') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
