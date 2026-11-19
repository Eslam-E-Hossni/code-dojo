/**
 * The rules of a GitHub Actions workflow (.github/workflows/*.yml).
 *
 * They look at the structure of the file, never at its exact text: a job
 * may have any name, steps may have a `name`, and a list may be written
 * [main] or as items under each other.
 */

import {
  firstUnknown,
  looksSecret,
  nodeMajor,
  orderVerdict,
  swallowsFailure,
  unknownKey,
  usesNpmCi,
  usesNpmInstall,
  kindsOf,
  type Command,
} from "./pipeline";
import { PASS, code, fail, todo, type Rule } from "./types";
import { dict, strings, text, type Dict, type Path, type YamlFile } from "./yaml";

const TOP_KEYS = ["name", "run-name", "on", "permissions", "env", "defaults", "concurrency", "jobs"];
const JOB_KEYS = [
  "name", "permissions", "needs", "if", "runs-on", "environment", "concurrency", "outputs", "env", "defaults",
  "steps", "timeout-minutes", "strategy", "continue-on-error", "container", "services", "uses", "with", "secrets",
];
const STEP_KEYS = [
  "id", "if", "name", "uses", "run", "shell", "with", "env", "continue-on-error", "timeout-minutes",
  "working-directory",
];

interface Step {
  raw: Dict;
  path: Path;
  /** "actions/checkout" for uses: actions/checkout@v7. Empty when the step has no `uses`. */
  action: string;
  /** The part after "@", or null. */
  ref: string | null;
  run: string | null;
  with: Dict | null;
  env: Dict | null;
}

interface Job {
  id: string;
  raw: Dict;
  path: Path;
  steps: Step[];
}

function rootOf(file: YamlFile): Dict | null {
  return dict(file.data);
}

function jobsOf(file: YamlFile): Job[] {
  const root = rootOf(file);
  const all = root ? dict(root.jobs) : null;
  if (!all) return [];
  const out: Job[] = [];
  for (const id of Object.keys(all)) {
    const raw = dict(all[id]);
    if (!raw) continue;
    const steps: Step[] = [];
    const list = Array.isArray(raw.steps) ? raw.steps : [];
    for (let i = 0; i < list.length; i++) {
      const step = dict(list[i]);
      if (!step) continue;
      const uses = text(step.uses);
      const at = uses.lastIndexOf("@");
      steps.push({
        raw: step,
        path: ["jobs", id, "steps", i],
        action: at === -1 ? uses : uses.slice(0, at),
        ref: at === -1 ? null : uses.slice(at + 1),
        run: typeof step.run === "string" ? step.run : null,
        with: dict(step.with),
        env: dict(step.env),
      });
    }
    out.push({ id, raw, path: ["jobs", id], steps });
  }
  return out;
}

function allSteps(jobs: Job[]): Step[] {
  const out: Step[] = [];
  for (const job of jobs) for (const step of job.steps) out.push(step);
  return out;
}

function commandsOf(file: YamlFile, job: Job): Command[] {
  const out: Command[] = [];
  for (const step of job.steps) {
    if (step.run !== null) out.push({ text: step.run, line: file.lineOf(step.path) });
  }
  return out;
}

/** The events of `on`, whatever way it is written: a word, a list, or a map. */
function triggersOf(file: YamlFile): Map<string, Dict | null> | null {
  const root = rootOf(file);
  if (!root || root.on === undefined || root.on === null) return null;
  const out = new Map<string, Dict | null>();
  const map = dict(root.on);
  if (map) {
    for (const event of Object.keys(map)) out.set(event, dict(map[event]));
  } else {
    for (const event of strings(root.on)) out.set(event, null);
  }
  return out;
}

function matchesMain(pattern: string): boolean {
  return pattern === "main" || pattern === "*" || pattern === "**";
}

/** True when the value is written in the file itself, and not taken from an expression. */
function isLiteral(value: unknown): boolean {
  const written = text(value);
  return written !== "" && !written.includes("${{");
}

type GhRule = Rule<YamlFile>;

