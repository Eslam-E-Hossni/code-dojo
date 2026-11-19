import type { ConfigProblem, Step } from "../types";
import * as a from "./ci-azure-steps";
import * as g from "./ci-github-steps";

/**
 * The two "translate" exercises. They are the same pipeline in the two
 * systems, so they live in one file: the reference file of each one is the
 * file the other one gives to read.
 */

const GITHUB_STEPS: Step[] = [
  g.name(
    "CI",
    "نبدأ يا إسلام: ملف Azure في التاب التاني، وهنكتب نفس الـ pipeline بلغة GitHub Actions. Azure مش لازم فيه اسم، بس هنا بنبدأ بيه: `CI`.",
  ),
  g.on("في Azure فيه مفتاحين منفصلين: `trigger` و `pr`. في GitHub الاتنين بيتكتبوا تحت مفتاح واحد من حرفين."),
  g.push("`trigger` في Azure معناه push. هنا بتكتب اسم الحدث نفسه."),
  g.branchesMain("و `- main` اللي تحت `trigger` بتبقى هنا فلتر branches بين قوسين مربعين."),
  g.pullRequest("و `pr` بتاعة Azure هنا حدث اسمه كلمتين بينهم `_`."),
  g.gh(4, "branches: [main]", {
    coach: "وبرضه على `main` بس، زي `- main` اللي تحت `pr`.",
    hint1: "نفس السطر اللي كتبته تحت `push`.",
    explain: "Only pull requests that target main start the workflow, like pr: - main in Azure.",
    accept: ['branches: ["main"]'],
  }),
  g.gh(0, "env:", {
    coach:
      "`variables` في Azure هنا اسمها `env`، على مستوى الـ workflow. ومتغير الـ cache بتاع npm مش هتنقله: GitHub بيعمل الـ cache بطريقة تانية.",
    hint1: "كلمة `env` في أول السطر، وبعدها `:`.",
    explain: "env at the top of the workflow gives a variable to every job, like variables in Azure.",
  }),
  g.gh(2, "VITE_API_URL: https://api.example.com", {
    coach: "انقل المتغير `VITE_API_URL` بنفس قيمته.",
    hint1: "اسم المتغير، نقطتين، مسافة، وبعدها العنوان زي ما هو في ملف Azure.",
    explain: "A public setting like the API address is a plain variable, not a secret.",
  }),
  g.jobs("في ملف Azure الخطوات مكتوبة على طول من غير job. في GitHub لازم job صريحة: افتح `jobs`."),
  g.job("build", "وسمّيها `build`."),
  g.runsOn("`pool` و `vmImage` في Azure بيتحولوا لسطر واحد جوه الـ job: نوع الـ runner."),
  g.steps("ودلوقتي الخطوات، تحت `steps`."),
  g.checkout(
    "أول فرق كبير: Azure بينزّل الكود لوحده، فالخطوة دي مش موجودة في ملفه. هنا لازم تكتبها: `actions/checkout`، نسخة `v7`.",
  ),
  g.setupNode("`UseNode@1` بتاعة Azure هنا action اسمها `actions/setup-node`، نسخة `v7`."),
  g.withInputs("و `inputs` هنا اسمها `with`."),
  g.nodeVersion("والنسخة: في Azure مكتوبة `22.x`. هنا المفتاح `node-version`، والرقم 22 يكفي."),
  g.cacheNpm("الـ task بتاعة `Cache@2` كلها، بالـ `key` والـ `path`، بتتحول هنا لسطر واحد جوه نفس الـ action."),
  g.npmCi("`script` في Azure هنا اسمها `run`. أول أمر: التنصيب."),
  g.lint("وبعده الـ lint، بنفس التحويل."),
  g.test("وبعده الـ tests."),
  g.build("وبعده الـ build."),
  g.gh(8, "env:", {
    coach: "خطوة الـ build في Azure معاها `env`. هنا نفس المفتاح في نفس المكان.",
    hint1: "كلمة `env` وبعدها `:`. من غير شرطة.",
    explain: "env on a step sets variables for that step only, in both systems.",
  }),
  g.gh(10, "API_TOKEN: ${{ secrets.API_TOKEN }}", {
    coach: "في Azure القيمة `$(API_TOKEN)`: secret variable. هنا السر بيتقري من `secrets` جوه expression.",
    hint1: "اسم المتغير، نقطتين، وبعدها expression فيه `secrets` ونقطة واسم السر.",
    explain: "In GitHub Actions a secret is read with the secrets context. In Azure it is a secret variable, read with $(NAME).",
  }),
  g.gh(6, "- uses: actions/upload-artifact@v7", {
    coach: "`publish` في Azure هنا action اسمها `actions/upload-artifact`، نسخة `v7`.",
    hint1: "شرطة، `uses`، نقطتين، وبعدها اسم الـ action و `@v7`.",
    explain: "upload-artifact is the GitHub Actions form of the publish step in Azure.",
    accept: [
      "- uses: actions/upload-artifact@v6",
      "- uses: actions/upload-artifact@v5",
      "- uses: actions/upload-artifact@v4",
    ],
  }),
  g.withInputs("وإعداداتها تحت `with`."),
  g.gh(10, "name: dist", {
    coach: "`artifact: dist` في Azure هو اسم الـ artifact. هنا المفتاح اسمه `name`.",
    hint1: "المفتاح `name`، وقيمته اسم الـ artifact.",
    explain: "name in GitHub Actions is artifact in Azure Pipelines.",
  }),
  g.gh(10, "path: dist", {
    coach: "و `publish: dist` في Azure هو الفولدر. هنا المفتاح اسمه `path`.",
    hint1: "المفتاح `path`، وقيمته اسم الفولدر.",
    explain: "path in GitHub Actions is the value of publish in Azure Pipelines.",
    accept: ["path: dist/", "path: ./dist"],
  }),
];

