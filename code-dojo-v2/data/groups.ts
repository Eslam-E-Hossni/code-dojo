import type { Group } from "./types";

/** The order here is the order on the home page. */
export const groups: Group[] = [
  { id: "most-repeated", title: "Most repeated", about: "The problems that come up again and again." },
  { id: "polyfills", title: "Polyfills", about: "Write your own version of a built-in, to show how it works inside." },
  { id: "algorithms", title: "Algorithms", about: "Short problems on arrays and strings, solved with plain loops." },
  { id: "output", title: "Output questions", about: "Read the code, type what it prints, then run it to check." },
  { id: "react", title: "React", about: "Components and hooks, with a live preview and tests that click through them." },
  { id: "event-emitter", title: "EventEmitter", about: "A small class with on, off, emit and once." },
];
