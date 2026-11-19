import { describe, expect, it } from "vitest";
import { checkLine, normalize } from "@/lib/check";

const step = (expected: string, accept?: string[]) => ({ expected, accept });

function passes(input: string, expected: string, accept?: string[]) {
  return checkLine(input, step(expected, accept)).ok;
}

function diffOf(input: string, expected: string, accept?: string[]) {
  const result = checkLine(input, step(expected, accept));
  if (result.ok || result.empty) throw new Error("expected a failed check");
  return result;
}

describe("normalization", () => {
  it("ignores leading, trailing and repeated spaces", () => {
    expect(passes("   const   cache  =  new   Map() ;  ", "const cache = new Map();")).toBe(true);
  });

  it("ignores a trailing semicolon, both ways", () => {
    expect(passes("clearTimeout(timer)", "clearTimeout(timer);")).toBe(true);
    expect(passes("let timer;", "let timer")).toBe(true);
  });

  it("treats single and double quotes the same", () => {
    expect(passes("if (typeof x === 'string') {", 'if (typeof x === "string") {')).toBe(true);
  });

  it("keeps the text inside strings exact", () => {
    expect(passes('log("search: ")', 'log("search:")')).toBe(false);
    expect(passes('log("Search:")', 'log("search:")')).toBe(false);
  });

  it("ignores spaces around operators and brackets", () => {
    expect(passes("for(let i=0;i<arr.length;i++){", "for (let i = 0; i < arr.length; i++) {")).toBe(true);
    expect(passes("return function(...args){", "return function (...args) {")).toBe(true);
    expect(passes("fn . apply ( this , args )", "fn.apply(this, args);")).toBe(true);
  });

  it("does not glue words together", () => {
    expect(passes("returnfunction (...args) {", "return function (...args) {")).toBe(false);
    expect(passes("lettimer;", "let timer;")).toBe(false);
  });

  it("keeps operators exact", () => {
    expect(passes("if (a == b) {", "if (a === b) {")).toBe(false);
    expect(passes("i--", "i++")).toBe(false);
    expect(passes("a - -b", "a--b")).toBe(false);
  });

  it("is case sensitive", () => {
    expect(passes("cleartimeout(timer);", "clearTimeout(timer);")).toBe(false);
  });

  it("accepts a block typed on one line or on several", () => {
    expect(passes("}; }", "  };\n}")).toBe(true);
    expect(passes("};\n}", "  };\n}")).toBe(true);
    expect(passes("}\n}", "  };\n}")).toBe(true);
    expect(passes("return cache.get(key) }", "      return cache.get(key);\n    }")).toBe(true);
  });

  it("keeps the semicolons of a for header", () => {
    expect(passes("for (let i = 0 i < n i++) {", "for (let i = 0; i < n; i++) {")).toBe(false);
  });

  it("treats (x) => and x => the same", () => {
    expect(passes("return new Promise(resolve => setTimeout(resolve, ms));", "return new Promise((resolve) => setTimeout(resolve, ms));")).toBe(true);
  });

  it("ignores comments", () => {
    expect(passes("let timer; // the timer id", "let timer;")).toBe(true);
  });

  it("gives the same normal form for equal lines", () => {
    expect(normalize("timer=setTimeout(()=>{")).toBe(normalize("timer = setTimeout(() => {"));
  });
});

describe("accept list", () => {
  it("accepts the reference and the listed variants", () => {
    const accept = ["const cache = {};"];
    expect(checkLine("const cache = new Map()", step("const cache = new Map();", accept))).toEqual({ ok: true, via: "expected" });
    expect(checkLine("const cache = {}", step("const cache = new Map();", accept))).toEqual({ ok: true, via: "accept" });
  });

  it("rejects what is in neither", () => {
    expect(passes("const cache = [];", "const cache = new Map();", ["const cache = {};"])).toBe(false);
  });
});

describe("empty input", () => {
  it("is not a miss", () => {
    expect(checkLine("   ", step("let timer;"))).toEqual({ ok: false, empty: true });
    expect(checkLine("// nothing yet", step("let timer;"))).toEqual({ ok: false, empty: true });
  });
});

