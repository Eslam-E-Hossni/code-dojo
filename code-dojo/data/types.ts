/**
 * Code Dojo data model.
 *
 * Everything the app shows about a problem lives in these types. To add a
 * problem: create a file in /data/problems, export a `Problem`, and add it to
 * the list in /data/problems/index.ts. No component needs to change.
 */

export type Difficulty = "easy" | "medium" | "hard";

/** reported = asked in real interviews, likely = common at senior level. */
export type Tag = "reported" | "likely" | "polyfill";

export type GroupId =
  | "most-repeated"
  | "polyfills"
  | "algorithms"
  | "output"
  | "react"
  | "event-emitter"
  | "testing"
  | "docker"
  | "ci-github"
  | "ci-azure";

/**
 * One line (or one small block) of the reference solution.
 *
 * Writing rules:
 * - `coach`, `hint1` are Egyptian Arabic. Wrap code terms in backticks so
 *   they render left-to-right: "استخدم `clearTimeout`".
 * - `coach` says WHAT we need and WHY. It never contains the line itself.
 * - `expected` keeps its real indentation (2 spaces per level). Joining every
 *   `expected` with "\n" must give the full, runnable reference solution.
 *   To keep an empty line above a step, start its `expected` with "\n".
 * - Plain loops only in algorithm and polyfill solutions: no map, filter,
 *   reduce, forEach, sort or flat.
 */
export interface Step {
  /** What we need now and why, spoken to the learner. */
  coach: string;
  /** The reference code. Usually one line; use "\n" for a small block. */
  expected: string;
  /**
   * Other valid ways to write this step. They earn the same points, but the
   * editor still locks the reference line so later steps stay consistent.
   */
  accept?: string[];
  /** A nudge about the idea: which tool or keyword. Shown after 1 miss. */
  hint1: string;
  /**
   * The shape of the line with blanks. Shown after 2 misses.
   * `shape(expected)` from data/shape.ts can make it from the line itself.
   */
  hint2: string;
  /** One simple English sentence to say out loud in the interview. */
  explain: string;
}

/**
 * A problem can have more than one solution or function (for example
 * flatten: recursive, then with a stack). Each one is a part.
 */
