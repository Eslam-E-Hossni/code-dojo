/**
 * Says what is different, in plain English, pointing at the first wrong
 * part. A message names what the learner wrote and why it is not right.
 * It does not give the reference code away: that is what the hints and
 * the reveal are for.
 */

import { isNode, signature, type CNode } from "./canon";
import type { Difference } from "./diff";

export interface Explained {
  message: string;
  /** The part of the parsed source the message is about, or null for "the whole line". */
  range: { start: number; end: number } | null;
}

/** Array methods that change the array they are called on. */
const MUTATING = new Set(["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin"]);

const STATEMENT_WORDS: Record<string, string> = {
  Var: "a declaration",
  If: "an if",
  For: "a loop",
  ForOf: "a loop",
  ForIn: "a loop",
  While: "a loop",
  DoWhile: "a loop",
  Return: "a return",
  Expr: "a call or an assignment",
  Throw: "a throw",
  Try: "a try block",
  Block: "a block",
};

/** A pair of built-in functions that people mix up, with the reason they are different. */
const MIXED_UP: Record<string, string> = {
  "setInterval>setTimeout": "`setInterval` repeats again and again. This step needs something that runs one time.",
  "setTimeout>setInterval": "`setTimeout` runs one time only. This step needs something that repeats.",
  "clearInterval>clearTimeout": "`clearInterval` stops an interval. The thing to stop here was started in another way.",
  "clearTimeout>clearInterval": "`clearTimeout` stops a timeout. The thing to stop here was started in another way.",
};

function snippet(source: string, node: CNode | null, limit: number): string | null {
  if (node === null || node.end > limit || node.end <= node.start) return null;
  const text = source.slice(node.start, node.end).replace(/\s+/g, " ").trim();
  if (text === "" || text.length > 40) return null;
  return text;
}

function rangeOf(node: CNode | null, limit: number): Explained["range"] {
  if (node === null) return null;
  return { start: Math.min(node.start, limit), end: Math.min(node.end, limit) };
}

function nameOf(node: CNode | null): string {
  if (node === null) return "";
  if (node.t === "Global") return String(node.name);
  if (node.t === "Ref" || node.t === "Bind") return String(node._name);
  return "";
}

function sameWithoutCall(call: CNode, other: CNode): boolean {
  return call.t === "Call" && signature(call.callee) === signature(other);
}

function typeMessage(user: CNode, ref: CNode, quote: (node: CNode | null) => string | null): string {
  // fn() where fn was wanted, and the other way round.
  if (sameWithoutCall(user, ref)) {
    const name = quote(user.callee as CNode) ?? "the function";
    return "This runs `" + name + "` now. Pass the function itself, without ().";
  }
  if (sameWithoutCall(ref, user)) {
    const name = quote(user) ?? "It";
    return "`" + name + "` is only named here, not called. Add () to run it.";
  }
  // A call where a function to run later is wanted: setTimeout(fn(), 100).
  if (ref.t === "Fn" && user.t === "Call") {
    const name = quote(user.callee as CNode) ?? "the function";
    return "This runs `" + name + "` now and passes its result. This step needs a function here, to run later.";
  }
  if (ref.t === "New" && user.t === "Call" && signature(ref.callee) === signature(user.callee)) {
    return "`" + (quote(user.callee as CNode) ?? "This") + "` is a class. Create it with `new`.";
  }
  if (ref.t === "Call" && user.t === "New" && signature(ref.callee) === signature(user.callee)) {
    return "`" + (quote(user.callee as CNode) ?? "This") + "` is a plain function here. Call it without `new`.";
  }
  if (ref.t === "Return" && user.t === "Expr") {
    return "The value is not returned. Without `return`, the function gives back undefined.";
  }
  if (ref.t === "Expr" && user.t === "Return") return "Nothing is returned at this point. This step does something else.";
  if (ref.t === "Await" && user.t !== "Await") return "This gives a Promise. Wait for its value with `await`.";
  if (user.t === "Await" && ref.t !== "Await") return "There is nothing to wait for here. Remove `await`.";
  if (ref.t === "Rest" && user.t !== "Rest") {
    return "This takes one value only. Here it must collect all of them: put `...` in front of the name.";
  }
  if (user.t === "Rest" && ref.t !== "Rest") return "This is one value here, not a list of them. Remove the `...`.";
  if (ref.t === "Spread" && user.t !== "Spread") return "This is a list of values. Spread it with `...`.";
  if (user.t === "Spread" && ref.t !== "Spread") return "No need to spread here. Pass the value as it is.";
  if (user.t === "Str" && ref.t !== "Str") return "This is text in quotes. Here we need a value, not text.";
  if (user.t === "Update" || user.t === "Assign") return "This changes a value. This step does not change one here.";

  const mine = STATEMENT_WORDS[user.t];
  const theirs = STATEMENT_WORDS[ref.t];
  if (mine !== undefined && theirs !== undefined && mine !== theirs) {
    return "You wrote " + mine + " here. This step is not " + mine + ". Read the coach sentence again.";
  }
  const text = quote(user);
  return text === null ? "This part is not what the step needs." : "`" + text + "` is not what this step needs here.";
}

