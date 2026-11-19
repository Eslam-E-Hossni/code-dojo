import { formatValue } from "./format";

/** Thrown by a failed expectation. Its message is shown under the test. */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

/**
 * Deep equality for test results. Arrays must also agree on holes, because
 * the array polyfills have to keep them.
 */
export function deepEqual(a: unknown, b: unknown, seen: Map<unknown, unknown> = new Map()): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  if (seen.get(a) === b) return true;
  seen.set(a, b);

  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Error && b instanceof Error) return a.name === b.name && a.message === b.message;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (i in a !== i in b) return false;
      if (!deepEqual(a[i], b[i], seen)) return false;
    }
    return true;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !deepEqual(value, b.get(key), seen)) return false;
    }
    return true;
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) return false;
    }
    return true;
  }

  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const keysA = Object.keys(ra);
  const keysB = Object.keys(rb);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(rb, key)) return false;
    if (!deepEqual(ra[key], rb[key], seen)) return false;
  }
  return true;
}

function report(label: string | undefined, lines: string[]): never {
  throw new AssertionError((label ? label + "\n" : "") + lines.join("\n"));
}

function matchers(actual: unknown, label: string | undefined, negate: boolean) {
  const check = (pass: boolean, expectedText: string) => {
    if (pass !== negate) return;
    report(label, [
      (negate ? "Expected not: " : "Expected: ") + expectedText,
      "Received: " + formatValue(actual),
    ]);
  };

  return {
    /** Same value or same object (like ===, but NaN equals NaN). */
    toBe(expected: unknown) {
      check(Object.is(actual, expected), formatValue(expected));
    },
    /** Same content, compared deeply. */
    toEqual(expected: unknown) {
      check(deepEqual(actual, expected), formatValue(expected));
    },
    /**
     * `actual` must be a function that throws. Pass an error class to check
     * the type, or a string that the message must contain.
     */
    toThrow(expected?: (new (...args: never[]) => Error) | string) {
      if (typeof actual !== "function") {
        report(label, ["expect(...).toThrow() needs a function, like expect(() => run())."]);
      }
      let thrown: unknown;
      let didThrow = false;
      try {
        (actual as () => unknown)();
      } catch (error) {
        didThrow = true;
        thrown = error;
      }

      let pass = didThrow;
      let wanted = "an error to be thrown";
      if (typeof expected === "function") {
        wanted = "a thrown " + expected.name;
        pass = didThrow && thrown instanceof expected;
      } else if (typeof expected === "string") {
        wanted = "a thrown error with message containing " + formatValue(expected);
        pass = didThrow && String((thrown as Error)?.message ?? thrown).includes(expected);
      }

      if (pass !== negate) return;
      report(label, [
        (negate ? "Expected not: " : "Expected: ") + wanted,
        "Received: " + (didThrow ? "thrown " + formatValue(thrown) : "no error"),
      ]);
    },
  };
}

/**
 * expect(value).toBe(x), .toEqual(x), .toThrow(), and the same after .not.
 * The optional label says what the value is: expect(n, "calls to fn").toBe(1).
 */
export function expect(actual: unknown, label?: string) {
  return { ...matchers(actual, label, false), not: matchers(actual, label, true) };
}

export interface Spy {
  (...args: unknown[]): unknown;
  /** The arguments of every call, in order. */
  calls: unknown[][];
  /** The `this` of every call. */
  thisValues: unknown[];
}

/** A function that remembers how it was called. */
export function spy(implementation?: (...args: never[]) => unknown): Spy {
  const fn = function (this: unknown, ...args: unknown[]) {
    fn.calls.push(args);
    fn.thisValues.push(this);
    return implementation
      ? (implementation as (...a: unknown[]) => unknown).apply(this, args)
      : undefined;
  } as Spy;
  fn.calls = [];
  fn.thisValues = [];
  return fn;
}
