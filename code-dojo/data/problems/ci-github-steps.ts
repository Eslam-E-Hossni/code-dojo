import type { Step } from "../types";
import { yline } from "./config-helpers";

/**
 * The lines that come back in every GitHub Actions workflow, written once.
 * An exercise builds its file from these, and writes its own lines with gh().
 *
 * `indent` is the number of spaces in front of the line. A coach sentence
 * can be replaced per exercise; the hint and the English sentence stay.
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

/** One line of a workflow, at its indentation. */
export function gh(indent: number, line: string, text: LineText): Step {
  const { accept, ...rest } = text;
  if (accept === undefined) return yline(pad(indent, line), rest);
  const padded: string[] = [];
  for (let i = 0; i < accept.length; i++) padded.push(pad(indent, accept[i]));
  return yline(pad(indent, line), { ...rest, accept: padded });
}

/** The versions of an action that are still in use, as alternatives to the newest one. */
function olderVersions(line: string, current: number, oldest: number): string[] {
  const out: string[] = [];
  for (let version = current - 1; version >= oldest; version--) {
    out.push(line.replace("@v" + current, "@v" + version));
  }
  return out;
}

export function name(value: string, coach?: string): Step {
  return gh(0, "name: " + value, {
    coach: coach ?? "ادّي الـ workflow اسم يظهر في صفحة Actions: `" + value + "`.",
    hint1: "المفتاح `name`، نقطتين، مسافة، وبعدها الاسم.",
    explain: "name is the title of the workflow in the Actions tab.",
  });
}

export function on(coach?: string): Step {
  return gh(0, "on:", {
    coach: coach ?? "دلوقتي إمتى الـ workflow يشتغل. المفتاح اللي بيجمع الأحداث من حرفين: `on`.",
    hint1: "كلمة `on` في أول السطر، وبعدها `:` بس.",
    explain: "on lists the events that start the workflow.",
  });
}

export function push(coach?: string): Step {
  return gh(2, "push:", {
    coach: coach ?? "أول حدث: لما حد يعمل push.",
    hint1: "اسم الحدث `push`، وبعده `:`.",
    explain: "The first event is a push to the repository.",
  });
}

export function branchesMain(coach?: string): Step {
  return gh(4, "branches: [main]", {
    coach:
      coach ?? "بس مش أي push: على الـ branch الرئيسي `main` بس. اكتب الـ branches كـ list بين قوسين مربعين.",
    hint1: "المفتاح `branches`، نقطتين، وبعدها اسم الـ branch بين `[` و `]`.",
    explain: "The branches filter keeps this trigger to the main branch.",
    accept: ['branches: ["main"]'],
  });
}

export function pullRequest(coach?: string): Step {
  return gh(2, "pull_request:", {
    coach: coach ?? "تاني حدث: أي pull request، علشان الكود يتفحص قبل ما يتدمج.",
    hint1: "كلمتين بينهم `_`: `pull` و `request`، وبعدهم `:`.",
    explain: "pull_request runs the workflow on every pull request, before the merge.",
  });
}

export function jobs(coach?: string): Step {
  return gh(0, "jobs:", {
    coach: coach ?? "دلوقتي الشغل نفسه. كل الـ jobs بتتكتب تحت مفتاح واحد: `jobs`.",
    hint1: "كلمة `jobs` في أول السطر، وبعدها `:`.",
    explain: "jobs holds the jobs of the workflow. They run in parallel unless one needs another.",
  });
}

export function job(id: string, coach?: string): Step {
  return gh(2, id + ":", {
    coach: coach ?? "سمّي الـ job: `" + id + "`.",
    hint1: "اسم الـ job وبعده `:`، من غير أي قيمة.",
    explain: "The key is the id of the job. Other jobs point to it by this id.",
  });
}

export function runsOn(coach?: string): Step {
  return gh(4, "runs-on: ubuntu-latest", {
    coach: coach ?? "كل job بتشتغل على جهاز جديد اسمه runner. اطلب آخر نسخة Ubuntu.",
    hint1: "المفتاح `runs-on` بشرطة، وقيمته `ubuntu-latest`.",
    explain: "runs-on picks the runner: a fresh virtual machine for this job.",
    accept: ["runs-on: ubuntu-24.04", "runs-on: ubuntu-22.04"],
  });
}

export function steps(coach?: string): Step {
  return gh(4, "steps:", {
    coach: coach ?? "خطوات الـ job بتتكتب list تحت `steps`، وبتتنفّذ بالترتيب.",
    hint1: "كلمة `steps` وبعدها `:`.",
    explain: "steps is the list of things the job does, in order.",
  });
}

