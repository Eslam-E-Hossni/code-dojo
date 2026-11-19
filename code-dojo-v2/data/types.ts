/**
 * Code Dojo data model.
 *
 * Everything the app shows about a problem lives in these types. To add a
 * problem: create a file in /data/problems, export a `Problem`, and add it
 * to the list in /data/problems/index.ts. No component needs to change.
 *
 * All text is plain English: short sentences and common words, because the
 * learner will say these sentences in an interview. Real terms stay
 * (closure, callback, accumulator, cleanup).
 */

export type Difficulty = "easy" | "medium" | "hard";

/** reported = asked in real interviews, likely = common at senior level. */
export type Tag = "reported" | "likely" | "polyfill";

export type GroupId = "most-repeated" | "polyfills" | "algorithms" | "output" | "react" | "event-emitter";

export interface Group {
  id: GroupId;
  title: string;
  /** One line under the title on the home page. */
  about: string;
}

/**
 * One line, or one small block, of the reference solution.
 *
 * Writing rules:
 * - `coach` says WHAT we need next and WHY, in one or two short sentences.
 *   It never gives the code. Say "Islam" once, in the first step of a
 *   problem; after that say "we".
 * - Put code terms in backticks: "Clear the old `timer` first." The app
 *   swaps a name in backticks for the name the learner chose.
 * - `expected` keeps its real indentation (2 spaces per level). Joining
 *   every `expected` with "\n" gives the full, runnable reference solution.
 * - `explain` says what the finished line does. It must not repeat `coach`.
 * - Plain loops only in algorithm and polyfill solutions: no map, filter,
 *   reduce, forEach, sort or flat.
 */
export interface Step {
  /** What we need next and why. Never the code. */
  coach: string;
  /** The reference code: one line, or a small block with "\n". */
  expected: string;
  /** A nudge about the idea: which tool or keyword. Shown after 1 miss. */
  hint1: string;
  /**
   * The shape of the line with blanks: `const ____ = new ____();`.
   * Shown after 2 misses. `shape(expected)` in data/shape.ts can make it.
   */
  hint2: string;
  /** One sentence about what the finished line does, to say out loud. */
  explain: string;
  /**
   * Behaviour tests for this step: the ids of hidden tests that must pass
   * once this step is written. Put them on the step that closes a unit (a
   * function, a component, the whole solution). When they pass, the unit
   * is accepted even if its lines differ from the reference.
   */
  checks?: string[];
  /**
   * A group id. Steps next to each other with the same id can be written
   * in any order (independent declarations, imports).
   */
  order?: string;
  /**
   * Other right ways to write this step that do not mean exactly the same
   * (`let timer = null;` for `let timer;`), so the checker cannot prove
   * them equal by itself. Most steps need none: a different style, other
   * names, a ternary or a for...of are accepted without being listed.
   */
  accept?: string[];
}

/**
 * A problem can have more than one solution or function (for example
 * flatten: recursive, then with a stack). Each one is a part, and each
 * part is a unit for the behaviour check.
 */
export interface Part {
  id: string;
  /** Shown as a heading and, with several parts, as a comment in the editor. */
  title: string;
  /** The function to write, as a call: "debounce(fn, delay)". */
  signature: string;
  steps: Step[];
}

/**
 * A hidden test. The learner sees its name and result, never its code.
 *
 * `code` is the body of an async function. It runs in the worker after the
 * learner's code, so their functions are in scope. It can use:
 *
 *   expect(value).toBe(x)        same value (like ===)
 *   expect(value).toEqual(x)     same content, compared deeply
 *   expect(() => f()).toThrow()  f throws; pass a class or text to be exact
 *   expect(value).not.toBe(x)    any of the above, reversed
 *   expect(value, "label")       the label is added to the failure message
 *   spy()                        a function that records .calls and .thisValues
 *   await clock.tick(ms)         moves fake time; timers never wait for real time
 */
export interface TestCase {
  /** Short and unique in the problem. Steps point to it in `checks`. */
  id: string;
  /** What it checks, in English. */
  name: string;
  /** The id of the part it tests. Leave out when the problem has one part. */
  part?: string;
  code: string;
}

export interface FollowUp {
  question: string;
  answer: string;
}

/** What every kind of problem has. */
interface ProblemBase {
  /** URL slug. Also the key for saved progress, so do not rename it. */
  id: string;
  group: GroupId;
  title: string;
  difficulty: Difficulty;
  tag: Tag;
  /** The task, as the interviewer would say it. */
  statement: string;
  /** Example calls with their results. */
  examples?: string[];
  /** Clarifying questions to ask before coding. */
  askFirst: string[];
  edgeCases: string[];
  /** Time and space. For an output question: the rule behind the answer. */
  complexity: string;
  followUps: FollowUp[];
}

