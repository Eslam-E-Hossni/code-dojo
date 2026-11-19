# Code Dojo (v2)

A web app to practise WRITING classic front-end interview solutions from memory, one line at a time: an English coach, a smart answer checker, and a real code editor.

No backend. Progress is saved in `localStorage`. The UI is English, left to right.

This folder is the new English version. The earlier Arabic app is next to it, in `../code-dojo`, and is not changed by anything here.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3010 (the old app uses port 3000, so the two can run together).

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs every reference solution against its hidden tests, every reference line through the smart checker, the 10 alternative solutions (line by line, and whole as in Recall and Exam), the runner, and the data checks |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run build` then `npm start` | Production build, served on port 3010 |

## What is built so far (phases 1 to 3)

- The data model (`data/types.ts`) and 44 problems in five groups:
  - Most repeated (9): debounce, throttle, sleep, mySetTimeout, flatten, deepClone, currying, memoize, a cache with TTL.
  - Polyfills (12): map, filter, reduce, forEach, bind, call, apply, Promise.all, allSettled, race, any, JSON.stringify.
  - Algorithms (16): two sum, largest, second largest, reverse string, palindrome, anagram, move zeroes, valid parentheses, decode string, Kadane, binary search, remove duplicates, count characters, FizzBuzz, fibonacci, next bigger number.
  - Output questions (6): event loop order, var in a loop, lost `this`, hoisting and the TDZ, async/await order, value vs reference.
  - EventEmitter (1).
- The smart checker (`lib/checker`).
- The three modes: Learn, Recall and Exam.
- The runner, with the Console and Tests tabs.
- The Solution panel: the reference in a read-only editor with Copy, a Walkthrough, a Compare view, and the complexity with the follow-up questions.
- Settings: the optional AI judge, a self-check page, and erasing saved progress.

Still to come, in this order: React problems with Sandpack (phase 4), the Testing track (5), the Dockerfile and CI/CD tracks (6), the memory system, the full home page and offline use (7).

## Output questions

An output question shows code that you only read. You type what it prints, one line of output per line, and only then run it. The code runs in the same Web Worker, and its lines are compared with yours: a line you forgot costs one line, not every line after it. Each printed line then shows the reason it comes at that place, to say out loud. Only the first check gives points (5 per right line), because after it the answer is on the screen. An output question has one screen: there is no Learn, Recall or Exam for it, and no Solution panel.

## Self-check

`/self-check` (also linked from Settings) runs, in the browser you have open, every reference solution against its hidden tests, every reference line through the smart checker, and every output question against its stored lines. `npm test` does the same in Node.

## The three modes

The mode switch is at the top of a problem page. Learn is at `/problem/<id>`, the others at `/problem/<id>/recall` and `/problem/<id>/exam`.

| Mode | What you get | How it ends |
| --- | --- | --- |
| Learn | The coach, two hints, the smart checker, line by line | When the last step is accepted |
| Recall | The coach sentences only. You write the whole solution in a free editor | When every hidden test passes |
| Exam | The task, a blank editor and a timer. No hints, no coach sentences | When every hidden test passes. The time is saved |

Keys: Enter at the end of a line checks it (Learn). Shift+Enter adds a line without checking (Learn). Ctrl+Enter or Cmd+Enter is Run, in every mode.

### Run, Console and Tests

Run sends your code to a Web Worker. The Tests tab shows pass or fail for every hidden test, with what was expected and what came back. The Console tab shows what your code printed with `console.log`, `console.warn` and `console.error`, and any error that was not caught, with its line.

In Learn half a function cannot run, so Run works on the functions that are finished, and the tests of a function start by themselves when its last line is accepted. In Recall and Exam Run takes the whole editor.

### Points in Recall and Exam

Running the tests is free, but the points drop with every run, because in an interview there is no test button.

| | First run | Second run | Later |
| --- | --- | --- | --- |
| Recall | 30 | 20 | 10 |
| Exam | 50 | 35 | 20 |

A banned pattern is refused in these modes too: with `map`, `filter`, `reduce`, `forEach`, `sort` or `flat` in a plain-loops problem, the solution is not accepted even when every test passes, and the place is marked in the editor.

### Assisted attempts

The Solution button works in every mode. In Recall and Exam, opening it marks the attempt as assisted: a small badge shows it, the score is saved on that attempt only and is not added to the total, and the problem does not count as passed by it. In Learn, and after an attempt is finished, opening it changes nothing.

## How a line is checked

You do not have to type the reference character by character. A line passes when it is correct. The layers, in `lib/checker`:

1. **Normalize** (`parse.ts`, `scan.ts`): spaces, semicolons, quotes, trailing commas and comments do not matter. An unfinished block is closed for parsing, so half a function can be read.
2. **Same meaning** (`canon.ts`, `diff.ts`): the code is parsed with Babel and compared as a tree. `let` or `const` when the variable never changes, the three ways to write a small arrow, a function expression or an arrow when there is no `this`, `a + 1` or `1 + a`, `i++` or `i += 1`, a template string or a concatenation, `if/else` or a ternary, a counting loop or `for...of`, destructuring or property access. `==` is never `===`.
3. **Name freedom** (`resolve.ts`, `names.ts`): every name is yours, except the names the tests call. The coach, the hints and a shown line then use your names.
4. **Behaviour**: when your text closes a function, it is run against the hidden tests of that function. If they pass, the function is accepted even when its lines differ from the reference, and its remaining steps are marked done.
5. **Banned patterns** (`banned.ts`): `map`, `filter`, `reduce`, `forEach`, `sort`, `flat` are refused with a reason in problems that ask for plain loops, even when the tests would pass.
6. **AI judge** (`judge.ts`): optional and off by default. See below.

A wrong line gets a message about its first wrong part (`messages.ts`), and that part is underlined in the editor.

Several steps can be written at once (Shift+Enter adds a line without checking). A step that is right so far but not finished is not a miss: the coach says "keep typing".

When a finished function fails its hidden tests, the coach says so, and the Tests tab opens with the result of each test.

### Points

Each step: 10 points at the first try, 5 after one miss, 2 after two. After three misses the line is shown, the step gives 0 points and is marked weak, and you still type it yourself to go on. Asking for a hint counts as a miss.

## The AI judge

In Settings you can paste your own Anthropic API key and turn the judge on. When layers 1 to 4 cannot decide about a line, the app sends exactly three things to the Anthropic API, straight from your browser:

- the line you wrote,
- the expected line,
- the code you wrote so far for that function.

Nothing else is sent. The answer is `{ equivalent, reason }`, and the reason is shown to you. The key is stored only in this browser's `localStorage`. With no key, or when the call fails for any reason, the line is simply not accepted and you get the usual hints.

The call uses the official `@anthropic-ai/sdk`, the model `claude-opus-5-5` with low effort and a structured JSON answer, and it lets the API fall back to its default model if the first one declines the request. Settings has a "Test the judge" button that sends one fixed sample question, to see that the key works.

## Where code runs

Your code never runs on the main thread, and `eval` is never used there. It runs in a Web Worker (`lib/runner`) with a 2-second limit per test, a guard against endless loops, and fake timers, so a test of debounce does not wait for real time. A worker that still hangs is killed from the page.

## A note on pages in the background

Next (with `cacheComponents`) keeps a page you just left in the document, hidden, and brings it back as it was on Back or Forward. A Monaco editor does not live through that: its cleanup throws it away. So every editor gets a key from `lib/useAwayCount.ts` and is built again for the page that comes back, with the text that was typed. Keep this in mind when adding an editor, and use selectors that look at visible elements only when testing in a browser.

## Adding a problem

1. Create a file in `data/problems`. Use `debounce.ts` as the model: the steps with `line(expected, { coach, hint1, explain })`, then the hidden tests. For an output question use `event-loop-order.ts`.
2. Check the file alone, before it is in the list (Git Bash): `DOJO_FILES=my-file npx vitest run tests/one.test.ts`. It checks the writing rules, runs the reference against its tests, and sends every reference line through the checker.
3. Add it to the list in `data/problems/index.ts`, at its place in the study order.
4. Run `npm test`.

Writing rules, also checked by the tests:

- `coach`: one or two short sentences that say WHAT we need next and WHY, never the code. Simple English. "Islam" once, in the first step, then "we".
- `explain`: one whole sentence about what the finished line does. It must not repeat the coach.
- Code terms go in backticks, so the app can swap in the learner's names.
- Plain loops only in the solutions: no `map`, `filter`, `reduce`, `forEach`, `sort` or `flat`.
- The last step of every function has `checks`: the ids of the hidden tests of that function.
- `accept` lists other right ways to write one step that are not exactly the same (`let timer = null;` for `let timer;`). Most steps need none, and the tests refuse one that the checker would accept by itself.
- A name in backticks in a coach sentence or a hint must be a name of the solution (or a keyword or a built-in), because the app swaps it for the learner's own name.
- `order` gives the same group id to neighbouring steps that can be written in any order.

## Folders

```
app/                 pages: home, /problem/[id], /problem/[id]/[mode], /settings
components/          the screens and panels
data/                types, the problems, the interview template
lib/checker/         the smart checker
lib/runner/          the Web Worker that runs code and tests
lib/practice.ts      the rules of Recall and Exam
lib/store.ts         progress, drafts and settings in localStorage
tests/               vitest
public/monaco/       the editor's files, copied from node_modules by scripts/copy-assets.mjs
```
