/**
 * The rules of an Azure Pipelines file (azure-pipelines.yml).
 *
 * A pipeline can be written in three shapes, and the rules read all of
 * them: steps at the top, a list of jobs, or stages with jobs inside. A
 * deployment job keeps its steps under strategy.runOnce.deploy.
 */

import {
  firstUnknown,
  kindsOf,
  looksSecret,
  nodeMajor,
  orderVerdict,
  swallowsFailure,
  unknownKey,
  usesNpmCi,
  usesNpmInstall,
  type Command,
  type CommandKind,
} from "./pipeline";
import { PASS, code, fail, todo, type Rule } from "./types";
import { dict, strings, text, type Dict, type Path, type YamlFile } from "./yaml";

const TOP_KEYS = [
  "name", "trigger", "pr", "schedules", "pool", "variables", "parameters", "resources", "stages", "jobs", "steps",
  "strategy", "extends", "container", "services", "workspace", "lockBehavior", "appendCommitMessageToRunName",
];
const STAGE_KEYS = [
  "stage", "displayName", "dependsOn", "condition", "variables", "jobs", "pool", "lockBehavior", "trigger",
  "isSkippable", "templateContext", "template", "parameters",
];
const JOB_KEYS = [
  "job", "deployment", "displayName", "dependsOn", "condition", "strategy", "continueOnError", "pool", "workspace",
  "container", "services", "timeoutInMinutes", "cancelTimeoutInMinutes", "variables", "steps", "environment", "uses",
  "templateContext", "template", "parameters",
];
const STEP_KEYS = [
  "script", "bash", "pwsh", "powershell", "task", "checkout", "download", "publish", "template", "parameters",
  "displayName", "name", "condition", "continueOnError", "enabled", "env", "inputs", "timeoutInMinutes",
  "retryCountOnTaskFailure", "target", "workingDirectory", "failOnStderr", "artifact", "clean", "fetchDepth",
  "fetchTags", "persistCredentials", "submodules", "lfs", "path", "patterns",
];

/** Inputs that name a service connection: the credentials live in the project settings. */
const CONNECTION_INPUTS = [
  "containerRegistry", "azureSubscription", "connectedServiceName", "connectedServiceNameARM",
  "dockerRegistryServiceConnection", "kubernetesServiceConnection", "serviceConnection",
];

interface Step {
  raw: Dict;
  path: Path;
  /** The command of a script step (script, bash, pwsh, powershell), or null. */
  script: string | null;
  /** "Cache" for task: Cache@2. Empty when the step is not a task. */
  task: string;
  inputs: Dict | null;
  env: Dict | null;
}

interface Job {
  name: string;
  kind: "job" | "deployment" | "implicit";
  raw: Dict;
  path: Path;
  steps: Step[];
  stage: Stage | null;
}

interface Stage {
  name: string;
  index: number;
  raw: Dict;
  path: Path;
  jobs: Job[];
}

interface Pipeline {
  root: Dict | null;
  stages: Stage[];
  /** Every job of the file, whatever shape it is written in. */
  jobs: Job[];
}

function readSteps(list: unknown, path: Path): Step[] {
  const out: Step[] = [];
  if (!Array.isArray(list)) return out;
  for (let i = 0; i < list.length; i++) {
    const raw = dict(list[i]);
    if (!raw) continue;
    let script: string | null = null;
    for (const key of ["script", "bash", "pwsh", "powershell"]) {
      if (typeof raw[key] === "string") script = raw[key] as string;
    }
    const task = text(raw.task);
    out.push({
      raw,
      path: [...path, i],
      script,
      task: task.includes("@") ? task.slice(0, task.indexOf("@")) : task,
      inputs: dict(raw.inputs),
      env: dict(raw.env),
    });
  }
  return out;
}

function readJobs(list: unknown, path: Path, stage: Stage | null): Job[] {
  const out: Job[] = [];
  if (!Array.isArray(list)) return out;
  for (let i = 0; i < list.length; i++) {
    const raw = dict(list[i]);
    if (!raw) continue;
    const jobPath = [...path, i];
    if (raw.deployment !== undefined) {
      // The steps of a deployment job sit under the hooks of its strategy.
      const strategy = dict(raw.strategy);
      const runOnce = strategy ? dict(strategy.runOnce) : null;
      const steps: Step[] = [];
      if (runOnce) {
        for (const hook of ["preDeploy", "deploy", "routeTraffic", "postRouteTraffic"]) {
          const body = dict(runOnce[hook]);
          if (!body) continue;
          for (const step of readSteps(body.steps, [...jobPath, "strategy", "runOnce", hook, "steps"])) steps.push(step);
        }
      }
      out.push({ name: text(raw.deployment), kind: "deployment", raw, path: jobPath, steps, stage });
    } else {
      out.push({
        name: text(raw.job),
        kind: "job",
        raw,
        path: jobPath,
        steps: readSteps(raw.steps, [...jobPath, "steps"]),
        stage,
      });
    }
  }
  return out;
}