function valueMessage(found: Difference, quote: (node: CNode | null) => string | null): string {
  const owner = found.owner;
  if (owner === null) return "This part is different.";
  if (owner.t === "Member" && found.key === "name") {
    const name = String(owner.name);
    if (MUTATING.has(name)) return "You used `" + name + "`, which changes the original array.";
    return "`." + name + "` is not the property we need here.";
  }
  if (owner.t === "Num" || owner.t === "Str" || owner.t === "Bool") {
    return "Check the value `" + (quote(owner) ?? String(owner.value)) + "`.";
  }
  if (owner.t === "Fn" && found.key === "async") {
    return owner.async === true ? "This function does not need `async`." : "This function waits for something, so it must be `async`.";
  }
  if (owner.t === "Var" && found.key === "exported") {
    return "This is exported in another way than the task asks. Check `export default` against a plain `export`.";
  }
  if (found.key === "optional") return "Check the `?.` here.";
  if (owner.t === "Logic" && found.key === "op") return "`" + String(owner.op) + "` is not the right way to join these two conditions.";
  if (owner.t === "Unary" && found.key === "op") return "`" + String(owner.op) + "` is not the operator we need here.";
  if (owner.t === "Prop" && found.key === "key") return "The key `" + String(owner.key) + "` is not the one we need.";
  const text = quote(owner);
  return text === null ? "This part is different." : "`" + text + "` is different from what this step needs.";
}

/**
 * `source` is the code that was parsed for the learner, and `limit` the
 * length of what they really typed (the rest was added to close brackets).
 */