const trigger: GhRule = {
  id: "gh-trigger",
  title: "بيشتغل مع كل push على `main` ومع كل pull request",
  why: "الـ CI ليه وقتين: قبل الدمج علشان الـ PR اللي بايظ ميدخلش، وبعد الدمج علشان تتأكد إن `main` نفسه سليم. من غير `pull_request` المشكلة بتبان بعد ما تتدمج.",
  check(file) {
    if (!rootOf(file)) return todo("الملف لسه فاضي.");
    const events = triggersOf(file);
    if (!events) return todo("لسه مفيش `on`.");

    const missing: string[] = [];
    if (!events.has("push")) {
      missing.push("push");
    } else {
      const push = events.get("push");
      if (push && push.branches !== undefined && !strings(push.branches).some(matchesMain)) {
        return fail("`push` متحدد بـ branches مفيهاش `main`.", file.lineOfKey(["on", "push", "branches"]));
      }
      if (push && strings(push["branches-ignore"]).some(matchesMain)) {
        return fail("`main` محطوط في `branches-ignore`.", file.lineOfKey(["on", "push", "branches-ignore"]));
      }
    }
    if (!events.has("pull_request")) missing.push("pull_request");
    return missing.length === 0 ? PASS : todo("لسه ناقص: " + missing.map(code).join(" و "));
  },
};

const triggerMainOnly: GhRule = {
  id: "gh-trigger-main-only",
  title: "بيشتغل مع الـ push على `main` بس، مش مع الـ pull requests",
  why: "الـ workflow ده بيرفع image على الـ registry. لو اشتغل مع كل PR، أي كود لسه ما اتراجعش هيتبني ويترفع، والـ secrets ممكن توصل لكود من fork. الرفع بيحصل بعد الدمج بس.",
  check(file) {
    if (!rootOf(file)) return todo("الملف لسه فاضي.");
    const events = triggersOf(file);
    if (!events) return todo("لسه مفيش `on`.");
    if (events.has("pull_request")) {
      return fail("فيه `pull_request` في `on`، فالـ image هتتبني وتترفع من أي PR.", file.lineOfKey(["on", "pull_request"]));
    }
    if (!events.has("push")) return todo("لسه مفيش `push`.");
    const push = events.get("push");
    const branches = push ? push.branches : undefined;
    if (branches === undefined || branches === null) {
      return todo("`push` من غير `branches` بيشتغل على كل الـ branches. حدّد `main`.");
    }
    const list = strings(branches);
    if (!list.includes("main")) return fail("الـ branches المكتوبة مفيهاش `main`.", file.lineOfKey(["on", "push", "branches"]));
    if (list.length > 1) return fail("فيه branches غير `main`.", file.lineOfKey(["on", "push", "branches"]));
    return PASS;
  },
};

const runsOn: GhRule = {
  id: "gh-runs-on",
  title: "كل job محدد لها `runs-on`",
  why: "كل job بتشتغل على جهاز جديد اسمه runner، ولازم تقول نوعه. من غير `runs-on` الـ workflow بيترفض قبل ما يبدأ. والمفتاح بشرطة مش underscore: الاسم الغلط بيتجاهل أو بيترفض.",
  check(file) {
    const jobs = jobsOf(file);
    if (jobs.length === 0) return todo("لسه مفيش jobs.");
    for (const job of jobs) {
      // A job that calls a reusable workflow has no runner of its own.
      if (job.raw.uses !== undefined) continue;
      if (text(job.raw["runs-on"]) !== "" || Array.isArray(job.raw["runs-on"]) || dict(job.raw["runs-on"])) continue;
      for (const key of Object.keys(job.raw)) {
        if (key !== "runs-on" && key.toLowerCase().replace(/[-_]/g, "") === "runson") {
          return fail(
            "المفتاح " + code(key) + " في الـ job " + code(job.id) + " مش معروف. الاسم الصح `runs-on` بشرطة.",
            file.lineOfKey([...job.path, key]),
          );
        }
      }
      return todo("الـ job " + code(job.id) + " لسه مفيهاش `runs-on`.");
    }
    return PASS;
  },
};