const AZURE_STEPS: Step[] = [
  a.trigger(
    "نبدأ يا إسلام: ملف GitHub Actions في التاب التاني، وهنكتب نفس الـ pipeline بلغة Azure. الـ `name` مش لازم هنا. و `on` و `push` بيبقوا مفتاح واحد: `trigger`.",
  ),
  a.triggerMain("و `branches: [main]` بتبقى عنصر في list تحته."),
  a.pr("الحدث `pull_request` هنا مفتاح لوحده من حرفين، في أول السطر."),
  a.prMain("وبرضه على `main`."),
  a.pool("`runs-on` في GitHub بتتكتب لكل job. هنا بتتكتب مرة للـ pipeline كله، والمفتاح `pool`."),
  a.vmImage("ونوع الجهاز بيتكتب تحته في `vmImage`، بنفس القيمة اللي في ملف GitHub."),
  a.az(0, "variables:", {
    coach: "`env` اللي على مستوى الـ workflow هنا اسمها `variables`.",
    hint1: "كلمة `variables` في أول السطر، وبعدها `:`.",
    explain: "variables in Azure Pipelines is env at the top of a GitHub Actions workflow.",
  }),
  a.az(2, "npm_config_cache: $(Pipeline.Workspace)/.npm", {
    coach:
      "أول متغير مش موجود في ملف GitHub: هناك `cache: npm` بتعمل كل حاجة. هنا لازم تقول لـ npm يخزّن فين: المتغير `npm_config_cache`، وقيمته فولدر `.npm` جوه `$(Pipeline.Workspace)`.",
    hint1: "اسم المتغير، نقطتين، وبعدها `$(Pipeline.Workspace)` وشرطة مايلة واسم الفولدر.",
    explain: "Azure needs to know which folder to cache, so npm is told to keep its cache inside the pipeline workspace.",
  }),
  a.az(2, "VITE_API_URL: https://api.example.com", {
    coach: "وانقل المتغير `VITE_API_URL` بنفس قيمته.",
    hint1: "اسم المتغير، نقطتين، مسافة، وبعدها العنوان زي ما هو في ملف GitHub.",
    explain: "A public setting like the API address is a plain variable, not a secret.",
  }),
  a.steps(
    "في GitHub فيه `jobs` وتحتها `build` وتحتها `steps`. هنا job واحدة، فتقدر تكتب `steps` على طول في أول السطر.",
  ),
  a.useNode(
    "خطوة `actions/checkout` ملهاش مقابل: Azure بينزّل الكود لوحده. فأول خطوة هي Node: `actions/setup-node` هنا task اسمها `UseNode`، نسخة 1.",
  ),
  a.inputs("و `with` هنا اسمها `inputs`."),
  a.nodeVersion("`node-version` هنا اسمها `version`، والرقم بيتكتب `22.x` بين علامات تنصيص."),
  ...cacheLines(),
  a.npmCi("`run` في GitHub هنا اسمها `script`. أول أمر: التنصيب."),
  a.lint("وبعده الـ lint، بنفس التحويل."),
  a.test("وبعده الـ tests."),
  a.build("وبعده الـ build."),
  a.az(4, "env:", {
    coach: "خطوة الـ build معاها `env` في الملفين: نفس المفتاح في نفس المكان.",
    hint1: "كلمة `env` وبعدها `:`. من غير شرطة.",
    explain: "env on a step sets variables for that step only, in both systems.",
  }),
  a.az(6, "API_TOKEN: $(API_TOKEN)", {
    coach:
      "في GitHub القيمة جاية من `secrets` جوه expression. هنا السر secret variable، وبيتقري باسمه بين `$(` و `)`. ولازم تمرّره بـ `env` كده: Azure مش بيبعت الأسرار للـ scripts لوحده.",
    hint1: "اسم المتغير، نقطتين، وبعدها نفس الاسم بين `$(` و `)`.",
    explain: "A secret variable is not given to scripts by default. It must be mapped into env with $(NAME).",
  }),
  a.az(2, "- publish: dist", {
    coach: "`actions/upload-artifact` هنا خطوة مختصرة اسمها `publish`، وقيمتها الفولدر اللي كان في `path`.",
    hint1: "شرطة، `publish`، نقطتين، وبعدها اسم الفولدر.",
    explain: "publish saves a folder as a pipeline artifact. It is the short form of a publish task.",
    accept: ["- publish: dist/", "- publish: ./dist"],
  }),
  a.az(4, "artifact: dist", {
    coach: "واسم الـ artifact اللي كان في `name` هنا مفتاحه `artifact`، في نفس الخطوة.",
    hint1: "المفتاح `artifact`، وقيمته اسم الـ artifact. من غير شرطة.",
    explain: "artifact is the name of the published artifact, like name in upload-artifact.",
  }),
];

