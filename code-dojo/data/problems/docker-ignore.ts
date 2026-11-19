import type { ConfigProblem } from "../types";
import { iline } from "./config-helpers";

export const dockerIgnore: ConfigProblem = {
  id: "docker-ignore",
  kind: "config",
  group: "docker",
  title: ".dockerignore for a front-end project",
  difficulty: "easy",
  tag: "likely",
  statement:
    "Write the .dockerignore file of a front-end project. Keep out of the build context everything the image does not need: installed packages, git history, old build output, test reports, secrets, logs, editor files and the Docker files themselves.",
  askFirst: [
    "Which folder does the build write to: dist, build or .next?",
    "Is it one project or a monorepo? A pattern matches from the root of the context only.",
    "Does the Dockerfile copy any file that I am about to ignore?",
  ],
  edgeCases: [
    "node_modules matches the top folder only. For every level, write **/node_modules",
    ".env* also covers .env.local and .env.production",
    "A pattern that is too wide, like *.json, removes package.json and breaks the build",
  ],
  complexity:
    "The build context is everything docker build sends to the builder. Leave out what the image installs or builds by itself, and every secret.",
  idea: "قبل أي build، Docker بيبعت الفولدر كله للـ builder، واسمه الـ build context. ملف `.dockerignore` بيشيل منه اللي ملوش لازمة. النتيجة: build أسرع، و cache بيتكسر أقل، و secrets مبتدخلش الـ image بالغلط مع `COPY . .`.",
  file: ".dockerignore",
  language: "dockerignore",
  rules: [
    "ignore-node-modules",
    "ignore-git",
    "ignore-build-output",
    "ignore-coverage",
    "ignore-env",
    "ignore-logs",
    "ignore-local-files",
    "ignore-docker-files",
    "keeps-package-files",
    "keeps-source",
  ],
  parts: [
    {
      id: "main",
      title: ".dockerignore",
      signature: ".dockerignore",
      steps: [
        iline("node_modules", {
          coach:
            "نبدأ يا إسلام بأتقل حاجة: الفولدر اللي npm بينزّل فيه الـ packages. الـ image بتنصّب نسختها بنفسها، فمش عايزين بتاع جهازك.",
          accept: ["node_modules/", "**/node_modules"],
          hint1: "اسم الفولدر بس في سطر لوحده: `node` و `modules` وبينهم `_`.",
          explain: "The image installs its own packages, so the local node_modules stays out of the build context.",
        }),
        iline(".git", {
          coach: "بعده فولدر تاريخ الـ repo. كبير، وملوش أي دور جوه الـ image.",
          accept: [".git/"],
          hint1: "فولدر مخفي: نقطة وبعدها `git`.",
          explain: "The git history is large and the image never needs it.",
        }),
        iline("dist", {
          coach: "ناتج الـ build القديم اللي على جهازك. الـ image هتبني من الأول. ابدأ بفولدر الـ SPA: `dist`.",
          accept: ["dist/"],
          hint1: "اسم الفولدر بس: `dist`.",
          explain: "Old build output from my machine must not mix with the new build.",
        }),
        iline(".next", {
          coach: "ونفس الفكرة لفولدر الـ build بتاع Next: `.next`.",
          accept: [".next/"],
          hint1: "فولدر مخفي: نقطة وبعدها `next`.",
          explain: "The same for the Next.js build folder.",
        }),
        iline("coverage", {
          coach: "تقارير الاختبارات اللي Jest بيطلّعها في فولدر `coverage`.",
          accept: ["coverage/"],
          hint1: "اسم الفولدر بس: `coverage`.",
          explain: "Test reports are made on my machine and have no use in the image.",
        }),
        iline(".env*", {
          coach:
            "أهم سطر: ملفات الـ secrets. عايزين `.env` وكل اللي بيبدأ بيه، زي `.env.local`. سطر واحد يغطّيهم كلهم.",
          accept: ["**/.env*"],
          hint1: "اكتب `.env` وبعدها على طول الحرف اللي معناه «أي حاجة».",
          explain: "The star covers .env, .env.local and .env.production, so no secret is copied by COPY . .",
        }),
        iline("*.log", {
          coach: "ملفات الـ log، زي `npm-debug.log`. بتتغير كل شوية وبتكسر الـ cache من غير فايدة.",
          accept: ["**/*.log"],
          hint1: "نجمة وبعدها الامتداد `.log`.",
          explain: "Log files change all the time, and every change would break the cache of COPY . .",
        }),
        iline(".vscode", {
          coach: "إعدادات المحرر بتاعك: فولدر `.vscode`.",
          accept: [".vscode/"],
          hint1: "فولدر مخفي: نقطة وبعدها `vscode`.",
          explain: "Editor settings belong to my machine, not to the image.",
        }),
        iline(".DS_Store", {
          coach: "والملف اللي نظام macOS بيحطّه في كل فولدر: `.DS_Store`.",
          hint1: "نقطة، وبعدها `DS` كابيتال، و `_`، وبعدها `Store`.",
          explain: "System files like .DS_Store are noise in the build context.",
        }),
        iline("Dockerfile", {
          coach:
            "ملفات Docker نفسها مش محتاجة تتنسخ جوه الـ image. Docker بيقراها حتى لو متجاهلة. ابدأ بملف الـ build نفسه.",
          accept: ["Dockerfile*"],
          hint1: "اسم الملف زي ما هو، بأول حرف كابيتال.",
          explain: "Docker still reads the Dockerfile when it is ignored. Ignoring it only keeps it out of COPY . .",
        }),
        iline(".dockerignore", {
          coach: "وآخر سطر: الملف اللي بتكتبه دلوقتي نفسه.",
          hint1: "اسم الملف اللي في أول التاب، بالنقطة اللي في أوله.",
          explain: "The ignore file itself is not needed in the image either.",
        }),
      ],
    },
  ],
  followUps: [
    {
      question: "What is the build context?",
      answer: "It is the folder that docker build sends to the builder. COPY can only read files from it.",
      how: "The .dockerignore file removes paths from the context before the build starts.",
      example: "docker build .   ->  the context is the current folder",
    },
    {
      question: "Why ignore node_modules when the Dockerfile runs npm ci anyway?",
      answer: "The local node_modules is large, and it was installed for my own operating system.",
      how: "It slows the build down, and COPY . . would write it over the packages that were installed inside the image.",
      example: "A native package built on Windows or macOS does not run on alpine Linux.",
    },
    {
      question: "How is .dockerignore different from .gitignore?",
      answer: "The syntax looks the same, but a pattern is matched from the root of the build context only.",
      how: "node_modules ignores only the top folder. To ignore it at every level I write **/node_modules.",
      example: "*.log matches app.log but not logs/app.log. **/*.log matches both.",
    },
  ],
};
