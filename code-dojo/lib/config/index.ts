/**
 * Checks a config file against the rules of its exercise.
 *
 * Every rule has an id. An exercise lists the ids it wants (`rules` in the
 * problem data), so a new exercise can reuse rules without new code.
 */

import type { ConfigLanguage } from "@/data/types";
import { AZURE_RULES } from "./azure";
import { COMPOSE_RULES } from "./compose";
import { DOCKERFILE_RULES, parseDockerfile } from "./dockerfile";
import { DOCKERIGNORE_RULES, parseDockerIgnore } from "./dockerignore";
import { GITHUB_RULES } from "./github";
import type { CheckReport, Diagnostic, Rule, RuleResult } from "./types";
import { parseYaml, validYamlRule } from "./yaml";

type Parse = (text: string) => { diagnostics: Diagnostic[] };

interface Family {
  language: ConfigLanguage;
  parse: Parse;
  rules: Rule<never>[];
}

/** Four kinds of YAML file share one reader, so a file is parsed once whatever rules it mixes. */
const FAMILIES: Family[] = [
  { language: "dockerfile", parse: parseDockerfile, rules: DOCKERFILE_RULES as Rule<never>[] },
  { language: "dockerignore", parse: parseDockerIgnore, rules: DOCKERIGNORE_RULES as Rule<never>[] },
  { language: "yaml", parse: parseYaml, rules: COMPOSE_RULES as Rule<never>[] },
  { language: "yaml", parse: parseYaml, rules: [validYamlRule] as Rule<never>[] },
  { language: "yaml", parse: parseYaml, rules: GITHUB_RULES as Rule<never>[] },
  { language: "yaml", parse: parseYaml, rules: AZURE_RULES as Rule<never>[] },
];

interface Entry {
  family: Family;
  rule: Rule<never>;
}

const REGISTRY = new Map<string, Entry>();
for (const family of FAMILIES) {
  for (const rule of family.rules) {
    if (REGISTRY.has(rule.id)) throw new Error("Two rules share the id " + rule.id);
    REGISTRY.set(rule.id, { family, rule });
  }
}

/** The language a rule is written for, or null for an unknown id. */
export function languageOfRule(id: string): ConfigLanguage | null {
  return REGISTRY.get(id)?.family.language ?? null;
}

export function allRuleIds(): string[] {
  return Array.from(REGISTRY.keys());
}

/** A line of the file that the report points at, for the editor to underline. */
export interface ReportMarker {
  line: number;
  /** The last line of the mark, when it covers more than one. */
  endLine?: number;
  message: string;
  severity: "error" | "warning";
}

/** Syntax errors, and every broken rule that knows its line. */
export function markersOf(report: CheckReport): ReportMarker[] {
  const out: ReportMarker[] = [];
  // The editor shows plain text, so the backticks around code terms go.
  const plain = (text: string) => text.split("`").join("");
  for (const diagnostic of report.diagnostics) {
    const raw = diagnostic.raw === undefined ? "" : " (" + diagnostic.raw + ")";
    const marker: ReportMarker = { line: diagnostic.line, message: plain(diagnostic.message) + raw, severity: "error" };
    if (diagnostic.endLine !== undefined) marker.endLine = diagnostic.endLine;
    out.push(marker);
  }
  for (const rule of report.rules) {
    if (rule.status !== "fail" || rule.line === undefined) continue;
    // "The file is valid YAML" repeats a syntax error that is already marked.
    if (report.diagnostics.some((diagnostic) => diagnostic.message === rule.detail)) continue;
    out.push({ line: rule.line, message: plain(rule.title + ": " + (rule.detail ?? "")), severity: "warning" });
  }
  return out;
}

/** Only the syntax errors of a file, for the editor to underline while it is typed. */
export function syntaxErrors(ruleIds: string[], text: string): Diagnostic[] {
  const entry = ruleIds.length > 0 ? REGISTRY.get(ruleIds[0]) : undefined;
  return entry ? entry.family.parse(text).diagnostics : [];
}

export interface CheckOptions {
  /**
   * For a file that is meant to be complete (a "fix this file" exercise):
   * a rule that is not met counts as a problem, not as "not yet".
   */
  strict?: boolean;
}

export function checkConfig(ruleIds: string[], text: string, options: CheckOptions = {}): CheckReport {
  const parsed = new Map<Parse, { diagnostics: Diagnostic[] }>();
  const rules: RuleResult[] = [];
  const diagnostics: Diagnostic[] = [];
  let passed = 0;

  for (const id of ruleIds) {
    const entry = REGISTRY.get(id);
    if (!entry) throw new Error("Unknown rule: " + id);

    let file = parsed.get(entry.family.parse);
    if (!file) {
      file = entry.family.parse(text);
      parsed.set(entry.family.parse, file);
      for (const diagnostic of file.diagnostics) diagnostics.push(diagnostic);
    }

    let verdict = entry.rule.check(file as never);
    if (options.strict && verdict.status === "todo") verdict = { ...verdict, status: "fail" };
    if (verdict.status === "pass") passed++;
    rules.push({ id, title: entry.rule.title, why: entry.rule.why, ...verdict });
  }

  return { rules, diagnostics, passed, ok: diagnostics.length === 0 && passed === ruleIds.length };
}