export function explain(found: Difference, source: string, limit: number): Explained {
  const quote = (node: CNode | null) => snippet(source, node, limit);
  const user = found.user;
  const ref = found.ref;
  const owner = found.owner;

  switch (found.kind) {
    case "missing": {
      let message = "Something is missing here.";
      if (owner !== null && owner.t === "Call" && found.key === "args") message = "This call needs one more argument.";
      else if (owner !== null && owner.t === "New" && found.key === "args") message = "`new` needs one more argument here.";
      else if (owner !== null && owner.t === "Fn" && found.key === "params") message = "This function needs one more parameter.";
      else if (owner !== null && owner.t === "Var" && found.key === "init") message = "Give this variable a starting value.";
      else if (owner !== null && owner.t === "Return" && found.key === "arg") message = "Return a value here, not nothing.";
      else if (owner !== null && owner.t === "Block") message = "This block is closed too early. A line is still missing inside it.";
      else if (owner !== null && owner.t === "Jsx" && found.key === "children") message = "This tag is closed too early. Something is still missing inside it.";
      else if (owner !== null && owner.t === "Var" && found.key === "exported") {
        message = "This must be exported. The preview and the tests import it, so put `export default` or `export` in front, as the task says.";
      }
      return { message, range: rangeOf(owner, limit) };
    }
    case "extra": {
      let message = "There is something extra here.";
      if (owner !== null && (owner.t === "Call" || owner.t === "New") && found.key === "args") message = "This call has one argument too many.";
      else if (owner !== null && owner.t === "Fn" && found.key === "params") message = "This function has one parameter too many.";
      else if (owner !== null && owner.t === "Var" && found.key === "init") message = "This variable starts without a value.";
      else if (owner !== null && owner.t === "Block") message = "This is more than the step asks for. Write only this step.";
      else if (owner !== null && owner.t === "If" && found.key === "alt") message = "This `if` has no `else` part here.";
      else if (owner !== null && owner.t === "Jsx" && found.key === "children") message = "There is something extra inside this tag. Write only this step.";
      else if (owner !== null && owner.t === "Var" && found.key === "exported") message = "This is not exported in this solution. Remove `export`.";
      return { message, range: rangeOf(user ?? owner, limit) };
    }
    case "type":
      if (user === null || ref === null) return { message: "This part is not what the step needs.", range: rangeOf(owner, limit) };
      return { message: typeMessage(user, ref, quote), range: rangeOf(user, limit) };
    case "value":
      return { message: valueMessage(found, quote), range: rangeOf(owner, limit) };
    case "operator": {
      const op = user === null ? "" : String(user.op);
      const right = ref !== null && isNode(ref.right) ? ref.right : null;
      // i <= list.length goes one step past the end.
      if (op === "<=" && ref !== null && ref.op === "<" && right !== null && right.t === "Member" && right.name === "length") {
        return { message: "With `<=` the loop goes one step past the end. The last index is length - 1.", range: rangeOf(user, limit) };
      }
      // Math.max against Math.min, or the ternary that does the same.
      if (op === "max") return { message: "This gives the bigger of the two. This step needs the smaller one.", range: rangeOf(user, limit) };
      if (op === "min") return { message: "This gives the smaller of the two. This step needs the bigger one.", range: rangeOf(user, limit) };
      return { message: "`" + op + "` is not the right operator here.", range: rangeOf(user, limit) };
    }
    case "var":
      return {
        message: "Use `let` or `const`. `var` ignores block scope, so the variable can leak out of a loop or an if.",
        range: rangeOf(user, limit),
      };
    case "const-reassigned": {
      const name = user !== null && isNode(user.id) ? nameOf(user.id) : "This variable";
      return { message: "`" + name + "` gets a new value later, so it cannot be `const`. Use `let`.", range: rangeOf(user, limit) };
    }
    case "arrow-this":
      return {
        message:
          "An arrow function has no `this` of its own. This function must keep the `this` of the caller, so write it with the `function` keyword.",
        range: rangeOf(user, limit),
      };
    case "function-this":
      return {
        message: "A regular function gets its own `this`. Here we need the `this` from outside, so use an arrow function.",
        range: rangeOf(user, limit),
      };
    case "loose-equality":
      return {
        message: '`==` converts the types before it compares, so `0 == ""` is true. Use `===`, which compares without converting.',
        range: rangeOf(user, limit),
      };
    case "loose-null":
      return {
        message: "`!= null` treats undefined like null. This value can be undefined, so the result changes. Compare with the strict operator.",
        range: rangeOf(user, limit),
      };
    case "strict-null":
      return {
        message: "The strict operator lets undefined through. This value can be undefined, and we want to catch that too.",
        range: rangeOf(user, limit),
      };
    case "api-name":
      return {
        message: "Call it `" + nameOf(ref) + "`. The tests use this name, so it cannot change.",
        range: rangeOf(user, limit),
      };
    case "name": {
      if (user !== null && user.t === "Global") {
        return { message: "`" + nameOf(user) + "` is not defined at this point.", range: rangeOf(user, limit) };
      }
      if (user !== null && user.t === "Bind") {
        return { message: "This declares something else than the step needs.", range: rangeOf(user, limit) };
      }
      return { message: "`" + nameOf(user) + "` is not the value we need here.", range: rangeOf(user, limit) };
    }
    case "global": {
      const mixed = MIXED_UP[nameOf(user) + ">" + nameOf(ref)];
      return { message: mixed ?? "`" + nameOf(user) + "` is not what we need here.", range: rangeOf(user, limit) };
    }
    case "jsx-tag": {
      const mine = user !== null && user.value !== "" ? "<" + String(user.value) + ">" : "A fragment";
      return { message: "`" + mine + "` is not the tag this step needs.", range: rangeOf(user, limit) };
    }
    case "jsx-attr-missing":
      return { message: "This tag needs one more attribute.", range: rangeOf(owner, limit) };
    case "jsx-attr-extra":
      return {
        message: "`" + (user === null ? "This attribute" : String(user.name)) + "` is not an attribute of this tag in this step.",
        range: rangeOf(user, limit),
      };
    case "for-of-index": {
      // A for...of goes over every item, first to last. Is that what the reference loop does?
      const start = ref !== null && isNode(ref.init) && isNode(ref.init.init) ? ref.init.init : null;
      const fromFirst = start !== null && start.t === "Num" && start.value === 0;
      const upward = ref !== null && isNode(ref.test) && ref.test.t === "Bin" && ref.test.op === "<";
      const message =
        fromFirst && upward
          ? "A `for...of` loop has no index. This loop needs the position later, so use a counting `for` loop."
          : "A `for...of` loop goes over every item, from the first to the last. This loop does not, so write a counting `for` loop.";
      return { message, range: rangeOf(user, limit) };
    }
    default:
      return { message: "This is different from what the step needs.", range: rangeOf(user ?? owner, limit) };
  }
}
