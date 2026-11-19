import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "before-expiry",
    name: "returns a value before it expires",
    code: `
const cache = new TTLCache();
cache.set("a", 1, 1000);
expect(cache.get("a")).toBe(1);
await clock.tick(999);
expect(cache.get("a"), "after 999 ms").toBe(1);`,
  },
  {
    id: "after-expiry",
    name: "returns undefined after the time is over",
    code: `
const cache = new TTLCache();
cache.set("a", 1, 1000);
await clock.tick(5000);
expect(cache.get("a")).toBe(undefined);`,
  },
  {
    id: "missing-key",
    name: "edge case: the key does not exist",
    code: `
const cache = new TTLCache();
expect(cache.get("missing")).toBe(undefined);
expect(cache.has("missing")).toBe(false);`,
  },
  {
    id: "exact-expiry",
    name: "edge case: read exactly at the expiry time",
    code: `
const cache = new TTLCache();
cache.set("a", 1, 1000);
await clock.tick(1000);
expect(cache.get("a"), "exactly 1000 ms after set").toBe(undefined);`,
  },
  {
    id: "own-time",
    name: "every key has its own time",
    code: `
const cache = new TTLCache();
cache.set("short", "s", 100);
cache.set("long", "l", 500);
await clock.tick(200);
expect(cache.get("short"), "the short one after 200 ms").toBe(undefined);
expect(cache.get("long"), "the long one after 200 ms").toBe("l");`,
  },
  {
    id: "set-again",
    name: "edge case: setting the same key again restarts its time",
    code: `
const cache = new TTLCache();
cache.set("a", "old", 100);
await clock.tick(80);
cache.set("a", "new", 100);
await clock.tick(80);
expect(cache.get("a"), "160 ms after the first set").toBe("new");
await clock.tick(20);
expect(cache.get("a"), "100 ms after the second set").toBe(undefined);`,
  },
  {
    id: "falsy-values",
    name: "edge case: falsy values like 0 are still values",
    code: `
const cache = new TTLCache();
cache.set("zero", 0, 100);
cache.set("empty", "", 100);
cache.set("no", false, 100);
cache.set("nothing", null, 100);
expect(cache.get("zero")).toBe(0);
expect(cache.get("empty")).toBe("");
expect(cache.get("no")).toBe(false);
expect(cache.get("nothing")).toBe(null);
expect(cache.has("zero"), "has for a stored 0").toBe(true);`,
  },
  {
    id: "has-expiry",
    name: "has follows the expiry",
    code: `
const cache = new TTLCache();
cache.set("a", 1, 100);
expect(cache.has("a"), "right after set").toBe(true);
await clock.tick(100);
expect(cache.has("a"), "after it expired").toBe(false);`,
  },
  {
    id: "any-key",
    name: "keys can be any value, not only strings",
    code: `
const cache = new TTLCache();
const user = { id: 1 };
cache.set(user, "object key", 100);
cache.set(1, "number key", 100);
cache.set("1", "string key", 100);
expect(cache.get(user)).toBe("object key");
expect(cache.get(1)).toBe("number key");
expect(cache.get("1")).toBe("string key");`,
  },
  {
    id: "own-entries",
    name: "two caches do not share entries",
    code: `
const first = new TTLCache();
const second = new TTLCache();
first.set("a", 1, 100);
expect(second.get("a")).toBe(undefined);`,
  },
];