describe("diff of the first wrong token", () => {
  it("points at the first different token", () => {
    const input = "clearTimeout(time);";
    const { diff } = diffOf(input, "clearTimeout(timer);");
    expect(diff.kind).toBe("wrong");
    expect(input.slice(diff.start, diff.end)).toBe("time");
    expect(diff.got).toBe("time");
    expect(diff.want).toBe("timer");
  });

  it("reports a line that stops early", () => {
    const input = "timer = setTimeout(";
    const { diff } = diffOf(input, "timer = setTimeout(() => {");
    expect(diff.kind).toBe("missing");
    expect(diff.start).toBe(input.length);
    expect(diff.want).toBe("(");
  });

  it("reports extra text after a complete line", () => {
    const input = "let timer = 0;";
    const { diff } = diffOf(input, "let timer;");
    expect(diff.kind).toBe("extra");
    // The optional semicolon is not part of the mistake.
    expect(diff.got).toBe("= 0");
  });

  it("compares with the closest variant", () => {
    const input = "fn.call(this, args);";
    const { diff } = diffOf(input, "fn.apply(this, args);", ["fn.call(this, ...args);"]);
    expect(diff.kind).toBe("wrong");
    expect(diff.got).toBe("args");
    expect(diff.want).toBe("...");
  });
});

describe("rename-only mismatch", () => {
  it("spots a different name for a new variable", () => {
    const { rename } = diffOf("const memo = new Map();", "const cache = new Map();");
    expect(rename).toEqual([{ want: "cache", got: "memo" }]);
  });

  it("spots different function and parameter names", () => {
    const { rename } = diffOf("function debounce(func, wait) {", "function debounce(fn, delay) {");
    expect(rename).toEqual([
      { want: "fn", got: "func" },
      { want: "delay", got: "wait" },
    ]);
  });

  it("follows a loop counter through the whole header", () => {
    const { rename } = diffOf("for (let k = 0; k < arr.length; k++) {", "for (let i = 0; i < arr.length; i++) {");
    expect(rename).toEqual([{ want: "i", got: "k" }]);
  });

  it("needs the new name to be used the same way everywhere", () => {
    const { rename } = diffOf("for (let k = 0; i < arr.length; k++) {", "for (let i = 0; i < arr.length; i++) {");
    expect(rename).toBeNull();
  });

  it("does not excuse a wrong name from an earlier step", () => {
    const { rename } = diffOf("clearTimeout(timerId);", "clearTimeout(timer);");
    expect(rename).toBeNull();
    const second = diffOf("const inner = flatten(array[i]);", "const inner = flatten(arr[i]);");
    expect(second.rename).toBeNull();
  });

  it("does not excuse any other difference", () => {
    const { rename } = diffOf("let memo = new Map();", "const cache = new Map();");
    expect(rename).toBeNull();
  });

  it("spots different parameter names in a class method, but not a different method name", () => {
    expect(diffOf("on(event, cb) {", "on(name, listener) {").rename).toEqual([
      { want: "name", got: "event" },
      { want: "listener", got: "cb" },
    ]);
    expect(diffOf("emit(event, ...rest) {", "emit(name, ...args) {").rename).toEqual([
      { want: "name", got: "event" },
      { want: "args", got: "rest" },
    ]);
    expect(diffOf("subscribe(name, listener) {", "on(name, listener) {").rename).toBeNull();
  });

  it("does not take a call for a method definition", () => {
    expect(diffOf("clearTimeout(timerId);", "clearTimeout(timer);").rename).toBeNull();
    expect(diffOf("timer = setTimeout(() => {", "timer = setTimeout(() => {x").rename).toBeNull();
  });

  it("handles rest and arrow parameters", () => {
    expect(diffOf("return function (...params) {", "return function (...args) {").rename).toEqual([{ want: "args", got: "params" }]);
    expect(diffOf(".then((val) => {", ".then((value) => {").rename).toEqual([{ want: "value", got: "val" }]);
  });
});