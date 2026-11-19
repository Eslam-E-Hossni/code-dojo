import type { ConfigProblem } from "../types";
import * as a from "./ci-azure-steps";

export const ciAzDeploy: ConfigProblem = {
  id: "ci-az-deploy",
  kind: "config",
  group: "ci-azure",
  title: "Azure Pipelines: deploy with an environment",
  difficulty: "hard",
  tag: "likely",
  statement:
    "Write a pipeline with two stages. Build installs, builds and publishes the dist folder as an artifact. Deploy runs only on main and only after Build succeeds: it is a deployment job that targets the production environment, which asks for an approval, and it runs ./scripts/deploy.sh with a token from a secret variable.",
  askFirst: [
    "Who approves a deployment, and where is that check set?",
    "Should a pull request build without deploying?",
    "Does the deploy stage build again, or does it use the artifact of the build stage?",
  ],
  edgeCases: [
    "A custom condition replaces succeeded(): the branch check alone would deploy after a failed build",
    "A deployment job does not check out the repository by itself",
    "A secret variable is not passed to a script unless it is mapped into env",
  ],
  complexity: "Stages run in order. dependsOn and condition guard the deploy stage, and a deployment job with an environment adds the approval.",
  idea: "Azure عنده مستوى فوق الـ jobs اسمه stages. مرحلة الـ deploy عليها قفلين: `dependsOn` بيخلّيها تستنى الـ build، و `condition` بيقصرها على `main`. والموافقة بتيجي من الـ `environment`، وده بيشتغل مع job من نوع `deployment` خطواتها تحت `strategy`.",
  file: "azure-pipelines.yml",
  language: "yaml",
  twin: "ci-gh-deploy",
  rules: [
    "ci-valid-yaml",
    "az-known-keys",
    "az-trigger",
    "az-pool",
    "az-node-version",
    "az-npm-ci",
    "az-order",
    "az-publish-artifact",
    "az-deploy-gated",
    "az-environment",
    "az-uses-secrets",
    "az-no-plain-secrets",
    "az-stops-on-failure",
  ],
  parts: [
    {
      id: "build",
      title: "build stage",
      signature: "azure-pipelines.yml",
      steps: [
        ...a.header("نبدأ يا إسلام بنفس البداية: `trigger`، المفتاح اللي بيشغّل الـ pipeline مع الـ push."),
        a.az(0, "stages:", {
          coach: "المرة دي الـ pipeline مرحلتين: build و deploy. المراحل بتتكتب list تحت `stages`.",
          hint1: "كلمة `stages` في أول السطر، وبعدها `:`.",
          explain: "stages is the top level of a pipeline. Stages run one after another by default.",
        }),
        a.az(2, "- stage: Build", {
          coach: "أول مرحلة: سمّيها `Build`.",
          hint1: "شرطة، `stage`، نقطتين، وبعدها الاسم بحرف B كابيتال.",
          explain: "The first stage builds the app. Its name is what other stages depend on.",
        }),
        a.az(4, "jobs:", {
          coach: "كل مرحلة فيها jobs، تحت المفتاح `jobs`.",
          hint1: "كلمة `jobs` وبعدها `:`.",
          explain: "A stage holds jobs, and a job holds steps.",
        }),
        a.az(6, "- job: Build", {
          coach: "job واحدة بتبني. سمّيها `Build` برضه.",
          hint1: "شرطة، `job`، نقطتين، وبعدها الاسم.",
          explain: "A normal job. Azure checks out the repository for it automatically.",
        }),
        a.steps("وخطواتها تحت `steps`.", 8),
        a.useNode(undefined, 10),
        a.inputs(undefined, 12),
        a.nodeVersion(undefined, 14),
        a.npmCi(undefined, 10),
        a.build("ابني التطبيق. الناتج هيطلع في فولدر `dist`.", 10),
        a.az(10, "- publish: dist", {
          coach: "الـ agent هيتمسح لما الـ job تخلص، فاحفظ فولدر الناتج كـ artifact. الخطوة المختصرة اسمها `publish`.",
          hint1: "شرطة، `publish`، نقطتين، وبعدها اسم الفولدر.",
          explain: "publish saves the folder as a pipeline artifact, so a later stage can use it.",
          accept: ["- publish: dist/", "- publish: ./dist"],
        }),
        a.az(12, "artifact: dist", {
          coach: "وادّي الـ artifact اسم: `dist`. المفتاح `artifact`، في نفس الخطوة.",
          hint1: "المفتاح `artifact`، وقيمته اسم الـ artifact. من غير شرطة.",
          explain: "artifact is the name of the published artifact.",
        }),
      ],
    },
    {
      id: "deploy",
      title: "deploy stage",
      signature: "azure-pipelines.yml",
      steps: [
        a.az(2, "- stage: Deploy", {
          coach: "المرحلة التانية: النشر. سمّيها `Deploy`، على نفس مستوى المرحلة الأولى.",
          hint1: "شرطة، `stage`، نقطتين، وبعدها الاسم بحرف D كابيتال.",
          explain: "The second stage deploys what the first stage built.",
        }),
        a.az(4, "dependsOn: Build", {
          coach: "أول قفل: المرحلة دي تستنى مرحلة `Build`. المفتاح `dependsOn`، والـ O كابيتال.",
          hint1: "المفتاح `dependsOn`، وقيمته اسم المرحلة الأولى.",
          explain: "dependsOn makes this stage wait for the Build stage.",
          accept: ["dependsOn: [Build]"],
        }),
        a.az(4, "condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))", {
          coach:
            "تاني قفل: شرطين مع بعض جوه `and`. الأول `succeeded()`: اللي قبلها نجح. والتاني `eq`: المتغير `Build.SourceBranch` بيساوي `refs/heads/main`. لو كتبت شرط الـ branch لوحده، هيلغي شرط النجاح.",
          hint1:
            "`condition`، وبعده `and(` وجواه جزئين بينهم فاصلة: `succeeded()`، و `eq(variables['...'], '...')` بعلامات تنصيص مفردة.",
          explain: "A custom condition replaces the default succeeded(), so both checks are written together inside and().",
        }),
        a.az(4, "jobs:", {
          coach: "والـ jobs بتاعة المرحلة دي.",
          hint1: "كلمة `jobs` وبعدها `:`.",
          explain: "The deploy stage has its own jobs.",
        }),
        a.az(6, "- deployment: Deploy", {
          coach: "هنا الـ job نوعها مختلف: مش `job`، دي `deployment`. سمّيها `Deploy`.",
          hint1: "شرطة، `deployment`، نقطتين، وبعدها الاسم.",
          explain: "A deployment job records the deployment on an environment. It is written with deployment in place of job.",
        }),
        a.az(8, "environment: production", {
          coach:
            "اربطها بالـ environment اللي اسمه `production`. الموافقة متظبطة عليه في إعدادات المشروع، والـ job هتقف مستنياها.",
          hint1: "المفتاح `environment`، وقيمته اسم الـ environment.",
          explain: "The job targets the production environment. Its approvals and checks must pass before the job starts.",
        }),
        a.az(8, "strategy:", {
          coach: "الـ deployment job خطواتها مش تحت `steps` على طول. بتتكتب جوه `strategy`.",
          hint1: "كلمة `strategy` وبعدها `:`.",
          explain: "A deployment job describes how it rolls out with a strategy.",
        }),
        a.az(10, "runOnce:", {
          coach: "أبسط strategy: شغّل النشر مرة واحدة. اسمها `runOnce`، والـ O كابيتال.",
          hint1: "كلمتين ملزوقين: `run` و `Once`، وبعدهم `:`.",
          explain: "runOnce is the simplest strategy: every step runs one time.",
        }),
        a.az(12, "deploy:", {
          coach: "وجواها المرحلة اللي فيها النشر نفسه: `deploy`.",
          hint1: "كلمة `deploy` بحروف صغيرة، وبعدها `:`.",
          explain: "deploy is the hook of the strategy that holds the deployment steps.",
        }),
        a.steps("وأخيرًا الخطوات، تحت `steps`.", 14),
        a.az(16, "- checkout: self", {
          coach:
            "الـ deployment job مش بتنزّل الكود لوحدها زي الـ job العادية. والـ script بتاع النشر جوه الـ repo، فنزّله بإيدك: خطوة `checkout`، وقيمتها `self`.",
          hint1: "شرطة، `checkout`، نقطتين، وبعدها `self`.",
          explain: "A deployment job does not check out the repository by itself. checkout: self does it.",
        }),
        a.az(16, "- script: ./scripts/deploy.sh $(Pipeline.Workspace)/dist", {
          coach:
            "شغّل الـ script اللي في `./scripts/deploy.sh`. الـ artifact بينزل لوحده في مساحة الـ pipeline، فادّيله المسار: `$(Pipeline.Workspace)` وبعده `/dist`.",
          hint1: "شرطة، `script`، نقطتين، مسار الـ script، وبعده `$(Pipeline.Workspace)/dist`.",
          explain: "A deployment job downloads the pipeline artifacts by itself, into $(Pipeline.Workspace).",
        }),
        a.az(18, "env:", {
          coach: "الـ script محتاج token. متغيرات الخطوة بتتكتب تحت `env`، في نفس الخطوة.",
          hint1: "كلمة `env` وبعدها `:`. من غير شرطة.",
          explain: "env sets environment variables for this step only.",
        }),
        a.az(20, "DEPLOY_TOKEN: $(DEPLOY_TOKEN)", {
          coach:
            "المتغير `DEPLOY_TOKEN`، وقيمته السر اللي بنفس الاسم، بين `$(` و `)`. لازم تمرّره كده: Azure مش بيبعت الأسرار للـ scripts لوحده.",
          hint1: "اسم المتغير، نقطتين، وبعدها نفس الاسم بين `$(` و `)`.",
          explain: "A secret variable is not given to scripts by default. It must be mapped into env.",
        }),
      ],
    },
  ],
  followUps: [
    {
      question: "How does the approval work?",
      answer: "Approvals are checks on the environment, set in the project settings. They are not written in the YAML.",
      how: "A deployment job that targets the environment waits until the checks pass.",
      example: "environment: production",
    },
    {
      question: "Why and(succeeded(), ...) and not only the branch check?",
      answer: "A custom condition replaces the default one, which is succeeded().",
      how: "With only the branch check, the stage would run on main even when the build stage failed.",
      example: "condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))",
    },
    {
      question: "What is special about a deployment job?",
      answer: "It records the deployment history on the environment, and its steps sit under a strategy such as runOnce.",
      how: "It does not check out the repository by itself, but it downloads the pipeline artifacts automatically.",
      example: "- deployment: Deploy   /   - checkout: self",
    },
  ],
};
