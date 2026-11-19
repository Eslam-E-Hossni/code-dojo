import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { groups } from "@/data/groups";
import { problems } from "@/data/problems";
import { shape } from "@/data/shape";
import { interviewTemplate } from "@/data/template";
import { configShape } from "@/data/problems/config-helpers";
import { TEST_KEEP } from "@/data/problems/testing-helpers";
import type {
  CodeProblem,
  ConfigProblem,
  OutputProblem,
  Problem,
  ReactProblem,
  StepProblem,
  TestingProblem,
} from "@/data/types";
import { checkLine, normalize } from "@/lib/check";
import { checkConfig, languageOfRule } from "@/lib/config";
import { buildPreviewFiles } from "@/lib/sandpack";
import { buildLocked, flattenSteps, solutionText, syntaxOf } from "@/lib/steps";

const BANNED = [".map(", ".filter(", ".reduce(", ".forEach(", ".sort(", ".flat("];

/** Runs the reference solution and returns the named functions. */
function load<T>(problem: Problem, names: string[]): T {
  if (problem.kind !== "code") throw new Error(problem.id + " is not a code problem");
  const body = solutionText(problem) + "\nreturn { " + names.join(", ") + " };";
  return new Function(body)() as T;
}

/** Syntax errors of a JSX file, as text. Empty when it parses. */
function jsxSyntaxErrors(code: string): string[] {
  const result = ts.transpileModule(code, {
    fileName: "App.jsx",
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.Preserve, allowJs: true, target: ts.ScriptTarget.ES2022 },
  });
  return (result.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

/** Rules for a problem that is written step by step. */
function stepRules(problem: StepProblem) {
  const steps = flattenSteps(problem);

  it("has steps with unique keys", () => {
    expect(steps.length).toBeGreaterThan(0);
    const keys = new Set(steps.map((s) => s.key));
    expect(keys.size).toBe(steps.length);
    for (const part of problem.parts) expect(part.title.trim().length, part.id).toBeGreaterThan(0);
  });

  it("names the function of every part", () => {
    const code = solutionText(problem);
    for (const part of problem.parts) {
      // A config file has no function: its parts are named after the file.
      if (problem.kind === "config") {
        expect(part.signature, part.id).toBe(problem.file);
        continue;
      }
      // "debounce(fn, delay)", "Array.prototype.myMap(callback)", "new TTLCache()", "Timer()"
      const name = part.signature.replace(/^new /, "").split("(")[0];
      expect(part.signature, part.id).toMatch(/^(new )?[A-Za-z_$][\w$.]*\(.*\)$/);
      expect(code.includes(name), part.id + ": " + name + " is not in the solution").toBe(true);
    }
  });

  it("has complete steps", () => {
    for (const step of steps) {
      const where = `${problem.id} ${step.key}`;
      expect(step.coach.trim().length, where).toBeGreaterThan(0);
      expect(step.hint1.trim().length, where).toBeGreaterThan(0);
      expect(step.explain.trim().length, where).toBeGreaterThan(0);
      expect(step.hint2, where).toContain("_");
      expect(step.hint2.split("\n").length, where).toBe(step.lines);
      // Odd backticks would break the inline code rendering.
      expect(step.coach.split("`").length % 2, where).toBe(1);
      expect(step.hint1.split("`").length % 2, where).toBe(1);
    }
  });

  it("starts by speaking to the learner", () => {
    expect(steps[0].coach).toContain("يا إسلام");
  });

  it("never gives the line away in the coach sentence", () => {
    for (const step of steps) {
      const coach = step.coach.split("`").join("");
      if (problem.kind === "config") {
        // A config line is compared as words, so the same goes for this rule.
        const words = step.expected.trim().split(/\s+/).join(" ");
        if (words.length < 12) continue;
        expect(coach.split(/\s+/).join(" ").includes(words), `${problem.id} ${step.key}`).toBe(false);
        continue;
      }
      const line = normalize(step.expected);
      if (line.length < 12) continue;
      expect(normalize(coach).includes(line), `${problem.id} ${step.key}`).toBe(false);
    }
  });

  it("accepts its own reference lines and variants", () => {
    for (const step of steps) {
      const where = `${problem.id} ${step.key}`;
      expect(checkLine(step.expected, step, syntaxOf(problem)), where).toEqual({ ok: true, via: "expected" });
      for (const variant of step.accept ?? []) {
        expect(checkLine(variant, step, syntaxOf(problem)), `${where}: ${variant}`).toEqual({ ok: true, via: "accept" });
      }
    }
  });

  it("keeps its indentation in steps of two spaces", () => {
    for (const line of solutionText(problem).split("\n")) {
      const indent = /^ */.exec(line)![0].length;
      expect(indent % 2, `${problem.id}: "${line}"`).toBe(0);
      expect(line.includes("\t"), `${problem.id}: tab in "${line}"`).toBe(false);
    }
  });
}

function codeRules(problem: CodeProblem) {
  it("has hidden tests for every part", () => {
    const partIds = new Set(problem.parts.map((part) => part.id));
    const names = new Set<string>();
    const tested = new Set<string>();
    expect(problem.tests.length).toBeGreaterThanOrEqual(5);
    for (const test of problem.tests) {
      expect(test.name.trim().length, problem.id).toBeGreaterThan(0);
      expect(test.code.trim().length, test.name).toBeGreaterThan(0);
      expect(test.code, test.name).toContain("expect(");
      expect(names.has(test.name), "duplicate test name: " + test.name).toBe(false);
      names.add(test.name);
      if (problem.parts.length > 1) {
        expect(test.part, test.name + " needs a part").toBeDefined();
      }
      if (test.part !== undefined) {
        expect(partIds.has(test.part), test.name + " has an unknown part").toBe(true);
        tested.add(test.part);
      }
    }
    if (problem.parts.length > 1) expect(tested.size).toBe(problem.parts.length);
    // The edge cases of the problem must show up in the test names.
    const edgeTests = problem.tests.filter((test) => test.name.includes("edge case"));
    expect(edgeTests.length, problem.id + " edge case tests").toBeGreaterThan(0);
  });

  it("uses plain loops only", () => {
    const code = solutionText(problem);
    for (const banned of BANNED) {
      expect(code.includes(banned), `${problem.id} uses ${banned}`).toBe(false);
    }
  });

  it("joins into code that parses", () => {
    expect(() => new Function(solutionText(problem))).not.toThrow();
  });
}

function reactRules(problem: ReactProblem) {
  it("has things to try in the preview", () => {
    expect(problem.checks.length).toBeGreaterThanOrEqual(4);
    expect(new Set(problem.checks).size).toBe(problem.checks.length);
    for (const check of problem.checks) expect(check.trim().length).toBeGreaterThan(0);
  });

  it("joins into files that parse and have a default export", () => {
    const files = buildPreviewFiles(problem, solutionText(problem));
    for (const name of ["/App.js", "/stage.js", "/index.js", "/mockApi.js"]) {
      expect(jsxSyntaxErrors(files[name].code), problem.id + " " + name).toEqual([]);
    }
    expect(files["/App.js"].code).toContain("export default function");
    expect(files["/stage.js"].code).toContain("export function Stage(");
  });

  it("has its steps written with the line() helper", () => {
    for (const step of flattenSteps(problem)) {
      expect(step.hint2, `${problem.id} ${step.key}`).toBe(shape(step.expected));
    }
  });
}

/** What the test must do on the correct and the buggy code is checked in testing-exercises.test.ts. */
function testRules(problem: TestingProblem) {
  it("joins into a test file that parses", () => {
    expect(jsxSyntaxErrors(solutionText(problem))).toEqual([]);
    for (const path of Object.keys(problem.subject)) {
      expect(jsxSyntaxErrors(problem.subject[path]), path).toEqual([]);
    }
    for (const version of problem.buggy) {
      for (const path of Object.keys(version.files)) {
        expect(jsxSyntaxErrors(version.files[path]), version.id + " " + path).toEqual([]);
      }
    }
  });

  it("has its steps written with the tline() helper", () => {
    for (const step of flattenSteps(problem)) {
      expect(step.hint2, `${problem.id} ${step.key}`).toBe(shape(step.expected, TEST_KEEP));
    }
  });

  it("writes test names and visible text in the coach sentence, so they can be typed", () => {
    // A test name is free text. The learner can only type it if the coach gives it.
    for (const step of flattenSteps(problem)) {
      const named = /^\s*(?:it|describe)\("([^"]+)"/.exec(step.expected.trim());
      if (named) expect(step.coach, `${problem.id} ${step.key}`).toContain(named[1]);
    }
  });
}