function read(file: YamlFile): Pipeline {
  const root = dict(file.data);
  const stages: Stage[] = [];
  const jobs: Job[] = [];
  if (!root) return { root, stages, jobs };

  if (Array.isArray(root.stages)) {
    for (let i = 0; i < root.stages.length; i++) {
      const raw = dict(root.stages[i]);
      if (!raw) continue;
      const stage: Stage = { name: text(raw.stage), index: stages.length, raw, path: ["stages", i], jobs: [] };
      stage.jobs = readJobs(raw.jobs, ["stages", i, "jobs"], stage);
      stages.push(stage);
      for (const job of stage.jobs) jobs.push(job);
    }
  } else if (Array.isArray(root.jobs)) {
    for (const job of readJobs(root.jobs, ["jobs"], null)) jobs.push(job);
  } else if (root.steps !== undefined) {
    jobs.push({ name: "", kind: "implicit", raw: root, path: [], steps: readSteps(root.steps, ["steps"]), stage: null });
  }
  return { root, stages, jobs };
}

function allSteps(pipeline: Pipeline): Step[] {
  const out: Step[] = [];
  for (const job of pipeline.jobs) for (const step of job.steps) out.push(step);
  return out;
}

function commandsOf(file: YamlFile, job: Job): Command[] {
  const out: Command[] = [];
  for (const step of job.steps) {
    if (step.script !== null) out.push({ text: step.script, line: file.lineOf(step.path) });
  }
  return out;
}

/**
 * The branches of `trigger` or `pr`: a list, the word none, or a map with
 * branches.include. Undefined when the key is missing or still empty.
 */
function branchesOf(value: unknown): string[] | "none" | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === "none") return "none";
  const map = dict(value);
  if (map) {
    const branches = dict(map.branches);
    if (branches) return strings(branches.include);
    return map.branches === undefined ? undefined : strings(map.branches);
  }
  return strings(value);
}

function matchesMain(pattern: string): boolean {
  return pattern === "main" || pattern === "refs/heads/main" || pattern === "*";
}

type AzRule = Rule<YamlFile>;

const trigger: AzRule = {
  id: "az-trigger",
  title: "بيشتغل مع كل push على `main` ومع كل pull request عليه",
  why: "الـ CI ليه وقتين: قبل الدمج علشان الـ PR اللي بايظ ميدخلش، وبعد الدمج علشان تتأكد إن `main` سليم. في Azure هم مفتاحين: `trigger` و `pr`. و `pr` في الـ YAML بيشتغل لو الكود على GitHub أو Bitbucket. في Azure Repos فحص الـ PR بيتظبط من branch policy.",
  check(file) {
    const { root } = read(file);
    if (!root) return todo("الملف لسه فاضي.");
    const missing: string[] = [];
    const keys: ["trigger", "pr"] = ["trigger", "pr"];
    for (const key of keys) {
      const branches = branchesOf(root[key]);
      if (branches === undefined) {
        missing.push(key);
      } else if (branches === "none") {
        return fail(
          key === "trigger" ? "`trigger: none` بيوقّف التشغيل مع الـ push." : "`pr: none` بيوقّف فحص الـ pull requests.",
          file.lineOfKey([key]),
        );
      } else if (!branches.some(matchesMain)) {
        return fail(code(key) + " مكتوب فيه branches مفيهاش `main`.", file.lineOfKey([key]));
      }
    }
    return missing.length === 0 ? PASS : todo("لسه ناقص: " + missing.map(code).join(" و "));
  },
};

