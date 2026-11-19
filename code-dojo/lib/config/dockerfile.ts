/**
 * A small Dockerfile parser, and the rules of the Docker track.
 *
 * Nothing is built. The parser reads instructions, their flags and the
 * stages; the rules look at that structure. It covers what front-end
 * Dockerfiles use. Heredocs are not supported.
 */

import { PASS, code, fail, todo, type Diagnostic, type Rule } from "./types";

export interface Instruction {
  /** FROM, COPY ... in upper case. */
  keyword: string;
  /** Everything after the keyword and the flags, with continued lines joined. */
  args: string;
  /** --from=build gives { from: "build" }. */
  flags: Record<string, string>;
  /** The values of the exec form: CMD ["node", "server.js"]. Null for the shell form. */
  json: string[] | null;
  /** The line the instruction starts on, from 1. */
  line: number;
}

export interface Stage {
  index: number;
  /** The name after AS, or null. */
  name: string | null;
  /** The image without its tag: "node", "nginxinc/nginx-unprivileged". */
  image: string;
  tag: string | null;
  digest: string | null;
  /** The index of the earlier stage this one starts from, for FROM build. */
  base: number | null;
  from: Instruction;
  /** The instructions of the stage, without its FROM. */
  body: Instruction[];
}

export interface Dockerfile {
  instructions: Instruction[];
  stages: Stage[];
  diagnostics: Diagnostic[];
}

const KNOWN = new Set([
  "FROM", "RUN", "CMD", "LABEL", "MAINTAINER", "EXPOSE", "ENV", "ADD", "COPY", "ENTRYPOINT",
  "VOLUME", "USER", "WORKDIR", "ARG", "ONBUILD", "STOPSIGNAL", "HEALTHCHECK", "SHELL",
]);

function words(text: string): string[] {
  const out: string[] = [];
  let current = "";
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote !== "") {
      if (ch === quote) quote = "";
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === " " || ch === "\t") {
      if (current !== "") out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current !== "") out.push(current);
  return out;
}

export function parseDockerfile(text: string): Dockerfile {
  const lines = text.split("\n");
  const instructions: Instruction[] = [];
  const stages: Stage[] = [];
  const diagnostics: Diagnostic[] = [];
  const names = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i].replace(/\r$/, "");
    if (raw.trim() === "" || raw.trim()[0] === "#") continue;

    // A backslash at the end joins the next line.
    const line = i + 1;
    while (raw.trimEnd().endsWith("\\")) {
      raw = raw.trimEnd().slice(0, -1).trimEnd() + " ";
      i++;
      if (i >= lines.length) {
        diagnostics.push({ line, message: "السطر بيخلص بـ `\\` ومفيش سطر بعده يكمّله." });
        break;
      }
      const next = lines[i].replace(/\r$/, "");
      if (next.trim()[0] !== "#") raw += next.trim();
    }

    const match = /^\s*(\S+)\s*(.*)$/.exec(raw);
    if (!match) continue;
    const keyword = match[1].toUpperCase();
    let rest = match[2].trim();

    if (!KNOWN.has(keyword)) {
      diagnostics.push({ line, message: code(match[1]) + " مش instruction معروفة في Dockerfile." });
      continue;
    }
    if (rest === "") {
      diagnostics.push({ line, message: code(keyword) + " محتاجة قيمة بعدها." });
      continue;
    }

    const flags: Record<string, string> = {};
    for (let flag = /^--([\w-]+)(?:=(\S+))?\s*/.exec(rest); flag !== null; flag = /^--([\w-]+)(?:=(\S+))?\s*/.exec(rest)) {
      flags[flag[1]] = flag[2] ?? "";
      rest = rest.slice(flag[0].length);
    }

    let json: string[] | null = null;
    if (rest[0] === "[") {
      try {
        const parsed: unknown = JSON.parse(rest);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) json = parsed as string[];
      } catch {
        if (keyword === "CMD" || keyword === "ENTRYPOINT") {
          diagnostics.push({
            line,
            message: "الـ array دي مش مكتوبة صح. لازم علامات تنصيص دبل وفواصل: `[\"node\", \"server.js\"]`.",
          });
        }
      }
    }

    const instruction: Instruction = { keyword, args: rest, flags, json, line };
    instructions.push(instruction);

    if (keyword === "FROM") {
      const parts = words(rest);
      const reference = parts[0] ?? "";
      const name = parts.length >= 3 && parts[1].toLowerCase() === "as" ? parts[2] : null;

      let image = reference;
      let digest: string | null = null;
      const at = image.indexOf("@");
      if (at !== -1) {
        digest = image.slice(at + 1);
        image = image.slice(0, at);
      }
      let tag: string | null = null;
      const colon = image.lastIndexOf(":");
      // A colon before the last slash is a registry port, not a tag.
      if (colon > image.lastIndexOf("/")) {
        tag = image.slice(colon + 1);
        image = image.slice(0, colon);
      }

      const base = names.has(reference.toLowerCase()) ? (names.get(reference.toLowerCase()) as number) : null;
      const stage: Stage = { index: stages.length, name, image, tag, digest, base, from: instruction, body: [] };
      stages.push(stage);
      if (name !== null) names.set(name.toLowerCase(), stage.index);
    } else if (stages.length === 0) {
      if (keyword !== "ARG") {
        diagnostics.push({ line, message: "الـ Dockerfile لازم يبدأ بـ `FROM`. " + code(keyword) + " جت قبلها." });
      }
    } else {
      stages[stages.length - 1].body.push(instruction);
    }
  }

  return { instructions, stages, diagnostics };
}

