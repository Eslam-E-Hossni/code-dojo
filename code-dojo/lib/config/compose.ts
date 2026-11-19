/**
 * A docker-compose.yml reader, and its rules.
 *
 * The file is parsed with the `yaml` library, so a syntax or indentation
 * error is reported with its line. The rules then look at the structure,
 * not at the exact text.
 */

import { PASS, code, fail, todo, type Rule } from "./types";
import { dict, parseYaml, type Dict, type YamlFile } from "./yaml";

export { parseYaml, type YamlFile };

function services(file: YamlFile): Dict | null {
  const root = dict(file.data);
  return root ? dict(root.services) : null;
}

function service(file: YamlFile, name: string): Dict | null {
  const all = services(file);
  return all ? dict(all[name]) : null;
}

/** environment can be a map (KEY: value) or a list ("KEY=value"). Both become pairs. */
function environment(config: Dict): [string, string][] {
  const out: [string, string][] = [];
  const env = config.environment;
  if (Array.isArray(env)) {
    for (const item of env) {
      const text = String(item);
      const eq = text.indexOf("=");
      out.push(eq === -1 ? [text, ""] : [text.slice(0, eq), text.slice(eq + 1)]);
    }
  } else {
    const map = dict(env);
    if (map) {
      for (const key of Object.keys(map)) out.push([key, map[key] === null ? "" : String(map[key])]);
    }
  }
  return out;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => (dict(item) ? JSON.stringify(item) : String(item)));
  const map = dict(value);
  return map ? Object.keys(map) : [];
}

const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|PRIVATE_?KEY|CREDENTIAL|DATABASE_URL)/i;

type ComposeRule = Rule<YamlFile>;

const validYaml: ComposeRule = {
  id: "compose-valid-yaml",
  title: "الملف YAML سليم",
  why: "في YAML المسافات في أول السطر هي اللي بتحدد مين جوه مين. مسافة زيادة أو ناقصة بتغيّر المعنى أو بتبوّظ الملف كله، و Compose مش هيشتغل.",
  check(file) {
    if (file.diagnostics.length > 0) {
      return fail(file.diagnostics[0].message, file.diagnostics[0].line);
    }
    return dict(file.data) ? PASS : todo("الملف لسه فاضي.");
  },
};

const twoServices: ComposeRule = {
  id: "compose-two-services",
  title: "فيه خدمتين تحت services: web و api",
  why: "كل container في Compose هو service ليه اسم. الاسم ده مش مجرد عنوان: الخدمات التانية بتوصل له بيه على الشبكة الداخلية.",
  check(file) {
    const all = services(file);
    if (!all) return todo("لسه مفيش services.");
    const missing = ["web", "api"].filter((name) => !dict(all[name]));
    return missing.length === 0 ? PASS : todo("لسه ناقص: " + missing.map(code).join(" و "));
  },
};

const buildOrPinnedImage: ComposeRule = {
  id: "compose-build-or-image",
  title: "كل خدمة ليها build، أو image بـ tag محدد",
  why: "Compose لازم يعرف يجيب الـ container منين: يبنيه من Dockerfile، أو ينزّل image جاهزة. ولو image، الـ tag المحدد بيخلّي كل الناس تشتغل على نفس النسخة.",
  check(file) {
    const all = services(file);
    if (!all || Object.keys(all).length === 0) return todo("لسه مفيش خدمات.");
    for (const name of Object.keys(all)) {
      const config = dict(all[name]);
      if (!config) return todo("الخدمة " + code(name) + " لسه فاضية.");
      if (config.build !== undefined) continue;
      if (config.image === undefined) return todo("الخدمة " + code(name) + " لسه مفيهاش build ولا image.");
      const image = String(config.image);
      const tag = image.lastIndexOf(":") > image.lastIndexOf("/") ? image.slice(image.lastIndexOf(":") + 1) : "";
      if (tag === "" || tag === "latest") {
        return fail("الـ image بتاعة " + code(name) + " من غير tag محدد.", file.lineOf(["services", name, "image"]));
      }
    }
    return PASS;
  },
};