const triggerMainOnly: AzRule = {
  id: "az-trigger-main-only",
  title: "بيشتغل مع الـ push على `main` بس، مش مع الـ pull requests",
  why: "الـ pipeline ده بيرفع image على الـ registry. لو اشتغل مع كل PR، كود لسه ما اتراجعش هيتبني ويترفع. `pr: none` بيقفل فحص الـ PR للملف ده، والرفع يحصل بعد الدمج بس.",
  check(file) {
    const { root } = read(file);
    if (!root) return todo("الملف لسه فاضي.");
    const pushed = branchesOf(root.trigger);
    if (pushed === "none") return fail("`trigger: none` بيوقّف التشغيل خالص.", file.lineOfKey(["trigger"]));
    if (pushed !== undefined && !pushed.includes("main")) {
      return fail("`trigger` مكتوب فيه branches مفيهاش `main`.", file.lineOfKey(["trigger"]));
    }
    if (pushed !== undefined && pushed.length > 1) return fail("فيه branches غير `main` في `trigger`.", file.lineOfKey(["trigger"]));
    const pulls = branchesOf(root.pr);
    if (pulls !== undefined && pulls !== "none") {
      return fail("`pr` مفتوح، فالـ image هتتبني وتترفع من الـ pull requests.", file.lineOfKey(["pr"]));
    }
    if (pushed === undefined) return todo("لسه مفيش `trigger` على `main`.");
    if (pulls === undefined) return todo("من غير `pr: none`، الـ pull requests هتشغّل الـ pipeline ده كمان.");
    return PASS;
  },
};

function poolProblem(file: YamlFile, value: unknown, path: Path): ReturnType<AzRule["check"]> | null {
  if (typeof value === "string" && value !== "") return PASS;
  const map = dict(value);
  if (!map) return null;
  if (text(map.vmImage) !== "" || text(map.name) !== "") return PASS;
  for (const key of Object.keys(map)) {
    if (key !== "vmImage" && key.toLowerCase().replace(/[-_]/g, "") === "vmimage") {
      return fail("المفتاح " + code(key) + " مش معروف. الاسم الصح `vmImage`، والـ I كابيتال.", file.lineOfKey([...path, key]));
    }
  }
  return null;
}

const pool: AzRule = {
  id: "az-pool",
  title: "الـ agent متحدد بـ `pool`",
  why: "الـ agent هو الجهاز اللي الـ pipeline بيشتغل عليه. `vmImage` بتطلب جهاز جاهز من Microsoft بالنظام اللي تختاره. لو اتكتبت على مستوى الـ pipeline، كل الـ jobs بتاخدها.",
  check(file) {
    const pipeline = read(file);
    if (!pipeline.root) return todo("الملف لسه فاضي.");
    const atTop = poolProblem(file, pipeline.root.pool, ["pool"]);
    if (atTop) return atTop;
    // Not at the top: then every job, or its stage, must have one.
    let covered = pipeline.jobs.length > 0;
    for (const job of pipeline.jobs) {
      const own = job.kind === "implicit" ? null : poolProblem(file, job.raw.pool, [...job.path, "pool"]);
      const ofStage = job.stage ? poolProblem(file, job.stage.raw.pool, [...job.stage.path, "pool"]) : null;
      const verdict = own ?? ofStage;
      if (verdict && verdict.status === "fail") return verdict;
      if (!verdict) covered = false;
    }
    return covered ? PASS : todo(pipeline.root.pool === undefined ? "لسه مفيش `pool`." : "`pool` لسه من غير `vmImage`.");
  },
};

const NODE_TASKS: Record<string, { input: string; other: string }> = {
  UseNode: { input: "version", other: "versionSpec" },
  NodeTool: { input: "versionSpec", other: "version" },
};

/** The steps that install Node, with the name of their version input. */
function nodeSteps(pipeline: Pipeline): Step[] {
  return allSteps(pipeline).filter((step) => NODE_TASKS[step.task] !== undefined);
}

const nodeVersion: AzRule = {
  id: "az-node-version",
  title: "نسخة Node متحددة بـ task",
  why: "الـ agent عليه نسخة Node بتتغير مع الوقت. لما تحددها بـ `UseNode@1`، الـ pipeline بيشتغل بنفس النسخة اللي المشروع متجرب عليها، والنتيجة متتغيرش من يوم للتاني.",
  check(file) {
    const steps = nodeSteps(read(file));
    if (steps.length === 0) return todo("لسه مفيش `UseNode@1`.");
    for (const step of steps) {
      const names = NODE_TASKS[step.task];
      if (step.inputs && text(step.inputs[names.input]) !== "") continue;
      if (step.inputs && step.inputs[names.other] !== undefined) {
        return fail(
          code(step.task) + " بياخد النسخة في " + code(names.input) + "، مش " + code(names.other) + ".",
          file.lineOfKey([...step.path, "inputs", names.other]),
        );
      }
      for (const key of [names.input, names.other]) {
        if (step.raw[key] !== undefined) {
          return fail(
            code(key) + " مكتوبة على مستوى الـ step نفسه، مش جوه `inputs`. المسافات اللي في أولها ناقصة.",
            file.lineOfKey([...step.path, key]),
          );
        }
      }
      return todo(code(step.task) + " لسه من غير " + code(names.input) + " جوه `inputs`.");
    }
    return PASS;
  },
};