const checkout: GhRule = {
  id: "gh-checkout",
  title: "الكود بينزل بـ `actions/checkout` قبل أي أمر",
  why: "الـ runner بيبدأ فاضي: مفيش عليه الـ repo. من غير checkout، `npm ci` مش هيلاقي `package.json`. وده بيتكرر في كل job، لأن كل job بتشتغل على جهاز جديد.",
  check(file) {
    const jobs = jobsOf(file);
    let good = 0;
    for (const job of jobs) {
      let checkoutAt = -1;
      let firstNeed = -1;
      for (let i = 0; i < job.steps.length; i++) {
        const step = job.steps[i];
        if (step.action === "actions/checkout" && checkoutAt === -1) checkoutAt = i;
        // A command, or a Docker build from the local folder, needs the files.
        const needsFiles = step.run !== null || (step.action === "docker/build-push-action" && step.with?.context !== undefined);
        if (needsFiles && firstNeed === -1) firstNeed = i;
      }
      if (firstNeed !== -1 && (checkoutAt === -1 || checkoutAt > firstNeed)) {
        return fail(
          checkoutAt === -1
            ? "الـ job " + code(job.id) + " بتشغّل أوامر ومفيهاش `actions/checkout`، فالكود مش موجود على الـ runner."
            : "في الـ job " + code(job.id) + " الـ checkout جاية بعد أول أمر محتاج الكود.",
          file.lineOf(job.steps[firstNeed].path),
        );
      }
      if (checkoutAt !== -1) good++;
    }
    if (good > 0) return PASS;
    return todo(jobs.length === 0 ? "لسه مفيش jobs." : "لسه مفيش `actions/checkout`.");
  },
};

const nodeVersion: GhRule = {
  id: "gh-node-version",
  title: "نسخة Node متحددة بـ `actions/setup-node`",
  why: "الـ runner عليه نسخة Node بتتغير مع الوقت. لما تحددها، الـ CI بيشتغل بنفس النسخة اللي المشروع متجرب عليها، والنتيجة متتغيرش من يوم للتاني.",
  check(file) {
    const steps = allSteps(jobsOf(file)).filter((step) => step.action === "actions/setup-node");
    if (steps.length === 0) return todo("لسه مفيش `actions/setup-node`.");
    for (const step of steps) {
      const inputs = step.with;
      if (inputs && (text(inputs["node-version"]) !== "" || text(inputs["node-version-file"]) !== "")) continue;
      // The classic indentation mistake: valid YAML, but the key landed on the step.
      for (const key of ["node-version", "node-version-file", "cache"]) {
        if (step.raw[key] !== undefined) {
          return fail(
            code(key) + " مكتوبة على مستوى الـ step نفسه، مش جوه `with`. المسافات اللي في أولها ناقصة.",
            file.lineOfKey([...step.path, key]),
          );
        }
      }
      return todo("`actions/setup-node` لسه من غير `node-version` جوه `with`.");
    }
    return PASS;
  },
};

const cache: GhRule = {
  id: "gh-cache",
  title: "الـ dependencies ليها cache",
  why: "تنزيل الـ packages من الأول في كل تشغيل بياخد أغلب وقت الـ CI. الـ cache بيتحفظ بمفتاح معمول من `package-lock.json`، فبيتجدد بس لما الـ dependencies تتغير.",
  check(file) {
    const steps = allSteps(jobsOf(file));
    for (const step of steps) {
      if (step.action === "actions/cache") return PASS;
      if (step.action === "actions/setup-node" && step.with && text(step.with.cache) !== "") return PASS;
    }
    return todo(
      steps.some((step) => step.action === "actions/setup-node")
        ? "لسه مفيش `cache` جوه `with` بتاع `actions/setup-node`."
        : "لسه مفيش cache.",
    );
  },
};

const npmCi: GhRule = {
  id: "gh-npm-ci",
  title: "التنصيب بـ `npm ci`، مش `npm install`",
  why: "`npm ci` بينصّب بالظبط النسخ اللي في `package-lock.json`، وبيفشل لو الملفين مش متطابقين. `npm install` ممكن يغيّر الـ lock file، فالـ CI يختبر نسخ غير اللي على جهازك.",
  check(file) {
    let sawCi = false;
    for (const step of allSteps(jobsOf(file))) {
      if (step.run === null) continue;
      if (usesNpmInstall(step.run)) return fail("الخطوة دي بتستخدم `npm install`.", file.lineOf(step.path));
      if (usesNpmCi(step.run)) sawCi = true;
    }
    return sawCi ? PASS : todo("لسه مفيش `npm ci`.");
  },
};

