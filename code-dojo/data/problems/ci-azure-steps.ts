import type { Step } from "../types";
import { yline } from "./config-helpers";

/**
 * The lines that come back in every Azure Pipelines file, written once.
 * An exercise builds its file from these, and writes its own lines with az().
 *
 * `indent` is the number of spaces in front of the line. Steps sit at 2
 * spaces in a simple pipeline and deeper inside stages, so the step lines
 * take the indentation as an argument.
 */

interface LineText {
  coach: string;
  hint1: string;
  explain: string;
  /** Other correct ways to write the line, without the indentation. */
  accept?: string[];
}

function pad(indent: number, line: string): string {
  let out = "";
  for (let i = 0; i < indent; i++) out += " ";
  return out + line;
}

/** One line of a pipeline, at its indentation. */
export function az(indent: number, line: string, text: LineText): Step {
  const { accept, ...rest } = text;
  if (accept === undefined) return yline(pad(indent, line), rest);
  const padded: string[] = [];
  for (let i = 0; i < accept.length; i++) padded.push(pad(indent, accept[i]));
  return yline(pad(indent, line), { ...rest, accept: padded });
}

export function trigger(coach?: string): Step {
  return az(0, "trigger:", {
    coach: coach ?? "إمتى الـ pipeline يشتغل مع الـ push. في Azure المفتاح اسمه `trigger`.",
    hint1: "كلمة `trigger` في أول السطر، وبعدها `:`.",
    explain: "trigger lists the branches whose pushes start the pipeline.",
  });
}

export function triggerMain(coach?: string): Step {
  return az(2, "- main", {
    coach: coach ?? "والـ branch هو `main`. اكتبه عنصر في list.",
    hint1: "شرطة، مسافة، واسم الـ branch.",
    explain: "A push to main starts the pipeline.",
  });
}

export function pr(coach?: string): Step {
  return az(0, "pr:", {
    coach: coach ?? "الـ pull requests ليها مفتاح لوحدها من حرفين: `pr`.",
    hint1: "حرفين: `pr`، وبعدهم `:`.",
    explain: "pr lists the target branches whose pull requests are validated.",
  });
}

export function prMain(coach?: string): Step {
  return az(2, "- main", {
    coach: coach ?? "أي pull request رايح على `main` يتفحص قبل الدمج.",
    hint1: "شرطة، مسافة، واسم الـ branch.",
    explain: "A pull request that targets main runs the pipeline before the merge.",
  });
}

export function pool(coach?: string): Step {
  return az(0, "pool:", {
    coach: coach ?? "حدّد الجهاز اللي الـ pipeline هيشتغل عليه. في Azure اسمه agent، وبيتطلب بـ `pool`.",
    hint1: "كلمة `pool` في أول السطر، وبعدها `:`.",
    explain: "pool picks the agents that run the jobs.",
  });
}

export function vmImage(coach?: string): Step {
  return az(2, "vmImage: ubuntu-latest", {
    coach: coach ?? "اطلب جهاز جاهز من Microsoft عليه آخر نسخة Ubuntu. المفتاح `vmImage`، والـ I كابيتال.",
    hint1: "`vmImage`، نقطتين، وقيمته `ubuntu-latest`.",
    explain: "vmImage asks for a Microsoft-hosted agent with that operating system.",
    accept: ['vmImage: "ubuntu-latest"', "vmImage: ubuntu-24.04", "vmImage: ubuntu-22.04"],
  });
}

export function steps(coach?: string, indent = 0): Step {
  return az(indent, "steps:", {
    coach: coach ?? "الخطوات بتتكتب list تحت `steps`. مفيش خطوة checkout هنا: Azure بينزّل الكود لوحده.",
    hint1: "كلمة `steps` وبعدها `:`.",
    explain: "steps is the list of things the job does. Azure checks out the repository by itself.",
  });
}

export function useNode(coach?: string, indent = 2): Step {
  return az(indent, "- task: UseNode@1", {
    coach:
      coach ?? "نصّب Node على الـ agent. الحاجات الجاهزة في Azure اسمها tasks، ودي اسمها `UseNode` ونسختها 1.",
    hint1: "شرطة، `task`، نقطتين، وبعدها اسم الـ task وعلامة `@` ورقم النسخة.",
    explain: "A task is a ready-made step. UseNode installs a Node version on the agent.",
    accept: ["- task: NodeTool@0"],
  });
}

/** `inputs:` under a task that starts at `indent`. */
export function inputs(coach?: string, indent = 4): Step {
  return az(indent, "inputs:", {
    coach: coach ?? "إعدادات الـ task بتتكتب تحت `inputs`، في نفس الخطوة.",
    hint1: "كلمة `inputs` وبعدها `:`. من غير شرطة: ده مفتاح في نفس الخطوة.",
    explain: "inputs passes settings to the task.",
  });
}

