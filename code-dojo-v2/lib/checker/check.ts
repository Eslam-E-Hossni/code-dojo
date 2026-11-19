/**
 * The smart checker of Learn mode.
 *
 * The learner does not have to type the reference character by character.
 * A line is accepted when it means the same thing. The layers, in order:
 *
 *   1. Normalize      whitespace, semicolons, quotes, comments (parse.ts)
 *   2. AST            compare meaning, not text (canon.ts, diff.ts)
 *   3. Name freedom   any variable names; only the API is fixed (resolve.ts)
 *   4. Behaviour      a finished function that passes its tests is accepted
 *   5. Banned         refused with a reason, even when tests pass (banned.ts)
 *   6. AI judge       optional, off by default (judge.ts)
 *
 * Layer 5 runs first, because a banned pattern is refused whatever else
 * is true. Layers 1 to 3 need no waiting. Layers 4 and 6 are slow, so
 * they are only asked when the fast layers cannot decide.
 */

import type { CodeProblem, Step, TestCase } from "@/data/types";
import { findBanned } from "./banned";
import { canonical, type CNode } from "./canon";
import { compare, definedIds, forOfStarts, reassignedIds, thisFunctionStarts, type DiffContext, type Difference } from "./diff";
import { explain } from "./messages";
import { renameCode } from "./names";
import { parseOpen, parseWhole, usesJsx, type Parsed } from "./parse";
import { resolve } from "./resolve";
import { sameDepth, scan } from "./scan";

/** A step with its place in the whole problem. */
export interface FlatStep extends Step {
  /** Position across all parts, from 0. */
  index: number;
  partIndex: number;
  partId: string;
  partTitle: string;
  /** Stable id for saved progress: "<part id>:<position in the part>". */
  key: string;
  firstOfPart: boolean;
  lastOfPart: boolean;
}

export function flattenSteps(problem: CodeProblem): FlatStep[] {
  const out: FlatStep[] = [];
  for (let p = 0; p < problem.parts.length; p++) {
    const part = problem.parts[p];
    for (let s = 0; s < part.steps.length; s++) {
      out.push({
        ...part.steps[s],
        index: out.length,
        partIndex: p,
        partId: part.id,
        partTitle: part.title,
        key: part.id + ":" + s,
        firstOfPart: s === 0,
        lastOfPart: s === part.steps.length - 1,
      });
    }
  }
  return out;
}

/** The reference code of one part. */
export function partSolution(problem: CodeProblem, partIndex: number): string {
  const lines: string[] = [];
  for (const step of problem.parts[partIndex].steps) lines.push(step.expected);
  return lines.join("\n");
}

/** The full reference solution: every part, with a comment line above each when there are several. */
export function solutionText(problem: CodeProblem): string {
  const blocks: string[] = [];
  for (let p = 0; p < problem.parts.length; p++) {
    const heading = problem.parts.length > 1 ? "// " + problem.parts[p].title + "\n" : "";
    blocks.push(heading + partSolution(problem, p));
  }
  return blocks.join("\n\n");
}

/** What the checker remembers between lines. */
export interface CheckState {
  /** Steps that are done, in the order they were written. */
  done: number[];
  /** The learner's own accepted code, by part id. This is what the editor shows. */
  code: Record<string, string>;
  /**
   * What later lines are compared against, by part id. It is the same as
   * `code`, except for a line that the AI judge accepted: that line is
   * kept as the reference line, so the lines after it can still be read.
   */
  shadow: Record<string, string>;
  /** Reference name -> the learner's name. */
  names: Record<string, string>;
}

export const EMPTY_STATE: CheckState = { done: [], code: {}, shadow: {}, names: {} };

export interface TestReport {
  passed: number;
  total: number;
  failures: { name: string; message: string }[];
  /** The code could not run at all. */
  fatal: string | null;
}

export type Verdict =
  /** Nothing was typed, or the problem is already finished. */
  | { kind: "empty" }
  /** Right so far, but the step is not finished. Not a wrong attempt. */
  | { kind: "partial"; message: string }
  | {
      kind: "reject";
      reason: "banned" | "syntax" | "different" | "tests";
      message: string;
      /** The wrong part, as offsets in the text that was typed. */
      range: { start: number; end: number } | null;
      tests: TestReport | null;
      /** What the AI judge said, when it was asked and said no. */
      judge: string | null;
    }
  | {
      kind: "accept";
      /** The steps this text covers, in order. More than one when several steps were written at once. */
      steps: number[];
      via: "match" | "tests" | "judge";
      state: CheckState;
      /** The result of the hidden tests, when this text finished a function. */
      tests: TestReport | null;
      /** Why it was accepted, when that is worth saying. */
      note: string | null;
    };

export interface JudgeQuestion {
  line: string;
  expected: string;
  codeSoFar: string;
}