export const ttlCache: CodeProblem = {
  id: "ttl-cache",
  kind: "code",
  group: "most-repeated",
  title: "Cache with TTL",
  difficulty: "medium",
  tag: "likely",
  language: "js",
  api: ["TTLCache"],
  plainLoops: true,
  statement:
    "Build a class TTLCache with set(key, value, ttl), get(key) and has(key). An entry is gone ttl ms after it was set.",
  examples: [
    "const cache = new TTLCache();",
    'cache.set("user", { name: "A" }, 1000);',
    'cache.get("user"); // { name: "A" }',
    '// one second later: cache.get("user") is undefined',
  ],
  askFirst: [
    "Is the time to live per entry, or one value for the whole cache?",
    "What should get return for a missing or expired key?",
    "Should expired entries be removed by a timer, or when they are read?",
  ],
  edgeCases: [
    "The key does not exist",
    "Read exactly at the expiry time",
    "Setting the same key again restarts its time",
    "Falsy values like 0 are still values",
  ],
  parts: [
    {
      id: "main",
      title: "TTLCache",
      signature: "new TTLCache()",
      steps: [
        line("class TTLCache {", {
          coach: "Let's start, Islam. The cache needs data and methods that live together, so a class fits well.",
          hint1: "Use the `class` keyword and the name `TTLCache`.",
          explain: "TTLCache is a class, so each cache I create has its own entries.",
        }),
        line("  constructor() {", {
          coach: "A new cache must prepare its storage when it is created. For that we open the special method that runs on `new`.",
          hint1: "The method is called `constructor`, and its parentheses are empty.",
          explain: "The constructor runs once for every new cache, and it takes no arguments.",
        }),
        line("    this.store = new Map();\n  }", {
          coach:
            "The entries need a place to live on the instance, so we create an empty storage there and close the constructor. Two lines.",
          hint1: "Put a `new Map` on `this`, under the name `store`. Then close the block.",
          explain: "A Map on the instance holds the entries, and its keys can be any type.",
        }),
        line("  set(key, value, ttl) {", {
          coach: "Now the first method. It saves a value under a key, together with the time it may live in milliseconds.",
          hint1: "A method called `set` with three parameters: the key, the value and the time to live.",
          explain: "set takes a key, a value, and how long the value lives.",
        }),
        line("    this.store.set(key, { value, expiresAt: Date.now() + ttl });\n  }", {
          coach:
            "The value alone is not enough, because later we must know if it is still alive, so we save it with the moment it expires and close the method. Two lines.",
          hint1:
            "Call `set` on the `store` with the key and an object. The object holds the value and `expiresAt`, which is `Date.now` plus `ttl`. Then close the method.",
          explain: "I store the value together with the time it expires, which is now plus the time to live.",
        }),
        line("  get(key) {", {
          coach: "Now the second method, which reads a value by its key.",
          hint1: "A method called `get` with one parameter.",
          explain: "get takes a key.",
        }),
        line("    const entry = this.store.get(key);", {
          coach: "First we take what the storage holds for this key, if anything.",
          hint1: "Read from the `store` with `get`, and keep the answer in a variable.",
          explain: "I read the entry from the Map.",
        }),
        line("    if (!entry) return undefined;", {
          coach: "If nothing was saved under this key, there is nothing to give back, and we stop here.",
          hint1: "An `if` that checks that `entry` is missing, and then a `return` of `undefined`.",
          explain: "A missing key gives no entry, so I return undefined early.",
          accept: ["    if (!entry) return;", "    if (entry === undefined) return undefined;"],
        }),
        line("    if (Date.now() >= entry.expiresAt) {", {
          coach: "The entry exists, but it may be too old. We compare the current time with the moment it expires.",
          hint1: "Compare `Date.now` with `entry.expiresAt`. At that exact moment the entry already counts as expired.",
          explain: "I check if the entry has expired, and the exact expiry time already counts as expired.",
        }),
        line("      this.store.delete(key);", {
          coach: "An expired entry has no use, so we remove it from the storage and free the memory.",
          hint1: "A Map removes a key with `delete`.",
          explain: "I delete the expired entry when it is read, so the cache needs no timer for cleanup.",
        }),
        line("      return undefined;\n    }", {
          coach: "For the caller an expired entry is the same as a missing one, so we give back nothing and close the if. Two lines.",
          hint1: "`return` the value `undefined`, then close the block.",
          explain: "I return undefined, as if the key was never set.",
          accept: ["      return;\n    }"],
        }),
        line("    return entry.value;\n  }", {
          coach:
            "If the entry is still alive, the caller gets the value itself and not the whole entry, and we close the method. Two lines.",
          hint1: "`return` the `value` property of `entry`, then close the block.",
          explain: "I return only the value, because the expiry time is an inner detail of the cache.",
        }),
        line("  has(key) {", {
          coach: "The last method answers one question: is this key in the cache and still alive?",
          hint1: "A method called `has` with one parameter.",
          explain: "has takes a key and answers true or false.",
        }),
        line("    return this.get(key) !== undefined;\n  }\n}", {
          coach:
            "The read method already knows when an entry is expired, so we ask it and check that it gave something back, and then we close the method and the class. Three lines.",
          hint1: "Call `this.get` with the key and compare the result with `undefined`. Then two closing braces, each on its own line.",
          explain: "has reuses get, so the expiry rule lives in one place.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "set, get and has are O(1). Expired entries are removed when they are read.",
  followUps: [
    {
      question: "An entry that is never read again stays in memory. How would you fix that?",
      answer: "With a cleanup that runs from time to time, or a timer per entry that deletes it. Reading stays the same.",
    },
    {
      question: "What is the weak point of has?",
      answer: "It cannot tell a stored undefined from a missing key. I would compare the entry itself, not the value.",
    },
  ],
};
