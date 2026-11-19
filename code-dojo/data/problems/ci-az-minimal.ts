import type { ConfigProblem } from "../types";
import * as a from "./ci-azure-steps";

export const ciAzMinimal: ConfigProblem = {
  id: "ci-az-minimal",
  kind: "config",
  group: "ci-azure",
  title: "Azure Pipelines: minimal CI",
  difficulty: "easy",
  tag: "likely",
  statement:
    "Write the smallest useful CI pipeline. On every push to main and on every pull request to main: set up Node 22, install with npm ci, and run the tests.",
  askFirst: [
    "Is the repository on GitHub or in Azure Repos? The pr key works for GitHub and Bitbucket only.",
    "Which Node version does the project use?",
    "Which command runs the tests?",
  ],
  edgeCases: [
    "There is no checkout step: Azure checks out the repository by itself",
    "Keys are case-sensitive: vmImage, not vmimage",
    "For a repository in Azure Repos, pull request validation is a branch policy, not the pr key",
  ],
  complexity: "A simple pipeline has four parts: trigger, pr, pool and steps. The code is checked out for you.",
  idea: "ملف Azure بيجاوب على نفس السؤالين: إمتى يشتغل (`trigger` و `pr`)، وهيعمل إيه (`steps`). الفرق عن GitHub Actions إن الجهاز بيتحدد مرة واحدة بـ `pool`، وإن الكود بينزل لوحده من غير خطوة checkout.",
  file: "azure-pipelines.yml",
  language: "yaml",
  twin: "ci-gh-minimal",
  rules: [
    "ci-valid-yaml",
    "az-known-keys",
    "az-trigger",
    "az-pool",
    "az-node-version",
    "az-npm-ci",
    "az-order",
    "az-runs-tests",
    "az-stops-on-failure",
  ],
  parts: [
    {
      id: "main",
      title: "azure-pipelines.yml",
      signature: "azure-pipelines.yml",
      steps: [
        ...a.header("نبدأ يا إسلام: إمتى الـ pipeline يشتغل مع الـ push. في Azure المفتاح اسمه `trigger`."),
        a.steps(),
        a.useNode("أول خطوة: نصّب Node على الـ agent. الحاجات الجاهزة في Azure اسمها tasks، ودي اسمها `UseNode` ونسختها 1."),
        a.inputs(),
        a.nodeVersion(),
        a.npmCi(),
        a.test("وآخر خطوة: شغّل الـ tests. لو test واحد وقع، الـ pipeline كله بيفشل."),
      ],
    },
  ],
  followUps: [
    {
      question: "There is no checkout step. How does the code get to the agent?",
      answer: "Azure Pipelines checks out the repository automatically at the start of every job.",
      how: "It is an implicit first step. I write a checkout step only to change it, or to turn it off.",
      example: "steps:  - checkout: none",
    },
    {
      question: "What is the difference between a task and a script?",
      answer: "A task is a packaged step with inputs, like UseNode@1. A script is a shell command.",
      how: "The number after @ is the major version of the task.",
      example: "- task: UseNode@1   /   - script: npm test",
    },
    {
      question: "What is a pool?",
      answer: "A pool is a group of agents: the machines that run the jobs.",
      how: "vmImage asks for a Microsoft-hosted agent with that image. A pool name points to self-hosted agents.",
      example: "pool:  vmImage: ubuntu-latest",
    },
  ],
};