/** A config file: every line by the line check, and the whole file by its rules. */
function configRules(problem: ConfigProblem) {
  const steps = flattenSteps(problem);

  it("has its steps written with the helper of its language", () => {
    for (const step of steps) {
      expect(step.hint2, `${problem.id} ${step.key}`).toBe(configShape(step.expected, problem.language));
    }
  });

  it("uses rules of its own language, each one once", () => {
    expect(problem.rules.length).toBeGreaterThanOrEqual(6);
    expect(new Set(problem.rules).size).toBe(problem.rules.length);
    for (const id of problem.rules) expect(languageOfRule(id), id).toBe(problem.language);
  });

  it("passes every rule with its reference file", () => {
    const report = checkConfig(problem.rules, solutionText(problem));
    expect(report.diagnostics).toEqual([]);
    expect(report.rules.filter((rule) => rule.status !== "pass").map((rule) => rule.id + ": " + rule.detail)).toEqual([]);
    expect(report.ok).toBe(true);
    // Handed in as a finished file, where "not yet" counts as a problem too.
    expect(checkConfig(problem.rules, solutionText(problem), { strict: true }).ok).toBe(true);
  });

  it("never shows a rule as broken while the reference file is being written", () => {
    // In Learn the list is checked after every line. A rule may wait, and it
    // may turn green, but a correct line must never turn it red.
    let last = 0;
    for (let upTo = 0; upTo <= steps.length; upTo++) {
      const report = checkConfig(problem.rules, buildLocked(problem, steps, upTo).text);
      const where = `${problem.id} after ${upTo} steps`;
      expect(report.diagnostics, where).toEqual([]);
      expect(report.rules.filter((rule) => rule.status === "fail").map((rule) => rule.id), where).toEqual([]);
      last = report.passed;
    }
    expect(last).toBe(problem.rules.length);
  });

  it("starts with no rule green on an empty file", () => {
    const report = checkConfig(problem.rules, "");
    expect(report.passed).toBe(0);
    expect(report.rules.filter((rule) => rule.status === "fail")).toEqual([]);
  });

  if (problem.twin !== undefined) {
    it("has a twin in the other CI system that points back", () => {
      const twin = problems.find((other) => other.id === problem.twin);
      expect(twin, problem.twin).toBeDefined();
      if (!twin || twin.kind !== "config") throw new Error("the twin must be a config problem");
      expect(twin.twin).toBe(problem.id);
      expect(twin.group).not.toBe(problem.group);
      expect([problem.group, twin.group].sort()).toEqual(["ci-azure", "ci-github"]);
    });
  }

  if (problem.given !== undefined) {
    const given = problem.given;

    it("gives the reference file of its twin to read", () => {
      const twin = problems.find((other) => other.id === problem.twin);
      if (!twin || twin.kind !== "config") throw new Error("a translate exercise needs a twin");
      expect(given.file).toBe(twin.file);
      expect(given.code).toBe(solutionText(twin));
      // The file to read is a good file of its own system.
      expect(checkConfig(twin.rules, given.code, { strict: true }).ok).toBe(true);
    });
  }

  if (problem.starter !== undefined) {
    const starter = problem.starter;

    it("has a file to fix with exactly the problems the statement promises", () => {
      const promised = /has (\d+) problems/.exec(problem.statement);
      expect(promised, "the statement must say how many problems there are").not.toBeNull();
      const report = checkConfig(problem.rules, starter, { strict: true });
      expect(report.diagnostics).toEqual([]);
      const broken = report.rules.filter((rule) => rule.status !== "pass");
      expect(broken.length, broken.map((rule) => rule.id).join(", ")).toBe(Number(promised![1]));
      // Every broken rule says what is wrong.
      for (const rule of broken) expect((rule.detail ?? "").length, rule.id).toBeGreaterThan(0);
    });

    it("explains every problem of the file to fix in a step", () => {
      const explained = steps.filter((step) => /^Problem \d+:/.test(step.explain));
      const promised = Number(/has (\d+) problems/.exec(problem.statement)![1]);
      expect(explained.length).toBe(promised);
    });
  }
}

