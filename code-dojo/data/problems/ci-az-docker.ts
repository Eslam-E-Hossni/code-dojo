import type { ConfigProblem } from "../types";
import * as a from "./ci-azure-steps";

export const ciAzDocker: ConfigProblem = {
  id: "ci-az-docker",
  kind: "config",
  group: "ci-azure",
  title: "Azure Pipelines: build and push a Docker image",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write a pipeline that builds the Docker image of the project and pushes it to a registry. It runs only on a push to main, never on pull requests. The login uses the service connection named docker-hub, the image is my-user/my-app, and every image is tagged with the commit SHA.",
  askFirst: [
    "Which registry, and is there a service connection for it in the project?",
    "Should pull requests build the image too, or only pushes to main?",
    "How should the image be tagged: the build id, the commit SHA, a version?",
  ],
  edgeCases: [
    "command: build only builds. buildAndPush builds and uploads",
    "Without pr: none, pull requests from a GitHub repository also start the pipeline",
    "The tag latest alone says nothing about which commit is running",
  ],
  complexity: "One task, Docker@2, logs in through a service connection, builds and pushes. No password is in the file.",
  idea: "في Azure رفع الـ image خطوة واحدة: الـ task اللي اسمها `Docker@2` بالأمر `buildAndPush`. تسجيل الدخول بيتم عن طريق service connection: بيانات الدخول متخزنة في إعدادات المشروع، والملف بيكتب اسمها بس. والـ tag من الـ commit SHA.",
  file: "azure-pipelines.yml",
  language: "yaml",
  twin: "ci-gh-docker",
  rules: [
    "ci-valid-yaml",
    "az-known-keys",
    "az-trigger-main-only",
    "az-pool",
    "az-docker-push",
    "az-uses-secrets",
    "az-no-plain-secrets",
    "az-image-tag",
  ],
  parts: [
    {
      id: "main",
      title: "azure-pipelines.yml",
      signature: "azure-pipelines.yml",
      steps: [
        a.trigger("نبدأ يا إسلام: الـ pipeline ده بيرفع image، فيشتغل مع الـ push بس. ابدأ بالمفتاح `trigger`."),
        a.triggerMain(),
        a.az(0, "pr: none", {
          coach:
            "واقفل فحص الـ pull requests للملف ده: الـ image مترفعش من كود لسه ما اتراجعش. المفتاح `pr`، وقيمته الكلمة اللي معناها «ولا واحد».",
          hint1: "حرفين `pr`، نقطتين، مسافة، وبعدها `none`.",
          explain: "pr: none turns off pull request validation, so only pushes to main start this pipeline.",
        }),
        a.pool(),
        a.vmImage(),
        a.steps("الخطوات تحت `steps`. الكود بينزل لوحده، فالـ Dockerfile هيبقى موجود على الـ agent."),
        a.az(2, "- task: Docker@2", {
          coach: "خطوة واحدة بتعمل كل حاجة: الـ task اللي اسمها `Docker`، نسخة 2.",
          hint1: "شرطة، `task`، نقطتين، وبعدها اسم الـ task و `@2`.",
          explain: "Docker@2 logs in, builds and pushes, depending on its command.",
        }),
        a.inputs(),
        a.az(6, "containerRegistry: docker-hub", {
          coach:
            "أول إعداد: تسجيل الدخول. مفيش باسورد هنا: بتكتب اسم الـ service connection اللي متسجّل في المشروع، وهو `docker-hub`. المفتاح `containerRegistry`.",
          hint1: "المفتاح `containerRegistry` بحرف R كابيتال، وقيمته اسم الـ connection.",
          explain: "containerRegistry names a service connection. The credentials are stored in the project settings, not in the file.",
        }),
        a.az(6, "repository: my-user/my-app", {
          coach: "اسم الـ image على الـ registry: `my-user/my-app`. المفتاح `repository`.",
          hint1: "المفتاح `repository`، وقيمته اسم المستخدم وشرطة مايلة واسم التطبيق.",
          explain: "repository is the name of the image in the registry.",
        }),
        a.az(6, "command: buildAndPush", {
          coach: "الأمر: ابني وارفع في مرة واحدة. القيمة كلمة واحدة بالشكل ده: `buildAndPush`.",
          hint1: "المفتاح `command`، وقيمته `build` و `And` و `Push` ملزوقين.",
          explain: "buildAndPush builds the image and pushes it. build alone would not upload it.",
        }),
        a.az(6, "Dockerfile: Dockerfile", {
          coach: "مكان الـ Dockerfile: في أول المشروع. المفتاح نفسه اسمه `Dockerfile` بحرف D كابيتال.",
          hint1: "المفتاح `Dockerfile`، وقيمته مسار الملف: نفس الكلمة.",
          explain: "Dockerfile is the path of the file to build from.",
          accept: ["Dockerfile: ./Dockerfile", "Dockerfile: '**/Dockerfile'", 'Dockerfile: "**/Dockerfile"'],
        }),
        a.az(6, "tags: $(Build.SourceVersion)", {
          coach:
            "وآخر إعداد: الـ tag. خلّيه الـ commit SHA. Azure بيحطّه في متغير جاهز اسمه `Build.SourceVersion`، وبيتقري بين `$(` و `)`.",
          hint1: "المفتاح `tags`، وقيمته اسم المتغير الجاهز بين `$(` و `)`.",
          explain: "Build.SourceVersion is the commit SHA of the run, so every image points to the exact code it was built from.",
          accept: ["tags: $(Build.BuildId)"],
        }),
      ],
    },
  ],
  followUps: [
    {
      question: "Where is the password of the registry?",
      answer: "It is not in the file. It lives in a service connection, in the project settings.",
      how: "containerRegistry names that connection, and the Docker task logs in with it.",
      example: "containerRegistry: docker-hub",
    },
    {
      question: "What does pr: none do?",
      answer: "It turns off pull request validation for this pipeline.",
      how: "The pipeline then runs only for pushes to the branches listed in trigger.",
      example: "pr: none",
    },
    {
      question: "Why $(Build.SourceVersion) as the tag?",
      answer: "It is the commit SHA of the run, so each image is tied to the exact code it was built from.",
      how: "It is a predefined variable: Azure fills it in. $(Build.BuildId) is a common alternative, a number that grows with every run.",
      example: "tags: $(Build.SourceVersion)",
    },
  ],
};
