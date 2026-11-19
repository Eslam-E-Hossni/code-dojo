/**
 * Turns any value into readable text, close to what a browser console
 * shows. Values cannot cross from the worker as they are (functions and
 * some objects cannot be cloned), so the worker sends text.
 */

const MAX_DEPTH = 4;
const MAX_ITEMS = 100;
const MAX_STRING = 10_000;

function quote(text: string): string {
  return "'" + text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
}

function formatKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : quote(key);
}

function inner(value: unknown, depth: number, seen: Set<unknown>): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  switch (typeof value) {
    case "string":
      return quote(value);
    case "number":
      return Object.is(value, -0) ? "-0" : String(value);
    case "boolean":
      return String(value);
    case "bigint":
      return String(value) + "n";
    case "symbol":
      return value.toString();
    case "function": {
      const isClass = /^class\b/.test(Function.prototype.toString.call(value));
      const name = value.name || "(anonymous)";
      return isClass ? "[class " + name + "]" : "[Function: " + name + "]";
    }
  }

  const object = value as object;
  if (object instanceof Error) return object.name + ": " + object.message;
  if (object instanceof Date) {
    return Number.isNaN(object.getTime()) ? "Invalid Date" : object.toISOString();
  }
  if (object instanceof RegExp) return object.toString();
  if (typeof (object as PromiseLike<unknown>).then === "function" && object instanceof Promise) {
    return "Promise {}";
  }

  if (seen.has(object)) return "[Circular]";
  if (depth >= MAX_DEPTH) return Array.isArray(object) ? "[Array]" : "[Object]";
  seen.add(object);

  let text: string;
  if (Array.isArray(object)) {
    const parts: string[] = [];
    let holes = 0;
    const flushHoles = () => {
      if (holes > 0) parts.push("<" + holes + " empty item" + (holes > 1 ? "s" : "") + ">");
      holes = 0;
    };
    const shown = Math.min(object.length, MAX_ITEMS);
    for (let i = 0; i < shown; i++) {
      if (!(i in object)) {
        holes++;
        continue;
      }
      flushHoles();
      parts.push(inner(object[i], depth + 1, seen));
    }
    flushHoles();
    if (object.length > shown) parts.push("... " + (object.length - shown) + " more items");
    text = "[" + parts.join(", ") + "]";
  } else if (object instanceof Map) {
    const parts: string[] = [];
    for (const [k, v] of object) {
      parts.push(inner(k, depth + 1, seen) + " => " + inner(v, depth + 1, seen));
    }
    text = "Map(" + object.size + ") {" + parts.join(", ") + "}";
  } else if (object instanceof Set) {
    const parts: string[] = [];
    for (const v of object) parts.push(inner(v, depth + 1, seen));
    text = "Set(" + object.size + ") {" + parts.join(", ") + "}";
  } else {
    const record = object as Record<string, unknown>;
    const keys = Object.keys(record);
    const parts: string[] = [];
    for (let i = 0; i < keys.length && i < MAX_ITEMS; i++) {
      parts.push(formatKey(keys[i]) + ": " + inner(record[keys[i]], depth + 1, seen));
    }
    if (keys.length > MAX_ITEMS) parts.push("... " + (keys.length - MAX_ITEMS) + " more keys");
    const proto = Object.getPrototypeOf(object);
    const className =
      proto && proto !== Object.prototype && proto.constructor ? proto.constructor.name : "";
    const body = parts.length > 0 ? "{ " + parts.join(", ") + " }" : "{}";
    text = className ? className + " " + body : body;
  }

  seen.delete(object);
  return text;
}

/** A value as it appears inside a message: strings are quoted. */
export function formatValue(value: unknown): string {
  const text = inner(value, 0, new Set());
  return text.length > MAX_STRING ? text.slice(0, MAX_STRING) + "…" : text;
}

/** The arguments of one console call, joined like a console does. */
export function formatArgs(args: unknown[]): string {
  const parts: string[] = [];
  for (let i = 0; i < args.length; i++) {
    // A top-level string prints without quotes.
    parts.push(typeof args[i] === "string" ? (args[i] as string) : formatValue(args[i]));
  }
  const text = parts.join(" ");
  return text.length > MAX_STRING ? text.slice(0, MAX_STRING) + "…" : text;
}