function outputRules(problem: OutputProblem) {
  it("has code and the lines it prints, each with a reason", () => {
    expect(problem.code.trim().length).toBeGreaterThan(0);
    expect(problem.output.length).toBeGreaterThanOrEqual(3);
    for (const line of problem.output) {
      expect(line.text.trim().length, problem.id).toBeGreaterThan(0);
      expect(line.why.trim().length, problem.id + ": " + line.text).toBeGreaterThan(0);
    }
  });

  it("does not show the answer in the code", () => {
    // A comment in the code would be the place where an answer leaks.
    expect(problem.code.includes("//"), problem.id).toBe(false);
    expect(problem.code.includes("/*"), problem.id).toBe(false);
    expect(() => new Function("return async function () {\n" + problem.code + "\n}")).not.toThrow();
  });
}

describe("data rules", () => {
  it("has unique problem ids and known groups", () => {
    const ids = new Set<string>();
    const groupIds = new Set(groups.map((g) => g.id));
    for (const problem of problems) {
      expect(ids.has(problem.id), problem.id).toBe(false);
      ids.add(problem.id);
      expect(groupIds.has(problem.group), problem.id).toBe(true);
    }
  });

  it("keeps every kind of problem in its own group", () => {
    for (const problem of problems) {
      expect(problem.kind === "output", problem.id).toBe(problem.group === "output");
      expect(problem.kind === "react", problem.id).toBe(problem.group === "react");
    }
  });

  it("lists the problems in the order of the groups", () => {
    const order = groups.map((g) => g.id);
    let last = 0;
    for (const problem of problems) {
      const at = order.indexOf(problem.group);
      expect(at, problem.id + " is listed before an earlier group").toBeGreaterThanOrEqual(last);
      last = at;
    }
  });

  it("has every problem of the plan", () => {
    const count = (kind: Problem["kind"]) => problems.filter((p) => p.kind === kind).length;
    expect(count("code")).toBe(38);
    expect(count("output")).toBe(5);
    expect(count("react")).toBe(9);
    expect(count("test")).toBe(10);
    expect(count("config")).toBe(19);
    const inGroup = (group: string) => problems.filter((p) => p.group === group).length;
    expect(inGroup("docker")).toBe(6);
    expect(inGroup("ci-github")).toBe(7);
    expect(inGroup("ci-azure")).toBe(6);
  });

  it("has seven template steps", () => {
    expect(interviewTemplate).toHaveLength(7);
  });

  for (const problem of problems) {
    describe(problem.id, () => {
      it("has complete content", () => {
        expect(problem.title.trim().length).toBeGreaterThan(0);
        expect(problem.statement.length).toBeGreaterThan(0);
        expect(problem.askFirst.length).toBeGreaterThan(0);
        expect(problem.edgeCases.length).toBeGreaterThan(0);
        expect(problem.complexity.length).toBeGreaterThan(0);
        expect(problem.idea.length).toBeGreaterThan(0);
        expect(problem.idea.split("`").length % 2, "backticks in idea").toBe(1);
        for (const followUp of problem.followUps) {
          expect(followUp.question.trim().length).toBeGreaterThan(0);
          expect(followUp.answer.trim().length, followUp.question).toBeGreaterThan(0);
        }
      });

      if (problem.kind === "output") {
        outputRules(problem);
      } else {
        stepRules(problem);
        if (problem.kind === "code") codeRules(problem);
        else if (problem.kind === "react") reactRules(problem);
        else if (problem.kind === "test") testRules(problem);
        else configRules(problem);
      }
    });
  }
});

