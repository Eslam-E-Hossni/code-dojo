import { shape } from "../shape";
import type { Step } from "../types";

/**
 * A step whose `hint2` is made from the line itself (see data/shape.ts).
 * The React problems use it, because the shape of a JSX line is always the
 * same idea: every name and every text is a blank.
 *
 * `expected` can start with "\n" to keep an empty line before it.
 */
export function line(expected: string, text: Omit<Step, "expected" | "hint2">): Step {
  return { ...text, expected, hint2: shape(expected) };
}

/**
 * Every other order of the names in an import line, for `accept`.
 * The order of named imports does not matter, so all of them are right.
 */
export function importOrders(names: string[], from = "react"): string[] {
  const orders: string[][] = [];

  const build = (picked: string[], left: string[]) => {
    if (left.length === 0) {
      orders.push(picked);
      return;
    }
    for (let i = 0; i < left.length; i++) {
      const rest: string[] = [];
      for (let k = 0; k < left.length; k++) {
        if (k !== i) rest.push(left[k]);
      }
      build([...picked, left[i]], rest);
    }
  };
  build([], names);

  const out: string[] = [];
  // The first order is the reference line itself.
  for (let i = 1; i < orders.length; i++) {
    out.push("import { " + orders[i].join(", ") + ' } from "' + from + '";');
  }
  return out;
}

/** The lines that close a component: the parent tag, the return, the function. */
export function closing(tag: string): string {
  return "    </" + tag + ">\n  );\n}";
}
