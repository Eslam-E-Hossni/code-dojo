/**
 * A .dockerignore reader, and its rules.
 *
 * The rules do not look for exact lines. They ask what the file does:
 * "is node_modules/react/index.js left out of the build context?". So any
 * pattern that does the job passes.
 *
 * Docker's matching, as far as front-end projects need it:
 * - a pattern is read from the root of the context: `node_modules` is the
 *   folder at the root, not one deeper down (unlike .gitignore)
 * - `*` matches inside one path segment, `**` matches any number of them
 * - a pattern that matches a folder also leaves out everything in it
 * - a line that starts with `!` brings a path back, and the last matching
 *   line wins
 */

import { PASS, code, fail, todo, type Diagnostic, type Rule } from "./types";

export interface IgnorePattern {
  pattern: string;
  negated: boolean;
  line: number;
  test: RegExp;
}

export interface DockerIgnore {
  patterns: IgnorePattern[];
  diagnostics: Diagnostic[];
}

function toRegExp(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        // "**/" also matches no folder at all: **/x is x at any depth.
        if (pattern[i + 2] === "/") {
          out += "(?:.*/)?";
          i += 2;
        } else {
          out += ".*";
          i += 1;
        }
      } else {
        out += "[^/]*";
      }
    } else if (ch === "?") {
      out += "[^/]";
    } else if ("\\^$+.()|{}[]".includes(ch)) {
      out += "\\" + ch;
    } else {
      out += ch;
    }
  }
  // The path itself, or anything under it when it is a folder.
  return new RegExp("^" + out + "(?:/.*)?$");
}

export function parseDockerIgnore(text: string): DockerIgnore {
  const patterns: IgnorePattern[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let pattern = lines[i].trim();
    if (pattern === "" || pattern[0] === "#") continue;
    const negated = pattern[0] === "!";
    if (negated) pattern = pattern.slice(1).trim();
    pattern = pattern.replace(/^\.?\//, "").replace(/\/+$/, "");
    if (pattern === "") continue;
    patterns.push({ pattern, negated, line: i + 1, test: toRegExp(pattern) });
  }
  return { patterns, diagnostics: [] };
}

/** True when the path is left out of the build context. */
export function isIgnored(file: DockerIgnore, path: string): boolean {
  let ignored = false;
  for (const entry of file.patterns) {
    if (entry.test.test(path)) ignored = !entry.negated;
  }
  return ignored;
}

type IgnoreRule = Rule<DockerIgnore>;

/** A rule that passes when every one of these paths is left out. */
function mustIgnore(id: string, title: string, why: string, paths: string[]): IgnoreRule {
  return {
    id,
    title,
    why,
    check(file) {
      const still = paths.filter((path) => !isIgnored(file, path));
      if (still.length === 0) return PASS;
      return todo("لسه بيدخل في الـ build context: " + still.map(code).join(" و "));
    },
  };
}

/** A rule that fails when one of these paths is left out by mistake. */
function mustKeep(id: string, title: string, why: string, paths: string[]): IgnoreRule {
  return {
    id,
    title,
    why,
    check(file) {
      if (file.patterns.length === 0) return todo("الملف لسه فاضي.");
      for (const path of paths) {
        if (!isIgnored(file, path)) continue;
        let line: number | undefined;
        for (const entry of file.patterns) {
          if (!entry.negated && entry.test.test(path)) line = entry.line;
        }
        return fail(code(path) + " اتشال من الـ build context، والـ build محتاجه.", line);
      }
      return PASS;
    },
  };
}

export const DOCKERIGNORE_RULES: IgnoreRule[] = [
  mustIgnore(
    "ignore-node-modules",
    "`node_modules` مش بتتبعت للـ build",
    "`node_modules` بتاعة جهازك كبيرة جدًا، وفيها ملفات متبنية لنظام تشغيلك إنت. الـ image بتنصّب نسختها بـ `npm ci`. لو اتبعتت، الـ build يبقى بطيء، و `COPY . .` ممكن تكتب فوق اللي اتنصّب جوه.",
    ["node_modules/react/index.js"],
  ),
  mustIgnore(
    "ignore-git",
    "فولدر `.git` مش بيتبعت",
    "تاريخ الـ repo كله ملوش لازمة جوه الـ image: بيكبّرها، وممكن يكون فيه حاجات حساسة اتمسحت من الكود بس لسه في التاريخ.",
    [".git/config"],
  ),
  mustIgnore(
    "ignore-build-output",
    "ناتج الـ build القديم مش بيتبعت",
    "الـ image بتبني من الأول. ناتج build قديم من جهازك بيكبّر الـ context، وممكن يختلط بالناتج الجديد.",
    ["dist/index.html", ".next/BUILD_ID"],
  ),
  mustIgnore(
    "ignore-env",
    "ملفات `.env` مش بتتبعت",
    "ملفات `.env` فيها secrets. لو دخلت الـ build context، سطر زي `COPY . .` هينسخها جوه الـ image، وأي حد معاه الـ image يقدر يقراها.",
    [".env", ".env.local", ".env.production"],
  ),
  mustIgnore(
    "ignore-logs",
    "ملفات الـ log مش بتتبعت",
    "ملفات الـ log بتتغير كل شوية. كل تغيير فيها بيبوّظ الـ cache بتاع `COPY . .` من غير أي فايدة.",
    ["npm-debug.log"],
  ),
  mustIgnore(
    "ignore-coverage",
    "ناتج الاختبارات مش بيتبعت",
    "تقارير الـ coverage بتتولد على جهازك، وملهاش أي دور في تشغيل التطبيق.",
    ["coverage/lcov.info"],
  ),
  mustIgnore(
    "ignore-local-files",
    "ملفات المحرر والنظام مش بتتبعت",
    "إعدادات المحرر وملفات النظام خاصة بجهازك. وجودها في الـ context بيغيّر الـ cache من غير سبب.",
    [".vscode/settings.json", ".DS_Store"],
  ),
  mustIgnore(
    "ignore-docker-files",
    "ملفات Docker نفسها مش بتتبعت",
    "الـ Dockerfile و `.dockerignore` بيتقروا من برّه الـ context. لو اتنسخوا جوه الـ image، أي تعديل فيهم هيبوّظ الـ cache بتاع نسخ الكود.",
    ["Dockerfile", ".dockerignore"],
  ),
  mustKeep(
    "keeps-package-files",
    "`package.json` و lock file لسه موجودين",
    "الـ build بيبدأ بنسخ الملفين دول وتنصيب الـ dependencies منهم. لو اتشالوا من الـ context، `COPY` هتفشل.",
    ["package.json", "package-lock.json"],
  ),
  mustKeep(
    "keeps-source",
    "الكود نفسه لسه موجود",
    "pattern واسع زيادة ممكن يشيل الـ source نفسه، والـ build يطلع فاضي أو يفشل.",
    ["src/index.js", "public/index.html"],
  ),
];
