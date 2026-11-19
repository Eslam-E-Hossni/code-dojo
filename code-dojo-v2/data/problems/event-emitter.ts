import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const tests: TestCase[] = [
  {
    id: "passes-arguments",
    name: "a listener is called with the arguments of emit",
    code: `
const emitter = new EventEmitter();
const listener = spy();
emitter.on("message", listener);
emitter.emit("message", "hello", 42);
expect(listener.calls, "calls to the listener").toEqual([["hello", 42]]);`,
  },
  {
    id: "many-listeners",
    name: "one event can have many listeners, called in the order they were added",
    code: `
const emitter = new EventEmitter();
const order = [];
emitter.on("go", () => order.push("first"));
emitter.on("go", () => order.push("second"));
emitter.on("go", () => order.push("third"));
emitter.emit("go");
expect(order).toEqual(["first", "second", "third"]);`,
  },
  {
    id: "names-do-not-mix",
    name: "events with different names do not mix",
    code: `
const emitter = new EventEmitter();
const open = spy();
const close = spy();
emitter.on("open", open);
emitter.on("close", close);
emitter.emit("open");
expect(open.calls.length, "calls to the open listener").toBe(1);
expect(close.calls.length, "calls to the close listener").toBe(0);`,
  },
  {
    id: "off-removes",
    name: "off removes a listener",
    code: `
const emitter = new EventEmitter();
const kept = spy();
const removed = spy();
emitter.on("tick", kept);
emitter.on("tick", removed);
emitter.off("tick", removed);
emitter.emit("tick");
expect(kept.calls.length, "calls to the listener that stayed").toBe(1);
expect(removed.calls.length, "calls to the removed listener").toBe(0);`,
  },
  {
    id: "on-returns-unsubscribe",
    name: "on returns a function that unsubscribes",
    code: `
const emitter = new EventEmitter();
const listener = spy();
const stop = emitter.on("tick", listener);
expect(typeof stop, "typeof what on returns").toBe("function");
emitter.emit("tick");
stop();
emitter.emit("tick");
expect(listener.calls.length, "calls to the listener").toBe(1);`,
  },
  {
    id: "no-listeners",
    name: "edge case: emit with no listeners",
    code: `
const emitter = new EventEmitter();
emitter.emit("nothing", 1, 2);
emitter.off("nothing", () => {});
const listener = spy();
emitter.on("something", listener);
emitter.off("something", listener);
emitter.emit("something");
expect(listener.calls.length, "calls after it was removed").toBe(0);`,
  },
  {
    id: "added-twice",
    name: "edge case: the same listener added twice runs once",
    code: `
const emitter = new EventEmitter();
const listener = spy();
emitter.on("tick", listener);
emitter.on("tick", listener);
emitter.emit("tick");
expect(listener.calls.length, "calls to the listener").toBe(1);`,
  },
  {
    id: "once-runs-once",
    name: "once: the listener runs only the first time",
    code: `
const emitter = new EventEmitter();
const listener = spy();
emitter.once("ready", listener);
emitter.emit("ready", "a");
emitter.emit("ready", "b");
expect(listener.calls, "calls to the listener").toEqual([["a"]]);`,
  },
  {
    id: "once-keeps-others",
    name: "once does not disturb the other listeners",
    code: `
const emitter = new EventEmitter();
const always = spy();
const single = spy();
emitter.on("tick", always);
emitter.once("tick", single);
emitter.emit("tick");
emitter.emit("tick");
expect(always.calls.length, "calls to the normal listener").toBe(2);
expect(single.calls.length, "calls to the once listener").toBe(1);`,
  },
  {
    id: "removes-itself",
    name: "edge case: a listener removes itself during emit",
    code: `
const emitter = new EventEmitter();
const order = [];
const selfRemoving = () => {
  order.push("self-removing");
  emitter.off("tick", selfRemoving);
};
emitter.on("tick", selfRemoving);
emitter.on("tick", () => order.push("normal"));
emitter.emit("tick");
emitter.emit("tick");
expect(order).toEqual(["self-removing", "normal", "normal"]);`,
  },
  {
    id: "own-listeners",
    name: "two emitters do not share listeners",
    code: `
const first = new EventEmitter();
const second = new EventEmitter();
const listener = spy();
first.on("tick", listener);
second.emit("tick");
expect(listener.calls.length, "calls from the other emitter").toBe(0);`,
  },
];

