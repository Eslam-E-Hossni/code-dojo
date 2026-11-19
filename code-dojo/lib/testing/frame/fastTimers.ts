/**
 * Zero-delay timers that the browser cannot slow down.
 *
 * user-event and Testing Library wait between their steps with
 * setTimeout(fn, 0). A browser slows timers down in a page it does not
 * show: a tab in the background, or a hidden frame. One wait can then take
 * a whole second, and a test with a few clicks passes Jest's 5 seconds.
 *
 * So in the test frame a timer with no delay is run through a message
 * channel, which is never slowed down. It still runs as its own task, after
 * the current code and its promises, like a real setTimeout(fn, 0). Timers
 * with a real delay go to the browser as before.
 */
export function installFastTimers(view: Window & typeof globalThis): void {
  const nativeSet = view.setTimeout.bind(view);
  const nativeClear = view.clearTimeout.bind(view);
  const channel = new view.MessageChannel();
  const waiting = new Map<number, () => void>();
  // The browser's own ids are positive, so these can never be mixed up with them.
  let nextId = -1;

  channel.port1.onmessage = (event: MessageEvent) => {
    const run = waiting.get(event.data as number);
    if (!run) return;
    waiting.delete(event.data as number);
    run();
  };

  const fastSet = (handler: TimerHandler, delay?: number, ...args: unknown[]) => {
    if (typeof handler !== "function" || (delay !== undefined && delay > 0)) {
      return nativeSet(handler, delay, ...args);
    }
    const id = nextId--;
    waiting.set(id, () => handler(...args));
    channel.port2.postMessage(id);
    return id;
  };

  const fastClear = (id?: number) => {
    if (typeof id === "number" && id < 0) waiting.delete(id);
    else nativeClear(id);
  };

  view.setTimeout = fastSet as typeof view.setTimeout;
  view.clearTimeout = fastClear as typeof view.clearTimeout;
}
