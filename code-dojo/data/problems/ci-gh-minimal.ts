import type { ConfigProblem } from "../types";
import * as g from "./ci-github-steps";

export const ciGhMinimal: ConfigProblem = {
  id: "ci-gh-minimal",
  kind: "config",
  group: "ci-github",
  title: "GitHub Actions: minimal CI",
  difficulty: "easy",
  tag: "likely",
  statement:
    "Write the smallest useful CI workflow. On every push to main and on every pull request: check out the code, set up Node 22, install with npm ci, and run the tests.",
  askFirst: [
    "Which events should start the workflow: pushes, pull requests, or both?",
    "Which Node version does the project use?",
    "Which command runs the tests?",
  ],
  edgeCases: [
    "The runner starts empty: without a checkout step there is no code on it",
    "A push to any branch other than main should not start the workflow",
    "A failing test must fail the job and mark the pull request red",
  ],
  complexity: "A workflow has jobs, and a job has steps. Every job starts on a fresh runner: check out, set up, install, then run.",
  idea: "الـ workflow ملف YAML واحد بيجاوب على سؤالين: إمتى يشتغل (`on`)، وهيعمل إيه (`jobs`). كل job بتبدأ على جهاز فاضي، فلازم الأول تنزّل الكود وتنصّب Node والـ packages، وبعدها تشغّل اللي عايزه.",
  file: ".github/workflows/ci.yml",
  language: "yaml",
  twin: "ci-az-minimal",
  rules: [
    "ci-valid-yaml",
    "gh-known-keys",
    "gh-trigger",
    "gh-runs-on",
    "gh-checkout",
    "gh-node-version",
    "gh-npm-ci",
    "gh-order",
    "gh-runs-tests",
    "gh-stops-on-failure",
  ],
  parts: [
    {
      id: "main",
      title: "ci.yml",
      signature: ".github/workflows/ci.yml",
      steps: [
        ...g.header("CI", "نبدأ يا إسلام: ادّي الـ workflow اسم يظهر في صفحة Actions. الاسم `CI`."),
        g.jobs(),
        g.job("test", "عندنا job واحدة بتشغّل الـ tests. سمّيها `test`."),
        g.runsOn(),
        g.steps(),
        g.checkout(),
        g.setupNode(),
        g.withInputs(),
        g.nodeVersion(),
        g.npmCi(),
        g.test("وآخر خطوة: شغّل الـ tests. لو test واحد وقع، الـ job كلها بتفشل والـ PR بيتعلّم أحمر."),
      ],
    },
  ],
  followUps: [
    {
      question: "What is the difference between a workflow, a job and a step?",
      answer: "A workflow is one YAML file. It has jobs, and every job has steps.",
      how: "Each job runs on its own fresh runner. The steps of a job run one after another on that same machine.",
      example: "ci.yml -> job test -> steps: checkout, setup-node, npm ci, npm test",
    },
    {
      question: "Why is actions/checkout the first step?",
      answer: "The runner starts as an empty machine. The repository is not on it.",
      how: "checkout clones the commit that started the workflow, so the next steps find package.json and the code.",
      example: "Without it npm ci fails: there is no package.json on the runner.",
    },
    {
      question: "What is the difference between uses and run?",
      answer: "uses runs a ready-made action. run runs a shell command.",
      how: "An action is code from another repository, pinned with @version. A run step is a line of shell on the runner.",
      example: "uses: actions/setup-node@v7   /   run: npm test",
    },
  ],
};