const runsTests: GhRule = {
  id: "gh-runs-tests",
  title: "فيه خطوة بتشغّل الـ tests",
  why: "ده الهدف من الـ CI: الـ tests تشتغل لوحدها مع كل تغيير، ومحدش يعتمد على إن كل واحد شغّلها على جهازه.",
  check(file) {
    for (const step of allSteps(jobsOf(file))) {
      if (step.run !== null && kindsOf(step.run).includes("test")) return PASS;
    }
    return todo("لسه مفيش خطوة بتشغّل `npm test`.");
  },
};

function order(id: string, title: string, why: string, required: Parameters<typeof orderVerdict>[1]): GhRule {
  return {
    id,
    title,
    why,
    check(file) {
      const jobs = jobsOf(file);
      return orderVerdict(
        jobs.map((job) => commandsOf(file, job)),
        required,
      );
    },
  };
}

const ORDER_WHY =
  "الترتيب من الأسرع والأرخص للأبطأ: الـ lint بيخلص في ثواني، وبعده الـ type-check، وبعده الـ tests، والـ build في الآخر. لو فيه غلطة بسيطة، الـ pipeline يقف بدري ومتستناش الـ build.";

const stepsInOrder = order(
  "gh-order",
  "الخطوات بالترتيب: التنصيب الأول، وبعده باقي الأوامر",
  "كل أمر `npm run` محتاج الـ packages تكون متنصّبة. لو الترتيب اتلخبط، أول أمر هيفشل علشان مفيش `node_modules`. والـ tests قبل الـ build: مفيش فايدة تبني كود الـ tests بتاعته واقعة.",
  ["install"],
);

const fullOrder = order(
  "gh-order-full",
  "lint، وبعده type-check، وبعده tests، وبعده build",
  ORDER_WHY,
  ["install", "lint", "typecheck", "test", "build"],
);

const stopsOnFailure: GhRule = {
  id: "gh-stops-on-failure",
  title: "أي خطوة تفشل بتوقّف الـ job",
  why: "ده السلوك الافتراضي: أول أمر يرجّع خطأ بيوقّف الـ job وبيعلّم الـ workflow أحمر. `continue-on-error: true` أو `|| true` بيخبّوا الفشل، فالـ PR يبان أخضر وهو بايظ.",
  check(file) {
    const jobs = jobsOf(file);
    let sawStep = false;
    for (const job of jobs) {
      if (job.raw["continue-on-error"] === true) {
        return fail("الـ job " + code(job.id) + " عليها `continue-on-error: true`.", file.lineOfKey([...job.path, "continue-on-error"]));
      }
      for (const step of job.steps) {
        sawStep = true;
        if (step.raw["continue-on-error"] === true) {
          return fail("الخطوة دي عليها `continue-on-error: true`.", file.lineOfKey([...step.path, "continue-on-error"]));
        }
        if (step.run !== null && swallowsFailure(step.run)) {
          return fail("الأمر ده آخره `|| true`، فعمره ما هيفشل.", file.lineOf(step.path));
        }
      }
    }
    return sawStep ? PASS : todo("لسه مفيش خطوات.");
  },
};

/** Every map where a value could be a secret: env at each level, and the inputs of an action. */
function valueMaps(file: YamlFile): { map: Dict; path: Path }[] {
  const out: { map: Dict; path: Path }[] = [];
  const root = rootOf(file);
  const rootEnv = root ? dict(root.env) : null;
  if (rootEnv) out.push({ map: rootEnv, path: ["env"] });
  for (const job of jobsOf(file)) {
    const jobEnv = dict(job.raw.env);
    if (jobEnv) out.push({ map: jobEnv, path: [...job.path, "env"] });
    for (const step of job.steps) {
      if (step.env) out.push({ map: step.env, path: [...step.path, "env"] });
      if (step.with) out.push({ map: step.with, path: [...step.path, "with"] });
    }
  }
  return out;
}