describe("shape: the hint with blanks", () => {
  it("hides names and text, keeps structure words, numbers and punctuation", () => {
    expect(shape("  const [count, setCount] = useState(0);")).toBe("const [_____, ________] = ________(0);");
    expect(shape('      result.push("FizzBuzz");')).toBe('______.____("________");');
    expect(shape("    if (i % 15 === 0) {")).toBe("if (_ % 15 === 0) {");
    expect(shape('<p role="alert">Could not load users.</p>')).toBe('<_ ____="_____">_____ ___ ____ _____.</_>');
  });

  it("leaves out indentation, empty lines and comments", () => {
    expect(shape("\n  return result;\n}")).toBe("return ______;\n}");
    expect(shape("  const [step, setStep] = useState(0); // 1, -1, or 0")).toBe("const [____, _______] = ________(0);");
  });

  it("does not take a URL inside a string for a comment", () => {
    expect(shape('fetch("https://example.com/users", {')).toBe('_____("_________________________", {');
  });

  it("always leaves at least one blank", () => {
    expect(shape("}")).toBe("_");
    expect(shape("  });\n}")).toBe("_);\n_");
    expect(shape("  return (")).toBe("______ (");
    expect(shape("    }, 1000);")).toBe("_, 1000);");
  });
});

describe("reference solutions behave", () => {
  describe("debounce", () => {
    type Debounce = <A extends unknown[]>(fn: (...args: A) => void, delay: number) => (...args: A) => void;
    const problem = problems.find((p) => p.id === "debounce")!;

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("runs once, with the last arguments, after the calls stop", () => {
      const { debounce } = load<{ debounce: Debounce }>(problem, ["debounce"]);
      const calls: number[] = [];
      const d = debounce((x: number) => calls.push(x), 100);
      d(1);
      vi.advanceTimersByTime(50);
      d(2);
      vi.advanceTimersByTime(99);
      expect(calls).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(calls).toEqual([2]);
    });

    it("works when called once, and with delay 0", () => {
      const { debounce } = load<{ debounce: Debounce }>(problem, ["debounce"]);
      const calls: string[] = [];
      debounce((x: string) => calls.push(x), 300)("a");
      debounce((x: string) => calls.push(x), 0)("b");
      vi.advanceTimersByTime(0);
      expect(calls).toEqual(["b"]);
      vi.advanceTimersByTime(300);
      expect(calls).toEqual(["b", "a"]);
    });

    it("keeps this", () => {
      const { debounce } = load<{ debounce: Debounce }>(problem, ["debounce"]);
      const seen: unknown[] = [];
      const obj = {
        name: "dojo",
        hit: debounce(function (this: unknown) {
          seen.push(this);
        }, 10),
      };
      obj.hit();
      vi.advanceTimersByTime(10);
      expect(seen).toEqual([obj]);
    });
  });

  describe("flatten", () => {
    type Flatten = (arr: unknown[]) => unknown[];
    const problem = problems.find((p) => p.id === "flatten")!;
    const fns = load<{ flatten: Flatten; flattenIterative: Flatten }>(problem, ["flatten", "flattenIterative"]);

    for (const name of ["flatten", "flattenIterative"] as const) {
      it(`${name} handles nesting, empties and order`, () => {
        const fn = fns[name];
        expect(fn([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]);
        expect(fn([])).toEqual([]);
        expect(fn([1, [], 2])).toEqual([1, 2]);
        expect(fn([[["a"]], "b", [["c", ["d"]]]])).toEqual(["a", "b", "c", "d"]);
        expect(fn([7])).toEqual([7]);
      });

      it(`${name} returns a new array and leaves the input alone`, () => {
        const input = [1, [2, 3]];
        const output = fns[name](input);
        expect(output).not.toBe(input);
        expect(input).toEqual([1, [2, 3]]);
      });
    }

    it("flattenIterative survives very deep nesting", () => {
      let deep: unknown[] = [1];
      for (let i = 0; i < 50000; i++) deep = [deep];
      expect(fns.flattenIterative(deep)).toEqual([1]);
    });
  });

  describe("memoize", () => {
    type Memoize = <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A) => R;
    const problem = problems.find((p) => p.id === "memoize")!;
    const { memoize } = load<{ memoize: Memoize }>(problem, ["memoize"]);

    it("calls fn once per set of arguments", () => {
      let calls = 0;
      const add = memoize((a: number, b: number) => {
        calls++;
        return a + b;
      });
      expect(add(1, 2)).toBe(3);
      expect(add(1, 2)).toBe(3);
      expect(add(2, 1)).toBe(3);
      expect(calls).toBe(2);
    });

    it("caches falsy results too", () => {
      let calls = 0;
      const zero = memoize(() => {
        calls++;
        return 0;
      });
      zero();
      zero();
      expect(calls).toBe(1);
    });

    it("keeps this", () => {
      const obj = {
        factor: 3,
        times: memoize(function (this: { factor: number }, n: number) {
          return this.factor * n;
        }),
      };
      expect(obj.times(2)).toBe(6);
    });
  });
});