export function nodeVersion(coach?: string, indent = 6): Step {
  return az(indent, 'version: "22.x"', {
    coach: coach ?? "النسخة: 22، وأي إصدار منها. بتتكتب `22.x` بين علامات تنصيص.",
    hint1: "المفتاح `version`، وقيمته بين علامات تنصيص: الرقم ونقطة و `x`.",
    explain: "version pins Node to the 22 line. The x takes the newest release of that line.",
    accept: ["version: 22.x", 'versionSpec: "22.x"', "versionSpec: 22.x"],
  });
}

export function npmCi(coach?: string, indent = 2): Step {
  return az(indent, "- script: npm ci", {
    coach: coach ?? "نصّب الـ dependencies من الـ lock file بالظبط. خطوة الأمر في Azure اسمها `script`.",
    hint1: "شرطة، `script`، نقطتين، وبعدها أمر npm اللي من حرفين.",
    explain: "script runs a shell command. npm ci installs exactly what the lock file says.",
  });
}

export function lint(coach?: string, indent = 2): Step {
  return az(indent, "- script: npm run lint", {
    coach: coach ?? "شغّل الـ lint الأول: أسرع فحص، فلو فيه غلطة الـ job تقف بدري.",
    hint1: "`script` وبعدها `npm run` واسم الـ script: `lint`.",
    explain: "Lint runs first because it is the fastest check.",
  });
}

export function typeCheck(coach?: string, indent = 2): Step {
  return az(indent, "- script: npm run type-check", {
    coach: coach ?? "بعده فحص الـ types. الـ script اسمه `type-check`.",
    hint1: "`script` وبعدها `npm run` واسم الـ script بشرطة في النص.",
    explain: "Then the type check: it finds type errors without running the code.",
  });
}

export function test(coach?: string, indent = 2): Step {
  return az(indent, "- script: npm test", {
    coach: coach ?? "شغّل الـ tests.",
    hint1: "`script` وبعدها أمر npm المختصر للـ tests، من غير كلمة `run`.",
    explain: "This step runs the tests. A failing test fails the job.",
  });
}

export function build(coach?: string, indent = 2): Step {
  return az(indent, "- script: npm run build", {
    coach: coach ?? "وفي الآخر الـ build: مفيش فايدة تبني كود الفحوصات بتاعته واقعة.",
    hint1: "`script` وبعدها `npm run` واسم الـ script: `build`.",
    explain: "The build comes last: it is the slowest step, and it only matters when the checks pass.",
  });
}

/** The two lines that tell npm where to keep its cache, so Cache@2 can save that folder. */
export function cacheVariable(): Step[] {
  return [
    az(0, "variables:", {
      coach: "علشان الـ cache: الأول قول لـ npm يخزّن فين. المتغيرات في Azure بتتكتب تحت `variables`.",
      hint1: "كلمة `variables` في أول السطر، وبعدها `:`.",
      explain: "variables holds values that every step can read.",
    }),
    az(2, "npm_config_cache: $(Pipeline.Workspace)/.npm", {
      coach:
        "المتغير اللي npm بيقراه اسمه `npm_config_cache`. قيمته فولدر `.npm` جوه مساحة الـ pipeline، واسمها `$(Pipeline.Workspace)`.",
      hint1: "اسم المتغير، نقطتين، وبعدها `$(Pipeline.Workspace)` وشرطة مايلة واسم الفولدر.",
      explain: "npm_config_cache tells npm to keep its cache inside the pipeline workspace, the same folder on every system.",
    }),
  ];
}

/** The four lines of the Cache@2 task. */
export function cacheTask(indent = 2): Step[] {
  return [
    az(indent, "- task: Cache@2", {
      coach: "دلوقتي الـ task اللي بتحفظ الفولدر ده وترجّعه في التشغيل الجاي: `Cache`، نسخة 2.",
      hint1: "شرطة، `task`، نقطتين، وبعدها اسم الـ task و `@2`.",
      explain: "Cache@2 restores a folder at the start of the job and saves it at the end.",
    }),
    inputs(undefined, indent + 2),
    az(indent + 4, "key: 'npm | \"$(Agent.OS)\" | package-lock.json'", {
      coach:
        "مفتاح الـ cache من 3 أجزاء بينهم `|`: كلمة `npm`، ونظام التشغيل `$(Agent.OS)` بين علامات تنصيص دبل، واسم الـ lock file. والقيمة كلها بين علامات تنصيص مفردة.",
      hint1: "المفتاح `key`، وبعده بين `'` و `'`: `npm`، `\"$(Agent.OS)\"`، `package-lock.json`، وبين كل جزء والتاني `|`.",
      explain: "The key includes the hash of package-lock.json, so a new lock file makes a new cache.",
    }),
    az(indent + 4, "path: $(npm_config_cache)", {
      coach: "والفولدر اللي يتحفظ: نفس المتغير اللي عرّفته فوق، بين `$(` و `)`.",
      hint1: "المفتاح `path`، وقيمته اسم متغير الـ cache بتاع npm بين `$(` و `)`.",
      explain: "path is the folder to save: the npm cache folder from the variable above.",
    }),
  ];
}

/** trigger on main, pr on main, and the pool. Six lines. */
export function header(firstCoach: string): Step[] {
  return [trigger(firstCoach), triggerMain(), pr(), prMain(), pool(), vmImage()];
}