/** cache: npm of GitHub becomes a whole task here. */
function cacheLines(): Step[] {
  const lines = a.cacheTask();
  lines[0] = {
    ...lines[0],
    coach: "سطر `cache: npm` اللي في ملف GitHub بيتحول هنا لـ task كاملة: `Cache`، نسخة 2.",
  };
  return lines;
}

function fileOf(steps: Step[]): string {
  const lines: string[] = [];
  for (let i = 0; i < steps.length; i++) lines.push(steps[i].expected);
  return lines.join("\n");
}

export const ciGhTranslate: ConfigProblem = {
  id: "ci-gh-translate",
  kind: "config",
  group: "ci-github",
  title: "Translate: Azure Pipelines to GitHub Actions",
  difficulty: "hard",
  tag: "likely",
  statement:
    "The second tab has an Azure Pipelines file: a complete CI pipeline. Write the same pipeline as a GitHub Actions workflow, with the same triggers, the same variable, the same steps, the same secret and the same artifact.",
  askFirst: [
    "Which parts of the Azure file have no line of their own in GitHub Actions, and the other way round?",
    "Where does each system keep its secrets?",
    "Is anything implicit in Azure that I must write myself in GitHub Actions?",
  ],
  edgeCases: [
    "Azure checks out the code by itself. GitHub Actions needs the checkout step",
    "Cache@2 with its key and path becomes one input of setup-node",
    "$(API_TOKEN) is a secret variable. In GitHub Actions it is ${{ secrets.API_TOKEN }}",
  ],
  complexity: "The ideas are the same in both systems: trigger, runner, variables, steps, secrets, artifact. Only the keys and the levels change.",
  idea: "النظامين فيهم نفس الأفكار بأسماء مختلفة. اترجم فكرة فكرة مش سطر سطر: إمتى يشتغل، على أنهي جهاز، المتغيرات، الخطوات، الأسرار، والـ artifact. وخد بالك من اللي نظام بيعمله لوحده والتاني محتاجه مكتوب، زي الـ checkout.",
  file: ".github/workflows/ci.yml",
  language: "yaml",
  twin: "ci-az-translate",
  given: { file: "azure-pipelines.yml", code: fileOf(AZURE_STEPS) },
  rules: [
    "ci-valid-yaml",
    "gh-known-keys",
    "gh-trigger",
    "gh-variables",
    "gh-runs-on",
    "gh-checkout",
    "gh-node-version",
    "gh-cache",
    "gh-npm-ci",
    "gh-order",
    "gh-uses-secrets",
    "gh-no-plain-secrets",
    "gh-upload-artifact",
  ],
  parts: [{ id: "main", title: "ci.yml", signature: ".github/workflows/ci.yml", steps: GITHUB_STEPS }],
  followUps: [
    {
      question: "What are the biggest differences between the two files?",
      answer: "GitHub Actions needs an explicit checkout step and names the runner on every job. Azure Pipelines checks out by itself and can set the pool once.",
      how: "The ideas are the same in both: a trigger, jobs, steps, variables and secrets.",
      example: "pool:  vmImage: ubuntu-latest   ->   runs-on: ubuntu-latest",
    },
    {
      question: "How does a script get a secret in each system?",
      answer: "In GitHub Actions I read it with ${{ secrets.NAME }}. In Azure Pipelines I map a secret variable with $(NAME).",
      how: "In both, the value is stored in the settings and masked in the logs. Azure does not give a secret variable to a script unless I map it into env.",
      example: "API_TOKEN: ${{ secrets.API_TOKEN }}   /   API_TOKEN: $(API_TOKEN)",
    },
    {
      question: "Where does caching live in each system?",
      answer: "In GitHub Actions it is one input of setup-node. In Azure Pipelines it is its own task, Cache@2, with a key and a path.",
      how: "Both restore the npm cache when the lock file has not changed.",
      example: "cache: npm   /   - task: Cache@2",
    },
  ],
};

