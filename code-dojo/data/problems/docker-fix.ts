import type { ConfigProblem } from "../types";
import { dline } from "./config-helpers";

/** The file to fix. It builds and runs, and it has 6 problems. */
const BROKEN = `FROM node:latest
COPY . .
RUN npm install
COPY .env .env
EXPOSE 3000
CMD ["node", "server.js"]
`;

export const dockerFix: ConfigProblem = {
  id: "docker-fix",
  kind: "config",
  group: "docker",
  title: "Fix this Dockerfile",
  difficulty: "medium",
  tag: "likely",
  statement:
    "This Dockerfile builds and runs, but it has 6 problems. Find them and fix them until every rule passes. The app starts with node server.js on port 3000.",
  askFirst: [
    "Is the base image pinned to a version?",
    "What is rebuilt when I change one line of code?",
    "Which user does the container run as, and is any secret copied into the image?",
  ],
  edgeCases: [
    "A .env file that is deleted in a later step is still inside the earlier layer",
    "COPY . . also copies .env, unless .env is listed in .dockerignore",
    "The file must still copy the code and start the app after the fixes",
  ],
  complexity:
    "Read a Dockerfile from the top and ask three things of every line: is it pinned, is it cached well, is it safe?",
  idea: "الملف ده شغال، وده اللي بيخلّي مشاكله تعدّي. راجعه بتلات أسئلة: النسخ ثابتة ولا لأ؟ الـ cache هيتكسر مع كل تعديل ولا لأ؟ وفيه حاجة خطر زي root أو ملف `.env`؟",
  file: "Dockerfile",
  language: "dockerfile",
  starter: BROKEN,
  rules: [
    "pinned-base",
    "workdir-before-copy",
    "deps-before-source",
    "npm-ci",
    "copies-source",
    "no-secrets",
    "non-root",
    "expose-and-cmd",
    "cmd-runs-node",
  ],
  parts: [
    {
      id: "main",
      title: "Dockerfile",
      signature: "Dockerfile",
      steps: [
        dline("FROM node:22-alpine", {
          coach:
            "افتح تاب الملف البايظ يا إسلام وبص على أول سطر: الـ image من غير نسخة ثابتة. دي المشكلة الأولى. اكتبه صح: Node نسخة 22، من النوع الخفيف.",
          accept: ["FROM node:20-alpine", "FROM node:24-alpine"],
          hint1: "`FROM` وبعدها اسم الـ image، نقطتين، والـ tag: الرقم وشرطة وبعدها `alpine`.",
          explain: "Problem 1: latest is a moving tag. I pin the Node version, so the build gives the same result every time.",
        }),
        dline("WORKDIR /app", {
          coach:
            "المشكلة التانية: الملف البايظ بينسخ على طول في الـ root بتاع الـ image، وسط ملفات النظام. حدّد فولدر للتطبيق الأول: `/app`.",
          hint1: "الـ instruction اسمها `WORKDIR`، وبعدها المسار.",
          explain: "Problem 2: there was no WORKDIR, so the files landed in the root of the image.",
        }),
        dline("COPY package*.json ./", {
          coach:
            "المشكلة التالتة: الكود كله بيتنسخ قبل التنصيب، فأي تعديل في سطر كود بيعيد تنصيب كل حاجة. انسخ ملفات الـ package لوحدها الأول.",
          accept: ["COPY package.json package-lock.json ./"],
          hint1: "`COPY` وبعدها `package*.json`، والوجهة `./`.",
          explain: "Problem 3: the code was copied before the install. Now only the package files come first, so the install stays cached.",
        }),
        dline("RUN npm ci", {
          coach:
            "المشكلة الرابعة: أمر التنصيب في الملف البايظ ممكن يغيّر الـ lock file وينزّل نسخ مختلفة. استخدم الأمر اللي بينصّب من الـ lock file بالظبط.",
          accept: ["RUN npm ci --omit=dev"],
          hint1: "`RUN` وبعدها أمر npm اللي من حرفين: `ci`.",
          explain: "Problem 4: npm install can change the lock file. npm ci installs exactly what the lock file says.",
        }),
        dline("COPY . .", {
          coach:
            "دلوقتي انسخ باقي الكود. والمشكلة الخامسة هي السطر اللي مش هنكتبه خالص: نسخ ملف `.env`. الـ secrets مكانها مش جوه الـ image، والملف ده بيتحط في `.dockerignore`.",
          accept: ["COPY . ./", "COPY ./ ./"],
          hint1: "`COPY` وبعدها نقطة للمصدر ونقطة للوجهة.",
          explain: "Problem 5: the .env file was copied into the image. I drop that line, and .env goes into .dockerignore.",
        }),
        dline("USER node", {
          coach:
            "المشكلة السادسة: الملف البايظ مفيهوش مستخدم، فالـ container بيشتغل root. استخدم المستخدم العادي اللي جاي مع الـ image بتاعة Node.",
          hint1: "الـ instruction اسمها `USER`، وبعدها اسم المستخدم: `node`.",
          explain: "Problem 6: the container ran as root. USER node runs the app as a normal user.",
        }),
        dline("EXPOSE 3000", {
          coach: "آخر سطرين كانوا صح في الملف البايظ، فاكتبهم زي ما هم. الأول: توثيق الـ port، وهو 3000.",
          hint1: "الـ instruction اسمها `EXPOSE`، وبعدها رقم الـ port.",
          explain: "EXPOSE was already right: it documents the port.",
        }),
        dline('CMD ["node", "server.js"]', {
          coach: "والتاني: أمر التشغيل. `server.js` بـ node، بصيغة الـ array.",
          hint1: "`CMD` وبعدها array بعلامات تنصيص دبل. كل كلمة في الأمر عنصر لوحده.",
          explain: "CMD was already right too: one command, in the exec form.",
        }),
      ],
    },
  ],
  followUps: [
    {
      question: "Why is FROM node:latest a problem?",
      answer: "latest is a moving tag. It points to a different image as new versions come out.",
      how: "The same Dockerfile can build today and break next month, with no change in the repository.",
      example: "FROM node:22-alpine pins the major version and uses the small alpine base.",
    },
    {
      question: "The .env file is deleted in a later RUN step. Is the secret gone?",
      answer: "No. Every instruction adds a layer, and the file is still inside the earlier layer.",
      how: "Anyone who has the image can read its old layers. A secret is given when the container starts, not baked into the image.",
      example: "docker run --env-file .env my-app   (and .env is listed in .dockerignore)",
    },
    {
      question: "What is the difference between CMD and ENTRYPOINT?",
      answer: "ENTRYPOINT is the program that always runs. CMD is the default command, or the default arguments when there is an ENTRYPOINT.",
      how: "Words after docker run replace CMD, but they are added after ENTRYPOINT.",
      example: 'ENTRYPOINT ["node"] + CMD ["server.js"]: docker run my-app other.js runs node other.js.',
    },
  ],
};
