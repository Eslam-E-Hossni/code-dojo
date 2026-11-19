# Code Dojo

A trainer for writing classic JavaScript interview problems from memory, one
line at a time. The UI is Egyptian Arabic (RTL); code and English stay LTR.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. `npm install` and `npm run dev` both copy the
Monaco editor and the Sandpack bundler from `node_modules` into `public/`, so
the app serves them itself and not from a CDN.

Other commands:

```bash
npm test        # checker, data rules, every reference solution, output questions,
                # React components, the review schedule, the service worker,
                # the test runner, every testing exercise on correct and buggy code,
                # and every reference Dockerfile and YAML file against its rules
npm run lint
npm run build   # also writes public/precache.json, the list of files for offline use
npm start       # serves the build: this is the version that works offline
```

## Where things are

| Path | What it holds |
| --- | --- |
| `data/types.ts` | The data model: the kinds of `Problem`, `Part`, `Step` |
| `data/shape.ts` | Makes the "shape with blanks" hint from a line of code |
| `data/problems/*.ts` | One file per problem |
| `data/problems/index.ts` | The list of problems, in study order |
| `data/template.ts` | The 7-step interview routine |
| `lib/check.ts` | The line checker (tokens, not raw strings) |
| `lib/learn.ts` | Attempt rules and points for Learn |
| `lib/practice.ts` | Points for Recall and Exam |
| `lib/store.ts` | Progress in `localStorage` (key `code-dojo:v1`) |
| `lib/review.ts` | The memory system: next review, mastery, streak, weak steps |
| `lib/drill.ts` | Picks the steps of the 5-minute drill |
| `lib/offline.ts`, `public/sw.js` | Offline: the service worker and what it has saved |
| `lib/testing/frame/` | The Jest-compatible test runner of the Testing track |
| `lib/testing/check.ts` | The key check: pass on the correct code, fail on every buggy version |
| `lib/testing/client.ts` | Runs a test file in a hidden, sandboxed iframe |
| `lib/config/` | The Docker and CI/CD tracks: a Dockerfile parser, `.dockerignore` matching, a YAML reader, and the rules |
| `lib/config/github.ts`, `azure.ts` | The rules of a GitHub Actions workflow and of an Azure Pipelines file |
| `data/pipelines.ts` | The side-by-side card: nine ideas in both CI systems |
| `data/docker.ts` | One line of help for every Dockerfile instruction, and the build time / run time note |
| `components/RulesView.tsx` | The checklist of rules that turns green |
| `lib/runner/` | Runs code in a Web Worker: fake timers, loop guard, `expect` |
| `lib/output.ts` | Compares a predicted output with the real one |
| `lib/sandpack.ts` | The files of the live React preview, with a mock API |
| `components/LearnMode.tsx` | Learn: one line at a time, with hints |
| `components/PracticeMode.tsx` | Recall and Exam: the whole solution, judged by tests |
| `components/OutputMode.tsx` | Output questions: predict, run, compare |
| `components/Home.tsx` | Home: due today, streak, points, every problem by mastery |
| `components/Drill.tsx` | The 5-minute drill |
| `components/ReactPreview.tsx` | The live preview of React problems (Sandpack) |
| `components/DojoEditor.tsx` | Monaco with locked finished lines (Learn) |

## The three modes

| Mode | URL | What you get |
| --- | --- | --- |
| Learn | `/problem/<id>` | Coach sentence, hints, line-by-line check |
| Recall | `/problem/<id>/recall` | Coach sentences only; you type everything, then Run |
| Exam | `/problem/<id>/exam` | Statement only, a timer, no hints |

Run (Ctrl/Cmd+Enter) executes the code in a worker. The Console tab shows
what your own code prints; the Tests tab shows pass or fail for each hidden
test. Timers are fake, so a 300 ms debounce is tested instantly.

## The memory system

Nothing extra is saved for it. The schedule is worked out from the finished
sessions, so progress from before it existed still counts.

- **Next review.** A ladder of three waits: 1 day, 3 days, 7 days. The score
  of a session says how far it may go: 85% or more up to 7 days, 60% or more
  up to 3 days, less goes back to 1 day. A problem climbs one step at a time
  and once per day, so a first session always comes back the next day.
- **Weak steps.** A step whose line had to be revealed is weak. While a
  problem has weak steps it comes back after 1 day. A weak step is cleared
  when it is typed right at the first try, in Learn or in the drill.
- **Mastery.** New: never finished. Strong: on the 7-day step with no weak
  steps. Learning: everything in between.
- **The review mode.** Home suggests Learn while lines are weak or the last
  score was low, then Recall, then Exam.
- **Streak.** Days in a row with a finished session or drill, in local time.
- **5-minute drill** (`/drill`). Three steps from three different problems:
  weak steps first, then steps that needed a hint, then any real line of a
  finished problem. The clock only reminds; it never stops the drill.

The numbers are at the top of `lib/review.ts` (`INTERVALS`, `STRONG_SCORE`,
`OK_SCORE`).

## Offline

