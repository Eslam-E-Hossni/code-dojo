import type { ConfigProblem } from "../types";
import * as g from "./ci-github-steps";

export const ciGhDeploy: ConfigProblem = {
  id: "ci-gh-deploy",
  kind: "config",
  group: "ci-github",
  title: "GitHub Actions: deploy with an environment",
  difficulty: "hard",
  tag: "likely",
  statement:
    "Write a workflow with two jobs. build installs, builds and saves the dist folder as an artifact. deploy runs only on main and only after build succeeds: it targets the production environment, which asks for an approval, downloads the artifact and runs ./scripts/deploy.sh with a token from the secrets.",
  askFirst: [
    "Who approves a deployment, and where is that rule set?",
    "Should a pull request build without deploying?",
    "Does the deploy job build again, or does it use the files the build job made?",
  ],
  edgeCases: [
    "Without needs the deploy job starts at the same time as the build job",
    "Each job runs on a fresh runner: the dist folder must travel as an artifact",
    "On a pull request github.ref is not refs/heads/main, so the deploy job is skipped",
  ],
  complexity: "needs orders the jobs, if keeps the deploy to main, environment adds the approval, and an artifact carries the build to the deploy job.",
  idea: "الـ deploy job عليها تلات أقفال: `needs` بيخلّيها تستنى الـ build، و `if` بيقصرها على `main`، و `environment` بيوقّفها لحد ما حد يوافق. والموافقة نفسها بتتظبط من إعدادات الـ repo، مش من الملف. وبما إن كل job على جهاز جديد، ناتج الـ build بيتنقل كـ artifact.",
  file: ".github/workflows/deploy.yml",
  language: "yaml",
  twin: "ci-az-deploy",
  rules: [
    "ci-valid-yaml",
    "gh-known-keys",
    "gh-trigger",
    "gh-runs-on",
    "gh-checkout",
    "gh-node-version",
    "gh-npm-ci",
    "gh-order",
    "gh-upload-artifact",
    "gh-deploy-gated",
    "gh-environment",
    "gh-download-artifact",
    "gh-uses-secrets",
    "gh-no-plain-secrets",
    "gh-stops-on-failure",
  ],
  parts: [
    {
      id: "build",
      title: "build job",
      signature: ".github/workflows/deploy.yml",
      steps: [
        ...g.header("Deploy", "نبدأ يا إسلام: اسم الـ workflow، وهو `Deploy`."),
        g.jobs(),
        g.job("build", "أول job بتبني التطبيق. سمّيها `build`."),
        g.runsOn(),
        g.steps(),
        g.checkout(),
        g.setupNode(),
        g.withInputs(),
        g.nodeVersion(),
        g.cacheNpm(),
        g.npmCi(),
        g.build("ابني التطبيق. الناتج هيطلع في فولدر `dist`."),
        g.gh(6, "- uses: actions/upload-artifact@v7", {
          coach:
            "الـ job دي هتخلص والـ runner هيتمسح، فاحفظ ناتج الـ build كـ artifact. الـ action اسمها `actions/upload-artifact`، نسخة `v7`.",
          hint1: "شرطة، `uses`، نقطتين، وبعدها اسم الـ action و `@v7`.",
          explain: "upload-artifact saves files from this job, so another job can take them.",
          accept: [
            "- uses: actions/upload-artifact@v6",
            "- uses: actions/upload-artifact@v5",
            "- uses: actions/upload-artifact@v4",
          ],
        }),
        g.withInputs(),
        g.gh(10, "name: dist", {
          coach: "ادّي الـ artifact اسم، علشان الـ job التانية تطلبه بيه: `dist`.",
          hint1: "المفتاح `name`، وقيمته اسم الـ artifact.",
          explain: "The artifact gets a name, and the deploy job asks for it by that name.",
        }),
        g.gh(10, "path: dist", {
          coach: "والفولدر اللي يتحفظ: فولدر ناتج الـ build.",
          hint1: "المفتاح `path`، وقيمته اسم الفولدر.",
          explain: "path is the folder to save: the build output.",
          accept: ["path: dist/", "path: ./dist"],
        }),
      ],
    },
    {
      id: "deploy",
      title: "deploy job",
      signature: ".github/workflows/deploy.yml",
      steps: [
        g.job("deploy", "الـ job التانية: النشر. سمّيها `deploy`، على نفس مستوى `build`."),
        g.gh(4, "needs: build", {
          coach: "أول قفل: الـ job دي تستنى الـ build، ولو الـ build فشل متشتغلش. المفتاح `needs`.",
          hint1: "المفتاح `needs`، وقيمته اسم الـ job اللي لازم تخلص الأول.",
          explain: "needs makes this job wait for build, and skips it when build fails.",
          accept: ["needs: [build]"],
        }),
        g.gh(4, "if: github.ref == 'refs/heads/main'", {
          coach:
            "تاني قفل: تشتغل على `main` بس. الشرط بيقارن `github.ref` بالاسم الكامل للـ branch: `refs/heads/main`، بين علامات تنصيص مفردة.",
          hint1: "المفتاح `if`، وبعده `github.ref`، علامة `==`، والاسم الكامل للـ branch بين `'` و `'`.",
          explain: "On a pull request github.ref is not refs/heads/main, so the deploy job is skipped.",
          accept: ["if: github.ref_name == 'main'"],
        }),
        g.runsOn("والـ job دي كمان محتاجة runner بتاعها."),
        g.gh(4, "environment: production", {
          coach:
            "تالت قفل: اربط الـ job بالـ environment اللي اسمه `production`. الموافقة متظبطة عليه في إعدادات الـ repo، والـ job هتقف مستنياها.",
          hint1: "المفتاح `environment`، وقيمته اسم الـ environment.",
          explain: "The job targets the production environment. Its protection rules, like required reviewers, apply before the job starts.",
        }),
        g.steps("وخطوات النشر تحت `steps`."),
        g.checkout("الـ runner ده جديد وفاضي، فنزّل الكود تاني: الـ script بتاع النشر جوه الـ repo. نفس الـ action: `actions/checkout`، نسخة `v7`."),
        g.gh(6, "- uses: actions/download-artifact@v8", {
          coach: "هات الـ artifact اللي الـ build حفظه. الـ action اسمها `actions/download-artifact`، ونسختها `v8`.",
          hint1: "شرطة، `uses`، نقطتين، وبعدها اسم الـ action و `@v8`.",
          explain: "download-artifact brings the files of the build job to this runner.",
          accept: [
            "- uses: actions/download-artifact@v7",
            "- uses: actions/download-artifact@v6",
            "- uses: actions/download-artifact@v5",
            "- uses: actions/download-artifact@v4",
          ],
        }),
        g.withInputs(),
        g.gh(10, "name: dist", {
          coach: "اطلبه بنفس الاسم اللي اتحفظ بيه.",
          hint1: "المفتاح `name`، وقيمته اسم الـ artifact.",
          explain: "The name must match the one used by upload-artifact.",
        }),
        g.gh(10, "path: dist", {
          coach: "ونزّله في فولدر بنفس الاسم.",
          hint1: "المفتاح `path`، وقيمته اسم الفولدر.",
          explain: "path is the folder the files are written to on this runner.",
          accept: ["path: dist/", "path: ./dist"],
        }),
        g.gh(6, "- run: ./scripts/deploy.sh dist", {
          coach: "شغّل الـ script بتاع النشر اللي في `./scripts/deploy.sh`، وادّيله اسم الفولدر.",
          hint1: "شرطة، `run`، نقطتين، وبعدها مسار الـ script وبعده اسم الفولدر.",
          explain: "The deploy script publishes the files that were built and saved by the build job.",
        }),
        g.gh(8, "env:", {
          coach: "الـ script محتاج token. الـ environment variables بتاعة الخطوة بتتكتب تحت `env`، في نفس الخطوة.",
          hint1: "كلمة `env` وبعدها `:`. من غير شرطة.",
          explain: "env sets environment variables for this step only.",
        }),
        g.gh(10, "DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}", {
          coach: "المتغير `DEPLOY_TOKEN`، وقيمته جاية من `secrets` بنفس الاسم. عمرها ما تتكتب هنا.",
          hint1: "اسم المتغير، نقطتين، وبعدها expression فيه `secrets` ونقطة واسم السر.",
          explain: "The token is read from the secrets store and given to the script as an environment variable.",
        }),
      ],
    },
  ],
  followUps: [
    {
      question: "How does the approval work?",
      answer: "The approval is a protection rule on the environment, set in the repository settings. It is not written in the YAML.",
      how: "When a job names that environment, it waits until a required reviewer approves it.",
      example: "environment: production",
    },
    {
      question: "What does needs do?",
      answer: "It makes a job wait for another job, and skips it when that job fails.",
      how: "Without needs, the jobs of a workflow start at the same time.",
      example: "deploy:  needs: build",
    },
    {
      question: "Why pass an artifact? Why not build again in the deploy job?",
      answer: "Each job runs on a fresh runner, so the files of the build job are gone when it ends.",
      how: "The artifact carries the exact files that were built to the deploy job. A second build could give a different result.",
      example: "upload-artifact in build, download-artifact in deploy",
    },
  ],
};
