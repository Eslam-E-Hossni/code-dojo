/**
 * The rules every code problem must pass, as functions that register
 * tests. data.test.ts and checker-reference.test.ts run them for every
 * problem in the app; one.test.ts runs them for single files, so a new
 * problem can be checked before it is added to the list.
 */
import { expect, it } from "vitest";
import type { CodeProblem } from "@/data/types";
import { findBanned } from "@/lib/checker/banned";
import { acceptSteps, checkFast, EMPTY_STATE, flattenSteps, solutionText, type CheckState } from "@/lib/checker/check";
import { parseWhole } from "@/lib/checker/parse";
import { judgeWhole, runnerFor, story, type } from "./helpers";

/** Sentences of a text. Code terms in backticks can hold dots, so they are taken out first. */
function sentences(text: string): string[] {
  const plain = text.replace(/`[^`]*`/g, "code");
  return plain.split(/(?<=[.?!])\s+/).filter((part) => part.trim() !== "");
}

/** Every text of a problem that the learner reads. */
function textsOf(problem: CodeProblem): string[] {
  const out = [problem.title, problem.statement, problem.complexity, ...problem.askFirst, ...problem.edgeCases];
  for (const item of problem.followUps) out.push(item.question, item.answer);
  for (const test of problem.tests) out.push(test.name);
  for (const part of problem.parts) {
    out.push(part.title);
    for (const step of part.steps) out.push(step.coach, step.hint1, step.explain);
  }
  return out;
}

/** The names a line of code uses, to see that a coach sentence talks about real ones. */
function wordsOf(code: string): Set<string> {
  return new Set(code.match(/[A-Za-z_$][\w$]*/g) ?? []);
}

/** The writing rules of the step data. */
export function dataRules(problem: CodeProblem): void {
  const steps = flattenSteps(problem);

  it("is complete: no placeholder text", () => {
    expect(problem.statement.trim()).not.toBe("");
    expect(problem.complexity.trim()).not.toBe("");
    expect(problem.askFirst.length).toBeGreaterThan(0);
    expect(problem.edgeCases.length).toBeGreaterThan(0);
    expect(problem.followUps.length).toBeGreaterThan(0);
    for (const item of problem.followUps) {
      expect(item.question.trim()).not.toBe("");
      expect(item.answer.trim()).not.toBe("");
    }
    expect(steps.length).toBeGreaterThan(0);
    for (const text of textsOf(problem)) {
      // Case matters here: "Todos" is the name of a component, "TODO" is a note that was left behind.
      expect(text).not.toMatch(/TODO|TBD|FIXME|[Ll]orem ipsum/);
    }
  });

  it("is in English only", () => {
    for (const text of textsOf(problem)) {
      expect(text, text).not.toMatch(/[؀-ۿ]/);
    }
  });

  it("says Islam once, in the first coach sentence, and then we", () => {
    for (const step of steps) {
      const count = step.coach.split("Islam").length - 1;
      expect(count, step.coach).toBe(step.index === 0 ? 1 : 0);
      // Hints and explanations never name the learner.
      expect(step.hint1 + step.explain).not.toContain("Islam");
    }
  });

  it("has a coach of one or two sentences that does not give the code", () => {
    for (const step of steps) {
      const count = sentences(step.coach).length;
      expect(count, step.coach).toBeGreaterThanOrEqual(1);
      expect(count, step.coach).toBeLessThanOrEqual(2);
      const code = step.expected.trim();
      // A short line like "}" can show up in any sentence. A real line must not.
      if (code.length > 8) {
        expect(step.coach.includes(code), step.coach).toBe(false);
        // Not in backticks either, piece by piece: no code term of the coach is a whole line.
        for (const term of step.coach.match(/`[^`]*`/g) ?? []) {
          for (const line of code.split("\n")) {
            if (line.trim().length > 8) expect(term.slice(1, -1).trim(), step.coach).not.toBe(line.trim().replace(/;$/, ""));
          }
        }
      }
    }
  });

  it("has an explain of one sentence that does not repeat the coach", () => {
    const known = wordsOf(solutionText(problem));
    for (const step of steps) {
      expect(sentences(step.explain), step.explain).toHaveLength(1);
      // A whole sentence, because it is also shown alone, right after its step.
      expect(step.explain, step.explain).toMatch(/\.$/);
      // It starts like a sentence: with a capital letter, or with a name from the code
      // ("debounce takes..."). "so I push it..." is the tail of another sentence.
      const first = (/^`?([A-Za-z_$][\w$]*)/.exec(step.explain) ?? ["", ""])[1];
      if (/^[a-z]/.test(first)) expect(known.has(first), "starts in the middle of a sentence: " + step.explain).toBe(true);
      expect(step.explain).not.toBe(step.coach);
      expect(step.coach.includes(step.explain), step.explain).toBe(false);
    }
  });

  it("is written in plain sentences: no exclamation marks, dashes or semicolons, and no long coach", () => {
    for (const step of steps) {
      for (const text of [step.coach, step.hint1, step.explain]) {
        // Code terms in backticks may hold any character. A hyphen inside a word is fine.
        const plain = text.replace(/`[^`]*`/g, "");
        expect(plain, text).not.toMatch(/[!;]|—|–| - /);
      }
      // Two SHORT sentences: the learner reads the coach before every line.
      expect(step.coach.length, step.coach).toBeLessThanOrEqual(240);
    }
  });

  it("has two hints per step, and hint 2 is the shape with blanks", () => {
    for (const step of steps) {
      expect(step.hint1.trim(), step.expected).not.toBe("");
      expect(step.hint1).not.toBe(step.coach);
      expect(step.hint2.trim(), step.expected).not.toBe("");
      // A line with names in it must hide them. A name of one letter is one blank: `_++`.
      const keywords =
        /\b(if|else|for|while|do|return|const|let|function|new|typeof|of|in|class|this|try|catch|throw|async|await|break|continue|switch|case|default|true|false|null|undefined)\b/g;
      if (/[A-Za-z]/.test(step.expected.replace(keywords, ""))) {
        expect(step.hint2, step.expected).toContain("_");
        expect(step.hint2).not.toBe(step.expected);
      }
      // The shape keeps the line count, so the learner sees how much to type.
      expect(step.hint2.split("\n").length, step.expected).toBe(step.expected.split("\n").length);
      // Hint 1 is a nudge, not the answer.
      const code = step.expected.trim();
      if (code.length > 12) expect(step.hint1.includes(code), step.hint1).toBe(false);
    }
  });

  it("names in backticks are names of the solution, so the app can swap in the learner's names", () => {
    const known = wordsOf(solutionText(problem));
    // Fine in backticks without being in this solution: keywords, values, and built-ins people name.
    const free = new Set(
      (
        "true false null undefined this new return function arguments NaN Infinity let const var for of in if else while do " +
        "break continue switch case default typeof instanceof class extends constructor static async await try catch finally " +
        "throw delete void yield get set Array Object Promise Map Set WeakMap JSON Math Number String Boolean Symbol Date Error " +
        "TypeError RangeError console length prototype"
      ).split(" "),
    );
    for (const step of steps) {
      for (const text of [step.coach, step.hint1]) {
        for (const term of text.match(/`[^`]*`/g) ?? []) {
          for (const word of wordsOf(term)) {
            // Anything else is a name the learner never sees in the code, for example
            // `callback` where the solution calls it `fn`.
            if (!known.has(word) && !free.has(word)) expect.soft(known.has(word), "`" + word + "` in: " + text).toBe(true);
          }
        }
      }
    }
  });

  it("has behaviour checks on the step that closes each function", () => {
    const ids = new Set(problem.tests.map((test) => test.id));
    expect(ids.size, "test ids are unique").toBe(problem.tests.length);
    for (const test of problem.tests) expect(test.id, test.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);

    for (const part of problem.parts) {
      const last = part.steps[part.steps.length - 1];
      expect(last.checks, part.id).toBeDefined();
      expect((last.checks ?? []).length, part.id).toBeGreaterThan(0);
      for (const id of last.checks ?? []) expect(ids.has(id), id).toBe(true);
    }
    for (const step of steps) {
      if (!step.lastOfPart) expect(step.checks, step.expected).toBeUndefined();
    }
  });

  it("gives every test to a part, when there are several parts", () => {
    const parts = new Set(problem.parts.map((part) => part.id));
    expect(parts.size, "part ids are unique").toBe(problem.parts.length);
    for (const test of problem.tests) {
      if (problem.parts.length > 1) expect(parts.has(test.part ?? ""), test.id).toBe(true);
      expect(test.name.trim(), test.id).not.toBe("");
    }
    // Every part is tested, and its closing step names the tests of that part.
    for (const part of problem.parts) {
      if (problem.parts.length === 1) break;
      const own = problem.tests.filter((test) => test.part === part.id).map((test) => test.id);
      expect(own.length, part.id).toBeGreaterThan(0);
      expect([...(part.steps[part.steps.length - 1].checks ?? [])].sort(), part.id).toEqual([...own].sort());
    }
  });

  it("has enough hidden tests, with edge cases among them", () => {
    expect(problem.tests.length).toBeGreaterThanOrEqual(4);
    expect(new Set(problem.tests.map((test) => test.name)).size, "test names are unique").toBe(problem.tests.length);
  });

  it("has a reference solution that parses and declares every API name", () => {
    const solution = solutionText(problem);
    const parsed = parseWhole(solution, problem.language);
    expect(parsed.ok).toBe(true);
    for (const name of problem.api) {
      expect(solution, name).toMatch(new RegExp("\\b(function\\*?|class|const|let)\\s+" + name.replace(/\$/g, "\\$") + "\\b"));
    }
    // 2 spaces per level, no tabs.
    for (const line of solution.split("\n")) {
      expect(line, line).not.toMatch(/\t/);
      expect((/^ */.exec(line) as RegExpExecArray)[0].length % 2, line).toBe(0);
    }
    // No step begins or ends with an empty line: the editor shows the learner's own lines.
    for (const step of steps) {
      expect(step.expected, step.expected).not.toMatch(/^\s*\n|\n\s*$/);
    }
  });

  it("has nothing in its reference that the checker would refuse", () => {
    const solution = solutionText(problem);
    const parsed = parseWhole(solution, problem.language);
    if (!parsed.ok) throw new Error("the reference does not parse");
    if (problem.react === undefined) {
      // Plain loops only: no map, filter, reduce, forEach, sort or flat.
      expect(problem.plainLoops).toBe(true);
      expect(findBanned(parsed.parsed.ast, { plainLoops: true, from: 0 })).toBeNull();
      return;
    }
    // A React problem may use map for a list. Its own rules: keys, cleanups, no state changed in place.
    expect(problem.plainLoops).toBe(false);
    expect(problem.language).toBe("jsx");
    expect(problem.react.risky.length).toBeGreaterThan(0);
    const all = ["list-key", "index-key", "effect-cleanup", "state-mutation"] as const;
    expect(findBanned(parsed.parsed.ast, { plainLoops: false, from: 0, risky: [...all] })).toBeNull();
  });

  it("says what must be on the page, when it is a React problem", () => {
    if (problem.react === undefined) return;
    expect(problem.react.screen.length).toBeGreaterThan(0);
    expect(problem.react.tryIt.length).toBeGreaterThan(0);
    for (const text of [...problem.react.screen, ...problem.react.tryIt]) {
      expect(text.trim()).not.toBe("");
      expect(text, text).not.toMatch(/[؀-ۿ]/);
    }
    // The preview mounts the default export of the file. A hook has none of
    // its own, so its demo component, in the tail, is the default export.
    const shown = solutionText(problem) + "\n" + (problem.react.preview.tail ?? "");
    expect(shown).toMatch(/\bexport\s+default\b/);
  });

  it("lists another way to write a step only when the checker needs to be told", () => {
    // The state after the first `count` reference steps.
    const stateAt = (count: number): CheckState => {
      let state = EMPTY_STATE;
      for (let i = 0; i < count; i++) {
        const verdict = checkFast(problem, state, steps[i].expected);
        if (verdict.kind !== "accept") throw new Error("reference step " + i + " is not accepted");
        state = acceptSteps(problem, state, steps[i].expected, verdict.steps, verdict.names, null);
      }
      return state;
    };
    for (const step of steps) {
      for (const other of step.accept ?? []) {
        expect(other.trim(), step.expected).not.toBe(step.expected.trim());
        // Same indentation as the reference line, so the learner's code stays tidy.
        expect((/^ */.exec(other) as RegExpExecArray)[0], other).toBe((/^ */.exec(step.expected) as RegExpExecArray)[0]);
        // It is accepted...
        const state = stateAt(step.index);
        expect(checkFast(problem, state, other).kind, other).toBe("accept");
        // ...and only because it is listed: the checker would not take it by itself.
        const bare: CodeProblem = {
          ...problem,
          parts: problem.parts.map((part) => ({ ...part, steps: part.steps.map((item) => ({ ...item, accept: undefined })) })),
        };
        expect(checkFast(bare, state, other).kind, "this alternative is not needed: " + other).not.toBe("accept");
      }
    }
  });
}

/** The reference solution against its tests and against the smart checker. */
export function referenceRules(problem: CodeProblem): void {
  it(`the reference passes its ${problem.tests.length} hidden tests`, async () => {
    const report = await runnerFor(problem)(solutionText(problem), problem.tests);
    expect(report.fatal).toBeNull();
    expect(report.failures).toEqual([]);
    expect(report.passed).toBe(problem.tests.length);
  });

  it("the reference, written whole as in Recall and Exam, is accepted", async () => {
    const verdict = await judgeWhole(problem, solutionText(problem));
    expect(verdict.banned).toBeNull();
    expect(verdict.accepted).toBe(true);
  });

  it(`${flattenSteps(problem).length} steps, typed one step at a time, are each accepted at the first attempt`, async () => {
    const steps = flattenSteps(problem);
    const session = await type(problem, steps.map((step) => step.expected));
    expect(story(session).filter((line) => !line.includes("accept x1 via match"))).toEqual([]);
    expect(session.finished).toBe(true);
    // No name was changed, so the name map sends every name to itself.
    for (const expected of Object.keys(session.state.names)) expect(session.state.names[expected]).toBe(expected);
  });

  it('typed one line at a time, a step of several lines is "right so far" until its last line', async () => {
    const lines: string[] = [];
    for (const step of flattenSteps(problem)) {
      for (const text of step.expected.split("\n")) lines.push(text);
    }
    const session = await type(problem, lines);
    expect(story(session).filter((line) => line.includes("REJECT"))).toEqual([]);
    expect(session.finished).toBe(true);
  });

  it("the whole solution of each part, pasted at once, is accepted and its tests pass", async () => {
    const pieces = problem.parts.map((part) => part.steps.map((step) => step.expected).join("\n"));
    const session = await type(problem, pieces);
    expect(story(session).filter((line) => line.includes("REJECT"))).toEqual([]);
    expect(session.finished).toBe(true);
    // A finished function is shown to work: its tests ran and passed.
    for (const entry of session.log) {
      if (entry.verdict.kind !== "accept") continue;
      expect(entry.verdict.tests?.failures).toEqual([]);
    }
  });

  it("each part alone fails the tests of the other parts, so no test is in the wrong part", async () => {
    if (problem.parts.length === 1) return;
    for (let p = 0; p < problem.parts.length; p++) {
      const part = problem.parts[p];
      const code = part.steps.map((step) => step.expected).join("\n");
      const own = problem.tests.filter((test) => test.part === part.id);
      const report = await runnerFor(problem)(code, own);
      // A part may build on an earlier part (a helper it calls). Then all parts up to it must be enough.
      if (report.passed !== own.length) {
        const upTo = problem.parts.slice(0, p + 1).map((item) => item.steps.map((step) => step.expected).join("\n")).join("\n\n");
        const again = await runnerFor(problem)(upTo, own);
        expect(again.failures, part.id).toEqual([]);
      }
    }
  });
}
