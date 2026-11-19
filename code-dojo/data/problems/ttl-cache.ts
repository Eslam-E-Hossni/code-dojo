import type { CodeProblem } from "../types";

export const ttlCache: CodeProblem = {
  id: "ttl-cache",
  kind: "code",
  group: "most-repeated",
  title: "Cache with TTL",
  difficulty: "medium",
  tag: "likely",
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
        {
          coach:
            "نبدأ يا إسلام: الـ cache هيبقى class علشان يبقى ليه بيانات و methods. اكتب أول سطر.",
          expected: "class TTLCache {",
          hint1: "`class` اسمه `TTLCache`.",
          hint2: "class ________ {",
          explain: "The cache is a class.",
        },
        {
          coach: "أول حاجة الـ constructor، ومش محتاج parameters.",
          expected: "  constructor() {",
          hint1: "الـ method الخاصة اللي اسمها `constructor`، بأقواس فاضية.",
          hint2: "___________() {",
          explain: "The constructor needs no arguments.",
        },
        {
          coach: "جواه المخزن نفسه: Map فاضية على `this`. واقفل الـ constructor. سطرين.",
          expected: "    this.store = new Map();\n  }",
          hint1: "`this.store` بيساوي `new Map()`، وبعدها قوس القفل.",
          hint2: "this._____ = new ___();\n}",
          explain: "A Map holds the entries.",
        },
        {
          coach:
            "أول method: بنخزن قيمة بمفتاح، ومعاها المدة اللي هتعيشها بالـ milliseconds.",
          expected: "  set(key, value, ttl) {",
          hint1: "method اسمها `set` بتاخد `key` و `value` و `ttl`.",
          hint2: "___(___, _____, ___) {",
          explain: "set takes a key, a value, and how long the value lives.",
        },
        {
          coach:
            "مش هنخزن القيمة لوحدها. خزّن object فيه القيمة ووقت انتهائها: دلوقتي زائد المدة. واقفل الـ method. سطرين.",
          expected: "    this.store.set(key, { value, expiresAt: Date.now() + ttl });\n  }",
          accept: ["this.store.set(key, { value: value, expiresAt: Date.now() + ttl });\n}"],
          hint1:
            "`this.store.set` بالمفتاح و object فيه `value` و `expiresAt` اللي هو `Date.now() + ttl`.",
          hint2: "this._____.___(___, { _____, _________: Date.___() + ___ });\n}",
          explain: "I store the value together with the time it expires: now plus the time to live.",
        },
        {
          coach: "تاني method: القراءة بالمفتاح.",
          expected: "  get(key) {",
          hint1: "method اسمها `get` وبتاخد `key`.",
          hint2: "___(___) {",
          explain: "get takes a key.",
        },
        {
          coach: "هات اللي متخزن عند المفتاح ده من المخزن.",
          expected: "    const entry = this.store.get(key);",
          hint1: "`this.store.get(key)` والناتج في `const` اسمه `entry`.",
          hint2: "const _____ = this._____.___(___);",
          explain: "I read the entry from the Map.",
        },
        {
          coach: "لو مفيش حاجة أصلًا، رجّع `undefined` وخلاص.",
          expected: "    if (!entry) return undefined;",
          accept: ["if (!entry) return;", "if (entry === undefined) return undefined;"],
          hint1: "`if` بتنفي `entry`، والنتيجة `return undefined`.",
          hint2: "if (!_____) return _________;",
          explain: "If there is no entry, I return undefined.",
        },
        {
          coach: "لو موجود، اسأل: وقته خلص؟ قارن دلوقتي بوقت الانتهاء.",
          expected: "    if (Date.now() >= entry.expiresAt) {",
          hint1: "`if` بتقارن `Date.now()` بـ `entry.expiresAt` بأكبر من أو يساوي.",
          hint2: "if (Date.___() >= _____._________) {",
          explain: "If the entry has expired,",
        },
        {
          coach: "لو خلص، امسحه من المخزن علشان الميموري متتمليش.",
          expected: "      this.store.delete(key);",
          hint1: "`this.store.delete` بالمفتاح.",
          hint2: "this._____.______(___);",
          explain: "I delete it, so the cache does not keep dead entries,",
        },
        {
          coach: "ورجّع `undefined` كأنه مش موجود، واقفل الـ `if`. سطرين.",
          expected: "      return undefined;\n    }",
          accept: ["return;\n}"],
          hint1: "`return undefined`، وبعدها قوس القفل.",
          hint2: "return _________;\n}",
          explain: "and I return undefined.",
        },
        {
          coach: "ولو لسه عايش، رجّع القيمة نفسها مش الـ object كله. واقفل الـ method. سطرين.",
          expected: "    return entry.value;\n  }",
          hint1: "`return entry.value`، وبعدها قوس القفل.",
          hint2: "return _____._____;\n}",
          explain: "Otherwise I return the value.",
        },
        {
          coach: "آخر method: هل المفتاح موجود ولسه عايش؟",
          expected: "  has(key) {",
          hint1: "method اسمها `has` وبتاخد `key`.",
          hint2: "___(___) {",
          explain: "has takes a key.",
        },
        {
          coach:
            "متكررش منطق الانتهاء: استخدم `get` وشوف رجّعت حاجة ولا لأ. واقفل الـ method والـ class. تلات سطور.",
          expected: "    return this.get(key) !== undefined;\n  }\n}",
          hint1: "`return` ومقارنة `this.get(key)` بـ `undefined` بـ `!==`، وبعدها قوسين قفل.",
          hint2: "return this.___(___) !== _________;\n}\n}",
          explain: "has reuses get, so the expiry rule lives in one place.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "returns a value before it expires",
      code: `
const cache = new TTLCache();
cache.set("a", 1, 1000);
expect(cache.get("a")).toBe(1);
await clock.tick(999);
expect(cache.get("a"), "after 999 ms").toBe(1);`,
    },
    {
      name: "returns undefined after the time is over",
      code: `
const cache = new TTLCache();
cache.set("a", 1, 1000);
await clock.tick(5000);
expect(cache.get("a")).toBe(undefined);`,
    },
    {
      name: "edge case: the key does not exist",
      code: `
const cache = new TTLCache();
expect(cache.get("missing")).toBe(undefined);
expect(cache.has("missing")).toBe(false);`,
    },
    {
      name: "edge case: read exactly at the expiry time",
      code: `
const cache = new TTLCache();
cache.set("a", 1, 1000);
await clock.tick(1000);
expect(cache.get("a"), "exactly 1000 ms after set").toBe(undefined);`,
    },
    {
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
      name: "has follows the expiry",
      code: `
const cache = new TTLCache();
cache.set("a", 1, 100);
expect(cache.has("a"), "right after set").toBe(true);
await clock.tick(100);
expect(cache.has("a"), "after it expired").toBe(false);`,
    },
    {
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
      name: "two caches do not share entries",
      code: `
const first = new TTLCache();
const second = new TTLCache();
first.set("a", 1, 100);
expect(second.get("a")).toBe(undefined);`,
    },
  ],
  complexity: "set, get and has are O(1). Expired entries are removed when they are read.",
  idea: "كل قيمة بتتخزن ومعاها وقت انتهائها. ومفيش تايمر: بنسأل على الوقت ساعة القراءة بس، واللي خلص بنمسحه.",
  followUps: [
    {
      question: "An entry that is never read again stays in memory. How would you fix that?",
      answer:
        "With a cleanup that runs from time to time, or a timer per entry that deletes it. Reading stays the same.",
    },
    {
      question: "What is the weak point of has?",
      answer:
        "It cannot tell a stored undefined from a missing key. I would compare the entry itself, not the value.",
    },
  ],
};