// ---------------------------------------------------------------- helpers

function finalStage(file: Dockerfile): Stage | null {
  return file.stages.length === 0 ? null : file.stages[file.stages.length - 1];
}

function of(stage: Stage, keyword: string): Instruction[] {
  return stage.body.filter((instruction) => instruction.keyword === keyword);
}

/** The sources and the destination of a COPY or ADD. */
function copyParts(instruction: Instruction): { sources: string[]; dest: string } {
  const parts = instruction.json ?? words(instruction.args);
  return { sources: parts.slice(0, -1), dest: parts.length > 0 ? parts[parts.length - 1] : "" };
}

function copies(stage: Stage): Instruction[] {
  return stage.body.filter((instruction) => instruction.keyword === "COPY" || instruction.keyword === "ADD");
}

/** The command of a RUN or CMD as one string. */
function command(instruction: Instruction): string {
  return (instruction.json ? instruction.json.join(" ") : instruction.args).replace(/\s+/g, " ").trim();
}

const INSTALL = /\b(npm\s+(ci|install|i)|yarn(\s+install)?|pnpm\s+(install|i))\b/;
const NPM_INSTALL = /\bnpm\s+(install|i)(\s|$)/;
const BUILD = /\b(npm|yarn|pnpm)\s+(run\s+)?build\b/;

function isInstall(instruction: Instruction): boolean {
  if (instruction.keyword !== "RUN") return false;
  const text = command(instruction);
  // "npm install -g something" adds a tool, it does not install the project.
  return INSTALL.test(text) && !/\s(-g|--global)\b/.test(text);
}

function isBuild(instruction: Instruction): boolean {
  return instruction.keyword === "RUN" && BUILD.test(command(instruction));
}

function isWholeContext(source: string): boolean {
  return source === "." || source === "./" || source === "*" || source === "./*";
}