const cache: AzRule = {
  id: "az-cache",
  title: "الـ dependencies ليها cache بـ `Cache@2`",
  why: "تنزيل الـ packages من الأول في كل تشغيل بياخد أغلب وقت الـ pipeline. الـ `key` معمول من `package-lock.json`، فالـ cache بيتجدد بس لما الـ dependencies تتغير. والـ `path` هو الفولدر اللي npm بيخزّن فيه.",
  check(file) {
    const step = allSteps(read(file)).find((item) => item.task === "Cache");
    if (!step) return todo("لسه مفيش `Cache@2`.");
    const missing: string[] = [];
    if (!step.inputs || text(step.inputs.key) === "") missing.push("key");
    if (!step.inputs || text(step.inputs.path) === "") missing.push("path");
    return missing.length === 0 ? PASS : todo("`Cache@2` لسه ناقصه: " + missing.map(code).join(" و "));
  },
};

const npmCi: AzRule = {
  id: "az-npm-ci",
  title: "التنصيب بـ `npm ci`، مش `npm install`",
  why: "`npm ci` بينصّب بالظبط النسخ اللي في `package-lock.json`، وبيفشل لو الملفين مش متطابقين. `npm install` ممكن يغيّر الـ lock file، فالـ pipeline يختبر نسخ غير اللي على جهازك.",
  check(file) {
    let sawCi = false;
    for (const step of allSteps(read(file))) {
      if (step.task === "Npm" && step.inputs) {
        if (text(step.inputs.command) === "ci") sawCi = true;
        if (text(step.inputs.command) === "install") return fail("الـ task دي بتعمل `npm install`.", file.lineOf(step.path));
      }
      if (step.script === null) continue;
      if (usesNpmInstall(step.script)) return fail("الخطوة دي بتستخدم `npm install`.", file.lineOf(step.path));
      if (usesNpmCi(step.script)) sawCi = true;
    }
    return sawCi ? PASS : todo("لسه مفيش `npm ci`.");
  },
};

const runsTests: AzRule = {
  id: "az-runs-tests",
  title: "فيه خطوة بتشغّل الـ tests",
  why: "ده الهدف من الـ CI: الـ tests تشتغل لوحدها مع كل تغيير، ومحدش يعتمد على إن كل واحد شغّلها على جهازه.",
  check(file) {
    for (const step of allSteps(read(file))) {
      if (step.script !== null && kindsOf(step.script).includes("test")) return PASS;
    }
    return todo("لسه مفيش خطوة بتشغّل `npm test`.");
  },
};

function order(id: string, title: string, why: string, required: CommandKind[]): AzRule {
  return {
    id,
    title,
    why,
    check(file) {
      const pipeline = read(file);
      return orderVerdict(
        pipeline.jobs.map((job) => commandsOf(file, job)),
        required,
      );
    },
  };
}

const stepsInOrder = order(
  "az-order",
  "الخطوات بالترتيب: التنصيب الأول، وبعده باقي الأوامر",
  "كل أمر `npm run` محتاج الـ packages تكون متنصّبة. لو الترتيب اتلخبط، أول أمر هيفشل علشان مفيش `node_modules`. والـ tests قبل الـ build: مفيش فايدة تبني كود الـ tests بتاعته واقعة.",
  ["install"],
);

const fullOrder = order(
  "az-order-full",
  "lint، وبعده type-check، وبعده tests، وبعده build",
  "الترتيب من الأسرع والأرخص للأبطأ: الـ lint بيخلص في ثواني، وبعده الـ type-check، وبعده الـ tests، والـ build في الآخر. لو فيه غلطة بسيطة، الـ pipeline يقف بدري ومتستناش الـ build.",
  ["install", "lint", "typecheck", "test", "build"],
);

