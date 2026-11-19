import type { ConfigProblem } from "../types";
import { dline } from "./config-helpers";

export const dockerNodeApp: ConfigProblem = {
  id: "docker-node-app",
  kind: "config",
  group: "docker",
  title: "Dockerfile: a Node app",
  difficulty: "easy",
  tag: "likely",
  statement:
    "Write a Dockerfile for a Node.js app. The app starts with node server.js and listens on port 3000. The image needs the production dependencies only.",
  examples: ["docker build -t my-app .", "docker run -p 3000:3000 my-app"],
  askFirst: [
    "Which Node version does the app need?",
    "How does the app start, and on which port does it listen?",
    "Is there a build step, or does the code run as it is?",
  ],
  edgeCases: [
    "A change in the code must not reinstall the dependencies",
    "The container must not run as root",
    "No .env file and no secret may end up in the image",
  ],
  complexity:
    "Order the lines from what changes least to what changes most: the base image, the package files, the install, then the code.",
  idea: "كل سطر في الـ Dockerfile بيعمل layer بتتخزّن، وأول layer تتغير بتعيد كل اللي بعدها. فرتّب السطور من اللي بيتغير قليل للي بيتغير كتير: `package.json` الأول وبعده `npm ci`، والكود في الآخر. كده تعديل الكود مبيعيدش التنصيب.",
  file: "Dockerfile",
  language: "dockerfile",
  rules: [
    "pinned-base",
    "node-base",
    "workdir-before-copy",
    "node-env-production",
    "deps-before-source",
    "npm-ci",
    "copies-source",
    "non-root",
    "expose-and-cmd",
    "cmd-runs-node",
    "no-secrets",
  ],
  parts: [
    {
      id: "main",
      title: "Dockerfile",
      signature: "Dockerfile",
      steps: [
        dline("FROM node:22-alpine", {
          coach:
            "نبدأ يا إسلام: كل Dockerfile بيبدأ بالـ image اللي هنبني فوقها. عايزين Node نسخة 22، والنوع الخفيف `alpine`. والنسخة لازم تتكتب صريحة.",
          accept: ["FROM node:20-alpine", "FROM node:24-alpine"],
          hint1: "الـ instruction اسمها `FROM`. بعدها اسم الـ image، نقطتين، والـ tag: الرقم وشرطة وبعدها `alpine`.",
          explain: "FROM picks the base image. I pin the Node version, and I use alpine because it is small.",
        }),
        dline("WORKDIR /app", {
          coach: "حدّد الفولدر اللي التطبيق هيعيش فيه جوه الـ image: `/app`. كل اللي بعده هيشتغل جواه.",
          hint1: "الـ instruction اسمها `WORKDIR`، وبعدها المسار.",
          explain: "WORKDIR sets the folder for the next instructions, and creates it if it is missing.",
        }),
        dline("ENV NODE_ENV=production", {
          coach:
            "قول للتطبيق إنه شغال في الـ production. ده متغير بيفضل موجود وقت التشغيل، واسمه `NODE_ENV`.",
          hint1: "`ENV` وبعدها الاسم، علامة `=`، والقيمة `production`. من غير مسافات حوالين الـ `=`.",
          explain: "ENV sets a variable that is saved in the image, so it is there when the container runs.",
        }),
        dline("COPY package*.json ./", {
          coach:
            "انسخ ملفات الـ package بس: `package.json` والـ lock file. لسه مش الكود كله، علشان التنصيب يفضل في الـ cache.",
          accept: ["COPY package.json package-lock.json ./"],
          hint1: "`COPY` وبعدها `package*.json`: النجمة بتجيب الملفين. والوجهة `./` يعني الـ WORKDIR.",
          explain: "I copy only the package files first, so the install layer stays cached when the code changes.",
        }),
        dline("RUN npm ci --omit=dev", {
          coach:
            "نصّب الـ dependencies من الـ lock file بالظبط، ومن غير الـ devDependencies علشان الـ image تبقى أصغر.",
          hint1: "`RUN` وبعدها أمر npm اللي اسمه `ci`، ومعاه الـ flag `--omit=dev`.",
          explain: "npm ci installs exactly what the lock file says, and --omit=dev leaves out the dev dependencies.",
        }),
        dline("COPY . .", {
          coach: "دلوقتي انسخ باقي ملفات المشروع كلها جوه الـ WORKDIR.",
          accept: ["COPY . ./", "COPY ./ ./"],
          hint1: "`COPY` وبعدها نقطة للمصدر ونقطة للوجهة.",
          explain: "Now I copy the rest of the code. This layer changes most often, so it comes after the install.",
        }),
        dline("USER node", {
          coach:
            "خلّي الـ container يشتغل بمستخدم عادي، مش root. الـ image بتاعة Node فيها مستخدم جاهز اسمه `node`.",
          hint1: "الـ instruction اسمها `USER`، وبعدها اسم المستخدم.",
          explain: "USER switches to a normal user, so the app does not run as root.",
        }),
        dline("EXPOSE 3000", {
          coach: "وثّق إن التطبيق بيسمع على port 3000.",
          hint1: "الـ instruction اسمها `EXPOSE`، وبعدها رقم الـ port.",
          explain: "EXPOSE documents the port the app listens on. It does not publish it.",
        }),
        dline('CMD ["node", "server.js"]', {
          coach:
            "آخر سطر: الأمر اللي بيشتغل لما الـ container يبدأ. شغّل `server.js` بـ node، واكتبه بصيغة الـ array.",
          hint1: "`CMD` وبعدها array بعلامات تنصيص دبل. كل كلمة في الأمر عنصر لوحده.",
          explain: "CMD is the command the container runs when it starts. The array form runs node directly, without a shell.",
        }),
      ],
    },
  ],
  followUps: [
    {
      question: "Why copy package.json before the rest of the code?",
      answer: "Docker caches every instruction as a layer. When one layer changes, every layer after it is built again.",
      how: "The package files change rarely, so the install stays cached. Only the last COPY runs again when I change the code.",
      example: "COPY package*.json ./  ->  RUN npm ci  ->  COPY . .",
    },
    {
      question: 'What is the difference between CMD ["node", "server.js"] and CMD node server.js?',
      answer: "The array is the exec form: it runs node directly. The plain text is the shell form: it runs /bin/sh, and the shell runs node.",
      how: "With the exec form node is process 1, so it gets the stop signal from docker stop and can close cleanly.",
      example: 'CMD ["node", "server.js"]',
    },
    {
      question: "Why should the container not run as root?",
      answer: "A process in a container runs as root by default. If someone breaks into the app, they are root inside the container.",
      how: "USER switches to a normal user for the next instructions and for the running container, so the damage stays small.",
      example: "USER node   (the official Node image already has this user)",
    },
  ],
};
