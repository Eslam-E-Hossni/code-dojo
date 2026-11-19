/**
 * The `jest` object of a test run, put together from the packages that Jest
 * itself is made of:
 *   - jest-mock            jest.fn, jest.spyOn, clearAllMocks ...
 *   - @sinonjs/fake-timers jest.useFakeTimers, advanceTimersByTime ...
 * Module mocks (jest.mock) go to the runner's own module system.
 */

import FakeTimers, { type FakeMethod, type InstalledClock } from "@sinonjs/fake-timers";
import { ModuleMocker } from "jest-mock";
import type { Framework } from "./framework";
import type { Modules } from "./modules";

interface FakeTimersConfig {
  now?: number | Date;
  doNotFake?: string[];
  advanceTimers?: boolean | number;
}

export interface JestHandle {
  jest: Record<string, unknown>;
  automock(actual: unknown): unknown;
  /** Puts back the real timers and every spied function. */
  dispose(): void;
}

/** React schedules its work with these. Faking them would freeze rendering. */
const NEVER_FAKE = ["nextTick", "queueMicrotask"];

const NOT_FAKED =
  "A function to advance timers was called but the timers APIs are not replaced with fake timers. Call jest.useFakeTimers() first.";

export function createJest(options: {
  global: typeof globalThis;
  framework: Framework;
  modules: () => Modules;
  /** The test file: paths in jest.mock are read from where it sits. */
  entry: string;
}): JestHandle {
  const mocker = new ModuleMocker(options.global);
  let clock: InstalledClock | null = null;

  const automock = (actual: unknown, seen = new Map<unknown, unknown>()): unknown => {
    if (typeof actual === "function") return mocker.fn();
    if (actual === null || typeof actual !== "object") return actual;
    if (Array.isArray(actual)) return [];
    const known = seen.get(actual);
    if (known) return known;
    const out: Record<string, unknown> = {};
    seen.set(actual, out);
    for (const key of Object.keys(actual)) {
      out[key] = automock((actual as Record<string, unknown>)[key], seen);
    }
    if ((actual as { __esModule?: boolean }).__esModule) {
      Object.defineProperty(out, "__esModule", { value: true });
    }
    return out;
  };

  const backToRealTimers = () => {
    if (clock) clock.uninstall();
    clock = null;
  };

  /** Runs a timer call on the fake clock, or warns like Jest when the timers are real. */
  const onClock = <T>(run: (installed: InstalledClock) => T, fallback: T): T => {
    if (clock) return run(clock);
    options.global.console.warn(NOT_FAKED);
    return fallback;
  };

  const jest: Record<string, unknown> = {
    // ---- mock functions ----
    fn: mocker.fn.bind(mocker),
    spyOn: mocker.spyOn.bind(mocker),
    isMockFunction: mocker.isMockFunction.bind(mocker),
    mocked: (value: unknown) => value,
    clearAllMocks: () => {
      mocker.clearAllMocks();
      return jest;
    },
    resetAllMocks: () => {
      mocker.resetAllMocks();
      return jest;
    },
    restoreAllMocks: () => {
      mocker.restoreAllMocks();
      return jest;
    },

    // ---- timers ----
    useFakeTimers: (config: FakeTimersConfig = {}) => {
      backToRealTimers();
      const skip = NEVER_FAKE.concat(config.doNotFake ?? []);
      const toFake = (Object.keys(FakeTimers.timers) as FakeMethod[]).filter(
        (name) => !skip.includes(name) && typeof (options.global as Record<string, unknown>)[name] !== "undefined",
      );
      clock = FakeTimers.withGlobal(options.global).install({
        now: config.now ?? Date.now(),
        toFake,
        shouldAdvanceTime: Boolean(config.advanceTimers),
        advanceTimeDelta: typeof config.advanceTimers === "number" ? config.advanceTimers : undefined,
      });
      return jest;
    },
    useRealTimers: () => {
      backToRealTimers();
      return jest;
    },
    advanceTimersByTime: (ms: number) => {
      onClock((c) => c.tick(ms), 0);
    },
    advanceTimersByTimeAsync: async (ms: number) => {
      await onClock((c) => c.tickAsync(ms), Promise.resolve(0));
    },
    advanceTimersToNextTimer: (steps = 1) => {
      for (let i = 0; i < steps; i++) onClock((c) => c.next(), 0);
    },
    runAllTimers: () => {
      onClock((c) => c.runAll(), 0);
    },
    runAllTimersAsync: async () => {
      await onClock((c) => c.runAllAsync(), Promise.resolve(0));
    },
    runOnlyPendingTimers: () => {
      onClock((c) => c.runToLast(), 0);
    },
    runOnlyPendingTimersAsync: async () => {
      await onClock((c) => c.runToLastAsync(), Promise.resolve(0));
    },
    clearAllTimers: () => {
      if (clock) clock.reset();
    },
    getTimerCount: () => (clock ? clock.countTimers() : 0),
    setSystemTime: (now?: number | Date) => {
      onClock((c) => c.setSystemTime(now), undefined);
    },
    now: () => (clock ? clock.now : Date.now()),

    // ---- modules ----
    mock: (specifier: string, factory?: () => unknown) => {
      options.modules().mock(options.entry, specifier, factory ?? null);
      return jest;
    },
    doMock: (specifier: string, factory?: () => unknown) => {
      options.modules().mock(options.entry, specifier, factory ?? null);
      return jest;
    },
    unmock: (specifier: string) => {
      options.modules().unmock(options.entry, specifier);
      return jest;
    },
    dontMock: (specifier: string) => {
      options.modules().unmock(options.entry, specifier);
      return jest;
    },
    requireActual: (specifier: string) => options.modules().requireActual(options.entry, specifier),
    requireMock: (specifier: string) => options.modules().require(options.entry, specifier),
    resetModules: () => {
      options.modules().reset();
      return jest;
    },

    setTimeout: (ms: number) => {
      options.framework.setTimeout(ms);
      return jest;
    },
  };

  return {
    jest,
    automock,
    dispose: () => {
      backToRealTimers();
      mocker.restoreAllMocks();
    },
  };
}