const webPublishesPort: ComposeRule = {
  id: "compose-web-port",
  title: "الـ web فاتح port على جهازك",
  why: "الـ container معزول، ومحدش برّه يقدر يوصل له غير لو ربطت port من جهازك بـ port جواه. ترتيبها: بتاع جهازك الأول، وبعده بتاع الـ container.",
  check(file) {
    const web = service(file, "web");
    if (!web) return todo("لسه مفيش خدمة web.");
    const ports = list(web.ports);
    if (ports.length === 0) return todo("خدمة web لسه مفيهاش ports.");
    for (const port of ports) {
      if (/^(\d+\.\d+\.\d+\.\d+:)?\d+:\d+/.test(port) || port.includes('"target"')) return PASS;
    }
    return fail("الـ port لازم يتكتب بالشكل `host:container`، زي `\"3000:3000\"`.", file.lineOf(["services", "web", "ports"]));
  },
};

const webReachesApi: ComposeRule = {
  id: "compose-web-reaches-api",
  title: "الـ web بيوصل للـ api باسم الخدمة",
  why: "جوه شبكة Compose كل خدمة بتتوصل باسمها، فالعنوان يبقى `http://api:port`. كلمة `localhost` جوه الـ container معناها الـ container نفسه، مش جهازك ولا الـ api.",
  check(file) {
    const web = service(file, "web");
    if (!web) return todo("لسه مفيش خدمة web.");
    const pairs = environment(web);
    for (const [name, value] of pairs) {
      if (/localhost|127\.0\.0\.1/.test(value)) {
        return fail(code(name) + " بيشاور على `localhost`، وده جوه الـ container معناه الـ web نفسه.", file.lineOf(["services", "web", "environment"]));
      }
    }
    for (const [, value] of pairs) {
      if (/\/\/api(:\d+)?(\/|$)/.test(value)) return PASS;
    }
    return todo("لسه مفيش environment في web بيشاور على `http://api`.");
  },
};

const webDependsOnApi: ComposeRule = {
  id: "compose-depends-on",
  title: "الـ web بيبدأ بعد الـ api",
  why: "`depends_on` بيقول لـ Compose يشغّل الـ api الأول. خد بالك: ده بيرتّب بداية التشغيل بس، ومش بيستنى الـ api يبقى جاهز يرد. للكلام ده محتاج `healthcheck`.",
  check(file) {
    const web = service(file, "web");
    if (!web) return todo("لسه مفيش خدمة web.");
    return list(web.depends_on).includes("api") ? PASS : todo("خدمة web لسه مفيهاش `depends_on` على api.");
  },
};

const noSecretsInFile: ComposeRule = {
  id: "compose-no-secrets",
  title: "مفيش secrets مكتوبة في الملف",
  why: "ملف الـ compose بيتحط في الـ repo وكل الفريق بيشوفه. الـ secrets بتيجي من برّه بالشكل `${NAME}`، و Compose بيقراها من الـ environment أو من ملف `.env` اللي مش متسجل في git.",
  check(file) {
    const all = services(file);
    if (!all) return todo("لسه مفيش خدمات.");
    let sawEnvironment = false;
    for (const name of Object.keys(all)) {
      const config = dict(all[name]);
      if (!config) continue;
      for (const [key, value] of environment(config)) {
        sawEnvironment = true;
        if (SECRET_NAME.test(key) && value !== "" && !value.includes("${")) {
          return fail(code(key) + " في " + code(name) + " قيمته مكتوبة في الملف.", file.lineOf(["services", name, "environment"]));
        }
      }
    }
    return sawEnvironment ? PASS : todo("لسه مفيش environment يتراجع.");
  },
};

const apiGetsSecretFromOutside: ComposeRule = {
  id: "compose-api-env",
  title: "الـ api بياخد إعداده من برّه بـ `${...}`",
  why: "الـ api محتاج عنوان قاعدة البيانات وفيه باسورد. بـ `${DATABASE_URL}` القيمة بتيجي من جهاز كل واحد أو من الـ CI، والملف نفسه يفضل آمن يتشارك.",
  check(file) {
    const api = service(file, "api");
    if (!api) return todo("لسه مفيش خدمة api.");
    for (const [, value] of environment(api)) {
      if (/\$\{[A-Za-z_][A-Za-z0-9_]*\}/.test(value)) return PASS;
    }
    return todo("خدمة api لسه مفيهاش environment بقيمة `${...}`.");
  },
};

export const COMPOSE_RULES: ComposeRule[] = [
  validYaml,
  twoServices,
  buildOrPinnedImage,
  webPublishesPort,
  webReachesApi,
  webDependsOnApi,
  noSecretsInFile,
  apiGetsSecretFromOutside,
];