export interface JudgeAnswer {
  equivalent: boolean;
  reason: string;
}

export interface Deps {
  /** Runs code with hidden tests, in the worker. */
  runTests(code: string, tests: TestCase[]): Promise<TestReport>;
  /** The optional AI judge. Null answer = it could not be asked. */
  judge?: (question: JudgeQuestion) => Promise<JudgeAnswer | null>;
}

interface Prepared {
  parsed: Parsed;
  tree: CNode;
}

function prepare(text: string, problem: CodeProblem, whole: boolean): Prepared | null {
  const result = whole ? parseWhole(text, problem.language) : parseOpen(text, problem.language);
  if (!result.ok) return null;
  return { parsed: result.parsed, tree: resolve(canonical(result.parsed.ast, result.parsed.length), problem.api) };
}

/** The reference code of some steps. `swap` puts another right way to write one step in its place. */
function textOf(steps: FlatStep[], order: number[], swap?: { index: number; text: string }): string {
  const lines: string[] = [];
  for (const index of order) lines.push(swap !== undefined && swap.index === index ? swap.text : steps[index].expected);
  return lines.join("\n");
}

/** The steps that may come first now: the current one, or any of its `order` group that is still open. */
function firstChoices(steps: FlatStep[], pending: number[]): number[] {
  const current = steps[pending[0]];
  if (current.order === undefined) return [current.index];
  const out: number[] = [];
  for (const index of pending) {
    // The group is the run of steps right after the current one that share its id.
    if (steps[index].order !== current.order) break;
    out.push(index);
  }
  return out;
}

/** The tests of one part. A problem with one part gives all of them. */
export function testsOfPart(problem: CodeProblem, partId: string): TestCase[] {
  if (problem.parts.length === 1) return problem.tests;
  return problem.tests.filter((test) => test.part === partId);
}

/** All the learner's code so far, with `current` in place of the part being written. */
function wholeCode(problem: CodeProblem, state: CheckState, partId: string, current: string): string {
  const blocks: string[] = [];
  for (const part of problem.parts) {
    const code = part.id === partId ? current : state.code[part.id];
    if (code !== undefined && code.trim() !== "") blocks.push(code);
  }
  return blocks.join("\n\n");
}

/** Everything the learner has written so far, as one runnable text. */
export function learnerCode(problem: CodeProblem, state: CheckState): string {
  return wholeCode(problem, state, "", "");
}

type Decision =
  | { kind: "empty" }
  | { kind: "partial"; message: string }
  | {
      kind: "accept";
      steps: number[];
      names: Record<string, string>;
      /** True when the text matched one of the step's `accept` lines and not the reference line itself. */
      alternative: boolean;
    }
  | {
      kind: "reject";
      reason: "banned" | "syntax" | "different";
      message: string;
      range: { start: number; end: number } | null;
      /** The text is a finished unit, so its tests can decide. */
      finished: boolean;
    };

interface Situation {
  steps: FlatStep[];
  current: FlatStep;
  /** The steps of this part that are done, in the order they were written. */
  doneInPart: number[];
  /** The steps of this part that are still open, in reference order. */
  pending: number[];
  /** The learner's code of this part with the new text added. */
  userText: string;
  /** Where the new text starts in `userText`. */
  inputStart: number;
}

function situationOf(problem: CodeProblem, state: CheckState, input: string): Situation | null {
  const steps = flattenSteps(problem);
  const done = new Set(state.done);
  let current: FlatStep | null = null;
  for (const step of steps) {
    if (!done.has(step.index)) {
      current = step;
      break;
    }
  }
  if (current === null) return null;

  const doneInPart: number[] = [];
  for (const index of state.done) {
    if (steps[index].partIndex === current.partIndex) doneInPart.push(index);
  }
  const pending: number[] = [];
  for (const step of steps) {
    if (step.partIndex === current.partIndex && !done.has(step.index)) pending.push(step.index);
  }
  const base = state.shadow[current.partId] ?? "";
  const userText = base === "" ? input : base + "\n" + input;
  return { steps, current, doneInPart, pending, userText, inputStart: userText.length - input.length };
}