const noPlainSecrets: GhRule = {
  id: "gh-no-plain-secrets",
  title: "مفيش secret مكتوب في الملف",
  why: "ملف الـ workflow في الـ repo، وأي حد يقدر يقراه هو وتاريخه. الـ token المكتوب فيه يعتبر اتسرّب حتى لو مسحته بعدين. الأسرار بتتسجّل في إعدادات الـ repo وبتتقري بـ `${{ secrets.NAME }}`.",
  check(file) {
    for (const { map, path } of valueMaps(file)) {
      for (const key of Object.keys(map)) {
        if (looksSecret(key) && isLiteral(map[key])) {
          return fail(code(key) + " قيمته مكتوبة في الملف نفسه.", file.lineOfKey([...path, key]));
        }
      }
    }
    return allSteps(jobsOf(file)).length > 0 ? PASS : todo("لسه مفيش خطوات.");
  },
};

const usesSecrets: GhRule = {
  id: "gh-uses-secrets",
  title: "السر بييجي من الـ secrets store بـ `${{ secrets.NAME }}`",
  why: "الخطوة دي محتاجة token أو باسورد. GitHub بيخزّنه مشفّر، بيبعته للـ runner وقت التشغيل بس، وبيخفيه من الـ logs. والملف نفسه يفضل آمن يتشاف.",
  check(file) {
    for (const { map } of valueMaps(file)) {
      for (const key of Object.keys(map)) {
        if (/\$\{\{\s*secrets\.[A-Za-z_][A-Za-z0-9_]*\s*\}\}/.test(text(map[key]))) return PASS;
      }
    }
    return todo("لسه مفيش قيمة جاية من `secrets`.");
  },
};

/** The job that deploys: named so, or tied to an environment. */
function deployJob(jobs: Job[]): Job | null {
  for (const job of jobs) {
    if (/deploy/i.test(job.id) || job.raw.environment !== undefined) return job;
  }
  return null;
}