`npm run build` then `npm start` gives the version that works with no
connection. On the first visit the service worker downloads every page, the
app's files and the editor (about 300 files), and the home page runs one
React preview out of sight so that the bundler and the React packages are
saved too. The last line of the home page says how far this is. After that
the app opens and runs code even when the server is not reachable.

In `npm run dev` the service worker leaves the app's own requests alone,
because the dev server is on this machine and its files keep changing. It
only saves the React packages that the preview downloads from a CDN, so the
preview also works without internet after its first run.

A new build gets a new cache. Old caches are removed when it takes over.

## The Testing track

Here the learner writes the test, not the code. The code under test is given
and read-only, in a tab next to the editor.

**The key check.** Every exercise has the correct code (`subject`) and
several buggy versions (`buggy`). An exercise is solved only when the test
passes on the correct code and fails on every buggy version. When a test
still passes on a buggy version, the app says which behaviour it forgot to
check, in Arabic and without code.

**The runner.** Sandpack's built-in test runner could not run these
exercises: it has no fake timers and no `jest.mock`, `userEvent.setup()`
breaks in it, and `jest.spyOn(global, "fetch")` does not reach the
component. So the app has its own small runner, made of Jest's own parts:

| Part | Package |
| --- | --- |
| `expect` and its messages | `expect` |
| `jest.fn`, `jest.spyOn` | `jest-mock` |
| fake timers | `@sinonjs/fake-timers` |
| render, screen, user-event, DOM matchers | Testing Library |
| `describe`, `it`, hooks | `lib/testing/frame/framework.ts` |
| imports and `jest.mock` | `lib/testing/frame/modules.ts` |

`scripts/build-test-frame.mjs` bundles it into `public/test-frame/frame.js`
(it runs before `dev` and `build`). For every run the app creates a hidden
iframe, sandboxed without `allow-same-origin`, so test code cannot reach the
app or its storage. Nothing comes from a CDN, so tests also run offline.

What is different from real Jest:

- Tests run on the real browser DOM, not on jsdom.
- `jest.mock` works for the files of the exercise, not for packages.
- No snapshots, and test files are JavaScript with JSX, not TypeScript.
- A test that forgets to mock `fetch` gets a clear error. It never reaches
  the network.

## The Docker track

Here the learner writes config files: a Dockerfile, a `.dockerignore`, a
`docker-compose.yml`. Nothing is built and nothing is run. A file is judged
in two ways:

1. **Line check** (Learn). The same checker as the other tracks, reading
   the line as words: spacing does not matter, `from` is `FROM`, and a step
   can list other correct lines in `accept` (`node:20-alpine`,
   `COPY package.json package-lock.json ./`). In YAML the indentation is
   part of the line.
2. **Rule check** (every mode). `lib/config` parses the whole file and
   checks the rules of the exercise. A rule answers `pass`, `fail`, or
   `todo` (its part is not written yet), and has a title and a reason in
   Arabic. The list is the "القواعد" tab.

| Mode | When the rules are checked |
| --- | --- |
| Learn | After every finished line. A correct line never turns a rule red (`npm test` checks this). |
| Recall | While typing, and on "راجع الملف". Broken lines are underlined in the editor. |
| Exam | Only on "راجع الملف". The list is hidden before the first hand-in, because it says what a good file needs. |

"Fix this Dockerfile" has a `starter`: the broken file. Recall and Exam open
it in the editor, and Learn shows it in a read-only tab while the learner
writes the fixed file. There a rule that is not met counts as broken, not
as "not yet" (`strict`).

A `.dockerignore` rule does not look for a line. It asks what the file does:
"is `node_modules/react/index.js` left out of the build context?". So any
pattern that does the job passes, and a pattern that removes `package.json`
fails.

Hovering an instruction in a Dockerfile shows what it does. `ARG`, `ENV` and
`NEXT_PUBLIC_` names also say whether the value exists at build time or at
run time. The same text is in the "الأوامر" tab, for a screen with no mouse.

What the parser does not know: heredocs (`RUN <<EOF`), parser directives,
and variables inside `FROM` are not expanded (`FROM node:${VERSION}` counts
as pinned).

## The CI/CD track

Two groups with the same pipelines, so they can be compared: GitHub Actions
(`.github/workflows/*.yml`) and Azure Pipelines (`azure-pipelines.yml`).
Every exercise points to its `twin` in the other system. After finishing
one, the two reference files can be put side by side.

| Exercise | GitHub Actions | Azure Pipelines |
| --- | --- | --- |
| Minimal CI | checkout, setup-node, `npm ci`, test | UseNode, `npm ci`, test |
| Full CI | lint, type check, test, build, `cache: npm` | the same, with `Cache@2` |
| Matrix | `matrix: node-version: [20, 22]` | a named entry per version |
| Docker image | login, build-push, tag from the commit | `Docker@2` with a service connection |
| Deploy | `needs`, `if` main, `environment`, artifact | stages, `dependsOn`, `condition`, a `deployment` job |
| Fix this workflow | a file with 6 problems | (the 6 problems are GitHub ones) |
| Translate | given the Azure file, write the workflow | given the workflow, write the Azure file |

