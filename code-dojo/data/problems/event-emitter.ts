import type { CodeProblem } from "../types";

export const eventEmitter: CodeProblem = {
  id: "event-emitter",
  kind: "code",
  group: "event-emitter",
  title: "EventEmitter (pub / sub)",
  difficulty: "medium",
  tag: "likely",
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
        {
          coach: "نبدأ يا إسلام: class علشان يبقى فيه بيانات وأربع methods. اكتب أول سطر.",
          expected: "class EventEmitter {",
          hint1: "`class` اسمه `EventEmitter`.",
          hint2: "class ____________ {",
          explain: "EventEmitter is a class.",
        },
        {
          coach: "الـ constructor من غير parameters.",
          expected: "  constructor() {",
          hint1: "الـ method الخاصة اللي اسمها `constructor`، بأقواس فاضية.",
          hint2: "___________() {",
          explain: "The constructor needs no arguments.",
        },
        {
          coach:
            "جواه المخزن: Map المفتاح فيها اسم الـ event والقيمة مجموعة الـ listeners بتاعته. واقفل الـ constructor. سطرين.",
          expected: "    this.events = new Map();\n  }",
          hint1: "`this.events` بيساوي `new Map()`، وبعدها قوس القفل.",
          hint2: "this.______ = new ___();\n}",
          explain: "A Map goes from an event name to its listeners.",
        },
        {
          coach: "أول method: الاشتراك. بتاخد اسم الـ event والدالة اللي هتتنادى.",
          expected: "  on(name, listener) {",
          hint1: "method اسمها `on` بتاخد `name` و `listener`.",
          hint2: "__(____, ________) {",
          explain: "on takes an event name and a listener.",
        },
        {
          coach:
            "لو دي أول مرة حد يشترك في الـ event ده، اعمله مجموعة فاضية. استخدم Set مش array علشان متكررش وعلشان المسح يبقى سريع. كله في سطر واحد.",
          expected: "    if (!this.events.has(name)) this.events.set(name, new Set());",
          accept: ["if (!this.events.has(name)) { this.events.set(name, new Set()); }"],
          hint1: "`if` بتنفي `this.events.has(name)`، ولو آه `this.events.set` بالاسم و `new Set()`.",
          hint2: "if (!this.______.___(____)) this.______.___(____, new ___());",
          explain: "The first time an event is used, I create an empty Set for it. A Set has no duplicates, and delete is O(1).",
        },
        {
          coach: "هات مجموعة الـ event ده وضيف فيها الـ listener.",
          expected: "    this.events.get(name).add(listener);",
          hint1: "`this.events.get(name)` وبعدها `.add(listener)`.",
          hint2: "this.______.___(____).___(________);",
          explain: "I add the listener to the Set of that event.",
        },
        {
          coach:
            "رجّع دالة تلغي الاشتراك ده بالذات. arrow علشان `this` تفضل زي ما هي. واقفل الـ method. سطرين.",
          expected: "    return () => this.off(name, listener);\n  }",
          hint1: "`return` arrow من غير parameters بتنادي `this.off` بـ `name` و `listener`. وبعدها قوس القفل.",
          hint2: "return () => this.___(____, ________);\n}",
          explain: "on returns a function that removes this listener.",
        },
        {
          coach: "تاني method: إلغاء الاشتراك. نفس الـ parameters.",
          expected: "  off(name, listener) {",
          hint1: "method اسمها `off` بتاخد `name` و `listener`.",
          hint2: "___(____, ________) {",
          explain: "off takes the same two arguments.",
        },
        {
          coach: "هات مجموعة الـ event ده.",
          expected: "    const listeners = this.events.get(name);",
          hint1: "`this.events.get(name)` والناتج في `const` اسمه `listeners`.",
          hint2: "const _________ = this.______.___(____);",
          explain: "I get the Set of the event.",
        },
        {
          coach: "لو المجموعة موجودة أصلًا، امسح منها الـ listener. واقفل الـ method. سطرين.",
          expected: "    if (listeners) listeners.delete(listener);\n  }",
          accept: ["if (listeners) { listeners.delete(listener); }\n}"],
          hint1: "`if` على `listeners`، ولو موجودة `listeners.delete(listener)`. وبعدها قوس القفل.",
          hint2: "if (_________) _________.______(________);\n}",
          explain: "If it exists, I delete the listener from it.",
        },
        {
          coach: "تالت method: الإطلاق. بتاخد اسم الـ event وأي قيم نبعتها للـ listeners.",
          expected: "  emit(name, ...args) {",
          hint1: "method اسمها `emit` بتاخد `name` و rest parameter اسمه `args`.",
          hint2: "____(____, ...____) {",
          explain: "emit takes an event name and any arguments.",
        },
        {
          coach: "برضه هات مجموعة الـ event.",
          expected: "    const listeners = this.events.get(name);",
          hint1: "`this.events.get(name)` والناتج في `const` اسمه `listeners`.",
          hint2: "const _________ = this.______.___(____);",
          explain: "I get the Set of the event.",
        },
        {
          coach: "لو محدش مشترك، مفيش حاجة تتعمل. اخرج.",
          expected: "    if (!listeners) return;",
          hint1: "`if` بتنفي `listeners`، ولو آه `return`.",
          hint2: "if (!_________) ______;",
          explain: "If nobody listens, there is nothing to do.",
        },
        {
          coach: "لف على كل الـ listeners.",
          expected: "    for (const listener of listeners) {",
          hint1: "`for...of` على `listeners`، والمتغير اسمه `listener`.",
          hint2: "for (const ________ of _________) {",
          explain: "I loop over the listeners",
        },
        {
          coach: "نادي كل واحد بالقيم. واقفل الـ loop واقفل الـ method. تلات سطور.",
          expected: "      listener(...args);\n    }\n  }",
          hint1: "نادي `listener` وافرد `args` جواه، وبعدها قوسين قفل.",
          hint2: "________(...____);\n}\n}",
          explain: "and call each one with the arguments.",
        },
        {
          coach: "آخر method: listener بيشتغل مرة واحدة بس.",
          expected: "  once(name, listener) {",
          hint1: "method اسمها `once` بتاخد `name` و `listener`.",
          hint2: "____(____, ________) {",
          explain: "once takes an event name and a listener.",
        },
        {
          coach:
            "اشترك بدالة وسيطة من عندنا، واحفظ دالة الإلغاء اللي `on` بترجّعها. الدالة الوسيطة arrow بتاخد أي قيم.",
          expected: "    const off = this.on(name, (...args) => {",
          hint1: "`const` اسمه `off` وقيمته `this.on` بالاسم و arrow بتاخد `...args` وبتفتح قوس.",
          hint2: "const ___ = this.__(____, (...____) => {",
          explain: "I subscribe a wrapper function, and keep the unsubscribe function that on returns.",
        },
        {
          coach: "أول حاجة الدالة الوسيطة تعملها: تلغي نفسها.",
          expected: "      off();",
          hint1: "نادي `off` من غير قيم.",
          hint2: "___();",
          explain: "When the event fires, the wrapper removes itself first,",
        },
        {
          coach: "وبعدين تنادي الـ listener الحقيقي بالقيم.",
          expected: "      listener(...args);",
          hint1: "نادي `listener` وافرد `args` جواه.",
          hint2: "________(...____);",
          explain: "then calls the real listener.",
        },
        {
          coach: "اقفل الـ arrow وقوس `on`، واقفل الـ method، واقفل الـ class. تلات سطور.",
          expected: "    });\n  }\n}",
          hint1: "قوس الـ arrow مع قوس `on` و semicolon، وبعده قوس الـ method، وبعده قوس الـ class.",
          hint2: "_);\n_\n_",
          explain: "I close the wrapper, the method and the class.",
        },
      ],
    },
  ],
  tests: [
    {
      name: "a listener is called with the arguments of emit",
      code: `
const emitter = new EventEmitter();
const listener = spy();
emitter.on("message", listener);
emitter.emit("message", "hello", 42);
expect(listener.calls, "calls to the listener").toEqual([["hello", 42]]);`,
    },
    {
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
      name: "two emitters do not share listeners",
      code: `
const first = new EventEmitter();
const second = new EventEmitter();
const listener = spy();
first.on("tick", listener);
second.emit("tick");
expect(listener.calls.length, "calls from the other emitter").toBe(0);`,
    },
  ],
  complexity: "on and off: O(1). emit: O(listeners).",
  idea: "`Map` من اسم الـ event لـ `Set` من الـ listeners. والـ `once` بيلف الـ listener ويشيله بعد أول نداء.",
  followUps: [
    {
      question: "Why a Set and not an array?",
      answer: "No duplicates, and delete is O(1).",
    },
  ],
};
