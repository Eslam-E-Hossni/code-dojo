import type { ConfigProblem } from "../types";
import * as a from "./ci-azure-steps";

export const ciAzFull: ConfigProblem = {
  id: "ci-az-full",
  kind: "config",
  group: "ci-azure",
  title: "Azure Pipelines: full CI",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write a full CI pipeline for a front-end project. On every push to main and on every pull request to main it runs lint, then the type check, then the tests, then the build. The npm cache is saved with Cache@2.",
  askFirst: [
    "Which scripts does package.json have: lint, type-check, test, build?",
    "In which order should the checks run, and should a failure stop the rest?",
    "Is the lock file committed? The cache key is made from it.",
  ],
  edgeCases: [
    "Cache@2 needs to know the npm cache folder, so npm_config_cache is set first",
    "The cache key must change when package-lock.json changes",
    "continueOnError on a check would let a broken pull request pass",
  ],
  complexity: "Order the checks from the fastest to the slowest: lint, type check, tests, build. The first failure stops the job.",
  idea: "نفس الـ CI الكامل، بس الـ cache في Azure بيتكتب بإيدك: متغير بيقول لـ npm يخزّن فين، و task اسمها `Cache@2` بتحفظ الفولدر ده بمفتاح معمول من `package-lock.json`. والفحوصات مرتبة من الأسرع للأبطأ.",
  file: "azure-pipelines.yml",
  language: "yaml",
  twin: "ci-gh-full",
  rules: [
    "ci-valid-yaml",
    "az-known-keys",
    "az-trigger",
    "az-pool",
    "az-node-version",
    "az-cache",
    "az-npm-ci",
    "az-order-full",
    "az-stops-on-failure",
  ],
  parts: [
    {
      id: "main",
      title: "azure-pipelines.yml",
      signature: "azure-pipelines.yml",
      steps: [
        ...a.header("نبدأ يا إسلام بنفس البداية: `trigger`، المفتاح اللي بيشغّل الـ pipeline مع الـ push."),
        ...a.cacheVariable(),
        a.steps(),
        a.useNode(),
        a.inputs(),
        a.nodeVersion(),
        ...a.cacheTask(),
        a.npmCi(),
        a.lint(),
        a.typeCheck(),
        a.test("بعده الـ tests."),
        a.build(),
      ],
    },
  ],
  followUps: [
    {
      question: "A step fails. What happens to the steps after it?",
      answer: "They are skipped, and the job is marked as failed.",
      how: "Every step has the default condition succeeded(). continueOnError: true would turn the failure into a warning and hide it.",
      example: "A failing npm run lint stops the job before the tests start.",
    },
    {
      question: "How does Cache@2 know when to make a new cache?",
      answer: "From its key.",
      how: "The key is built from fixed text, the agent OS and the hash of package-lock.json. A new lock file gives a new key, so the old cache is not used.",
      example: "key: 'npm | \"$(Agent.OS)\" | package-lock.json'",
    },
    {
      question: "Why set npm_config_cache?",
      answer: "It tells npm where to keep its cache, so the pipeline knows which folder to save.",
      how: "The default folder is different on every operating system. A folder inside $(Pipeline.Workspace) is the same everywhere.",
      example: "npm_config_cache: $(Pipeline.Workspace)/.npm",
    },
  ],
};
