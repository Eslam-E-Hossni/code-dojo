import type { ConfigProblem } from "../types";
import { dline } from "./config-helpers";

export const dockerNextStandalone: ConfigProblem = {
  id: "docker-next-standalone",
  kind: "config",
  group: "docker",
  title: "Multi-stage: Next.js standalone",
  difficulty: "hard",
  tag: "likely",
  statement:
    'Write a multi-stage Dockerfile for a Next.js app that has output: "standalone" in next.config.js. The app reads NEXT_PUBLIC_API_URL. The final image runs node server.js on port 3000.',
  examples: [
    "docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t my-next .",
    "docker run -p 3000:3000 my-next",
  ],
  askFirst: [
    'Is output: "standalone" set in next.config.js?',
    "Which variables does the browser code read? They must exist at build time.",
    "Does the app write a cache at run time (ISR, image optimization)?",
  ],
  edgeCases: [
    "Without .next/static and public the page opens with no CSS and no images",
    "A NEXT_PUBLIC_ variable that is set only at run time does not reach the browser",
    "If the server writes a cache, the files must belong to the run user: add --chown=node:node to the COPY lines",
  ],
  complexity:
    "Three folders cross to the final stage: .next/standalone, .next/static and public. NEXT_PUBLIC_ values are fixed at build time.",
  idea: "مع `standalone`، الـ build بيطلّع فولدر صغير فيه `server.js` والـ dependencies اللي محتاجها بس، فالمرحلة النهائية مش محتاجة `npm ci`. بس خد بالك من حاجتين: الملفات الثابتة بتتنسخ بإيدك، ومتغيرات `NEXT_PUBLIC_` لازم تبقى موجودة وقت الـ build لأن قيمتها بتتكتب جوه الـ JavaScript.",
  file: "Dockerfile",
  language: "dockerfile",
  rules: [
    "pinned-base",
    "node-base",
    "workdir-before-copy",
    "deps-before-source",
    "npm-ci",
    "next-public-at-build",
    "multi-stage",
    "node-env-production",
    "final-copies-output",
    "next-standalone",
    "non-root",
    "expose-and-cmd",
    "cmd-runs-node",
    "no-secrets",
  ],
  parts: [
    {
      id: "build",
      title: "build stage",
      signature: "Dockerfile",
      steps: [
        dline("FROM node:22-alpine AS build", {
          coach:
            "نبدأ يا إسلام بمرحلة الـ build: Node نسخة 22 من النوع الخفيف، واسم المرحلة `build`.",
          accept: ["FROM node:20-alpine AS build", "FROM node:24-alpine AS build"],
          hint1: "زي أي `FROM`، وفي آخر السطر كلمة `AS` وبعدها اسم المرحلة.",
          explain: "The first stage builds the app, and AS gives it a name.",
        }),
        dline("WORKDIR /app", {
          coach: "حدّد فولدر الشغل: `/app`.",
          hint1: "الـ instruction اسمها `WORKDIR`، وبعدها المسار.",
          explain: "WORKDIR sets the folder for the next instructions.",
        }),
        dline("COPY package*.json ./", {
          coach: "انسخ ملفات الـ package لوحدها الأول، علشان الـ cache.",
          accept: ["COPY package.json package-lock.json ./"],
          hint1: "`COPY` وبعدها `package*.json`، والوجهة `./`.",
          explain: "I copy the package files first, so the install layer stays cached.",
        }),
        dline("RUN npm ci", {
          coach: "نصّب كل الـ dependencies من الـ lock file. الـ build محتاج الـ devDependencies كمان.",
          hint1: "`RUN` وبعدها أمر npm اللي اسمه `ci`، من غير أي flags.",
          explain: "npm ci installs everything from the lock file, with the dev dependencies the build needs.",
        }),
        dline("COPY . .", {
          coach: "انسخ باقي كود المشروع.",
          accept: ["COPY . ./", "COPY ./ ./"],
          hint1: "`COPY` وبعدها نقطة للمصدر ونقطة للوجهة.",
          explain: "Then I copy the source code.",
        }),
        dline("ARG NEXT_PUBLIC_API_URL", {
          coach:
            "قبل الـ build: المتغير اللي المتصفح هيستخدمه لازم يبقى موجود دلوقتي. عرّفه كمتغير وقت البناء، واسمه `NEXT_PUBLIC_API_URL`. من غير قيمة: القيمة هتيجي من برّه.",
          hint1: "الـ instruction اللي بتعرّف متغير وقت البناء بس اسمها `ARG`، وبعدها اسم المتغير.",
          explain: "ARG declares a build-time variable. Its value comes from --build-arg, and next build reads it.",
        }),
        dline("RUN npm run build", {
          coach: "دلوقتي ابني التطبيق. الـ build هيقرا المتغير ويكتب قيمته جوه ملفات الـ JavaScript.",
          hint1: "`RUN` وبعدها الـ script اللي اسمه `build` من `package.json`.",
          explain: "next build inlines the NEXT_PUBLIC_ value into the JavaScript and writes .next/standalone.",
        }),
      ],
    },
    {
      id: "final",
      title: "final stage",
      signature: "Dockerfile",
      steps: [
        dline("FROM node:22-alpine", {
          coach:
            "المرحلة النهائية: نفس الـ image بتاعة Node، بس من غير اسم ومن غير أي حاجة من المرحلة الأولى. السيرفر محتاج Node علشان يشتغل.",
          accept: ["FROM node:20-alpine", "FROM node:24-alpine"],
          hint1: "`FROM` جديدة بنفس الـ image والـ tag بتوع أول سطر، من غير `AS`.",
          explain: "A new FROM starts a clean final stage. The server still needs Node, but not the build tools.",
        }),
        dline("WORKDIR /app", {
          coach: "كل مرحلة بتبدأ من الأول، فحدّد فولدر الشغل تاني: `/app`.",
          hint1: "الـ instruction اسمها `WORKDIR`، وبعدها المسار.",
          explain: "Each stage starts fresh, so I set the working folder again.",
        }),
        dline("ENV NODE_ENV=production", {
          coach: "قول للسيرفر إنه شغال في الـ production. ده متغير وقت التشغيل، واسمه `NODE_ENV`.",
          hint1: "`ENV` وبعدها الاسم، علامة `=`، والقيمة `production`.",
          explain: "ENV is saved in the image, so the server sees NODE_ENV=production when it runs.",
        }),
        dline("COPY --from=build /app/public ./public", {
          coach:
            "دلوقتي هننسخ 3 فولدرات من مرحلة الـ build. الأول: الملفات العامة زي الصور، من `/app/public` لفولدر بنفس الاسم هنا.",
          hint1: "`COPY` ومعاها `--from=` واسم المرحلة. وبعدها المصدر `/app/public`، والوجهة `./public`.",
          explain: "The standalone folder does not include public, so I copy it myself.",
        }),
        dline("COPY --from=build /app/.next/standalone ./", {
          coach:
            "التاني هو الأهم: فولدر `standalone` اللي جوه `.next`. فيه `server.js` والـ dependencies اللي محتاجها بس. انسخ محتواه لفولدر الشغل نفسه.",
          hint1: "نفس شكل السطر اللي فات. المصدر `/app/.next/standalone`، والوجهة `./`.",
          explain: "The standalone folder has server.js and only the node_modules files the app really uses.",
        }),
        dline("COPY --from=build /app/.next/static ./.next/static", {
          coach:
            "التالت: ملفات الـ JavaScript والـ CSS، من فولدر `static` اللي جوه `.next`، لنفس المكان هنا. من غيرهم الصفحة هتفتح من غير تنسيق.",
          hint1: "نفس الشكل. المصدر `/app/.next/static`، والوجهة `./.next/static`.",
          explain: "The static files are not in the standalone folder either. Without them the page has no CSS and no JavaScript.",
        }),
        dline("USER node", {
          coach: "شغّل السيرفر بمستخدم عادي، مش root: المستخدم `node` اللي جاي مع الـ image.",
          hint1: "الـ instruction اسمها `USER`، وبعدها اسم المستخدم.",
          explain: "USER switches to a normal user, so the server does not run as root.",
        }),
        dline("EXPOSE 3000", {
          coach: "وثّق الـ port اللي السيرفر بيسمع عليه: 3000.",
          hint1: "الـ instruction اسمها `EXPOSE`، وبعدها رقم الـ port.",
          explain: "EXPOSE documents the port.",
        }),
        dline("ENV HOSTNAME=0.0.0.0", {
          coach:
            "السيرفر بيقرا المتغير `HOSTNAME` علشان يعرف يسمع على أنهي عنوان. خلّيه `0.0.0.0` علشان يستقبل من برّه الـ container.",
          hint1: "`ENV` وبعدها الاسم `HOSTNAME`، علامة `=`، والعنوان.",
          explain: "The standalone server reads HOSTNAME. 0.0.0.0 makes it listen on every address, so it is reachable from outside the container.",
        }),
        dline('CMD ["node", "server.js"]', {
          coach:
            "آخر سطر: شغّل `server.js` اللي الـ build طلّعه، بـ node مباشرة، وبصيغة الـ array.",
          hint1: "`CMD` وبعدها array بعلامات تنصيص دبل. كل كلمة في الأمر عنصر لوحده.",
          explain: "The container starts the small server that next build wrote. There is no npm and no next start here.",
        }),
      ],
    },
  ],
  followUps: [
    {
      question: 'What does output: "standalone" do?',
      answer: "next build writes a small folder, .next/standalone, with server.js and only the node_modules files the app really uses.",
      how: "The final stage copies that folder and runs node server.js. It needs no npm install.",
      example: "public and .next/static are not inside it, so I copy them myself.",
    },
    {
      question: "Why must a NEXT_PUBLIC_ variable be set at build time?",
      answer: "next build replaces it with its value inside the JavaScript that is sent to the browser.",
      how: "After the build the value is plain text in the bundle. Setting the variable when the container starts changes nothing in the browser.",
      example: "docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com .",
    },
    {
      question: "What is the difference between ARG and ENV?",
      answer: "ARG exists only while the image is built. ENV is saved in the image and is there when the container runs.",
      how: "ARG gets its value from --build-arg. ENV can be changed at run time with docker run -e.",
      example: "ARG NEXT_PUBLIC_API_URL for the build, ENV NODE_ENV=production for the server.",
    },
  ],
};
