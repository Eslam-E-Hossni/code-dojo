/**
 * What the rules of GitHub Actions and of Azure Pipelines share: reading a
 * shell command, the order of the quality steps, secret names, and
 * "did you mean" for a key that is written wrong.
 */

import { PASS, code, fail, todo, type RuleVerdict } from "./types";

/** The steps of a CI job that have a fixed place. */
export type CommandKind = "install" | "lint" | "typecheck" | "test" | "build";

const ORDER: CommandKind[] = ["install", "lint", "typecheck", "test", "build"];

const KIND_NAME: Record<CommandKind, string> = {
  install: "التنصيب",
  lint: "الـ lint",
  typecheck: "الـ type-check",
  test: "الـ tests",
  build: "الـ build",
};

const MATCHERS: [CommandKind, RegExp][] = [
  ["install", /\b(npm\s+(ci|install|i)|yarn\s+install|pnpm\s+(install|i))(\s|$)/],
  ["lint", /\b(npm|yarn|pnpm)\s+(run\s+)?lint\b|\beslint\b/],
  ["typecheck", /\b(npm|yarn|pnpm)\s+(run\s+)?(type-?check|typecheck|types|tsc)\b|\btsc\b/],
  ["test", /\b(npm|yarn|pnpm)\s+(run\s+)?test\b|\bnpm\s+t(\s|$)|\b(jest|vitest)\b/],
  ["build", /\b(npm|yarn|pnpm)\s+(run\s+)?build\b/],
];

/** The kinds of a command, in the order they appear. "npm ci && npm test" gives install, test. */
export function kindsOf(command: string): CommandKind[] {
  const out: CommandKind[] = [];
  for (const part of command.split(/\n|&&|;/)) {
    for (const [kind, pattern] of MATCHERS) {
      if (pattern.test(part)) {
        out.push(kind);
        break;
      }
    }
  }
  return out;
}

/** `npm install` for the project. `npm install -g something` adds a tool, so it does not count. */
export function usesNpmInstall(command: string): boolean {
  for (const part of command.split(/\n|&&|;/)) {
    if (/\bnpm\s+(install|i)(\s|$)/.test(part) && !/\s(-g|--global)\b/.test(part)) return true;
  }
  return false;
}

export function usesNpmCi(command: string): boolean {
  return /\bnpm\s+ci(\s|$)/.test(command);
}

/** A command that hides its own failure. */
export function swallowsFailure(command: string): boolean {
  return /\|\|\s*(true|:|exit\s+0)(\s|$)/.test(command);
}

const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|PRIVATE_?KEY|CREDENTIAL|PUBLISH_?PROFILE)/i;

/** True for a name like DEPLOY_TOKEN, password, API_KEY. */
export function looksSecret(name: string): boolean {
  return SECRET_NAME.test(name);
}

/** A command of a job, with the line it is written on. */
export interface Command {
  text: string;
  line?: number;
}

/**
 * Checks that the steps with a fixed place come in the right order:
 * install, lint, type-check, tests, build.
 * `jobs` holds the commands of every job. One job must have every kind in
 * `required`; any job with two of them the wrong way round fails.
 */
export function orderVerdict(jobs: Command[][], required: CommandKind[]): RuleVerdict {
  let sawCommand = false;
  let complete = false;
  let closest: CommandKind[] = required;

  for (const commands of jobs) {
    const seen = new Set<CommandKind>();
    let highest = -1;
    let highestText = "";
    for (const command of commands) {
      for (const kind of kindsOf(command.text)) {
        sawCommand = true;
        seen.add(kind);
        const rank = ORDER.indexOf(kind);
        if (rank < highest) {
          return fail(
            code(command.text.trim()) + " جاية بعد " + code(highestText) + "، والمفروض تيجي قبلها.",
            command.line,
          );
        }
        if (rank > highest) {
          highest = rank;
          highestText = command.text.trim();
        }
      }
    }
    const missing = required.filter((kind) => !seen.has(kind));
    if (missing.length === 0) complete = true;
    else if (missing.length < closest.length) closest = missing;
  }

  if (complete) return PASS;
  if (!sawCommand) return todo("لسه مفيش أوامر.");
  return todo("لسه ناقص: " + closest.map((kind) => KIND_NAME[kind]).join(" و "));
}

function squash(key: string): string {
  return key.toLowerCase().replace(/[-_\s]/g, "");
}

function distance(a: string, b: string): number {
  const row: number[] = [];
  for (let j = 0; j <= b.length; j++) row.push(j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

/** The known key a wrong key most likely stands for: runs_on gives runs-on. Null when nothing is close. */
export function nearestKey(key: string, known: string[]): string | null {
  const flat = squash(key);
  for (const candidate of known) {
    if (squash(candidate) === flat) return candidate;
  }
  let best: string | null = null;
  let bestDistance = 3;
  for (const candidate of known) {
    const d = distance(flat, squash(candidate));
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}

/** The message for a key that the place does not know. `where` is Arabic: "في الـ job". */
export function unknownKey(key: string, known: string[], where: string): string {
  const meant = nearestKey(key, known);
  return meant
    ? "المفتاح " + code(key) + " مش معروف " + where + ". قصدك " + code(meant) + "؟"
    : "المفتاح " + code(key) + " مش معروف " + where + ".";
}

/** The first key of `keys` that is not in `known`, or null. */
export function firstUnknown(keys: string[], known: string[]): string | null {
  for (const key of keys) {
    if (!known.includes(key)) return key;
  }
  return null;
}

/** 20, "20", "20.x" and "20.11.1" are all Node 20. */
export function nodeMajor(value: unknown): number | null {
  const match = /^v?(\d+)(\.|$)/.exec(String(value).trim());
  return match ? Number(match[1]) : null;
}
