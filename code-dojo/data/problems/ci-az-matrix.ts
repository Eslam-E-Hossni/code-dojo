import type { ConfigProblem } from "../types";
import * as a from "./ci-azure-steps";

export const ciAzMatrix: ConfigProblem = {
  id: "ci-az-matrix",
  kind: "config",
  group: "ci-azure",
  title: "Azure Pipelines: matrix (Node 20 and 22)",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write a CI pipeline that runs the tests on Node 20 and on Node 22. Use a matrix, so the steps are written once and run once for each version.",
  askFirst: [
    "Which Node versions must the project support?",
    "How many jobs may run at the same time?",
    "Do the runs need different operating systems too?",
  ],
  edgeCases: [
    "Every entry of the matrix needs a name and its own variables",
    "The Node task must read the matrix variable with $(name), not a fixed version",
    "maxParallel limits how many entries run at once",
  ],
  complexity: "In Azure a matrix is a map: each entry has a name and sets variables. The steps read them with $(name).",
  idea: "الـ matrix في Azure مش list زي GitHub: هي إعدادات ليها أسماء. كل إعداد تحته المتغيرات بتاعته، والخطوات بتقراها بـ `$(nodeVersion)`. Azure بيشغّل نسخة من الـ job لكل إعداد.",
  file: "azure-pipelines.yml",
  language: "yaml",
  twin: "ci-gh-matrix",
  rules: [
    "ci-valid-yaml",
    "az-known-keys",
    "az-trigger",
    "az-pool",
    "az-matrix",
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
        ...a.header("نبدأ يا إسلام بنفس البداية: `trigger`، المفتاح اللي بيشغّل الـ pipeline مع الـ push."),
        a.az(0, "strategy:", {
          coach: "عايزين نفس الخطوات تشتغل على أكتر من نسخة Node. ده بيتكتب تحت `strategy`، قبل الخطوات.",
          hint1: "كلمة `strategy` في أول السطر، وبعدها `:`.",
          explain: "strategy controls how the job is repeated.",
        }),
        a.az(2, "matrix:", {
          coach: "وجواها `matrix`: كل إعداد فيها بيعمل نسخة من الـ job.",
          hint1: "كلمة `matrix` وبعدها `:`.",
          explain: "A matrix runs the job once for each of its entries.",
        }),
        a.az(4, "node_20:", {
          coach: "في Azure كل إعداد ليه اسم. سمّي الأول `node_20`.",
          hint1: "اسم الإعداد بـ underscore، وبعده `:`.",
          explain: "Every entry of the matrix has a name. It shows up in the name of the job.",
        }),
        a.az(6, 'nodeVersion: "20.x"', {
          coach: "وتحته المتغير بتاعه: `nodeVersion`، وقيمته نسخة 20 مكتوبة `20.x` بين علامات تنصيص.",
          hint1: "اسم المتغير، نقطتين، والقيمة بين علامات تنصيص: الرقم ونقطة و `x`.",
          explain: "The entry sets a variable. Here it holds the Node version for this run.",
          accept: ["nodeVersion: 20.x"],
        }),
        a.az(4, "node_22:", {
          coach: "الإعداد التاني: `node_22`، على نفس مستوى الأول.",
          hint1: "اسم الإعداد بـ underscore، وبعده `:`.",
          explain: "The second entry gives a second run of the job.",
        }),
        a.az(6, 'nodeVersion: "22.x"', {
          coach: "ونفس المتغير بقيمة نسخة 22.",
          hint1: "نفس اسم المتغير، وقيمته `22.x` بين علامات تنصيص.",
          explain: "The same variable with another value: this run uses Node 22.",
          accept: ["nodeVersion: 22.x"],
        }),
        a.steps(),
        a.useNode(),
        a.inputs(),
        a.az(6, "version: $(nodeVersion)", {
          coach: "هنا الفرق: النسخة مش رقم ثابت. هي قيمة متغير الـ matrix، وبتتقري باسمه بين `$(` و `)`.",
          hint1: "المفتاح `version`، وقيمته اسم المتغير اللي سمّيته فوق بين `$(` و `)`.",
          explain: "$(nodeVersion) is replaced with the value of the current matrix entry just before the step runs.",
          accept: ["versionSpec: $(nodeVersion)"],
        }),
        a.npmCi(),
        a.test("وشغّل الـ tests. الخطوة دي هتشتغل مرتين: مرة على كل نسخة."),
      ],
    },
  ],
  followUps: [
    {
      question: "How is a matrix different in Azure Pipelines and in GitHub Actions?",
      answer: "In Azure every entry has a name and its own variables. In GitHub Actions I give lists, and it builds the combinations.",
      how: "The steps read an Azure matrix variable with $(name).",
      example: 'node_20:  nodeVersion: "20.x"',
    },
    {
      question: "How do I limit how many matrix jobs run at once?",
      answer: "With maxParallel in the strategy.",
      how: "Without it Azure starts as many jobs as there are free parallel jobs in the organization.",
      example: "strategy:  maxParallel: 2",
    },
    {
      question: "What is the difference between $(var) and ${{ var }} in Azure Pipelines?",
      answer: "$(var) is a macro: it is replaced just before the step runs. ${{ }} is a template expression: it is resolved when the YAML is compiled, before anything runs.",
      how: "The values of a matrix exist only at run time, so the steps read them with $( ).",
      example: "version: $(nodeVersion)",
    },
  ],
};