export interface Part {
  id: string;
  /** English. Shown as a heading and, with several parts, as a comment. */
  title: string;
  /**
   * The function to write, as a call: "debounce(fn, delay)". Recall and Exam
   * show it, because the hidden tests call the function by this name. For a
   * React component it is the component as a call: "Timer()".
   */
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
 *
 * setTimeout, setInterval, requestAnimationFrame and Date all follow the
 * fake clock, so tests of async code are fast and never flaky.
 */
export interface TestCase {
  /** What it checks, in English. */
  name: string;
  /** The id of the part it tests. Leave out when the problem has one part. */
  part?: string;
  code: string;
}

export interface FollowUp {
  question: string;
  /** The answer. In the What / How / Example shape this is the "What". */
  answer: string;
  /** How it works, in one or two short sentences. */
  how?: string;
  /** A small example: a line of code or a concrete case. */
  example?: string;
}

/** What every kind of problem has. */
interface ProblemBase {
  /** URL slug. Also the key for saved progress, so do not rename it. */
  id: string;
  group: GroupId;
  title: string;
  difficulty: Difficulty;
  tag: Tag;
  /** The task, in English, as the interviewer would say it. */
  statement: string;
  /** Example calls with their results. */
  examples?: string[];
  /** Clarifying questions to ask before coding. */
  askFirst: string[];
  edgeCases: string[];
  /** Time and space, or for an output question the rule behind it. */
  complexity: string;
  /** The key idea in one or two sentences, Egyptian Arabic. */
  idea: string;
  followUps: FollowUp[];
}

/**
 * A function or class to write. It has the three modes (Learn, Recall,
 * Exam) and is judged by hidden tests.
 */
export interface CodeProblem extends ProblemBase {
  kind: "code";
  parts: Part[];
  /**
   * Hidden tests. They must cover the edge cases above (empty input, one
   * item, duplicates, negatives, nested input, whatever applies).
   */
  tests: TestCase[];
}

/** One line the code prints, and the reason, in simple English. */
export interface OutputLine {
  text: string;
  why: string;
}

/**
 * "What does this print?" The learner reads `code`, types the output they
 * expect, then runs the code to compare.
 *
 * `output` is what the code really prints, line by line. `npm test` runs
 * the code and fails if these lines are not exactly its output.
 */
export interface OutputProblem extends ProblemBase {
  kind: "output";
  code: string;
  output: OutputLine[];
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
  /** Show the console under the preview, for code that logs. */
  console?: boolean;
}

/**
 * A React component or hook. It has the three modes too. Instead of hidden
 * tests there is a live preview, and `checks`: what to try in the preview
 * before calling it done.
 */
export interface ReactProblem extends ProblemBase {
  kind: "react";
  parts: Part[];
  preview: ReactPreview;
  checks: string[];
}

/**
 * A wrong version of the code under test. A test that really tests
 * something must fail on it.
 */
export interface BuggyVersion {
  id: string;
  /** What is broken, in simple English. Shown once the test catches it. */
  bug: string;
  /** The files this version replaces, by path. */
  files: Record<string, string>;
  /**
   * Shown when the learner's test still passes on this version: the
   * behaviour the test forgot to check. Egyptian Arabic, and never code.
   */
  missed: string;
}

/**
 * The learner writes the TEST. The code under test is given, read-only.
 *
 * The exercise is solved only when the test passes on `subject` (the
 * correct code) and fails on every version in `buggy`. `npm test` checks
 * that the reference test, the steps joined, does exactly that.
 */
export interface TestingProblem extends ProblemBase {
  kind: "test";
  /** The steps of the test file. */
  parts: Part[];
  /** The path of the file the learner writes: "/Counter.test.js". */
  testFile: string;
  /** The correct code under test, by path. The first file opens in the tab. */
  subject: Record<string, string>;
  buggy: BuggyVersion[];
  /** One sentence for an interview. About how the tool works, never about past work. */
  interview: string;
}

/** The language of a config file. It picks the editor colours and how lines are compared. */
export type ConfigLanguage = "dockerfile" | "dockerignore" | "yaml";

/**
 * A config file to write: a Dockerfile, a .dockerignore, a compose file,
 * a CI pipeline.
 * Nothing is built or run. The file is judged in two ways:
 * - Learn checks every line against the reference, like the other tracks.
 * - Every mode checks the whole file against `rules`. Each rule has a
 *   reason in Arabic. The rules live in lib/config, and `npm test` checks
 *   that the reference file passes all of them.
 */
export interface ConfigProblem extends ProblemBase {
  kind: "config";
  /** The name of the file the learner writes: "Dockerfile". */
  file: string;
  language: ConfigLanguage;
  parts: Part[];
  /** The ids of the rules the finished file must pass. */
  rules: string[];
  /**
   * For a "fix this file" exercise: the broken file. Recall and Exam start
   * from it, and Learn shows it in a read-only tab.
   */
  starter?: string;
  /**
   * A file to read next to the editor, in every mode. In a "translate"
   * exercise it is the pipeline of the other CI system.
   */
  given?: { file: string; code: string };
  /**
   * The id of the same exercise in the other CI system. After finishing,
   * the two reference files can be put side by side.
   */
  twin?: string;
}

export type Problem = CodeProblem | OutputProblem | ReactProblem | TestingProblem | ConfigProblem;

/** A problem that is written step by step. */
export type StepProblem = CodeProblem | ReactProblem | TestingProblem | ConfigProblem;

export interface Group {
  id: GroupId;
  title: string;
  titleAr: string;
}

export interface TemplateStep {
  id: string;
  title: string;
  note: string;
  say: string;
}
