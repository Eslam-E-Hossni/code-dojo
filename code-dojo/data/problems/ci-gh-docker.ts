import type { ConfigProblem } from "../types";
import * as g from "./ci-github-steps";

export const ciGhDocker: ConfigProblem = {
  id: "ci-gh-docker",
  kind: "config",
  group: "ci-github",
  title: "GitHub Actions: build and push a Docker image",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write a workflow that builds the Docker image of the project and pushes it to Docker Hub. It runs only on a push to main. The user name is a repository variable, the access token is a secret, and every image is tagged with the commit SHA.",
  askFirst: [
    "Which registry: Docker Hub, GitHub Container Registry, or a private one?",
    "Should pull requests build the image too, or only pushes to main?",
    "How should the image be tagged: latest, the commit SHA, a version?",
  ],
  edgeCases: [
    "Without push: true the image is built and then thrown away with the runner",
    "A pull request from a fork does not get the repository secrets",
    "The tag latest alone says nothing about which commit is running",
  ],
  complexity: "Log in, then build and push. The token comes from secrets, and the tag comes from the commit.",
  idea: "رفع الـ image تلات حركات: تسجيل دخول للـ registry، بناء، ورفع. الباسورد عمره ما يتكتب في الملف: بييجي من `secrets`. والـ tag بيتعمل من الـ commit SHA، علشان كل image تبقى مربوطة بالكود اللي اتبنت منه.",
  file: ".github/workflows/docker.yml",
  language: "yaml",
  twin: "ci-az-docker",
  rules: [
    "ci-valid-yaml",
    "gh-known-keys",
    "gh-trigger-main-only",
    "gh-runs-on",
    "gh-checkout",
    "gh-pinned-actions",
    "gh-docker-push",
    "gh-uses-secrets",
    "gh-no-plain-secrets",
    "gh-image-tag",
  ],
  parts: [
    {
      id: "main",
      title: "docker.yml",
      signature: ".github/workflows/docker.yml",
      steps: [
        g.name("Docker", "نبدأ يا إسلام: اسم الـ workflow، وهو `Docker`."),
        g.on(),
        g.push("حدث واحد بس المرة دي: الـ push. مفيش pull request هنا، لأن الـ image بتترفع بعد الدمج بس."),
        g.branchesMain("وعلى `main` بس. اكتب الـ branches كـ list بين قوسين مربعين."),
        g.jobs(),
        g.job("docker"),
        g.runsOn(),
        g.steps(),
        g.checkout("أول خطوة: نزّل الكود، علشان الـ Dockerfile يبقى موجود على الـ runner. الـ action اسمها `actions/checkout`، نسخة `v7`."),
        g.gh(6, "- uses: docker/setup-buildx-action@v4", {
          coach: "جهّز الـ builder بتاع Docker على الـ runner. الـ action اسمها `docker/setup-buildx-action`، نسخة `v4`.",
          hint1: "شرطة، `uses`، نقطتين، وبعدها اسم الـ action و `@v4`.",
          explain: "setup-buildx-action prepares Buildx, the builder that the build step uses.",
          accept: ["- uses: docker/setup-buildx-action@v3"],
        }),
        g.gh(6, "- uses: docker/login-action@v4", {
          coach: "سجّل دخول للـ registry قبل أي رفع. الـ action اسمها `docker/login-action`، نسخة `v4`.",
          hint1: "نفس شكل السطر اللي فات، باسم الـ action بتاعة الـ login.",
          explain: "The registry refuses a push without a login, so the login step comes before the build.",
          accept: ["- uses: docker/login-action@v3"],
        }),
        g.withInputs("بيانات الدخول بتتبعت للـ action تحت `with`."),
        g.gh(10, "username: ${{ vars.DOCKERHUB_USERNAME }}", {
          coach:
            "اسم المستخدم مش سر، فبييجي من متغيرات الـ repo: `vars`. اسم المتغير `DOCKERHUB_USERNAME`، جوه expression بين `${{` و `}}`.",
          hint1: "المفتاح `username`، وقيمته expression فيه `vars` ونقطة واسم المتغير.",
          explain: "A user name is not sensitive, so it is a repository variable, read with vars.",
        }),
        g.gh(10, "password: ${{ secrets.DOCKERHUB_TOKEN }}", {
          coach:
            "الباسورد سر، فبييجي من `secrets` وعمره ما يتكتب هنا. اسم السر `DOCKERHUB_TOKEN`.",
          hint1: "المفتاح `password`، وقيمته expression فيه `secrets` ونقطة واسم السر.",
          explain: "The token is stored encrypted in the repository settings and masked in the logs.",
        }),
        g.gh(6, "- uses: docker/build-push-action@v7", {
          coach: "دلوقتي الخطوة اللي بتبني وترفع في مرة واحدة: `docker/build-push-action`، نسخة `v7`.",
          hint1: "شرطة، `uses`، نقطتين، وبعدها اسم الـ action و `@v7`.",
          explain: "build-push-action builds the image and pushes it in one step.",
          accept: ["- uses: docker/build-push-action@v6", "- uses: docker/build-push-action@v5"],
        }),
        g.withInputs("وإعداداتها تحت `with`."),
        g.gh(10, "context: .", {
          coach: "أول إعداد: الـ build context، وهو فولدر المشروع اللي نزّلناه. اكتب نقطة.",
          hint1: "المفتاح `context`، وقيمته نقطة واحدة.",
          explain: "context is the folder sent to the build: here, the checked-out repository.",
        }),
        g.gh(10, "push: true", {
          coach: "قول للـ action ترفع الـ image بعد البناء. من غير السطر ده هتتبني وتترمي مع الـ runner.",
          hint1: "المفتاح `push`، وقيمته `true`.",
          explain: "push: true uploads the image. Without it the image is built and then lost with the runner.",
        }),
        g.gh(10, "tags: ${{ vars.DOCKERHUB_USERNAME }}/my-app:${{ github.sha }}", {
          coach:
            "وآخر إعداد: اسم الـ image. تلات أجزاء: اسم المستخدم من `vars` زي ما كتبته فوق، وبعده `/my-app`، وبعد النقطتين الـ tag وهو الـ commit SHA من `github.sha`.",
          hint1: "المفتاح `tags`، وبعده expression اسم المستخدم، `/my-app:`، وبعده expression فيه `github.sha`.",
          explain: "The tag is the commit SHA, so every image points to the exact code it was built from.",
        }),
      ],
    },
  ],
  followUps: [
    {
      question: "Why does the token come from secrets and the user name from vars?",
      answer: "A secret is encrypted and masked in the logs. A variable is plain configuration that people with access can read.",
      how: "Both are set in the repository settings. secrets is for tokens and passwords, vars is for values that are not sensitive.",
      example: "password: ${{ secrets.DOCKERHUB_TOKEN }}",
    },
    {
      question: "Why tag the image with the commit SHA and not only latest?",
      answer: "The SHA ties each image to the exact commit it was built from.",
      how: "latest moves with every push, so I cannot tell what is running and I cannot go back to a known image.",
      example: "my-app:3f2a9c1 instead of my-app:latest",
    },
    {
      question: "Why does this workflow not run on pull requests?",
      answer: "It pushes an image, and that should happen only for code that was reviewed and merged.",
      how: "A pull request from a fork does not get the repository secrets, so the login step would fail there anyway.",
      example: "on:  push:  branches: [main]",
    },
  ],
};