It uses the machinery of the Docker track (`kind: "config"`, the line
check, the rule list), with these additions:

- **Syntax errors, inline.** The `yaml` library parses the file. A syntax
  or indentation error is underlined in the editor while typing, in Recall
  and in Exam, with a short Arabic explanation and the parser's own
  message. When the parser cannot tell which of two lines is wrong, both
  are given ("سطر 3–4"). One mistake is reported once, even when the
  parser complains about it three times.
- **Structure, not text.** The rules read the parsed file. A job may have
  any name, a list may be `[main]` or items under each other, and an Azure
  pipeline may be written as steps, as jobs, or as stages.
- **Wrong keys.** A key that the place does not know is reported with the
  key that was probably meant (`runs_on` gives `runs-on`). So is the
  classic indentation mistake that is still valid YAML: `node-version` at
  the level of `with`.
- **The line check** reads `[main]` and `[ main ]`, and `${{ secrets.X }}`
  and `${{secrets.X}}`, as the same line.
- **A file to read.** A translate exercise has `given`: the pipeline of the
  other system, in a read-only tab in every mode. The two translate
  exercises are each other's `given`, and `npm test` checks that.

The versions of the actions in the reference lines (`actions/checkout@v7`
and so on) were the newest ones when the track was written. A step accepts
the older majors that are still common, and the rules only ask that a
version is there.

What the rules do not know: reusable workflows and templates are not
followed, expressions are not evaluated (a condition is matched as text),
and the approval of an environment cannot be checked, because it is set in
the settings of the repository or project and not in the YAML.

## The kinds of problem

| Kind | Example | How it is judged |
| --- | --- | --- |
| `code` | debounce, two sum | Hidden tests in the worker |
| `output` | event loop order | You type the output, then the code runs and the lines are compared |
| `react` | Timer, useFetch | A live preview next to the editor, and a list of things to try in it |
| `test` | Counter.test.js | Your test must pass on the correct code and fail on every buggy version |
| `config` | Dockerfile, docker-compose.yml, a CI pipeline | Rules on the whole file. Nothing is run |

An output question has one screen, at `/problem/<id>`. A React problem has the
three modes. In Recall and Exam the preview runs your own code, and you tick
each point of the list when you have seen it work.

The preview fetches nothing from the network: `fetch` is answered by a small
mock (`/api/users`, `/api/empty`, `/api/broken`, `/api/search?q=`). The
bundler itself is served by this app. The first time a preview runs, it
downloads React from a package CDN, and the service worker saves it (see
Offline).

## Add a problem

1. Copy a file in `data/problems/` and fill in every field. The rules for
   writing steps and tests are in the comments of `data/types.ts`.
2. Add it to the list in `data/problems/index.ts`.
3. Run `npm test`. It checks that every step is complete, that the reference
   lines pass the checker, that the joined steps parse as code, that no
   banned array method is used, and that the reference solution passes every
   hidden test.

No component needs to change.

For an output question, set `kind: "output"` and give the `code` and the
`output` lines with a reason each. `npm test` runs the code and fails if it
does not print exactly those lines.

For a testing exercise, set `kind: "test"`. Give the `subject` files, the
`buggy` versions (use `swap()` from `data/problems/testing-helpers.ts`, so a
buggy version is a small change of the correct code), and write the steps of
the test with `tline()`. `npm test` runs the reference test on the correct
code and on every buggy version.

For a config file, set `kind: "config"`, with the `file` name, its `language`
and the ids of its `rules` (they live in `lib/config`). Write the steps with
`dline()`, `yline()` or `iline()` from `data/problems/config-helpers.ts`.
`npm test` checks that the reference file passes every rule, and that no
rule turns red at any step on the way. A new rule goes into the list of its
language in `lib/config`, with a test in `tests/config-rules.test.ts` or
`tests/pipeline-rules.test.ts`. For a pipeline, build the file from the
shared lines in `data/problems/ci-github-steps.ts` and `ci-azure-steps.ts`,
and set `twin` on both exercises of the pair.

For a React problem, set `kind: "react"`. Write the steps with `line()` from
`data/problems/react-helpers.ts`, and give `checks` (what to try in the
preview). Use `preview.tail` when the solution draws nothing by itself (a
hook), and `preview.stage` to pass props or to add controls around it. Add
its behaviour to `tests/react.test.ts`, where the reference solution is
mounted and clicked for real.

A hidden test is a string of JavaScript. It runs after the learner's code:

```js
const fn = spy();
const debounced = debounce(fn, 100);
debounced("a");
await clock.tick(100);
expect(fn.calls, "calls to fn").toEqual([["a"]]);
```

To prove that a test catches a mistake, add a wrong solution to
`tests/mutants.test.ts`.

## Self-check

`npm test` runs every reference solution in Node. The page `/self-check` runs
them, and the code of every output question, in the real Web Worker of the
browser you have open. That is the way to check a browser you have not used
before. It also runs every reference test of the Testing track in the real
test frame, and every reference config file through its rules. React
problems are not on that page: they run in the preview.