/** Layers 1, 2, 3 and 5: everything that can be decided at once. */
function decide(problem: CodeProblem, state: CheckState, input: string): Decision {
  if (input.trim() === "") return { kind: "empty" };
  const here = situationOf(problem, state, input);
  if (here === null) return { kind: "empty" };
  const { steps, doneInPart, pending, userText, inputStart } = here;

  const inInput = (range: { start: number; end: number } | null) => {
    if (range === null) return null;
    const start = Math.max(0, range.start - inputStart);
    const end = Math.min(input.length, range.end - inputStart);
    return end > start ? { start, end } : null;
  };

  const parsed = parseOpen(userText, problem.language);
  if (!parsed.ok) {
    const at = parsed.problem.offset;
    return {
      kind: "reject",
      reason: "syntax",
      message: "This does not parse yet. " + parsed.problem.message,
      range: at === null ? null : inInput({ start: at, end: at + 1 }),
      finished: false,
    };
  }
  const mine = parsed.parsed;

  // Layer 5 first: a banned pattern is refused whatever else is true.
  const banned = findBanned(mine.ast, {
    plainLoops: problem.plainLoops,
    from: inputStart,
    risky: problem.react?.risky,
    typedEnd: mine.length,
  });
  if (banned !== null) {
    return { kind: "reject", reason: "banned", message: banned.message, range: inInput(banned), finished: false };
  }

  const userTree = resolve(canonical(mine.ast, mine.length), problem.api);

  const contextFor = (order: number[], swap?: { index: number; text: string }): DiffContext => {
    // What the full reference does later decides let or const, != null, arrow
    // or function, and for...of: a line is judged by the whole solution.
    const full = prepare(textOf(steps, order, swap), problem, true);
    return {
      length: mine.length,
      names: state.names,
      reassigned: full === null ? new Set() : reassignedIds(full.tree),
      defined: full === null ? new Set() : definedIds(full.tree),
      thisFunctions: full === null ? new Set() : thisFunctionStarts(full.tree),
      ofLoops: full === null ? new Set() : forOfStarts(full.tree),
      pairs: new Map(),
      pieceEnds: new Map(),
    };
  };

  // Does the text end exactly where some step ends? Try the longest reach first,
  // so several steps written at once are all taken.
  {
    for (const first of firstChoices(steps, pending)) {
      const chain = [first, ...pending.filter((index) => index !== first)];
      // The reference line first, then the other right ways to write this step.
      const ways: (string | null)[] = [null, ...(steps[first].accept ?? [])];
      for (const way of ways) {
        const swap = way === null ? undefined : { index: first, text: way };
        // Positions in the full reference must be the positions in its prefix, so it gets the same swap.
        const context = contextFor([...doneInPart, ...chain], swap);
        for (let reach = chain.length; reach >= 1; reach--) {
          const order = [...doneInPart, ...chain.slice(0, reach)];
          const refText = textOf(steps, order, swap);
          if (!sameDepth(scan(refText, usesJsx(problem.language)).open, mine.open)) continue;
          const ref = prepare(refText, problem, false);
          if (ref === null) continue;
          // A text that needed a hole to parse ("return (" with nothing in it yet) can only
          // be a whole step when the reference stops at the same place and needs the same hole.
          if (ref.parsed.repaired !== mine.repaired) continue;
          context.pairs = new Map();
          context.pieceEnds = new Map();
          if (compare(userTree, ref.tree, null, "", context) === null) {
            const names = namesOnly(state.names);
            for (const [expected, chosen] of context.pairs) {
              // `arr[i]` stands for the learner's loop variable only while that loop is open.
              const until = context.pieceEnds.get(expected);
              if (until !== undefined && until <= ref.parsed.length) continue;
              names[expected] = chosen;
            }
            return { kind: "accept", steps: chain.slice(0, reach), names, alternative: way !== null };
          }
        }
      }
    }
  }

  // Not at the end of a step. Is it right so far, or already wrong?
  const chain = pending;
  const context = contextFor([...doneInPart, ...chain]);
  let worst: Difference | null = null;
  let worstAt = -1;
  const lookAhead = Math.min(chain.length, 4);
  for (let reach = 1; reach <= lookAhead; reach++) {
    const ref = prepare(textOf(steps, [...doneInPart, ...chain.slice(0, reach)]), problem, false);
    if (ref === null) continue;
    const found = compare(userTree, ref.tree, null, "", context);
    if (found === null || found.unfinished) {
      return { kind: "partial", message: "Right so far. This step is not finished yet: keep typing." };
    }
    // Keep the difference that comes latest in the text: it had the longest match before it.
    const at = (found.user ?? found.owner)?.start ?? 0;
    if (at > worstAt) {
      worst = found;
      worstAt = at;
    }
  }

  const finished = mine.open.length === 0 && !mine.repaired;
  if (worst === null) {
    return { kind: "reject", reason: "different", message: "This is different from what the step needs.", range: null, finished };
  }
  const told = explain(worst, mine.code, mine.length);
  return { kind: "reject", reason: "different", message: told.message, range: inInput(told.range), finished };
}

function accepted(
  problem: CodeProblem,
  state: CheckState,
  input: string,
  covered: number[],
  names: Record<string, string>,
  shadowText: string | null,
): CheckState {
  const steps = flattenSteps(problem);
  const partId = steps[covered[0]].partId;
  const typed = input.replace(/\s+$/, "");
  const before = state.code[partId] ?? "";
  const shadowBefore = state.shadow[partId] ?? "";
  const shadowLine = shadowText ?? typed;
  return {
    done: [...state.done, ...covered],
    code: { ...state.code, [partId]: before === "" ? typed : before + "\n" + typed },
    shadow: { ...state.shadow, [partId]: shadowBefore === "" ? shadowLine : shadowBefore + "\n" + shadowLine },
    names,
  };
}

