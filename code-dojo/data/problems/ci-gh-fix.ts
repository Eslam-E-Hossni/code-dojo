import type { ConfigProblem } from "../types";
import * as g from "./ci-github-steps";

/**
 * The workflow to fix. It is valid YAML, and it has 6 problems:
 * no checkout in build, node-version outside `with`, the tests before the
 * install, runs_on, no needs on deploy, and a token in plain text.
 */
const BROKEN = `name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v7
        with:
        node-version: 22
      - run: npm test
      - run: npm ci
      - run: npm run build
  deploy:
    runs_on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v7
      - run: ./scripts/deploy.sh
        env:
          DEPLOY_TOKEN: dp_live_8f3a91c2
`;

export const ciGhFix: ConfigProblem = {
  id: "ci-gh-fix",
  kind: "config",
  group: "ci-github",
  title: "Fix this workflow",
  difficulty: "medium",
  tag: "likely",
  statement:
    "This workflow has 6 problems. Find them and fix them until every rule passes. It should test and build on every push to main and on every pull request, and deploy from main after the build succeeds.",
  askFirst: [
    "Does every job get the code before it runs a command?",
    "Is every key spelled the way GitHub expects, and at the right level?",
    "What does the deploy job wait for, and where does its token come from?",
  ],
  edgeCases: [
    "A key at the wrong indentation is still valid YAML, so nothing complains until the job runs",
    "runs_on is not runs-on: GitHub rejects the workflow",
    "A token that was committed must be revoked, even after it is removed from the file",
  ],
  complexity: "Read a workflow job by job and ask: does it have the code, are the steps in order, what does it wait for, and where do its secrets come from?",
  idea: "أغلب مشاكل الـ workflow مش syntax: الملف YAML سليم، بس المعنى غلط. مفتاح في مستوى غلط، خطوة قبل أوانها، job مش مستنية اللي قبلها، أو سر مكتوب بإيدك. راجع كل job بنفس الأسئلة: الكود موجود؟ الترتيب صح؟ مستنية إيه؟ والأسرار جاية منين؟",
  file: ".github/workflows/ci.yml",
  language: "yaml",
  starter: BROKEN,
  rules: [
    "ci-valid-yaml",
    "gh-trigger",
    "gh-runs-on",
    "gh-checkout",
    "gh-node-version",
    "gh-npm-ci",
    "gh-order",
    "gh-deploy-gated",
    "gh-no-plain-secrets",
    "gh-stops-on-failure",
  ],
  parts: [
    {
      id: "main",
      title: "ci.yml",
      signature: ".github/workflows/ci.yml",
      steps: [
        ...g.header(
          "CI",
          "افتح تاب الملف البايظ يا إسلام. أول 5 سطور فيه سليمة، فاكتبهم زي ما هم. الأول: اسم الـ workflow، وهو `CI`.",
        ),
        g.jobs(),
        g.job("build"),
        g.runsOn(),
        g.steps(),
        {
          ...g.checkout(
            "المشكلة الأولى: الـ job دي بتشغّل أوامر من غير ما تنزّل الكود. الـ runner بيبدأ فاضي، فأول خطوة لازم تبقى `actions/checkout`، نسخة `v7`.",
          ),
          explain: "Problem 1: the build job had no checkout step, so there was no code on the runner.",
        },
        g.setupNode(),
        g.withInputs(),
        {
          ...g.nodeVersion(
            "المشكلة التانية في المسافات: في الملف البايظ السطر ده على نفس مستوى `with`، فبقى مفتاح في الخطوة مش إعداد للـ action. المسافات مكتوبة لك صح هنا: اكتب نسخة Node، وهي 22.",
          ),
          explain: "Problem 2: node-version had the indentation of with, so it was a key of the step and not an input of the action.",
        },
        {
          ...g.npmCi("المشكلة التالتة في الترتيب: الملف البايظ بيشغّل الـ tests قبل ما ينصّب حاجة. التنصيب ييجي الأول."),
          explain: "Problem 3: the tests ran before the install. Now npm ci comes first.",
        },
        g.test("وبعد التنصيب الـ tests."),
        g.build(),
        g.job("deploy", "الـ job التانية: `deploy`."),
        {
          ...g.gh(4, "needs: build", {
            coach:
              "المشكلة الرابعة: الـ deploy مش مستنية حاجة، فهتشتغل مع الـ build في نفس الوقت. خلّيها تستنى الـ job اللي اسمها `build`.",
            hint1: "المفتاح `needs`، وقيمته اسم الـ job اللي لازم تخلص الأول.",
            explain: "Problem 4: deploy had no needs, so it started at the same time as build.",
            accept: ["needs: [build]"],
          }),
        },
        {
          ...g.runsOn("المشكلة الخامسة في اسم المفتاح: الملف البايظ كاتبه بـ underscore. الاسم الصح بشرطة."),
          explain: "Problem 5: the key was runs_on. GitHub only knows runs-on.",
        },
        g.gh(4, "if: github.ref == 'refs/heads/main'", {
          coach:
            "السطر ده كان صح: الـ deploy على `main` بس. الشرط بيقارن `github.ref` بالاسم الكامل للـ branch بين علامات تنصيص مفردة.",
          hint1: "المفتاح `if`، وبعده `github.ref`، علامة `==`، و `refs/heads/main` بين `'` و `'`.",
          explain: "The condition was already right: deploy only from the main branch.",
          accept: ["if: github.ref_name == 'main'"],
        }),
        g.steps(),
        g.checkout("الـ job دي فيها checkout من الأول، فاكتبها زي ما هي."),
        g.gh(6, "- run: ./scripts/deploy.sh", {
          coach: "وخطوة النشر زي ما هي: شغّل الـ script اللي في `./scripts/deploy.sh`.",
          hint1: "شرطة، `run`، نقطتين، وبعدها مسار الـ script.",
          explain: "The deploy step itself was right.",
        }),
        g.gh(8, "env:", {
          coach: "ومتغيرات الخطوة تحت `env`.",
          hint1: "كلمة `env` وبعدها `:`. من غير شرطة.",
          explain: "env sets environment variables for this step.",
        }),
        g.gh(10, "DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}", {
          coach:
            "المشكلة السادسة والأخطر: الـ token مكتوب في الملف بقيمته. لازم ييجي من `secrets` بنفس الاسم، والـ token القديم يتلغي لأنه اتسرّب خلاص.",
          hint1: "اسم المتغير، نقطتين، وبعدها expression فيه `secrets` ونقطة واسم السر.",
          explain: "Problem 6: the token was written in the file. It now comes from the secrets store, and the old token must be revoked.",
        }),
      ],
    },
  ],
  followUps: [
    {
      question: "The file is valid YAML, but GitHub rejects the workflow. Why?",
      answer: "Valid YAML only means the syntax and the indentation can be read. GitHub then checks the keys against its own schema.",
      how: "A key like runs_on is good YAML, but it is not a key that GitHub knows.",
      example: "runs_on  ->  runs-on",
    },
    {
      question: "What happens when the deploy job has no needs?",
      answer: "It starts at the same time as the build job.",
      how: "Jobs are independent by default. The deploy could finish before the tests have even failed.",
      example: "deploy:  needs: build",
    },
    {
      question: "A token was committed in the workflow file and then removed. Is it safe now?",
      answer: "No. It is still in the git history, and maybe in forks and clones.",
      how: "The only fix is to revoke that token and create a new one. The new one is stored as a secret.",
      example: "DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}",
    },
  ],
};
