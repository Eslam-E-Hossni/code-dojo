/**
 * Fake timers for the learner's code.
 *
 * Inside the runner, setTimeout and friends do not wait for real time. A
 * test moves time by hand with `await clock.tick(ms)`, so a 300 ms debounce
 * is tested in well under a millisecond and never flakes.
 */

interface QueuedTimer {
  id: number;
  time: number;
  /** Order of creation, to break ties between timers due at the same time. */
  seq: number;
  fn: (...args: unknown[]) => void;
  args: unknown[];
  /** Repeat period for setInterval, otherwise null. */
  every: number | null;
}

/**
 * Where fake time starts. It must look like a real timestamp: code such as
 * `Date.now() - lastCall >= limit` with `lastCall = 0` relies on that.
 */
export const FAKE_EPOCH = Date.UTC(2026, 0, 1, 9, 0, 0);

const FRAME_MS = 16;
const MAX_TIMERS_PER_TICK = 10_000;

// ---- one real macrotask, to let every pending promise callback run ----

const realSetImmediate: ((fn: () => void) => void) | undefined = (
  globalThis as { setImmediate?: (fn: () => void) => void }
).setImmediate;

let channel: MessageChannel | null = null;
const waiting: (() => void)[] = [];

/** Resolves after all microtasks that are queued right now have run. */
export function macrotask(): Promise<void> {
  if (realSetImmediate) {
    return new Promise((resolve) => realSetImmediate(resolve));
  }
  if (channel === null) {
    channel = new MessageChannel();
    channel.port1.onmessage = () => {
      const next = waiting.shift();
      if (next) next();
    };
  }
  const port = channel.port2;
  return new Promise((resolve) => {
    waiting.push(resolve);
    port.postMessage(0);
  });
}

export class FakeClock {
  now = FAKE_EPOCH;
  /** How many timer callbacks have run. */
  fired = 0;
  /** Errors thrown by timer callbacks. A browser reports these as uncaught. */
  uncaught: unknown[] = [];

  private timers = new Map<number, QueuedTimer>();
  private nextId = 1;
  private seq = 0;

  private add(fn: unknown, delay: unknown, args: unknown[], repeat: boolean): number {
    if (typeof fn !== "function") {
      throw new TypeError("The first argument of a timer must be a function.");
    }
    const asNumber = Number(delay);
    const ms = asNumber > 0 ? asNumber : 0;
    const id = this.nextId++;
    this.timers.set(id, {
      id,
      time: this.now + ms,
      seq: this.seq++,
      fn: fn as (...a: unknown[]) => void,
      args,
      // A zero interval would never let time move.
      every: repeat ? Math.max(1, ms) : null,
    });
    return id;
  }

  setTimeout = (fn: unknown, delay?: unknown, ...args: unknown[]): number =>
    this.add(fn, delay, args, false);

  setInterval = (fn: unknown, delay?: unknown, ...args: unknown[]): number =>
    this.add(fn, delay, args, true);

  /** clearTimeout and clearInterval share one id pool, as in a browser. */
  clear = (id?: unknown): void => {
    this.timers.delete(id as number);
  };

  /** The callback runs at the next 16 ms frame and gets the time since start. */
  requestAnimationFrame = (fn: unknown): number => {
    if (typeof fn !== "function") {
      throw new TypeError("requestAnimationFrame needs a function.");
    }
    const frame = () => (fn as (time: number) => void)(this.now - FAKE_EPOCH);
    return this.add(frame, FRAME_MS, [], false);
  };

  /** How many timers are still waiting. */
  pending(): number {
    return this.timers.size;
  }

  /** Drops every waiting timer. */
  clearAll(): void {
    this.timers.clear();
  }

  private next(limit: number): QueuedTimer | null {
    let best: QueuedTimer | null = null;
    for (const timer of this.timers.values()) {
      if (timer.time > limit) continue;
      if (best === null || timer.time < best.time || (timer.time === best.time && timer.seq < best.seq)) {
        best = timer;
      }
    }
    return best;
  }

  /**
   * Runs the earliest timer that is due at or before `limit`, then lets
   * promise callbacks run. Returns false when no such timer exists.
   */
  async fireNext(limit = Infinity): Promise<boolean> {
    const timer = this.next(limit);
    if (timer === null) return false;

    if (timer.time > this.now) this.now = timer.time;
    if (timer.every === null) {
      this.timers.delete(timer.id);
    } else {
      timer.time += timer.every;
      timer.seq = this.seq++;
    }

    this.fired++;
    try {
      timer.fn(...timer.args);
    } catch (error) {
      this.uncaught.push(error);
    }
    await macrotask();
    return true;
  }

  /** Moves fake time forward by `ms`, running every timer that comes due. */
  tick = async (ms = 0): Promise<void> => {
    const target = this.now + (Number(ms) > 0 ? Number(ms) : 0);
    // Code that awaits before it starts its timer needs one turn first.
    await macrotask();
    let count = 0;
    while (await this.fireNext(target)) {
      if (++count > MAX_TIMERS_PER_TICK) {
        throw new Error("More than 10,000 timers ran in one tick. A timer keeps starting itself again.");
      }
    }
    this.now = target;
    await macrotask();
  };
}

/** A Date whose "now" is the fake clock. */
export function fakeDate(clock: FakeClock): DateConstructor {
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(clock.now);
      else super(...(args as [number]));
    }
    static now(): number {
      return clock.now;
    }
  }
  return FakeDate as unknown as DateConstructor;
}
