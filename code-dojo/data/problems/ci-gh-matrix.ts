import type { ConfigProblem } from "../types";
import * as g from "./ci-github-steps";

export const ciGhMatrix: ConfigProblem = {
  id: "ci-gh-matrix",
  kind: "config",
  group: "ci-github",
  title: "GitHub Actions: matrix (Node 20 and 22)",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write a CI workflow that runs the tests on Node 20 and on Node 22. Use a matrix, so the job is written once and runs once for each version.",
  askFirst: [
    "Which Node versions must the project support?",
    "If one version fails, should the other runs be cancelled or finish?",
    "Do the runs need different operating systems too?",
  ],
  edgeCases: [
    "node-version must read the matrix value. A fixed number would test one version twice",
    "By default one failing run cancels the others (fail-fast)",
    "Every extra list in the matrix multiplies the number of jobs",
  ],
  complexity: "A matrix runs one job once per value, in parallel. The steps read the value with ${{ matrix.name }}.",
  idea: "بدل ما تكرر الـ job مرة لكل نسخة Node، بتكتبها مرة واحدة وتدّيها list تحت `matrix`. GitHub بيشغّل نسخة من الـ job لكل قيمة، مع بعض، وكل نسخة بتقرا قيمتها بـ `${{ matrix.node-version }}`.",
  file: ".github/workflows/ci.yml",
  language: "yaml",
  twin: "ci-az-matrix",
  rules: [
    "ci-valid-yaml",
    "gh-known-keys",
    "gh-trigger",
    "gh-runs-on",
    "gh-matrix",
    "gh-checkout",
    "gh-node-version",
    "gh-cache",
    "gh-npm-ci",
    "gh-runs-tests",
    "gh-stops-on-failure",
  ],
  parts: [
    {
      id: "main",
      title: "ci.yml",
      signature: ".github/workflows/ci.yml",
      steps: [
        ...g.header("CI", "نبدأ يا إسلام بنفس البداية: اسم الـ workflow، وهو `CI`."),
        g.jobs(),
        g.job("test"),
        g.runsOn(),
        g.gh(4, "strategy:", {
          coach: "عايزين نفس الـ job تشتغل على أكتر من نسخة Node. ده بيتكتب تحت `strategy`، قبل الخطوات.",
          hint1: "كلمة `strategy` وبعدها `:`.",
          explain: "strategy controls how the job is repeated.",
        }),
        g.gh(6, "matrix:", {
          coach: "وجواها `matrix`: كل قيمة فيها بتعمل نسخة من الـ job.",
          hint1: "كلمة `matrix` وبعدها `:`.",
          explain: "A matrix runs the job once for each value, in parallel.",
        }),
        g.gh(8, "node-version: [20, 22]", {
          coach: "سمّي المتغير `node-version`، وادّيله النسختين 20 و 22 في list بين قوسين مربعين.",
          hint1: "اسم المتغير، نقطتين، وبعدها الرقمين بين `[` و `]` وبينهم فاصلة.",
          explain: "The job runs twice: once with Node 20 and once with Node 22.",
          accept: ['node-version: ["20", "22"]', "node-version: [20.x, 22.x]"],
        }),
        g.steps(),
        g.checkout(),
        g.setupNode(),
        g.withInputs(),
        g.gh(10, "node-version: ${{ matrix.node-version }}", {
          coach:
            "هنا الفرق: النسخة مش رقم ثابت. هي قيمة المتغير اللي في الـ matrix، وبتتكتب كـ expression بين `${{` و `}}`.",
          hint1: "المفتاح `node-version`، وقيمته جوه الـ expression: `matrix` ونقطة واسم المتغير اللي سمّيته فوق.",
          explain: "The expression reads the current value of the matrix, so each run installs its own Node version.",
        }),
        g.cacheNpm(),
        g.npmCi(),
        g.test("وشغّل الـ tests. الخطوة دي هتشتغل مرتين: مرة على كل نسخة."),
      ],
    },
  ],
  followUps: [
    {
      question: "What does a matrix do?",
      answer: "It runs the same job once for every value in the list, in parallel.",
      how: "Each run gets its own runner, and reads its value with ${{ matrix.<name> }}.",
      example: "node-version: [20, 22] gives two jobs: test (20) and test (22).",
    },
    {
      question: "One job of the matrix fails. What happens to the others?",
      answer: "By default GitHub cancels the jobs of the matrix that are still running.",
      how: "That is fail-fast, and it is on by default. With fail-fast: false every combination finishes, so I see all the failures.",
      example: "strategy:  fail-fast: false",
    },
    {
      question: "How do I add a second dimension, like the operating system?",
      answer: "I add another list to the matrix, and GitHub runs every combination.",
      how: "Two Node versions and two systems give four jobs. runs-on then reads the system from the matrix.",
      example: "os: [ubuntu-latest, windows-latest]   with   runs-on: ${{ matrix.os }}",
    },
  ],
};