export function checkout(coach?: string): Step {
  return gh(6, "- uses: actions/checkout@v7", {
    coach:
      coach ??
      "أول خطوة: نزّل كود الـ repo على الـ runner، لأنه بيبدأ فاضي. دي action جاهزة اسمها `actions/checkout`، ونسختها `v7`.",
    hint1: "شرطة ومسافة، `uses`، نقطتين، وبعدها اسم الـ action و `@v7`.",
    explain: "The runner starts empty, so the first step checks out the repository.",
    accept: olderVersions("- uses: actions/checkout@v7", 7, 4),
  });
}

export function setupNode(coach?: string): Step {
  return gh(6, "- uses: actions/setup-node@v7", {
    coach: coach ?? "بعدها نصّب Node على الـ runner بالـ action اللي اسمها `actions/setup-node`، نسخة `v7`.",
    hint1: "نفس شكل السطر اللي فات، باسم الـ action التانية.",
    explain: "setup-node installs the Node version that the job asks for.",
    accept: olderVersions("- uses: actions/setup-node@v7", 7, 4),
  });
}

/** `with:` under a step that starts at `indent`. */
export function withInputs(coach?: string, indent = 8): Step {
  return gh(indent, "with:", {
    coach: coach ?? "الـ action دي بتاخد إعدادات. بتتكتب تحت `with`، في نفس الخطوة.",
    hint1: "كلمة `with` وبعدها `:`. من غير شرطة: ده مفتاح في نفس الخطوة.",
    explain: "with passes inputs to the action.",
  });
}

export function nodeVersion(coach?: string): Step {
  return gh(10, "node-version: 22", {
    coach: coach ?? "حدّد نسخة Node: 22.",
    hint1: "المفتاح `node-version` بشرطة، وقيمته الرقم.",
    explain: "node-version pins Node, so the job does not depend on what the runner happens to have.",
    accept: ['node-version: "22"', "node-version: 22.x", 'node-version: "22.x"'],
  });
}

export function cacheNpm(coach?: string): Step {
  return gh(10, "cache: npm", {
    coach: coach ?? "وخلّي نفس الـ action تحفظ cache لـ packages بتاعة npm، علشان التنصيب يبقى أسرع المرة الجاية.",
    hint1: "المفتاح `cache`، وقيمته اسم الـ package manager.",
    explain: "cache: npm saves the npm cache between runs. Its key is made from package-lock.json.",
    accept: ['cache: "npm"'],
  });
}

export function npmCi(coach?: string): Step {
  return gh(6, "- run: npm ci", {
    coach: coach ?? "نصّب الـ dependencies من الـ lock file بالظبط.",
    hint1: "خطوة بتشغّل أمر: شرطة، `run`، نقطتين، وبعدها أمر npm اللي من حرفين.",
    explain: "run executes a shell command. npm ci installs exactly what the lock file says.",
  });
}

export function lint(coach?: string): Step {
  return gh(6, "- run: npm run lint", {
    coach: coach ?? "شغّل الـ lint الأول: أسرع فحص، فلو فيه غلطة الـ job تقف بدري.",
    hint1: "`run` وبعدها `npm run` واسم الـ script: `lint`.",
    explain: "Lint runs first because it is the fastest check.",
  });
}

export function typeCheck(coach?: string): Step {
  return gh(6, "- run: npm run type-check", {
    coach: coach ?? "بعده فحص الـ types. الـ script اسمه `type-check`.",
    hint1: "`run` وبعدها `npm run` واسم الـ script بشرطة في النص.",
    explain: "Then the type check: it finds type errors without running the code.",
  });
}

export function test(coach?: string): Step {
  return gh(6, "- run: npm test", {
    coach: coach ?? "شغّل الـ tests.",
    hint1: "`run` وبعدها أمر npm المختصر للـ tests، من غير كلمة `run` التانية.",
    explain: "This step runs the tests. A failing test fails the job.",
  });
}

export function build(coach?: string): Step {
  return gh(6, "- run: npm run build", {
    coach: coach ?? "وفي الآخر الـ build: مفيش فايدة تبني كود الفحوصات بتاعته واقعة.",
    hint1: "`run` وبعدها `npm run` واسم الـ script: `build`.",
    explain: "The build comes last: it is the slowest step, and it only matters when the checks pass.",
  });
}

/** name: CI, then on: push to main and pull requests. Five lines. */
export function header(workflow: string, firstCoach: string): Step[] {
  return [name(workflow, firstCoach), on(), push(), branchesMain(), pullRequest()];
}