export const ciAzTranslate: ConfigProblem = {
  id: "ci-az-translate",
  kind: "config",
  group: "ci-azure",
  title: "Translate: GitHub Actions to Azure Pipelines",
  difficulty: "hard",
  tag: "likely",
  statement:
    "The second tab has a GitHub Actions workflow: a complete CI pipeline. Write the same pipeline as an Azure Pipelines file, with the same triggers, the same variable, the same steps, the same secret and the same artifact.",
  askFirst: [
    "Which lines of the workflow have no line of their own in Azure Pipelines?",
    "Is the repository on GitHub or in Azure Repos? It decides how pull requests start the pipeline.",
    "What does Azure need that GitHub Actions does by itself?",
  ],
  edgeCases: [
    "There is no checkout step: Azure does it by itself",
    "cache: npm becomes a variable for the npm cache folder and a Cache@2 task",
    "A secret variable must be mapped into env, or the script does not see it",
  ],
  complexity: "The ideas are the same in both systems: trigger, agent, variables, steps, secrets, artifact. Only the keys and the levels change.",
  idea: "نفس الأفكار، بس Azure بيفصّل أكتر في حاجات وبيختصر في حاجات. الـ trigger مفتاحين بدل واحد، والـ cache بيبقى task كاملة، لكن الـ checkout بيتم لوحده و job واحدة مش محتاجة `jobs`. اترجم فكرة فكرة.",
  file: "azure-pipelines.yml",
  language: "yaml",
  twin: "ci-gh-translate",
  given: { file: ".github/workflows/ci.yml", code: fileOf(GITHUB_STEPS) },
  rules: [
    "ci-valid-yaml",
    "az-known-keys",
    "az-trigger",
    "az-pool",
    "az-variables",
    "az-node-version",
    "az-cache",
    "az-npm-ci",
    "az-order",
    "az-uses-secrets",
    "az-no-plain-secrets",
    "az-publish-artifact",
  ],
  parts: [{ id: "main", title: "azure-pipelines.yml", signature: "azure-pipelines.yml", steps: AZURE_STEPS }],
  followUps: [
    {
      question: "What do stages add that GitHub Actions does not have?",
      answer: "Azure has one more level: a pipeline has stages, a stage has jobs, and a job has steps.",
      how: "Stages run one after another by default, and the jobs of a stage run in parallel. GitHub Actions has only jobs, ordered with needs.",
      example: "stages:  - stage: Build  ...  - stage: Deploy",
    },
    {
      question: "How is the pull request trigger different?",
      answer: "GitHub Actions uses the pull_request event. Azure Pipelines uses the pr key, and only for repositories on GitHub or Bitbucket Cloud.",
      how: "For a repository in Azure Repos, pull request validation is set with a branch policy, not in the YAML.",
      example: "pr:  - main",
    },
    {
      question: "How are variables different?",
      answer: "GitHub Actions has env at workflow, job or step level. Azure Pipelines has variables, read as $(NAME) in the YAML.",
      how: "In both, a script sees them as environment variables, and they are visible in the file. So secrets never go there.",
      example: "env:  VITE_API_URL: ...   /   variables:  VITE_API_URL: ...",
    },
  ],
};