const MAIN_ONLY = /github\.ref\s*==\s*['"]refs\/heads\/main['"]|github\.ref_name\s*==\s*['"]main['"]/;

const deployGated: GhRule = {
  id: "gh-deploy-gated",
  title: "الـ deploy بيشتغل على `main` بس، وبعد ما الـ build ينجح",
  why: "الـ jobs بتشتغل مع بعض في نفس الوقت إلا لو قلت غير كده. `needs` بيخلّي الـ deploy يستنى الـ build، ولو الـ build فشل الـ deploy بيتلغي. وشرط `if` بيمنع النشر من أي PR أو branch تاني.",
  check(file) {
    const jobs = jobsOf(file);
    const deploy = deployJob(jobs);
    if (!deploy) return todo("لسه مفيش job للـ deploy.");

    const condition = text(deploy.raw.if);
    if (/always\(\)/.test(condition)) {
      return fail("`always()` بيخلّي الـ deploy يشتغل حتى لو الـ build فشل.", file.lineOfKey([...deploy.path, "if"]));
    }
    const needs = strings(deploy.raw.needs);
    for (const name of needs) {
      if (!jobs.some((job) => job.id === name)) {
        return fail("`needs` بيشاور على job مش موجودة: " + code(name), file.lineOfKey([...deploy.path, "needs"]));
      }
    }
    const missing: string[] = [];
    if (needs.length === 0) missing.push("`needs` على الـ job اللي بتبني");
    if (!MAIN_ONLY.test(condition)) missing.push("شرط `if` إن الـ branch هو `main`");
    return missing.length === 0 ? PASS : todo("لسه ناقص: " + missing.join("، و "));
  },
};

const environment: GhRule = {
  id: "gh-environment",
  title: "الـ deploy مربوط بـ `environment`",
  why: "الـ environment اسم لمكان النشر، زي production. عليه بتتظبط الموافقة (required reviewers) والـ secrets الخاصة بيه من إعدادات الـ repo. الـ job بتقف مستنية لحد ما حد يوافق. الموافقة نفسها مش بتتكتب في الـ YAML.",
  check(file) {
    const deploy = deployJob(jobsOf(file));
    if (!deploy) return todo("لسه مفيش job للـ deploy.");
    const value = deploy.raw.environment;
    const name = dict(value) ? text(dict(value)?.name) : text(value);
    return name !== "" ? PASS : todo("الـ job " + code(deploy.id) + " لسه مفيهاش `environment`.");
  },
};

const uploadArtifact: GhRule = {
  id: "gh-upload-artifact",
  title: "ناتج الـ build بيتحفظ كـ artifact",
  why: "كل job بتشتغل على جهاز جديد، فالملفات اللي الـ build طلّعها بتضيع لما الـ job تخلص. الـ artifact بيحفظها علشان job تانية تاخدها، أو علشان تنزّلها بعدين.",
  check(file) {
    for (const step of allSteps(jobsOf(file))) {
      if (step.action !== "actions/upload-artifact") continue;
      if (step.with && text(step.with.path) !== "") return PASS;
      return todo("`actions/upload-artifact` لسه من غير `path` جوه `with`.");
    }
    return todo("لسه مفيش `actions/upload-artifact`.");
  },
};

const downloadArtifact: GhRule = {
  id: "gh-download-artifact",
  title: "الـ deploy بياخد الـ artifact اللي الـ build طلّعه",
  why: "الـ deploy لازم ينشر نفس الملفات اللي اتبنت واتختبرت، مش يبني من الأول. `actions/download-artifact` بينزّلها على الـ runner الجديد بتاع الـ job دي.",
  check(file) {
    const deploy = deployJob(jobsOf(file));
    if (!deploy) return todo("لسه مفيش job للـ deploy.");
    return deploy.steps.some((step) => step.action === "actions/download-artifact")
      ? PASS
      : todo("الـ job " + code(deploy.id) + " لسه مفيهاش `actions/download-artifact`.");
  },
};

const matrix: GhRule = {
  id: "gh-matrix",
  title: "الـ job بتشتغل على Node 20 و 22 بـ matrix",
  why: "الـ matrix بتشغّل نفس الـ job مرة لكل قيمة، مع بعض. كده تعرف إن الكود شغال على كل نسخة Node بتدعمها من غير ما تكرر الـ job بإيدك.",
  check(file) {
    for (const job of jobsOf(file)) {
      const strategy = dict(job.raw.strategy);
      const cells = strategy ? dict(strategy.matrix) : null;
      if (!cells) continue;
      for (const key of Object.keys(cells)) {
        const majors = (Array.isArray(cells[key]) ? (cells[key] as unknown[]) : []).map(nodeMajor);
        if (!majors.includes(20) || !majors.includes(22)) continue;
        const setup = job.steps.find((step) => step.action === "actions/setup-node");
        const version = setup?.with ? text(setup.with["node-version"]) : "";
        return version.includes("matrix." + key)
          ? PASS
          : todo("`node-version` لسه مش بياخد قيمته من " + code("matrix." + key) + ".");
      }
      return todo("الـ matrix لسه مفيهاش list فيها 20 و 22.");
    }
    return todo("لسه مفيش `strategy` فيها `matrix`.");
  },
};

const dockerPush: GhRule = {
  id: "gh-docker-push",
  title: "تسجيل دخول للـ registry، وبعده build و push",
  why: "الـ registry مش بيقبل push من غير تسجيل دخول، فالـ login لازم ييجي الأول. و `push: true` هي اللي بترفع الـ image: من غيرها الـ image بتتبني على الـ runner وبتتمسح معاه.",
  check(file) {
    const steps = allSteps(jobsOf(file));
    const loginAt = steps.findIndex((step) => step.action === "docker/login-action");
    const buildAt = steps.findIndex((step) => step.action === "docker/build-push-action");
    if (buildAt !== -1 && loginAt > buildAt) {
      return fail("الـ login جاي بعد الـ build، فالـ push هيترفض.", file.lineOf(steps[loginAt].path));
    }
    if (loginAt === -1) return todo("لسه مفيش `docker/login-action`.");
    if (buildAt === -1) return todo("لسه مفيش `docker/build-push-action`.");
    const inputs = steps[buildAt].with;
    if (!inputs || text(inputs.push) !== "true") return todo("لسه مفيش `push: true`، فالـ image هتتبني ومش هتترفع.");
    if (text(inputs.tags) === "") return todo("لسه مفيش `tags`: الـ image محتاجة اسم علشان تترفع.");
    return PASS;
  },
};

const imageTag: GhRule = {
  id: "gh-image-tag",
  title: "الـ image ليها tag مختلف لكل commit، مش `latest` بس",
  why: "لو كل image اسمها `latest`، مش هتعرف أنهي كود شغال في الـ production ومش هتعرف ترجع لنسخة قبلها. الـ tag المعمول من الـ commit SHA بيربط كل image بالكود اللي اتبنت منه.",
  check(file) {
    const build = allSteps(jobsOf(file)).find((step) => step.action === "docker/build-push-action");
    const tags = build?.with ? text(build.with.tags) : "";
    if (tags === "") return todo("لسه مفيش `tags`.");
    if (/github\.(sha|run_number|run_id|ref_name)|steps\./.test(tags)) return PASS;
    return fail("الـ tag ثابت ومش بيتغير من commit للتاني.", file.lineOfKey([...(build as Step).path, "with", "tags"]));
  },
};

const pinnedActions: GhRule = {
  id: "gh-pinned-actions",
  title: "كل action متثبّتة بنسخة",
  why: "الـ action كود حد تاني بيشتغل جوه الـ CI بتاعك ومعاه الـ secrets. من غير نسخة، أو بـ `@main`، أي تغيير عندهم بيوصلك من غير ما تعرف. النسخة بتخلّي التحديث قرارك إنت.",
  check(file) {
    let sawAction = false;
    for (const step of allSteps(jobsOf(file))) {
      if (step.action === "" || step.action.startsWith("./")) continue;
      sawAction = true;
      if (step.ref === null || step.ref === "") {
        return fail(code(step.action) + " من غير نسخة بعد `@`.", file.lineOf(step.path));
      }
      if (step.ref === "main" || step.ref === "master") {
        return fail(code(step.action + "@" + step.ref) + " بتشاور على branch بيتغير.", file.lineOf(step.path));
      }
    }
    return sawAction ? PASS : todo("لسه مفيش `uses`.");
  },
};

const knownKeys: GhRule = {
  id: "gh-known-keys",
  title: "كل المفاتيح مكتوبة صح وفي مكانها",
  why: "GitHub بيرفض الـ workflow لو فيه مفتاح ميعرفوش. وغلطة المسافات بتعمل نفس النتيجة: المفتاح بيبقى صح، بس في مستوى غلط.",
  check(file) {
    const root = rootOf(file);
    if (!root) return todo("الملف لسه فاضي.");
    const top = firstUnknown(Object.keys(root), TOP_KEYS);
    if (top !== null) return fail(unknownKey(top, TOP_KEYS, "في أول الملف"), file.lineOfKey([top]));

    const jobs = jobsOf(file);
    for (const job of jobs) {
      const inJob = firstUnknown(Object.keys(job.raw), JOB_KEYS);
      if (inJob !== null) {
        return fail(unknownKey(inJob, JOB_KEYS, "في الـ job " + code(job.id)), file.lineOfKey([...job.path, inJob]));
      }
      for (const step of job.steps) {
        const inStep = firstUnknown(Object.keys(step.raw), STEP_KEYS);
        if (inStep !== null) {
          return fail(unknownKey(inStep, STEP_KEYS, "في الخطوة"), file.lineOfKey([...step.path, inStep]));
        }
      }
    }
    return jobs.length > 0 ? PASS : todo("لسه مفيش jobs.");
  },
};

const variables: GhRule = {
  id: "gh-variables",
  title: "فيه متغير عادي في `env`",
  why: "الإعدادات اللي مش أسرار، زي عنوان الـ API، بتتكتب في `env` عادي. على مستوى الـ workflow بتوصل لكل الـ jobs. اللي في `env` ظاهر في الملف، فمكانه مش للأسرار.",
  check(file) {
    const root = rootOf(file);
    const maps: (Dict | null)[] = [root ? dict(root.env) : null];
    for (const job of jobsOf(file)) maps.push(dict(job.raw.env));
    for (const map of maps) {
      if (!map) continue;
      for (const key of Object.keys(map)) {
        if (!looksSecret(key) && text(map[key]) !== "") return PASS;
      }
    }
    return todo("لسه مفيش `env` فيه متغير على مستوى الـ workflow.");
  },
};

export const GITHUB_RULES: GhRule[] = [
  trigger,
  triggerMainOnly,
  runsOn,
  checkout,
  nodeVersion,
  cache,
  npmCi,
  runsTests,
  stepsInOrder,
  fullOrder,
  stopsOnFailure,
  noPlainSecrets,
  usesSecrets,
  deployGated,
  environment,
  uploadArtifact,
  downloadArtifact,
  matrix,
  dockerPush,
  imageTag,
  pinnedActions,
  knownKeys,
  variables,
];
