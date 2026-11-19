import type { ConfigProblem } from "../types";
import { yline } from "./config-helpers";

export const dockerCompose: ConfigProblem = {
  id: "docker-compose",
  kind: "config",
  group: "docker",
  title: "docker-compose.yml: web + API",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write a docker-compose.yml with two services. web is built from ./web, is published on port 3000, and finds the API through the variable API_URL. api is built from ./api, listens on port 4000 inside the network, and reads DATABASE_URL from outside the file.",
  examples: ["project/", "  docker-compose.yml", "  web/Dockerfile", "  api/Dockerfile"],
  askFirst: [
    "Which service must be reachable from my machine, and on which port?",
    "Does the code that calls the API run on the server or in the browser?",
    "Where do the secrets come from: a .env file next to the compose file, or the CI?",
  ],
  edgeCases: [
    "localhost inside a container is the container itself, not the other service",
    "depends_on orders the start only. It does not wait until the API is ready",
    "Code that runs in the browser cannot use the name api: that name exists only inside the Docker network",
  ],
  complexity:
    "Every service is a container with a name. Inside the Compose network a service is reached by that name: http://api:4000.",
  idea: "Compose بيشغّل أكتر من container بملف واحد، وبيحطهم على شبكة واحدة. كل service اسمها بيبقى عنوانها جوه الشبكة، فالـ web بيكلّم الـ api بـ `http://api:4000`. والمسافات في أول كل سطر هي اللي بتحدد مين جوه مين.",
  file: "docker-compose.yml",
  language: "yaml",
  rules: [
    "compose-valid-yaml",
    "compose-two-services",
    "compose-build-or-image",
    "compose-web-port",
    "compose-web-reaches-api",
    "compose-depends-on",
    "compose-api-env",
    "compose-no-secrets",
  ],
  parts: [
    {
      id: "main",
      title: "docker-compose.yml",
      signature: "docker-compose.yml",
      steps: [
        yline("services:", {
          coach:
            "نبدأ يا إسلام: الملف كله تحت مفتاح واحد فيه كل الـ containers. اسمه `services`، وبعده نقطتين.",
          hint1: "كلمة `services` في أول السطر من غير مسافات، وبعدها `:`.",
          explain: "Everything in a compose file lives under services. Each entry is one container.",
        }),
        yline("  web:", {
          coach: "أول service: الـ front-end، واسمها `web`. المسافات اللي في أول السطر مكتوبة لك: مسافتين.",
          hint1: "اسم الـ service وبعده `:`، ومن غير أي قيمة بعد النقطتين.",
          explain: "The first service is the front-end. Its name, web, is also its host name on the network.",
        }),
        yline("    build: ./web", {
          coach: "قول لـ Compose يبني الـ image من الـ Dockerfile اللي في فولدر `./web`.",
          accept: ["    build: web", "    build: ./web/"],
          hint1: "المفتاح `build`، نقطتين، مسافة، وبعدها مسار الفولدر.",
          explain: "build tells Compose to build the image from the Dockerfile in that folder.",
        }),
        yline("    ports:", {
          coach: "افتح الـ service دي على جهازك. المفتاح اسمه `ports`، وقيمته list هتيجي في السطر اللي بعده.",
          hint1: "كلمة `ports` وبعدها `:` بس.",
          explain: "ports publishes container ports on my machine.",
        }),
        yline('      - "3000:3000"', {
          coach:
            "عنصر الـ list: port 3000 على جهازك رايح لـ port 3000 جوه الـ container. اكتبه بين علامات تنصيص، لأن YAML ممكن يقرا رقمين بينهم نقطتين غلط.",
          accept: ["      - 3000:3000"],
          hint1: "شرطة ومسافة، وبعدها بين علامات تنصيص: port الجهاز، نقطتين، port الـ container.",
          explain: "The left number is the port on my machine, and the right number is the port inside the container.",
        }),
        yline("    environment:", {
          coach: "دلوقتي متغيرات الـ environment بتاعة الـ web. المفتاح اسمه `environment`.",
          hint1: "كلمة `environment` وبعدها `:` بس.",
          explain: "environment sets variables inside the container.",
        }),
        yline("      API_URL: http://api:4000", {
          coach:
            "المتغير `API_URL` اللي الـ web بيوصل بيه للـ API. العنوان باسم الـ service مش localhost: بروتوكول http، الاسم `api`، والـ port 4000.",
          hint1: "اسم المتغير، نقطتين، مسافة، وبعدها `http://` واسم الـ service والـ port.",
          explain: "Inside the Compose network a service is reached by its name, so the host is api and not localhost.",
        }),
        yline("    depends_on:", {
          coach: "خلّي الـ web يبدأ بعد الـ API. المفتاح اسمه `depends_on`.",
          hint1: "كلمتين بينهم `_`: `depends` و `on`، وبعدهم `:`.",
          explain: "depends_on sets the start order of the services.",
        }),
        yline("      - api", {
          coach: "وعنصر الـ list: اسم الـ service اللي لازم تبدأ الأول.",
          hint1: "شرطة ومسافة، وبعدها اسم الـ service التانية.",
          explain: "Compose starts api before web. It does not wait until api is ready.",
        }),
        yline("  api:", {
          coach: "الـ service التانية: `api`. ارجع بالمسافات لنفس مستوى `web`. المسافات مكتوبة لك.",
          hint1: "اسم الـ service وبعده `:`.",
          explain: "The second service is the API. It has the same indentation as web, so it is its sibling.",
        }),
        yline("    build: ./api", {
          coach: "ابنيها من الـ Dockerfile اللي في فولدر `./api`.",
          accept: ["    build: api", "    build: ./api/"],
          hint1: "المفتاح `build`، نقطتين، مسافة، وبعدها مسار الفولدر.",
          explain: "The API has its own Dockerfile in its own folder.",
        }),
        yline("    environment:", {
          coach: "ومتغيرات الـ environment بتاعتها: نفس المفتاح اللي كتبته في الـ web.",
          hint1: "كلمة `environment` وبعدها `:` بس.",
          explain: "The API gets its settings from environment variables too.",
        }),
        yline("      DATABASE_URL: ${DATABASE_URL}", {
          coach:
            "عنوان قاعدة البيانات فيه باسورد، فمينفعش يتكتب هنا. اسم المتغير `DATABASE_URL`، وقيمته تيجي من برّه الملف بنفس الاسم، بين `${` و `}`.",
          hint1: "اسم المتغير، نقطتين، مسافة، وبعدها `${` واسم المتغير تاني و `}`.",
          explain: "${DATABASE_URL} is filled in from my shell or from a .env file, so the secret is not in the repository.",
        }),
      ],
    },
  ],
  followUps: [
    {
      question: "How does the web container reach the api container?",
      answer: "Compose puts all the services of a file on one network, and every service name works as a host name.",
      how: "Docker runs a DNS inside that network. The name api points to the api container.",
      example: "http://api:4000 from the web container. localhost there is the web container itself.",
    },
    {
      question: "Does depends_on wait until the API is ready?",
      answer: "No. By default it only starts the api container before the web container.",
      how: "To wait for a ready service, the api needs a healthcheck, and web asks for condition: service_healthy.",
      example: "depends_on:  api:  condition: service_healthy",
    },
    {
      question: "The React code in the browser calls http://api:4000 and it fails. Why?",
      answer: "The name api exists only inside the Docker network. The browser runs on the user's machine, outside it.",
      how: "Browser code needs an address the user's machine can reach, so the api port is published or a proxy sits in front of it.",
      example: 'Server-side code: http://api:4000. Browser code: http://localhost:4000 with ports: "4000:4000" on api.',
    },
  ],
};