export const eventEmitter: CodeProblem = {
  id: "event-emitter",
  kind: "code",
  group: "event-emitter",
  title: "EventEmitter (pub / sub)",
  difficulty: "medium",
  tag: "likely",
  language: "js",
  api: ["EventEmitter"],
  plainLoops: true,
  statement: "Build a class with on, off, emit and once.",
  examples: [
    "const emitter = new EventEmitter();",
    'const stop = emitter.on("message", (text) => console.log(text));',
    'emitter.emit("message", "hello"); // prints "hello"',
    "stop(); // the listener is removed",
  ],
  askFirst: ["Can one event have many listeners?", "Should on return an unsubscribe function?"],
  edgeCases: [
    "emit with no listeners",
    "The same listener added twice",
    "A listener removes itself during emit",
  ],
  parts: [
    {
      id: "main",
      title: "EventEmitter",
      signature: "new EventEmitter()",
      steps: [
        line("class EventEmitter {", {
          coach:
            "Let's start, Islam. We need one object that keeps its own data and has four methods, so we write a class.",
          hint1: "Use the `class` keyword and the name `EventEmitter`.",
          explain: "EventEmitter is a class, so every emitter has its own data and the same four methods.",
        }),
        line("  constructor() {", {
          coach: "Every new emitter must set up its own storage when it is created. It needs no arguments for that.",
          hint1: "The special method called `constructor`, with empty parentheses.",
          explain: "The constructor runs once for every new emitter, and it takes no arguments.",
        }),
        line("    this.events = new Map();\n  }", {
          coach:
            "The storage links the name of an event to the group of listeners of that event, and then we close the constructor. Two lines.",
          hint1: "Put a new `Map` on `this`, then a closing brace.",
          explain: "A Map goes from an event name to its listeners.",
        }),
        line("  on(name, listener) {", {
          coach:
            "The first method subscribes. It takes the name of the event and the function to call when the event happens.",
          hint1: "A method called `on` with two parameters.",
          explain: "on takes an event name and a listener.",
        }),
        line("    if (!this.events.has(name)) this.events.set(name, new Set());", {
          coach:
            "A new event name has no group of listeners yet, and the next line needs one. The group must not hold the same listener twice, and removing one must be fast.",
          hint1: "Ask the Map with `has`. If the name is not there, `set` it to a new `Set`, all on one line.",
          explain: "For a new event name I create an empty Set, which has no duplicates and deletes in O(1).",
        }),
        line("    this.events.get(name).add(listener);", {
          coach: "Now the group of this event exists, so we put the listener into it.",
          hint1: "`get` the Set of this name from the Map, then `add` to it.",
          explain: "I add the listener to the Set of that event.",
        }),
        line("    return () => this.off(name, listener);\n  }", {
          coach:
            "The caller needs a way to remove this exact listener later, so we give back a function that does it and close the method. Two lines.",
          hint1:
            "Return an arrow function, so `this` is still the emitter. It calls `off` with the same two values. Then a closing brace.",
          explain: "on returns a function that removes this listener.",
        }),
        line("  off(name, listener) {", {
          coach:
            "The second method unsubscribes. It needs the same two things: the name of the event and the listener to remove.",
          hint1: "A method called `off` with the same two parameters.",
          explain: "off takes the same two arguments.",
        }),
        line("    const listeners = this.events.get(name);", {
          coach: "First we look up the group of listeners of this event.",
          hint1: "`get` it from the Map by `name`, and keep it in a variable.",
          explain: "I get the Set of the event.",
        }),
        line("    if (listeners) listeners.delete(listener);\n  }", {
          coach:
            "The event may have no listeners at all, so we remove the listener only when the group is there, and then we close the method. Two lines.",
          hint1: "An `if` on `listeners`, with `delete` on the same line. Then a closing brace.",
          explain: "If the Set is there, I delete the listener from it.",
        }),
        line("  emit(name, ...args) {", {
          coach:
            "The third method fires an event. It takes the name of the event, and any number of values to pass to the listeners.",
          hint1: "A method called `emit` with the name and a rest parameter.",
          explain: "emit takes an event name and any arguments.",
        }),
        line("    const listeners = this.events.get(name);", {
          coach: "Again we look up the group of listeners of this event.",
          hint1: "The same line as in `off`: `get` by `name`, into a variable.",
          explain: "I get the listeners of this event from the Map.",
        }),
        line("    if (!listeners) return;", {
          coach: "If nobody subscribed to this event, there is nothing to do and we stop.",
          hint1: "An `if` with `!` on `listeners`, and a `return` with no value on the same line.",
          explain: "I return early when the event has no listeners.",
        }),
        line("    for (const listener of listeners) {", {
          coach: "Every listener of this event must be called, so we go over all of them.",
          hint1: "A `for...of` loop over `listeners`.",
          explain: "I loop over the listeners of the event.",
        }),
        line("      listener(...args);\n    }\n  }", {
          coach:
            "Each listener is called with the values that came with the event, and then we close the loop and the method. Three lines.",
          hint1: "Call `listener` and spread `args` into the call, then two closing braces.",
          explain: "I call each listener with the arguments.",
        }),
        line("  once(name, listener) {", {
          coach:
            "The last method adds a listener that runs one time only. It takes the same two things as the method that subscribes.",
          hint1: "A method called `once` with the same two parameters as `on`.",
          explain: "once takes an event name and a listener.",
        }),
        line("    const off = this.on(name, (...args) => {", {
          coach:
            "The real listener cannot remove itself, so we subscribe our own wrapper function in its place. We will also need a way to remove the wrapper later.",
          hint1:
            "Call `on` with `name` and an arrow function with a rest parameter, and keep what it returns in a `const`.",
          explain: "I subscribe a wrapper function, and I keep the unsubscribe function that on returns.",
        }),
        line("      off();", {
          coach: "The subscription must end at the first event, so that is the first thing the wrapper does.",
          hint1: "Call the unsubscribe function that we just saved.",
          explain: "When the event fires, the wrapper removes itself first.",
        }),
        line("      listener(...args);", {
          coach: "Now the real listener can run, with the values that came with the event.",
          hint1: "Call `listener` and spread `args` into the call.",
          explain: "Then the wrapper calls the real listener with the arguments.",
        }),
        line("    });\n  }\n}", {
          coach:
            "Last, we close the wrapper together with the call that subscribes it, then the method, then the class. Three lines.",
          hint1:
            "A closing brace with a closing parenthesis and a semicolon, then a closing brace for the method, then one for the class.",
          explain: "I close the wrapper, the method and the class.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "on and off: O(1). emit: O(listeners).",
  followUps: [
    {
      question: "Why a Set and not an array?",
      answer: "No duplicates, and delete is O(1).",
    },
  ],
};
