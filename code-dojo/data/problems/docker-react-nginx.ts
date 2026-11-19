import type { ConfigProblem } from "../types";
import { dline } from "./config-helpers";

export const dockerReactNginx: ConfigProblem = {
  id: "docker-react-nginx",
  kind: "config",
  group: "docker",
  title: "Multi-stage: React SPA + nginx",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write a multi-stage Dockerfile for a React single-page app. npm run build writes the static files to /app/dist. The final image serves them with nginx and has no Node in it.",
  examples: ["docker build -t my-spa .", "docker run -p 8080:8080 my-spa"],
  askFirst: [
    "Which folder does the build write to: dist or build?",
    "Does the app use client-side routing? Then nginx must send index.html for unknown paths.",
    "Does the app read environment variables at build time?",
  ],
  edgeCases: [
    "The final image must not contain the source code or node_modules",
    "nginx must not run as root",
    "A route like /profile opened directly must not give 404",
  ],
  complexity:
    "Build in a big stage, run in a small one. Only the build output crosses from the first stage to the last.",
  idea: "الـ build محتاج Node والكود و `node_modules`، والتشغيل محتاج ملفات ثابتة بس. فبنقسم الملف مرحلتين: الأولى بتبني، والتانية nginx بياخد منها فولدر الناتج بس بـ `COPY --from`. الـ image النهائية بتطلع صغيرة ومفيهاش الكود.",
  file: "Dockerfile",
  language: "dockerfile",
  rules: [
    "pinned-base",
    "node-base",
    "workdir-before-copy",
    "deps-before-source",
    "npm-ci",
    "multi-stage",
    "nginx-final",
    "final-copies-output",
    "non-root",
    "expose-and-cmd",
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
            "نبدأ يا إسلام بالمرحلة اللي بتبني: Node نسخة 22 من النوع الخفيف. وادّي المرحلة اسم `build` علشان نرجع لها بعدين.",
          accept: ["FROM node:20-alpine AS build", "FROM node:24-alpine AS build"],
          hint1: "زي أي `FROM`، وفي آخر السطر كلمة `AS` وبعدها اسم المرحلة.",
          explain: "The first stage builds the app. AS gives the stage a name, so a later stage can copy from it.",
        }),
        dline("WORKDIR /app", {
          coach: "حدّد فولدر الشغل جوه المرحلة: `/app`.",
          hint1: "الـ instruction اسمها `WORKDIR`، وبعدها المسار.",
          explain: "WORKDIR sets the folder for the next instructions.",
        }),
        dline("COPY package*.json ./", {
          coach: "انسخ ملفات الـ package لوحدها الأول، علشان التنصيب يفضل في الـ cache.",
          accept: ["COPY package.json package-lock.json ./"],
          hint1: "`COPY` وبعدها `package*.json`، والوجهة `./`.",
          explain: "I copy the package files first, so the install layer stays cached.",
        }),
        dline("RUN npm ci", {
          coach:
            "نصّب كل الـ dependencies من الـ lock file. هنا محتاجين الـ devDependencies كمان، لأن أدوات الـ build منها.",
          hint1: "`RUN` وبعدها أمر npm اللي اسمه `ci`، من غير أي flags.",
          explain: "npm ci installs everything from the lock file. The build tools are dev dependencies, so I keep them here.",
        }),
        dline("COPY . .", {
          coach: "انسخ باقي كود المشروع.",
          accept: ["COPY . ./", "COPY ./ ./"],
          hint1: "`COPY` وبعدها نقطة للمصدر ونقطة للوجهة.",
          explain: "Then I copy the source code.",
        }),
        dline("RUN npm run build", {
          coach: "ابني التطبيق. الناتج هيطلع في `/app/dist`.",
          hint1: "`RUN` وبعدها الـ script اللي اسمه `build` من `package.json`.",
          explain: "The build writes the static files to /app/dist.",
        }),
      ],
    },
    {
      id: "final",
      title: "final stage",
      signature: "Dockerfile",
      steps: [
        dline("FROM nginxinc/nginx-unprivileged:1.27-alpine", {
          coach:
            "المرحلة النهائية بتبدأ بـ `FROM` جديدة. الـ image اسمها `nginxinc/nginx-unprivileged`: nginx بيشتغل بمستخدم عادي مش root. والـ tag: نسخة 1.27 من النوع الخفيف.",
          accept: [
            "FROM nginxinc/nginx-unprivileged:1.28-alpine",
            "FROM nginxinc/nginx-unprivileged:1.29-alpine",
            "FROM nginxinc/nginx-unprivileged:stable-alpine",
          ],
          hint1: "`FROM` وبعدها اسم الـ image، نقطتين، والـ tag: `1.27` وشرطة وبعدها `alpine`.",
          explain: "A new FROM starts the final stage. This nginx image runs as a normal user, so I need no USER line.",
        }),
        dline("COPY --from=build /app/dist /usr/share/nginx/html", {
          coach:
            "هات ناتج الـ build بس من المرحلة الأولى، وحطّه في الفولدر اللي nginx بيقدّم منه: `/usr/share/nginx/html`.",
          hint1: "`COPY` ومعاها `--from=` واسم المرحلة. وبعدها فولدر الناتج `/app/dist`، وبعده فولدر nginx.",
          explain: "COPY --from takes only the build output from the first stage. The source and node_modules stay behind.",
        }),
        dline("EXPOSE 8080", {
          coach: "وثّق الـ port. الـ image دي بتسمع على 8080، لأن مستخدم عادي ميقدرش يفتح port 80.",
          hint1: "الـ instruction اسمها `EXPOSE`، وبعدها رقم الـ port.",
          explain: "This image listens on 8080, because a normal user cannot open a port below 1024.",
        }),
        dline('CMD ["nginx", "-g", "daemon off;"]', {
          coach:
            "آخر سطر: شغّل nginx في الـ foreground. لو اشتغل في الخلفية، الـ container هيقفل على طول. الـ flag هو `-g` وقيمته `daemon off;`.",
          hint1: "`CMD` وبعدها array من 3 عناصر بعلامات تنصيص دبل: اسم البرنامج، والـ flag، وقيمته.",
          explain: "nginx must stay in the foreground, because the container lives only while its main process runs.",
        }),
      ],
    },
  ],
  followUps: [
    {
      question: "Why use a multi-stage build?",
      answer: "The build needs Node, the dev dependencies and the source. The running app needs only the built files.",
      how: "Every FROM starts a new stage. Only the last stage becomes the image, and COPY --from takes files out of an earlier stage.",
      example: "COPY --from=build /app/dist /usr/share/nginx/html",
    },
    {
      question: "Why serve a React app with nginx and not with Node?",
      answer: "After the build a single-page app is only static files: HTML, JavaScript and CSS.",
      how: "nginx serves static files fast, and its image is much smaller. Node is needed for the build, not at run time.",
      example: "Stage 1: node:22-alpine builds. Stage 2: nginx serves /usr/share/nginx/html.",
    },
    {
      question: "A user opens /profile directly and nginx answers 404. Why?",
      answer: "The route exists only in the React router. There is no file called /profile on the disk.",
      how: "nginx must send index.html for every path it does not find. Then the router reads the URL in the browser.",
      example: "try_files $uri $uri/ /index.html;",
    },
  ],
};
