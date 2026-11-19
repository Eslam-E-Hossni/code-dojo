/**
 * The side-by-side card of the CI/CD track: the same idea in GitHub
 * Actions and in Azure Pipelines.
 *
 * `note` is Egyptian Arabic, with code terms in backticks. The snippets
 * are complete enough to read alone, and short enough to compare at a glance.
 */

import type { GroupId } from "./types";

export type CiSystem = "github" | "azure";

/** The CI system of a group of exercises, or null for any other group. */
export function systemOfGroup(group: GroupId): CiSystem | null {
  if (group === "ci-github") return "github";
  if (group === "ci-azure") return "azure";
  return null;
}

export const SYSTEM_NAME: Record<CiSystem, string> = {
  github: "GitHub Actions",
  azure: "Azure Pipelines",
};

export const SYSTEM_FILE: Record<CiSystem, string> = {
  github: ".github/workflows/ci.yml",
  azure: "azure-pipelines.yml",
};

export interface PipelineConcept {
  id: string;
  /** The idea, in English: the word an interviewer uses. */
  title: string;
  titleAr: string;
  github: string;
  azure: string;
  note: string;
}

export const PIPELINE_CONCEPTS: PipelineConcept[] = [
  {
    id: "trigger",
    title: "Trigger",
    titleAr: "إمتى يشتغل",
    github: ["on:", "  push:", "    branches: [main]", "  pull_request:"].join("\n"),
    azure: ["trigger:", "  - main", "pr:", "  - main"].join("\n"),
    note: "في GitHub كل الأحداث تحت `on`. في Azure مفتاحين منفصلين: `trigger` للـ push و `pr` للـ pull requests. و `pr` في الـ YAML بيشتغل لو الكود على GitHub أو Bitbucket. لو الكود في Azure Repos، فحص الـ PR بيتظبط من branch policy.",
  },
  {
    id: "job",
    title: "Job",
    titleAr: "الـ job والاعتماد بينهم",
    github: ["jobs:", "  build:", "    runs-on: ubuntu-latest", "    steps: ...", "  deploy:", "    needs: build"].join("\n"),
    azure: ["jobs:", "  - job: Build", "    steps: ...", "  - job: Deploy", "    dependsOn: Build"].join("\n"),
    note: "في GitHub الـ jobs بتتكتب map: اسم الـ job هو المفتاح. في Azure هي list، وكل عنصر بيبدأ بـ `- job:`. الاعتماد هنا `needs` وهناك `dependsOn`. و Azure عنده مستوى زيادة فوق الـ jobs اسمه `stages`.",
  },
  {
    id: "step",
    title: "Step",
    titleAr: "الخطوة",
    github: ["steps:", "  - uses: actions/checkout@v7", "  - uses: actions/setup-node@v7", "  - run: npm ci"].join("\n"),
    azure: ["steps:", "  - task: UseNode@1", "  - script: npm ci"].join("\n"),
    note: "`uses` بتشغّل action جاهزة و `run` بتشغّل أمر. في Azure المقابل `task` و `script`. و Azure بينزّل الكود لوحده، فمفيش خطوة checkout.",
  },
  {
    id: "runner",
    title: "Runner / agent pool",
    titleAr: "الجهاز اللي بيشغّل",
    github: ["jobs:", "  build:", "    runs-on: ubuntu-latest"].join("\n"),
    azure: ["pool:", "  vmImage: ubuntu-latest"].join("\n"),
    note: "في GitHub اسمه runner، وبيتحدد لكل job بـ `runs-on`. في Azure اسمه agent، وبيتحدد بـ `pool`: مرة للـ pipeline كله، أو لكل job لوحدها.",
  },
  {
    id: "variables",
    title: "Variables",
    titleAr: "المتغيرات",
    github: ["env:", "  VITE_API_URL: https://api.example.com", "", "# from the settings: ${{ vars.NAME }}"].join("\n"),
    azure: ["variables:", "  VITE_API_URL: https://api.example.com", "", "# read in the YAML: $(NAME)"].join("\n"),
    note: "`env` في GitHub بتتحط على مستوى الـ workflow أو الـ job أو الخطوة. في Azure اسمها `variables`، وبتتقري جوه الـ YAML بـ `$(NAME)`. في النظامين القيم دي ظاهرة في الملف، فمكانها مش للأسرار.",
  },
  {
    id: "secrets",
    title: "Secrets",
    titleAr: "الأسرار",
    github: ["- run: ./scripts/deploy.sh", "  env:", "    DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}"].join("\n"),
    azure: ["- script: ./scripts/deploy.sh", "  env:", "    DEPLOY_TOKEN: $(DEPLOY_TOKEN)"].join("\n"),
    note: "السر بيتسجّل في الإعدادات، مش في الملف. في GitHub بيتقري من `secrets`. في Azure هو secret variable، ولازم تمرّره للـ script بـ `env` بنفسك: مش بيتبعت لوحده. والدخول على خدمة زي الـ registry بيبقى بـ service connection.",
  },
  {
    id: "cache",
    title: "Cache",
    titleAr: "الـ cache",
    github: ["- uses: actions/setup-node@v7", "  with:", "    node-version: 22", "    cache: npm"].join("\n"),
    azure: [
      "variables:",
      "  npm_config_cache: $(Pipeline.Workspace)/.npm",
      "",
      "- task: Cache@2",
      "  inputs:",
      "    key: 'npm | \"$(Agent.OS)\" | package-lock.json'",
      "    path: $(npm_config_cache)",
    ].join("\n"),
    note: "في النظامين مفتاح الـ cache معمول من `package-lock.json`: لو الملف اتغير، الـ cache بيتعمل من جديد. في GitHub سطر واحد جوه `setup-node`. في Azure متغير بيحدد الفولدر، و task لوحدها بـ `key` و `path`.",
  },
  {
    id: "artifact",
    title: "Artifact",
    titleAr: "نقل الملفات بين الـ jobs",
    github: ["- uses: actions/upload-artifact@v7", "  with:", "    name: dist", "    path: dist"].join("\n"),
    azure: ["- publish: dist", "  artifact: dist"].join("\n"),
    note: "كل job بتبدأ على جهاز نضيف، فالـ artifact هو الطريق لنقل ناتج الـ build للـ deploy. في GitHub بتنزّله بـ `actions/download-artifact`. في Azure الـ deployment job بتنزّله لوحدها.",
  },
  {
    id: "environment",
    title: "Environment",
    titleAr: "مكان النشر والموافقة",
    github: [
      "deploy:",
      "  needs: build",
      "  if: github.ref == 'refs/heads/main'",
      "  environment: production",
    ].join("\n"),
    azure: [
      "- deployment: Deploy",
      "  environment: production",
      "  strategy:",
      "    runOnce:",
      "      deploy:",
      "        steps: ...",
    ].join("\n"),
    note: "الموافقة (approval) مش بتتكتب في الـ YAML في أي نظام: بتتظبط على الـ environment نفسه من الإعدادات، والـ job بتقف مستنية. في Azure الـ `environment` بيشتغل مع job من نوع `deployment`، وخطواتها تحت `strategy`.",
  },
];