const stopsOnFailure: AzRule = {
  id: "az-stops-on-failure",
  title: "أي خطوة تفشل بتوقّف الـ job",
  why: "ده السلوك الافتراضي: أول أمر يرجّع خطأ بيوقّف الـ job وبيعلّم الـ pipeline أحمر. `continueOnError: true` أو `|| true` بيخبّوا الفشل، فالـ PR يبان سليم وهو بايظ.",
  check(file) {
    const pipeline = read(file);
    let sawStep = false;
    for (const job of pipeline.jobs) {
      if (job.kind !== "implicit" && job.raw.continueOnError === true) {
        return fail("الـ job " + code(job.name) + " عليها `continueOnError: true`.", file.lineOfKey([...job.path, "continueOnError"]));
      }
      for (const step of job.steps) {
        sawStep = true;
        if (step.raw.continueOnError === true) {
          return fail("الخطوة دي عليها `continueOnError: true`.", file.lineOfKey([...step.path, "continueOnError"]));
        }
        if (step.script !== null && swallowsFailure(step.script)) {
          return fail("الأمر ده آخره `|| true`، فعمره ما هيفشل.", file.lineOf(step.path));
        }
      }
    }
    return sawStep ? PASS : todo("لسه مفيش خطوات.");
  },
};

/** True when the value is written in the file, and not read from a variable. */
function isLiteral(value: unknown): boolean {
  const written = text(value);
  return written !== "" && !written.includes("$(") && !written.includes("${{") && !written.includes("$[");
}

/** variables can be a map (NAME: value) or a list of { name, value }. */
function variablePairs(value: unknown, path: Path): { name: string; value: unknown; path: Path }[] {
  const out: { name: string; value: unknown; path: Path }[] = [];
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = dict(value[i]);
      if (item && item.name !== undefined) out.push({ name: text(item.name), value: item.value, path: [...path, i] });
    }
  } else {
    const map = dict(value);
    if (map) for (const name of Object.keys(map)) out.push({ name, value: map[name], path: [...path, name] });
  }
  return out;
}

function allVariables(pipeline: Pipeline): { name: string; value: unknown; path: Path }[] {
  const out = pipeline.root ? variablePairs(pipeline.root.variables, ["variables"]) : [];
  for (const stage of pipeline.stages) {
    for (const pair of variablePairs(stage.raw.variables, [...stage.path, "variables"])) out.push(pair);
  }
  for (const job of pipeline.jobs) {
    if (job.kind === "implicit") continue;
    for (const pair of variablePairs(job.raw.variables, [...job.path, "variables"])) out.push(pair);
  }
  return out;
}

const noPlainSecrets: AzRule = {
  id: "az-no-plain-secrets",
  title: "مفيش secret مكتوب في الملف",
  why: "ملف الـ pipeline في الـ repo، وأي حد يقدر يقراه هو وتاريخه. الـ token المكتوب فيه يعتبر اتسرّب حتى لو مسحته بعدين. الأسرار بتتسجّل كـ secret variable في إعدادات الـ pipeline أو في variable group.",
  check(file) {
    const pipeline = read(file);
    for (const pair of allVariables(pipeline)) {
      if (looksSecret(pair.name) && isLiteral(pair.value)) {
        return fail(code(pair.name) + " قيمته مكتوبة في `variables`.", file.lineOfKey(pair.path));
      }
    }
    const steps = allSteps(pipeline);
    for (const step of steps) {
      for (const [map, key] of [[step.env, "env"], [step.inputs, "inputs"]] as const) {
        if (!map) continue;
        for (const name of Object.keys(map)) {
          if (looksSecret(name) && isLiteral(map[name])) {
            return fail(code(name) + " قيمته مكتوبة في الملف نفسه.", file.lineOfKey([...step.path, key, name]));
          }
        }
      }
    }
    return steps.length > 0 ? PASS : todo("لسه مفيش خطوات.");
  },
};