/**
 * The names without the entries that are a piece of code (`arr[i]` for the
 * variable of a for...of). Those are true only inside one open loop, so
 * they are found again at every check, and never carried over.
 */
function namesOnly(names: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(names)) {
    if (!key.includes("[")) out[key] = names[key];
  }
  return out;
}

/** The name a line declares, when the line is one declaration: `const x = ...`, `let x`, `function x(`. */
function declaredName(line: string): string | null {
  const match = /^\s*(?:(?:const|let|var)\s+([A-Za-z_$][\w$]*)|(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*))/.exec(line);
  if (match === null) return null;
  return match[1] ?? match[2] ?? null;
}

/** True when every step of the part is done in this state. */
function partIsDone(problem: CodeProblem, state: CheckState, partId: string): boolean {
  const done = new Set(state.done);
  for (const step of flattenSteps(problem)) {
    if (step.partId === partId && !done.has(step.index)) return false;
  }
  return true;
}

/**
 * Checks what the learner typed for the current step.
 * `deps` gives the slow layers: the hidden tests, and the optional AI judge.
 */
export async function check(problem: CodeProblem, state: CheckState, input: string, deps: Deps): Promise<Verdict> {
  const decision = decide(problem, state, input);
  if (decision.kind === "empty" || decision.kind === "partial") return decision;

  const here = situationOf(problem, state, input) as Situation;
  const partId = here.current.partId;
  const tests = testsOfPart(problem, partId);
  const code = wholeCode(problem, state, partId, (state.code[partId] ? state.code[partId] + "\n" : "") + input);

  if (decision.kind === "accept") {
    // After another right way, later lines are still compared with the reference line.
    const shadow = decision.alternative ? renameCode(textOf(here.steps, decision.steps), decision.names) : null;
    const next = accepted(problem, state, input, decision.steps, decision.names, shadow);
    // The function is finished: show that it really works.
    const report = partIsDone(problem, next, partId) && tests.length > 0 ? await deps.runTests(code, tests) : null;
    return { kind: "accept", steps: decision.steps, via: "match", state: next, tests: report, note: null };
  }

  if (decision.reason !== "different") {
    return { kind: "reject", reason: decision.reason, message: decision.message, range: decision.range, tests: null, judge: null };
  }

  // Layer 4: a finished function that passes its tests is right, however it is written.
  let report: TestReport | null = null;
  if (decision.finished && tests.length > 0) {
    report = await deps.runTests(code, tests);
    if (report.fatal === null && report.passed === report.total) {
      // The function is finished, so no loop of it is open any more.
      const next = accepted(problem, state, input, here.pending, namesOnly(state.names), null);
      return {
        kind: "accept",
        steps: here.pending,
        via: "tests",
        state: next,
        tests: report,
        note: "Your code is written in another way, and it passes every hidden test. That counts.",
      };
    }
  }

  // Layer 6: the optional AI judge, for one line that the other layers could not place.
  let judgeSaid: string | null = null;
  if (deps.judge !== undefined && report === null) {
    const expected = renameCode(here.current.expected, state.names);
    const answer = await deps.judge({ line: input, expected, codeSoFar: state.code[partId] ?? "" });
    if (answer !== null && answer.equivalent) {
      // The learner's line may declare its variable under another name. The lines
      // after it use that name, so it is learned here, as the fast layers do.
      const names = { ...state.names };
      const theirs = declaredName(here.current.expected);
      const mine = declaredName(input);
      if (theirs !== null && mine !== null && !problem.api.includes(theirs)) names[theirs] = mine;
      const shadow = renameCode(here.current.expected, names);
      const next = accepted(problem, state, input, [here.current.index], names, shadow);
      return { kind: "accept", steps: [here.current.index], via: "judge", state: next, tests: null, note: answer.reason };
    }
    if (answer !== null) judgeSaid = answer.reason;
  }

  return {
    kind: "reject",
    reason: report === null ? "different" : "tests",
    // A finished function is judged by its tests first. The difference from the reference is the lead to follow.
    message:
      report === null
        ? decision.message
        : "This function does not pass its hidden tests yet. Compared with the reference: " + decision.message,
    range: decision.range,
    tests: report,
    judge: judgeSaid,
  };
}

/** The fast layers alone, for tests and for places that cannot wait. */
export function checkFast(problem: CodeProblem, state: CheckState, input: string): Decision {
  return decide(problem, state, input);
}

/** The state after a revealed line was typed: the step is done, with the learner's own text. */
export { accepted as acceptSteps };
