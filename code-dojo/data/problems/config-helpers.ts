import type { ConfigLanguage, Step } from "../types";

/** Letters and digits become blanks. Punctuation stays: it is the shape of the line. */
function blank(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += /[A-Za-z0-9]/.test(text[i]) ? "_" : text[i];
  }
  return out;
}

/** Flags whose name is part of the shape of a Dockerfile line. Their value is hidden. */
const FLAG = /^--(from|chown|chmod)=/;

function dockerfileLine(line: string): string {
  const words = line.trim().split(/\s+/);
  const isFrom = words[0].toUpperCase() === "FROM";
  const shown: string[] = [];
  let hasBlank = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let text = word;
    // The instruction stays, and so does AS in a FROM line.
    if (i > 0 && !(isFrom && word.toUpperCase() === "AS")) {
      const flag = FLAG.exec(word);
      text = flag ? flag[0] + blank(word.slice(flag[0].length)) : blank(word);
    }
    if (text.includes("_")) hasBlank = true;
    shown.push(text);
  }

  // "COPY . ." has no letters to hide, so its two paths become blanks.
  if (!hasBlank) {
    for (let i = 1; i < shown.length; i++) shown[i] = "_";
  }
  return shown.join(" ");
}

/**
 * The "shape with blanks" hint of a config line:
 *
 *   FROM node:22-alpine AS build      ->  FROM ____:__-______ AS _____
 *   COPY --from=build /app/dist ./    ->  COPY --from=_____ /___/____ ./
 *       ports:                        ->      _____:          (YAML keeps its indentation)
 *   .env*                             ->  .___*
 */
export function configShape(code: string, language: ConfigLanguage): string {
  const out: string[] = [];
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    if (language === "dockerfile") out.push(dockerfileLine(lines[i]));
    else if (language === "yaml") out.push(blank(lines[i]).trimEnd());
    else out.push(blank(lines[i].trim()));
  }
  return out.join("\n");
}

type StepText = Omit<Step, "expected" | "hint2">;

/** A line of a Dockerfile. Its hint2 is made from the line itself. */
export function dline(expected: string, text: StepText): Step {
  return { ...text, expected, hint2: configShape(expected, "dockerfile") };
}

/** A line of a YAML file. `expected` keeps its indentation: in YAML it is part of the meaning. */
export function yline(expected: string, text: StepText): Step {
  return { ...text, expected, hint2: configShape(expected, "yaml") };
}

/** A line of a .dockerignore file. */
export function iline(expected: string, text: StepText): Step {
  return { ...text, expected, hint2: configShape(expected, "dockerignore") };
}