const usesSecrets: AzRule = {
  id: "az-uses-secrets",
  title: "السر بييجي من برّه الملف: secret variable أو service connection",
  why: "الـ secret variable بيتسجّل في إعدادات الـ pipeline، وبيتقري بـ `$(NAME)`. خد بالك: Azure مش بيبعته للـ script لوحده، لازم تمرّره بـ `env`. والـ service connection بيخزّن بيانات الدخول في إعدادات المشروع، والملف بيكتب اسمه بس.",
  check(file) {
    for (const step of allSteps(read(file))) {
      if (step.env) {
        for (const name of Object.keys(step.env)) {
          if (looksSecret(name) && /\$\([A-Za-z_][\w.]*\)/.test(text(step.env[name]))) return PASS;
        }
      }
      if (step.inputs) {
        for (const name of CONNECTION_INPUTS) {
          if (text(step.inputs[name]) !== "") return PASS;
        }
      }
    }
    return todo("لسه مفيش خطوة بتاخد سر من `$(NAME)` أو من service connection.");
  },
};

interface DeployUnit {
  /** The stage or the job that carries dependsOn and condition. */
  raw: Dict;
  path: Path;
  name: string;
  /** True when it is a stage that comes after another stage: Azure then waits for it by itself. */
  impliedOrder: boolean;
  /** The names it may depend on. */
  siblings: string[];
}

function deployUnit(pipeline: Pipeline): DeployUnit | null {
  for (const stage of pipeline.stages) {
    if (/deploy/i.test(stage.name) || stage.jobs.some((job) => job.kind === "deployment")) {
      return {
        raw: stage.raw,
        path: stage.path,
        name: stage.name,
        impliedOrder: stage.index > 0,
        siblings: pipeline.stages.filter((other) => other !== stage).map((other) => other.name),
      };
    }
  }
  if (pipeline.stages.length > 0) return null;
  for (const job of pipeline.jobs) {
    if (job.kind === "deployment" || /deploy/i.test(job.name)) {
      return {
        raw: job.raw,
        path: job.path,
        name: job.name,
        impliedOrder: false,
        siblings: pipeline.jobs.filter((other) => other !== job).map((other) => other.name),
      };
    }
  }
  return null;
}

const ON_MAIN = /Build\.SourceBranch'\]\s*,\s*'refs\/heads\/main'|Build\.SourceBranchName'\]\s*,\s*'main'/;

