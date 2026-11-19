import type { TemplateStep } from "./types";

/** The 7-step routine for any live-coding problem. */
export const interviewTemplate: TemplateStep[] = [
  {
    id: "repeat",
    title: "Repeat the task in your own words",
    note: "It shows that you understood, and it gives you a few seconds to think.",
    say: "So the task is to ... and return ... Is that right?",
  },
  {
    id: "ask",
    title: "Ask about the input and the output",
    note: "The type, the size, a new value or a changed input, and whether built-in helpers are allowed.",
    say: "What is the input type? Can I change the input, or should I return a new one? Can I use built-in methods?",
  },
  {
    id: "edge-cases",
    title: "Say the edge cases",
    note: "Empty, one item, duplicates, negative numbers, null or undefined, very deep, very large.",
    say: "Let me think about edge cases: empty input, one item, duplicates, negative numbers.",
  },
  {
    id: "plan",
    title: "Say the plan before you write",
    note: "Two sentences, then wait for a yes. If you have a simple way and a faster way, name both.",
    say: "My plan is to loop once and keep a Map. That is O(n). Should I go with this?",
  },
  {
    id: "code",
    title: "Write and talk",
    note: "A working solution first, clear names, and never silent for more than ten seconds.",
    say: "Here I save the value, so I can find it later in O(1).",
  },
  {
    id: "test",
    title: "Test it by hand",
    note: "Walk through one example line by line, then through one edge case.",
    say: "Let me test it with [2, 7, 11] and target 9. Then with an empty array.",
  },
  {
    id: "complexity",
    title: "Say the complexity and what you would improve",
    note: "Time and space, and what you would add with more time.",
    say: "Time is O(n), space is O(n). With more time I would add input validation and tests.",
  },
];