function isPackageFile(source: string): boolean {
  const name = source.replace(/^\.\//, "");
  return /^package(\*|-lock)?\.json$/.test(name) || /^(yarn\.lock|pnpm-lock\.yaml|npm-shrinkwrap\.json)$/.test(name);
}

function trimSlash(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** The directory a stage works in when it ends. */
function workdirOf(stage: Stage): string | null {
  const all = of(stage, "WORKDIR");
  return all.length === 0 ? null : trimSlash(all[all.length - 1].args.trim());
}

/** NAME=value pairs of an ENV or ARG line. A name without a value has value null. */
function assignments(instruction: Instruction): { name: string; value: string | null }[] {
  const parts = words(instruction.args);
  const out: { name: string; value: string | null }[] = [];
  if (instruction.keyword === "ENV" && parts.length === 2 && !parts[0].includes("=")) {
    // The old form: ENV NAME value
    return [{ name: parts[0], value: parts[1] }];
  }
  for (const part of parts) {
    const eq = part.indexOf("=");
    out.push(eq === -1 ? { name: part, value: null } : { name: part.slice(0, eq), value: part.slice(eq + 1) });
  }
  return out;
}

const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|PRIVATE_?KEY|CREDENTIAL)/i;
const SECRET_FILE = /(^|\/)(\.env(\..*)?|\.env\*|\.npmrc|id_rsa|id_ed25519|[^/]*\.pem|[^/]*\.key|[^/]*secret[^/]*)$/i;
const UNPRIVILEGED_IMAGE = /nginx-unprivileged|distroless.*nonroot/i;

// ------------------------------------------------------------------ rules

type DockerRule = Rule<Dockerfile>;

const pinnedBase: DockerRule = {
  id: "pinned-base",
  title: "الـ base image ليها tag محدد، مش `latest`",
  why: "الـ tag اللي اسمه `latest` بيتغير مع الوقت. نفس الـ Dockerfile ممكن يبني النهارده وميبنيش بكرة، ومش هتعرف إيه اللي اتغير. الـ tag المحدد بيخلّي الـ build يتكرر زي ما هو.",
  check(file) {
    if (file.stages.length === 0) return todo("لسه مفيش `FROM`.");
    for (const stage of file.stages) {
      if (stage.base !== null || stage.image === "scratch" || stage.digest !== null) continue;
      if (stage.tag === null) {
        return fail("الـ image " + code(stage.image) + " من غير tag، وده معناه `latest`.", stage.from.line);
      }
      if (stage.tag === "latest") return fail("الـ image " + code(stage.image) + " مكتوب لها `latest` صريح.", stage.from.line);
    }
    return PASS;
  },
};

const workdirBeforeCopy: DockerRule = {
  id: "workdir-before-copy",
  title: "فيه `WORKDIR` قبل نسخ الملفات",
  why: "من غير `WORKDIR` الملفات بتتنسخ في الـ root بتاع الـ image وسط ملفات النظام. `WORKDIR` بيحدد فولدر للتطبيق، وكل `COPY` و `RUN` بعده بيشتغل جواه.",
  check(file) {
    let sawCopy = false;
    for (const stage of file.stages) {
      let hasWorkdir = false;
      for (const instruction of stage.body) {
        if (instruction.keyword === "WORKDIR") hasWorkdir = true;
        if (instruction.keyword !== "COPY" && instruction.keyword !== "ADD") continue;
        sawCopy = true;
        const dest = copyParts(instruction).dest;
        // A full path like /usr/share/nginx/html does not depend on WORKDIR.
        if (!dest.startsWith("/") && !hasWorkdir) {
          return fail("`COPY` بتنسخ لمسار نسبي " + code(dest) + " ومفيش `WORKDIR` قبلها في المرحلة دي.", instruction.line);
        }
      }
    }
    return sawCopy ? PASS : todo("لسه مفيش `COPY`.");
  },
};

const depsBeforeSource: DockerRule = {
  id: "deps-before-source",
  title: "ملفات الـ package بتتنسخ وتتنصّب قبل باقي الكود",
  why: "Docker بيخزّن كل instruction كـ layer، وأول layer يتغير بيعيد كل اللي بعده. لو نسخت الكود كله قبل التنصيب، أي تعديل في سطر كود هيعيد تنصيب كل الـ dependencies. لما تنسخ package files لوحدها الأول، التنصيب بيتعاد بس لما هي تتغير.",
  check(file) {
    let sawInstall = false;
    for (const stage of file.stages) {
      const at = stage.body.findIndex(isInstall);
      if (at === -1) continue;
      sawInstall = true;
      let copiedPackageFiles = false;
      for (let i = 0; i < at; i++) {
        const instruction = stage.body[i];
        if (instruction.keyword !== "COPY" && instruction.keyword !== "ADD") continue;
        if ("from" in instruction.flags) continue;
        const { sources } = copyParts(instruction);
        if (sources.some(isWholeContext)) {
          return fail("الكود كله اتنسخ قبل تنصيب الـ dependencies. انسخ package files بس الأول.", instruction.line);
        }
        if (sources.some(isPackageFile)) copiedPackageFiles = true;
      }
      if (!copiedPackageFiles) {
        return fail("التنصيب بيشتغل قبل ما package files تتنسخ.", stage.body[at].line);
      }
    }
    return sawInstall ? PASS : todo("لسه مفيش أمر تنصيب.");
  },
};

const npmCi: DockerRule = {
  id: "npm-ci",
  title: "التنصيب بـ `npm ci`، مش `npm install`",
  why: "`npm ci` بينصّب بالظبط النسخ اللي في `package-lock.json`، وبيفشل لو الملفين مش متطابقين. `npm install` ممكن يغيّر الـ lock file وينزّل نسخ مختلفة، فالـ image تطلع مختلفة من build للتاني.",
  check(file) {
    let sawCi = false;
    for (const instruction of file.instructions) {
      if (instruction.keyword !== "RUN") continue;
      const text = command(instruction);
      if (NPM_INSTALL.test(text) && !/\s(-g|--global)\b/.test(text)) {
        return fail("السطر ده بيستخدم `npm install`.", instruction.line);
      }
      if (/\bnpm\s+ci\b/.test(text)) sawCi = true;
    }
    return sawCi ? PASS : todo("لسه مفيش `npm ci`.");
  },
};

const multiStage: DockerRule = {
  id: "multi-stage",
  title: "مرحلتين: مرحلة للـ build ومرحلة نهائية أصغر",
  why: "الـ build محتاج Node و devDependencies والكود كله، والتشغيل مش محتاجهم. لما تفصلهم في مرحلتين، الـ image النهائية بيبقى فيها ناتج الـ build بس: أصغر، وأسرع في التحميل، وفيها حاجات أقل ممكن تتهاجم.",
  check(file) {
    if (file.stages.length === 0) return todo("لسه مفيش `FROM`.");
    if (file.stages.length < 2) return todo("لسه فيه مرحلة واحدة. المرحلة التانية بتبدأ بـ `FROM` جديدة.");
    const last = file.stages[file.stages.length - 1];
    const buildInLast = last.body.find(isBuild);
    if (buildInLast) return fail("الـ build بيشتغل في المرحلة النهائية. المفروض يبقى في مرحلة قبلها.", buildInLast.line);
    for (let i = 0; i < file.stages.length - 1; i++) {
      if (file.stages[i].body.some(isBuild)) return PASS;
    }
    return todo("لسه مفيش أمر build في المرحلة الأولى.");
  },
};

const finalCopiesOutput: DockerRule = {
  id: "final-copies-output",
  title: "المرحلة النهائية بتنسخ ناتج الـ build بس",
  why: "لو المرحلة النهائية نسخت فولدر التطبيق كله، هتاخد معاها الـ source و `node_modules` بتاعة الـ build، وتبقى ضيّعت فايدة المرحلتين. انسخ بـ `--from` الفولدر اللي الـ build طلّعه بس.",
  check(file) {
    if (file.stages.length < 2) return todo("القاعدة دي بتتراجع لما يبقى فيه مرحلة نهائية.");
    const last = file.stages[file.stages.length - 1];
    const list = copies(last);
    if (list.length === 0) return todo("المرحلة النهائية لسه مفيهاش `COPY`.");
    for (const instruction of list) {
      if (!("from" in instruction.flags)) {
        return fail("`COPY` دي بتنسخ من جهازك، مش من مرحلة الـ build. استخدم `--from`.", instruction.line);
      }
      const source = file.stages.find(
        (stage) => stage.name?.toLowerCase() === instruction.flags.from.toLowerCase() || String(stage.index) === instruction.flags.from,
      );
      const workdir = source ? workdirOf(source) : null;
      for (const path of copyParts(instruction).sources) {
        const clean = trimSlash(path);
        if (clean === "/" || clean === "." || (workdir !== null && clean === workdir)) {
          return fail("`COPY` دي بتنسخ فولدر التطبيق كله " + code(path) + "، مش ناتج الـ build بس.", instruction.line);
        }
      }
    }
    return PASS;
  },
};

const nonRoot: DockerRule = {
  id: "non-root",
  title: "الـ container بيشتغل بمستخدم غير root",
  why: "الـ container بيشتغل root لو مقلتش غير كده. لو حد لقى ثغرة في التطبيق هيبقى معاه صلاحيات root جوه الـ container، وده بيسهّل الخروج منه. بمستخدم عادي الضرر بيبقى محدود.",
  check(file) {
    const last = finalStage(file);
    if (last === null) return todo("لسه مفيش `FROM`.");
    const users = of(last, "USER");
    if (users.length > 0) {
      const current = users[users.length - 1];
      const name = current.args.trim().split(":")[0];
      if (name === "root" || name === "0") return fail("`USER` متحدد بـ root.", current.line);
      return PASS;
    }
    // Some images already switch to a normal user.
    if (UNPRIVILEGED_IMAGE.test(last.image + ":" + (last.tag ?? ""))) return PASS;
    return todo("المرحلة النهائية مفيهاش `USER`، فالـ container هيشتغل root.");
  },
};

const exposeAndCmd: DockerRule = {
  id: "expose-and-cmd",
  title: "فيه `EXPOSE` و `CMD` واحدة",
  why: "`EXPOSE` بتقول للي هيشغّل الـ image التطبيق بيسمع على أنهي port. و `CMD` هي الأمر اللي بيشتغل لما الـ container يبدأ. لو كتبت أكتر من `CMD`، آخر واحدة بس هي اللي بتتنفّذ والباقي بيتجاهل من غير أي تحذير.",
  check(file) {
    const last = finalStage(file);
    if (last === null) return todo("لسه مفيش `FROM`.");
    const commands = of(last, "CMD");
    if (commands.length > 1) {
      return fail("فيه " + commands.length + " `CMD`. آخر واحدة بس هي اللي هتشتغل.", commands[0].line);
    }
    const exposes = of(last, "EXPOSE");
    if (exposes.length === 0 && commands.length === 0) return todo("لسه مفيش `EXPOSE` ولا `CMD`.");
    if (exposes.length === 0) return todo("لسه مفيش `EXPOSE`.");
    if (commands.length === 0) return todo("لسه مفيش `CMD`.");
    return PASS;
  },
};

const noSecrets: DockerRule = {
  id: "no-secrets",
  title: "مفيش secrets ولا ملفات `.env` جوه الـ image",
  why: "أي حاجة بتتنسخ أو تتكتب في الـ Dockerfile بتفضل في الـ layers للأبد، حتى لو مسحتها في سطر بعده. وأي حد معاه الـ image يقدر يقراها. الـ secrets بتتبعت وقت التشغيل من برّه.",
  check(file) {
    let sawSomething = false;
    for (const instruction of file.instructions) {
      if (instruction.keyword === "COPY" || instruction.keyword === "ADD") {
        sawSomething = true;
        for (const source of copyParts(instruction).sources) {
          if (SECRET_FILE.test(source)) return fail(code(source) + " ملف فيه secrets وبيتنسخ جوه الـ image.", instruction.line);
        }
      }
      if (instruction.keyword === "ENV" || instruction.keyword === "ARG") {
        sawSomething = true;
        for (const item of assignments(instruction)) {
          const literal = item.value !== null && item.value !== "" && !item.value.includes("$");
          if (SECRET_NAME.test(item.name) && literal) {
            return fail(code(item.name) + " قيمته مكتوبة في الملف نفسه.", instruction.line);
          }
        }
      }
    }
    return sawSomething ? PASS : todo("لسه مفيش `COPY` ولا `ENV` يتراجعوا.");
  },
};

// ------------------------------------------- what each exercise must contain

const nodeBase: DockerRule = {
  id: "node-base",
  title: "أول مرحلة مبنية على Node",
  why: "التطبيق محتاج Node علشان ينصّب ويشتغل أو يتبني. نسخة alpine أصغر بكتير من النسخة الكاملة.",
  check(file) {
    if (file.stages.length === 0) return todo("لسه مفيش `FROM`.");
    const first = file.stages[0];
    return first.image === "node" ? PASS : fail("أول مرحلة مبنية على " + code(first.image) + "، مش node.", first.from.line);
  },
};

const copiesSource: DockerRule = {
  id: "copies-source",
  title: "باقي كود المشروع بيتنسخ جوه الـ image",
  why: "ملفات الـ package لوحدها مش كفاية: التطبيق محتاج الكود نفسه. الكود هو الجزء اللي بيتغير كتير، فمكانه بعد التنصيب علشان الـ cache.",
  check(file) {
    // Only "is the code there?". Whether it comes after the install is the
    // job of deps-before-source, so one mistake is not counted twice.
    for (const stage of file.stages) {
      for (const instruction of stage.body) {
        if (instruction.keyword !== "COPY" || "from" in instruction.flags) continue;
        if (copyParts(instruction).sources.some(isWholeContext)) return PASS;
      }
    }
    return todo("لسه باقي الكود ما اتنسخش.");
  },
};

const cmdRunsNode: DockerRule = {
  id: "cmd-runs-node",
  title: "`CMD` بتشغّل التطبيق بـ node، بصيغة الـ array",
  why: "صيغة الـ array بتشغّل node مباشرة من غير shell في النص. كده إشارة الإيقاف بتوصل للتطبيق نفسه، فبيقفل نضيف لما الـ container يتوقف.",
  check(file) {
    const last = finalStage(file);
    const commands = last ? of(last, "CMD") : [];
    if (commands.length === 0) return todo("لسه مفيش `CMD`.");
    const current = commands[commands.length - 1];
    if (current.json === null) return fail("`CMD` مكتوبة بصيغة الـ shell. اكتبها array: `[\"node\", \"server.js\"]`.", current.line);
    if (current.json[0] !== "node") return fail("`CMD` بتشغّل " + code(current.json[0]) + "، مش node.", current.line);
    return PASS;
  },
};

const nodeEnvProduction: DockerRule = {
  id: "node-env-production",
  title: "`NODE_ENV` متحدد بـ `production`",
  why: "مكتبات كتير، ومنها React و Express، بتشتغل أسرع وبتقفل رسائل الـ debug لما `NODE_ENV` يبقى `production`. ده متغير وقت التشغيل، فمكانه `ENV`.",
  check(file) {
    const last = finalStage(file);
    if (last === null) return todo("لسه مفيش `FROM`.");
    for (const instruction of of(last, "ENV")) {
      for (const item of assignments(instruction)) {
        if (item.name === "NODE_ENV") {
          return item.value === "production" ? PASS : fail("`NODE_ENV` قيمته " + code(item.value) + "، مش `production`.", instruction.line);
        }
      }
    }
    return todo("لسه مفيش `ENV NODE_ENV=production` في المرحلة النهائية.");
  },
};

const nginxFinal: DockerRule = {
  id: "nginx-final",
  title: "المرحلة النهائية nginx، وبتنسخ الناتج لفولدر الـ html",
  why: "الـ SPA بعد الـ build بتبقى ملفات ثابتة: HTML و JS و CSS. مش محتاجة Node علشان تتقدّم. nginx بيقدّمها أسرع وبـ image أصغر بكتير، وهو بيقرا من `/usr/share/nginx/html`.",
  check(file) {
    if (file.stages.length < 2) return todo("لسه مفيش مرحلة نهائية.");
    const last = file.stages[file.stages.length - 1];
    if (!/nginx/i.test(last.image)) return fail("المرحلة النهائية مبنية على " + code(last.image) + "، مش nginx.", last.from.line);
    for (const instruction of copies(last)) {
      if (trimSlash(copyParts(instruction).dest) === "/usr/share/nginx/html") return PASS;
    }
    return todo("لسه ناتج الـ build ما اتنسخش لـ `/usr/share/nginx/html`.");
  },
};

const nextStandalone: DockerRule = {
  id: "next-standalone",
  title: "المرحلة النهائية فيها standalone و static و public",
  why: "مع `output: \"standalone\"`، Next بيطلّع فولدر صغير فيه `server.js` والـ dependencies اللي محتاجها بس. بس هو مبينسخش الملفات الثابتة: `.next/static` و `public` لازم ينضافوا بإيدك، وإلا الصفحة هتفتح من غير CSS ولا صور.",
  check(file) {
    if (file.stages.length < 2) return todo("لسه مفيش مرحلة نهائية.");
    const last = file.stages[file.stages.length - 1];
    const sources: string[] = [];
    for (const instruction of copies(last)) {
      for (const source of copyParts(instruction).sources) sources.push(trimSlash(source));
    }
    const missing: string[] = [];
    if (!sources.some((s) => s.endsWith(".next/standalone"))) missing.push(".next/standalone");
    if (!sources.some((s) => s.endsWith(".next/static"))) missing.push(".next/static");
    if (!sources.some((s) => s.endsWith("/public") || s === "public")) missing.push("public");
    return missing.length === 0 ? PASS : todo("لسه ناقص يتنسخ: " + missing.map(code).join(" و "));
  },
};

const nextPublicAtBuild: DockerRule = {
  id: "next-public-at-build",
  title: "متغير `NEXT_PUBLIC_` متاح وقت الـ build",
  why: "Next بيقرا متغيرات `NEXT_PUBLIC_` وهو بيبني، وبيكتب قيمتها جوه ملفات الـ JavaScript نفسها. فلو بعتّها وقت التشغيل بس، المتصفح هيفضل شايف القيمة القديمة. لازم تبقى `ARG` في مرحلة الـ build، قبل أمر الـ build.",
  check(file) {
    /** Declared in a stage that has no build command yet: the file may still be growing. */
    let waiting = false;
    /** Declared where no build will ever read it. */
    let tooLate: Instruction | null = null;
    const someStageBuilds = file.stages.some((stage) => stage.body.some(isBuild));

    for (const stage of file.stages) {
      const buildAt = stage.body.findIndex(isBuild);
      for (let i = 0; i < stage.body.length; i++) {
        const instruction = stage.body[i];
        if (instruction.keyword !== "ARG" && instruction.keyword !== "ENV") continue;
        if (!assignments(instruction).some((item) => item.name.startsWith("NEXT_PUBLIC_"))) continue;
        if (buildAt === -1) {
          if (someStageBuilds) tooLate = tooLate ?? instruction;
          else waiting = true;
        } else if (i < buildAt) {
          return PASS;
        } else {
          return fail("المتغير متعرّف بعد أمر الـ build، فالـ build مش هيشوفه.", instruction.line);
        }
      }
    }
    if (tooLate !== null) {
      return fail("المتغير متعرّف في مرحلة مفيهاش build. والـ build في مرحلة غيرها، فمش هيشوفه.", tooLate.line);
    }
    if (waiting) return todo("المتغير متعرّف. لسه أمر الـ build ما اتكتبش بعده.");
    return todo("لسه مفيش `ARG` لمتغير `NEXT_PUBLIC_`.");
  },
};

export const DOCKERFILE_RULES: DockerRule[] = [
  pinnedBase,
  workdirBeforeCopy,
  depsBeforeSource,
  npmCi,
  multiStage,
  finalCopiesOutput,
  nonRoot,
  exposeAndCmd,
  noSecrets,
  nodeBase,
  copiesSource,
  cmdRunsNode,
  nodeEnvProduction,
  nginxFinal,
  nextStandalone,
  nextPublicAtBuild,
];