const deployGated: AzRule = {
  id: "az-deploy-gated",
  title: "الـ deploy بيشتغل على `main` بس، وبعد ما الـ build ينجح",
  why: "`dependsOn` بيخلّي الـ deploy يستنى الـ build. خد بالك من `condition`: أي شرط تكتبه بيلغي الشرط الافتراضي `succeeded()`. فلو كتبت شرط الـ branch لوحده، الـ deploy هيشتغل حتى لو الـ build فشل. علشان كده الاتنين بيتكتبوا مع بعض جوه `and(...)`.",
  check(file) {
    const pipeline = read(file);
    const deploy = deployUnit(pipeline);
    if (!deploy) return todo("لسه مفيش stage أو job للـ deploy.");

    const condition = text(deploy.raw.condition);
    if (/always\(\)/.test(condition)) {
      return fail("`always()` بيخلّي الـ deploy يشتغل حتى لو الـ build فشل.", file.lineOfKey([...deploy.path, "condition"]));
    }
    const onMain = ON_MAIN.test(condition);
    if (onMain && !/succeeded\(/.test(condition)) {
      return fail(
        "الشرط المكتوب لغى `succeeded()` الافتراضي، فالـ deploy هيشتغل حتى لو الـ build فشل. اكتبهم مع بعض في `and(...)`.",
        file.lineOfKey([...deploy.path, "condition"]),
      );
    }

    const depends = deploy.raw.dependsOn;
    if (Array.isArray(depends) && depends.length === 0) {
      return fail("`dependsOn: []` معناه إن الـ deploy مش مستني حاجة.", file.lineOfKey([...deploy.path, "dependsOn"]));
    }
    for (const name of strings(depends)) {
      if (!deploy.siblings.includes(name)) {
        return fail("`dependsOn` بيشاور على اسم مش موجود: " + code(name), file.lineOfKey([...deploy.path, "dependsOn"]));
      }
    }
    const missing: string[] = [];
    if (strings(depends).length === 0 && !deploy.impliedOrder) missing.push("`dependsOn` على اللي بيبني");
    if (!onMain) missing.push("`condition` إن الـ branch هو `main`");
    return missing.length === 0 ? PASS : todo("لسه ناقص: " + missing.join("، و "));
  },
};

const environment: AzRule = {
  id: "az-environment",
  title: "الـ deploy هو `deployment` job مربوطة بـ `environment`",
  why: "الـ environment اسم لمكان النشر، زي production. عليه بتتظبط الموافقات (Approvals and checks) من إعدادات المشروع، والـ job بتقف مستنية لحد ما حد يوافق. و `environment` بتشتغل مع job من نوع `deployment` بس، وهي اللي بتسجّل تاريخ النشر.",
  check(file) {
    const pipeline = read(file);
    for (const job of pipeline.jobs) {
      if (job.kind === "job" && job.raw.environment !== undefined) {
        return fail(
          "`environment` مكتوبة على `job` عادية. لازم الـ job تبقى `deployment`.",
          file.lineOfKey([...job.path, "environment"]),
        );
      }
    }
    const deployment = pipeline.jobs.find((job) => job.kind === "deployment");
    if (!deployment) return todo("لسه مفيش `deployment` job.");
    const value = deployment.raw.environment;
    const name = dict(value) ? text(dict(value)?.name) : text(value);
    if (name === "") return todo("الـ `deployment` لسه مفيهاش `environment`.");
    return deployment.steps.length > 0 ? PASS : todo("الـ `deployment` لسه مفيهاش خطوات تحت `strategy`.");
  },
};

const publishArtifact: AzRule = {
  id: "az-publish-artifact",
  title: "ناتج الـ build بيتحفظ كـ artifact",
  why: "كل job بتشتغل على agent نضيف، فالملفات اللي الـ build طلّعها بتضيع لما الـ job تخلص. `publish` بتحفظها كـ artifact، والـ deployment job بتنزّله لوحدها قبل ما تبدأ.",
  check(file) {
    for (const step of allSteps(read(file))) {
      if (text(step.raw.publish) !== "") return PASS;
      if (step.task === "PublishPipelineArtifact" || step.task === "PublishBuildArtifacts") return PASS;
    }
    return todo("لسه مفيش خطوة `publish`.");
  },
};

const matrix: AzRule = {
  id: "az-matrix",
  title: "الـ job بتشتغل على Node 20 و 22 بـ matrix",
  why: "الـ matrix بتشغّل نفس الـ job مرة لكل إعداد. في Azure كل إعداد ليه اسم، وتحته المتغيرات بتاعته، والخطوات بتقراها بـ `$(name)`. كده تعرف إن الكود شغال على كل نسخة Node بتدعمها.",
  check(file) {
    const pipeline = read(file);
    const holders: Dict[] = pipeline.root ? [pipeline.root] : [];
    for (const job of pipeline.jobs) if (job.kind !== "implicit") holders.push(job.raw);

    for (const holder of holders) {
      const strategy = dict(holder.strategy);
      const cells = strategy ? dict(strategy.matrix) : null;
      if (!cells) continue;
      // Which variable holds the Node version in every cell?
      const majors = new Map<string, (number | null)[]>();
      for (const cell of Object.keys(cells)) {
        const values = dict(cells[cell]);
        if (!values) continue;
        for (const name of Object.keys(values)) {
          const list = majors.get(name) ?? [];
          list.push(nodeMajor(values[name]));
          majors.set(name, list);
        }
      }
      for (const [name, list] of majors) {
        if (!list.includes(20) || !list.includes(22)) continue;
        const used = nodeSteps(pipeline).some((step) => {
          const input = step.inputs ? text(step.inputs[NODE_TASKS[step.task].input]) : "";
          return input.includes("$(" + name + ")");
        });
        return used ? PASS : todo("نسخة Node لسه مش بتتقري من " + code("$(" + name + ")") + ".");
      }
      return todo("الـ matrix لسه مفيهاش إعدادين بنسخة 20 و 22.");
    }
    return todo("لسه مفيش `strategy` فيها `matrix`.");
  },
};

const dockerPush: AzRule = {
  id: "az-docker-push",
  title: "الـ image بتتبني وتترفع بـ `Docker@2`",
  why: "`buildAndPush` بتعمل الخطوتين في task واحدة. الـ task بتسجّل دخول للـ registry عن طريق الـ service connection اللي اسمه في `containerRegistry`، فمفيش باسورد في الملف. و `repository` هو اسم الـ image.",
  check(file) {
    const tasks = allSteps(read(file)).filter((step) => step.task === "Docker");
    if (tasks.length === 0) return todo("لسه مفيش `Docker@2`.");
    const commands = tasks.map((step) => (step.inputs ? text(step.inputs.command) : ""));
    const pushes = commands.includes("buildAndPush") || (commands.includes("build") && commands.includes("push"));
    const missing: string[] = [];
    if (!tasks.some((step) => step.inputs && text(step.inputs.containerRegistry) !== "")) missing.push("containerRegistry");
    if (!tasks.some((step) => step.inputs && text(step.inputs.repository) !== "")) missing.push("repository");
    if (!pushes) {
      if (commands.includes("build")) return todo("`command: build` بتبني بس. علشان ترفع استخدم `buildAndPush`.");
      missing.push("command");
    }
    return missing.length === 0 ? PASS : todo("`Docker@2` لسه ناقصها: " + missing.map(code).join(" و "));
  },
};

const imageTag: AzRule = {
  id: "az-image-tag",
  title: "الـ image ليها tag مختلف لكل تشغيل، مش `latest` بس",
  why: "لو كل image اسمها `latest`، مش هتعرف أنهي كود شغال في الـ production ومش هتعرف ترجع لنسخة قبلها. الـ tag المعمول من الـ commit أو من رقم الـ build بيربط كل image بالكود اللي اتبنت منه.",
  check(file) {
    const task = allSteps(read(file)).find((step) => step.task === "Docker");
    if (!task) return todo("لسه مفيش `Docker@2`.");
    const tags = task.inputs ? text(task.inputs.tags) : "";
    if (tags === "") return todo("لسه مفيش `tags`.");
    if (/\$\(Build\.(SourceVersion|BuildId|BuildNumber)\)/.test(tags)) return PASS;
    return fail("الـ tag ثابت ومش بيتغير من تشغيل للتاني.", file.lineOfKey([...task.path, "inputs", "tags"]));
  },
};

const knownKeys: AzRule = {
  id: "az-known-keys",
  title: "كل المفاتيح مكتوبة صح وفي مكانها",
  why: "Azure بيرفض الـ pipeline لو فيه مفتاح ميعرفوش، والمفاتيح حساسة لحالة الحروف: `vmImage` مش `vmimage`. وغلطة المسافات بتعمل نفس النتيجة: المفتاح بيبقى صح، بس في مستوى غلط.",
  check(file) {
    const pipeline = read(file);
    if (!pipeline.root) return todo("الملف لسه فاضي.");
    const top = firstUnknown(Object.keys(pipeline.root), TOP_KEYS);
    if (top !== null) return fail(unknownKey(top, TOP_KEYS, "في أول الملف"), file.lineOfKey([top]));

    for (const stage of pipeline.stages) {
      const inStage = firstUnknown(Object.keys(stage.raw), STAGE_KEYS);
      if (inStage !== null) return fail(unknownKey(inStage, STAGE_KEYS, "في الـ stage"), file.lineOfKey([...stage.path, inStage]));
    }
    for (const job of pipeline.jobs) {
      if (job.kind !== "implicit") {
        const inJob = firstUnknown(Object.keys(job.raw), JOB_KEYS);
        if (inJob !== null) return fail(unknownKey(inJob, JOB_KEYS, "في الـ job"), file.lineOfKey([...job.path, inJob]));
      }
      for (const step of job.steps) {
        const inStep = firstUnknown(Object.keys(step.raw), STEP_KEYS);
        if (inStep !== null) return fail(unknownKey(inStep, STEP_KEYS, "في الخطوة"), file.lineOfKey([...step.path, inStep]));
      }
    }
    const started = pipeline.root.steps !== undefined || pipeline.root.jobs !== undefined || pipeline.root.stages !== undefined;
    return started ? PASS : todo("لسه مفيش `steps`.");
  },
};

const variables: AzRule = {
  id: "az-variables",
  title: "فيه متغير عادي في `variables`",
  why: "الإعدادات اللي مش أسرار، زي عنوان الـ API، بتتكتب في `variables` وبتوصل لكل الخطوات كـ environment variable. اللي في `variables` ظاهر في الملف، فمكانه مش للأسرار.",
  check(file) {
    for (const pair of allVariables(read(file))) {
      // The npm cache folder is plumbing for Cache@2, not a setting of the app.
      if (pair.name !== "npm_config_cache" && !looksSecret(pair.name) && text(pair.value) !== "") return PASS;
    }
    return todo("لسه مفيش متغير للتطبيق في `variables`.");
  },
};

export const AZURE_RULES: AzRule[] = [
  trigger,
  triggerMainOnly,
  pool,
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
  publishArtifact,
  matrix,
  dockerPush,
  imageTag,
  knownKeys,
  variables,
];