/** The language of the editor and of the parser. */
export type CodeLanguage = "js" | "jsx" | "ts" | "tsx";

/**
 * A function or class to write. It has the three modes (Learn, Recall,
 * Exam) and is judged by the smart checker and by hidden tests.
 */
export interface CodeProblem extends ProblemBase {
  kind: "code";
  language: CodeLanguage;
  /**
   * The names the tests call. They are the required API, so the learner
   * must keep them. Every other name is the learner's choice.
   */
  api: string[];
  /** Plain loops only: array helpers like map and filter are refused. */
  plainLoops: boolean;
  parts: Part[];
  /**
   * Hidden tests. They must cover the edge cases above (empty input, one
   * item, duplicates, negatives, nested input, whatever applies).
   */
  tests: TestCase[];
  /**
   * A React problem. Its code is one file, /App.js, with JSX. It is shown
   * in a live preview, and its hidden tests are React Testing Library
   * tests that run in the app's test frame (see lib/testing).
   */
  react?: ReactSetup;
}

/**
 * The React mistakes the checker refuses with a reason, even when the
 * tests pass:
 *   list-key        an item of a list without a `key`
 *   index-key       the index as `key`, in a list that can lose items
 *   effect-cleanup  an effect that starts an interval, a timeout or a
 *                   listener and never stops it
 *   state-mutation  state or props changed in place
 */
export type RiskyRule = "list-key" | "index-key" | "effect-cleanup" | "state-mutation";

/**
 * What a React problem adds to a code problem.
 *
 * A hidden test of a React problem is the body of an async Jest test. It
 * can use, without importing them:
 *
 *   render, screen, fireEvent, act, waitFor, within, renderHook   (React Testing Library)
 *   userEvent                                                      (@testing-library/user-event)
 *   expect with the jest-dom matchers, and jest (jest.fn, jest.useFakeTimers, jest.spyOn)
 *   React
 *   every name in `api`: the learner's component or hook, as /App.js exports it
 *
 * fetch is blocked in a test: mock it with jest.spyOn(global, "fetch").
 */
export interface ReactSetup {
  /** The rules the checker applies to this problem. */
  risky: RiskyRule[];
  /** How the live preview shows the code. */
  preview: ReactPreview;
  /**
   * What must be on the page: the texts, labels and button names that the
   * hidden tests look for. Shown with the task, so a solution written in
   * another way can still pass.
   */
  screen: string[];
  /** What to try by hand in the preview. Shown next to it. */
  tryIt: string[];
  /** Code put in front of the hidden tests: helpers and mocks they share. */
  testSetup?: string;
  /**
   * For a "find the bugs" exercise: the component with the bugs in it.
   * Recall and Exam start from this code, and Learn shows it in a tab.
   */
  starter?: string;
}

/**
 * How a React problem is shown in the live preview (Sandpack).
 * The learner's code is the file /App.js.
 */
export interface ReactPreview {
  /**
   * Code added after the learner's code, in the same file. Use it when the
   * solution has nothing to render by itself, for example a hook: the tail
   * is then a small demo component with `export default`.
   */
  tail?: string;
  /**
   * Source of a module that exports `Stage({ Solution })`, where Solution
   * is the default export of /App.js. Use it to pass props or to add
   * controls around the component. Default: it renders <Solution />.
   */
  stage?: string;
  /** Show the console of the preview under it, for code whose result is a console.log. */
  console?: boolean;
}

/** One line that an output question prints, with the reason it comes at this place. */
export interface OutputLine {
  /** The text exactly as the console shows it. */
  text: string;
  /** Why this line, and why here. One or two short sentences to say out loud. */
  why: string;
}

/**
 * "What does this print?" The learner reads `code`, types the output they
 * expect, and only then runs the code to compare. There are no steps and
 * no modes: the code is given, and the answer is the output.
 *
 * `output` is what the code really prints, line by line. `npm test` runs
 * the code in the app's runner and fails if these lines are not exactly
 * its output. For these problems `complexity` holds the rule behind the
 * answer, because there is no algorithm to measure.
 */
export interface OutputProblem extends ProblemBase {
  kind: "output";
  code: string;
  output: OutputLine[];
}

export type Problem = CodeProblem | OutputProblem;

export interface TemplateStep {
  id: string;
  title: string;
  note: string;
  say: string;
}
