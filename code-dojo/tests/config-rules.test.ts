import { describe, expect, it } from "vitest";
import { allRuleIds, checkConfig, markersOf } from "@/lib/config";
import { parseDockerfile } from "@/lib/config/dockerfile";
import { isIgnored, parseDockerIgnore } from "@/lib/config/dockerignore";
import { parseYaml } from "@/lib/config/compose";
import type { RuleStatus } from "@/lib/config/types";

/** The status of one rule for a file. */
function status(rule: string, text: string): RuleStatus {
  return checkConfig([rule], text).rules[0].status;
}

function detail(rule: string, text: string): { status: RuleStatus; detail?: string; line?: number } {
  const result = checkConfig([rule], text).rules[0];
  return { status: result.status, detail: result.detail, line: result.line };
}

const NODE_APP = `FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]`;

const SPA = `FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]`;

describe("the Dockerfile parser", () => {
  it("reads instructions, flags, the exec form and line numbers", () => {
    const file = parseDockerfile(`# a comment
from node:22-alpine as build

copy --from=deps --chown=node:node /app/node_modules ./node_modules
CMD ["node", "server.js"]`);
    expect(file.diagnostics).toEqual([]);
    expect(file.instructions.map((i) => i.keyword + "@" + i.line)).toEqual(["FROM@2", "COPY@4", "CMD@5"]);
    expect(file.instructions[1].flags).toEqual({ from: "deps", chown: "node:node" });
    expect(file.instructions[1].args).toBe("/app/node_modules ./node_modules");
    expect(file.instructions[2].json).toEqual(["node", "server.js"]);
  });

  it("splits stages and knows the image, the tag, the name and the base stage", () => {
    const file = parseDockerfile(`FROM node:22-alpine AS build
FROM registry.example.com:5000/team/app
FROM node@sha256:abc
FROM build AS final`);
    expect(file.stages.map((s) => [s.image, s.tag, s.name, s.base])).toEqual([
      ["node", "22-alpine", "build", null],
      ["registry.example.com:5000/team/app", null, null, null],
      ["node", null, null, null],
      ["build", null, "final", 0],
    ]);
    expect(file.stages[2].digest).toBe("sha256:abc");
  });

  it("joins lines that end with a backslash", () => {
    const file = parseDockerfile("FROM node:22\nRUN npm ci && \\\n    npm run build\nEXPOSE 3000");
    expect(file.instructions[1].args).toBe("npm ci && npm run build");
    expect(file.instructions[2].line).toBe(4);
  });

  it("reports what it cannot read, with the line", () => {
    expect(parseDockerfile("FROM node:22\nCOPPY . .").diagnostics).toEqual([
      { line: 2, message: expect.stringContaining("COPPY") },
    ]);
    expect(parseDockerfile("WORKDIR /app\nFROM node:22").diagnostics[0].line).toBe(1);
    expect(parseDockerfile("FROM node:22\nWORKDIR").diagnostics[0].line).toBe(2);
    expect(parseDockerfile("FROM node:22\nCMD ['node', 'server.js']").diagnostics[0].line).toBe(2);
    // ARG may come before FROM.
    expect(parseDockerfile("ARG NODE_VERSION=22\nFROM node:${NODE_VERSION}").diagnostics).toEqual([]);
  });
});

describe("Dockerfile rules: the nine from the track", () => {
  it("pinned base image", () => {
    expect(status("pinned-base", "")).toBe("todo");
    expect(status("pinned-base", "FROM node:22-alpine")).toBe("pass");
    expect(status("pinned-base", "FROM node:20-alpine AS build\nFROM build")).toBe("pass");
    expect(status("pinned-base", "FROM scratch")).toBe("pass");
    expect(detail("pinned-base", "FROM node:22-alpine AS build\nFROM nginx")).toMatchObject({ status: "fail", line: 2 });
    expect(status("pinned-base", "FROM node:latest")).toBe("fail");
    expect(status("pinned-base", "FROM node")).toBe("fail");
  });

  it("WORKDIR before copying", () => {
    expect(status("workdir-before-copy", "FROM node:22")).toBe("todo");
    expect(status("workdir-before-copy", "FROM node:22\nWORKDIR /app\nCOPY . .")).toBe("pass");
    expect(detail("workdir-before-copy", "FROM node:22\nCOPY . .\nWORKDIR /app")).toMatchObject({ status: "fail", line: 2 });
    // A full destination path does not need a WORKDIR.
    expect(status("workdir-before-copy", SPA)).toBe("pass");
    // Each stage needs its own.
    expect(status("workdir-before-copy", "FROM node:22 AS a\nWORKDIR /app\nCOPY . .\nFROM node:22\nCOPY --from=a /app/dist ./dist")).toBe("fail");
  });

  it("package files before the source", () => {
    expect(status("deps-before-source", "FROM node:22\nWORKDIR /app")).toBe("todo");
    expect(status("deps-before-source", NODE_APP)).toBe("pass");
    expect(status("deps-before-source", "FROM node:22\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci\nCOPY . .")).toBe("pass");
    expect(detail("deps-before-source", "FROM node:22\nWORKDIR /app\nCOPY . .\nRUN npm ci")).toMatchObject({ status: "fail", line: 3 });
    expect(detail("deps-before-source", "FROM node:22\nWORKDIR /app\nRUN npm ci\nCOPY . .")).toMatchObject({ status: "fail", line: 3 });
  });

  it("npm ci, not npm install", () => {
    expect(status("npm-ci", "FROM node:22")).toBe("todo");
    expect(status("npm-ci", "FROM node:22\nRUN npm ci --omit=dev")).toBe("pass");
    expect(detail("npm-ci", "FROM node:22\nRUN npm install")).toMatchObject({ status: "fail", line: 2 });
    expect(status("npm-ci", "FROM node:22\nRUN npm i && npm run build")).toBe("fail");
    // A global tool is not the project's install.
    expect(status("npm-ci", "FROM node:22\nRUN npm install -g serve\nRUN npm ci")).toBe("pass");
  });

  it("two stages, with the build in the first", () => {
    expect(status("multi-stage", "")).toBe("todo");
    expect(status("multi-stage", NODE_APP)).toBe("todo");
    expect(status("multi-stage", SPA)).toBe("pass");
    expect(status("multi-stage", "FROM node:22 AS build\nFROM nginx:1.27\nRUN npm run build")).toBe("fail");
    expect(status("multi-stage", "FROM node:22 AS build\nFROM nginx:1.27")).toBe("todo");
  });

  it("the final stage copies only the build output", () => {
    expect(status("final-copies-output", NODE_APP)).toBe("todo");
    expect(status("final-copies-output", SPA)).toBe("pass");
    expect(status("final-copies-output", SPA.replace("/app/dist", "/app"))).toBe("fail");
    expect(status("final-copies-output", SPA.replace("/app/dist", "/app/"))).toBe("fail");
    expect(detail("final-copies-output", SPA.replace("COPY --from=build /app/dist", "COPY ./dist"))).toMatchObject({
      status: "fail",
      line: 9,
    });
    expect(status("final-copies-output", "FROM node:22 AS build\nFROM nginx:1.27")).toBe("todo");
  });

  it("a user that is not root", () => {
    expect(status("non-root", "")).toBe("todo");
    expect(status("non-root", "FROM node:22")).toBe("todo");
    expect(status("non-root", NODE_APP)).toBe("pass");
    expect(status("non-root", "FROM node:22\nUSER 1001:1001")).toBe("pass");
    expect(status("non-root", "FROM node:22\nUSER node\nUSER root")).toBe("fail");
    expect(status("non-root", "FROM node:22\nUSER 0")).toBe("fail");
    // This image already runs as a normal user.
    expect(status("non-root", SPA)).toBe("pass");
    expect(status("non-root", SPA.replace("nginxinc/nginx-unprivileged:1.27-alpine", "nginx:1.27-alpine"))).toBe("todo");
    // Only the final stage counts.
    expect(status("non-root", "FROM node:22 AS build\nUSER node\nFROM node:22")).toBe("todo");
  });

  it("EXPOSE and one CMD", () => {
    expect(status("expose-and-cmd", "FROM node:22")).toBe("todo");
    expect(status("expose-and-cmd", "FROM node:22\nEXPOSE 3000")).toBe("todo");
    expect(status("expose-and-cmd", 'FROM node:22\nCMD ["node", "a.js"]')).toBe("todo");
    expect(status("expose-and-cmd", NODE_APP)).toBe("pass");
    expect(detail("expose-and-cmd", NODE_APP + '\nCMD ["npm", "start"]')).toMatchObject({ status: "fail" });
  });

  it("no secrets", () => {
    expect(status("no-secrets", "FROM node:22")).toBe("todo");
    expect(status("no-secrets", NODE_APP)).toBe("pass");
    expect(detail("no-secrets", "FROM node:22\nWORKDIR /app\nCOPY .env .env")).toMatchObject({ status: "fail", line: 3 });
    expect(status("no-secrets", "FROM node:22\nCOPY .env.production ./")).toBe("fail");
    expect(status("no-secrets", "FROM node:22\nCOPY config/server.pem /certs/")).toBe("fail");
    expect(status("no-secrets", "FROM node:22\nENV API_KEY=abc123")).toBe("fail");
    expect(status("no-secrets", "FROM node:22\nARG NPM_TOKEN=xyz")).toBe("fail");
    // A name without a value, or a value that comes from outside, is fine.
    expect(status("no-secrets", "FROM node:22\nARG NPM_TOKEN\nENV API_KEY=$API_KEY")).toBe("pass");
    expect(status("no-secrets", "FROM node:22\nENV NODE_ENV=production")).toBe("pass");
  });
});

describe("Dockerfile rules: what an exercise must contain", () => {
  it("a Node base, the source after the install, and CMD with node", () => {
    expect(status("node-base", NODE_APP)).toBe("pass");
    expect(status("node-base", "FROM python:3.12")).toBe("fail");
    expect(status("copies-source", NODE_APP)).toBe("pass");
    expect(status("copies-source", "FROM node:22\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci")).toBe("todo");
    expect(status("cmd-runs-node", NODE_APP)).toBe("pass");
    expect(status("cmd-runs-node", NODE_APP.replace('CMD ["node", "server.js"]', "CMD node server.js"))).toBe("fail");
    expect(status("cmd-runs-node", NODE_APP.replace('"node", "server.js"', '"npm", "run", "dev"'))).toBe("fail");
    expect(status("node-env-production", NODE_APP)).toBe("pass");
    expect(status("node-env-production", NODE_APP.replace("=production", "=development"))).toBe("fail");
    expect(status("node-env-production", "FROM node:22")).toBe("todo");
  });

  it("nginx as the final stage", () => {
    expect(status("nginx-final", SPA)).toBe("pass");
    expect(status("nginx-final", SPA.replace("/usr/share/nginx/html", "/var/www"))).toBe("todo");
    expect(status("nginx-final", SPA.replace("nginxinc/nginx-unprivileged:1.27-alpine", "node:22-alpine"))).toBe("fail");
    expect(status("nginx-final", NODE_APP)).toBe("todo");
  });

  const NEXT = `FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]`;

  it("Next.js standalone output", () => {
    expect(status("next-standalone", NEXT)).toBe("pass");
    expect(detail("next-standalone", NEXT.replace("COPY --from=build /app/.next/static ./.next/static\n", ""))).toMatchObject({
      status: "todo",
      detail: expect.stringContaining(".next/static"),
    });
    expect(status("final-copies-output", NEXT)).toBe("pass");
  });

  it("NEXT_PUBLIC_ variables must exist at build time", () => {
    expect(status("next-public-at-build", NEXT)).toBe("pass");
    // Still typing: declared, the build line comes next.
    expect(status("next-public-at-build", NEXT.split("RUN npm run build")[0])).toBe("todo");
    expect(status("next-public-at-build", "FROM node:22")).toBe("todo");
    // The classic mistake: only at run time, in the final stage.
    const runtimeOnly = NEXT.replace("ARG NEXT_PUBLIC_API_URL\nENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL\n", "").replace(
      "ENV NODE_ENV=production",
      "ENV NODE_ENV=production\nENV NEXT_PUBLIC_API_URL=https://api.example.com",
    );
    expect(status("next-public-at-build", runtimeOnly)).toBe("fail");
    // Declared after the build ran.
    const late = NEXT.replace("ARG NEXT_PUBLIC_API_URL\nENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL\nRUN npm run build", "RUN npm run build\nARG NEXT_PUBLIC_API_URL");
    expect(status("next-public-at-build", late)).toBe("fail");
  });
});

describe(".dockerignore: patterns the way Docker reads them", () => {
  const ignored = (text: string, path: string) => isIgnored(parseDockerIgnore(text), path);

  it("matches a folder and everything in it, from the root only", () => {
    expect(ignored("node_modules", "node_modules/react/index.js")).toBe(true);
    expect(ignored("node_modules/", "node_modules")).toBe(true);
    expect(ignored("./node_modules", "node_modules/a.js")).toBe(true);
    // Unlike .gitignore, this does not reach deeper folders.
    expect(ignored("node_modules", "packages/web/node_modules/a.js")).toBe(false);
    expect(ignored("**/node_modules", "packages/web/node_modules/a.js")).toBe(true);
    expect(ignored("**/node_modules", "node_modules/a.js")).toBe(true);
  });

  it("knows * and **", () => {
    expect(ignored(".env*", ".env")).toBe(true);
    expect(ignored(".env*", ".env.local")).toBe(true);
    expect(ignored(".env*", "config/.env")).toBe(false);
    expect(ignored("*.log", "npm-debug.log")).toBe(true);
    expect(ignored("*.log", "logs/app.log")).toBe(false);
    expect(ignored("**/*.log", "logs/app.log")).toBe(true);
    expect(ignored("src/*.test.js", "src/a.test.js")).toBe(true);
    expect(ignored("src/*.test.js", "src/deep/a.test.js")).toBe(false);
  });

  it("lets ! bring a path back, and the last match wins", () => {
    expect(ignored("*.md\n!README.md", "README.md")).toBe(false);
    expect(ignored("*.md\n!README.md", "CHANGELOG.md")).toBe(true);
    expect(ignored("!README.md\n*.md", "README.md")).toBe(true);
  });

  it("skips comments and empty lines", () => {
    expect(parseDockerIgnore("# deps\n\nnode_modules\n   \n# end").patterns.map((p) => p.pattern + "@" + p.line)).toEqual([
      "node_modules@3",
    ]);
  });
});

describe(".dockerignore rules ask what the file does, not how it is written", () => {
  it("accepts any pattern that leaves the path out", () => {
    for (const text of ["node_modules", "**/node_modules", "node_modules/", "node_*"]) {
      expect(status("ignore-node-modules", text)).toBe("pass");
    }
    expect(status("ignore-node-modules", ".git")).toBe("todo");
    expect(status("ignore-env", ".env")).toBe("todo");
    expect(status("ignore-env", ".env*")).toBe("pass");
    expect(status("ignore-env", ".env\n.env.*")).toBe("pass");
    expect(status("ignore-build-output", "dist")).toBe("todo");
    expect(status("ignore-build-output", "dist\n.next")).toBe("pass");
    expect(status("ignore-docker-files", "Dockerfile\n.dockerignore")).toBe("pass");
    expect(status("ignore-local-files", ".vscode\n.DS_Store")).toBe("pass");
    expect(status("ignore-logs", "*.log")).toBe("pass");
    expect(status("ignore-coverage", "coverage")).toBe("pass");
    expect(status("ignore-git", ".git")).toBe("pass");
  });

  it("fails a pattern that removes what the build needs", () => {
    expect(status("keeps-package-files", "")).toBe("todo");
    expect(status("keeps-package-files", "node_modules")).toBe("pass");
    expect(detail("keeps-package-files", "node_modules\n*.json")).toMatchObject({ status: "fail", line: 2 });
    expect(status("keeps-package-files", "*.json\n!package*.json")).toBe("pass");
    expect(status("keeps-source", "node_modules")).toBe("pass");
    expect(status("keeps-source", "src")).toBe("fail");
    expect(status("keeps-source", "*")).toBe("fail");
  });
});

describe("docker-compose.yml", () => {
  const COMPOSE = `services:
  web:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      API_URL: http://api:4000
    depends_on:
      - api
  api:
    build: ./api
    environment:
      DATABASE_URL: \${DATABASE_URL}
`;
  const RULES = [
    "compose-valid-yaml",
    "compose-two-services",
    "compose-build-or-image",
    "compose-web-port",
    "compose-web-reaches-api",
    "compose-depends-on",
    "compose-no-secrets",
    "compose-api-env",
  ];

  it("passes every rule for a good file", () => {
    const report = checkConfig(RULES, COMPOSE);
    expect(report.rules.filter((r) => r.status !== "pass").map((r) => r.id + ": " + r.detail)).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("reports a YAML error with its line", () => {
    const broken = COMPOSE.replace("    ports:", "   ports:");
    const report = checkConfig(RULES, broken);
    expect(report.ok).toBe(false);
    expect(report.diagnostics.length).toBeGreaterThan(0);
    expect(report.diagnostics[0].line).toBeGreaterThanOrEqual(3);
    expect(report.rules[0]).toMatchObject({ id: "compose-valid-yaml", status: "fail" });
    expect(parseYaml("services:\n\tweb: 1").diagnostics.length).toBeGreaterThan(0);
  });

  it("every rule is unmet while the file grows, and fails only on a real mistake", () => {
    expect(checkConfig(RULES, "").rules.map((r) => r.status)).toEqual(RULES.map(() => "todo"));
    expect(status("compose-two-services", "services:\n  web:\n    build: .")).toBe("todo");
    expect(status("compose-build-or-image", "services:\n  web:\n    image: node:22-alpine")).toBe("pass");
    expect(status("compose-build-or-image", "services:\n  web:\n    image: node")).toBe("fail");
    expect(status("compose-build-or-image", "services:\n  web:\n    image: node:latest")).toBe("fail");
    expect(status("compose-web-port", COMPOSE.replace('"3000:3000"', '"3000"'))).toBe("fail");
    expect(status("compose-web-port", COMPOSE.replace('"3000:3000"', "8080:3000"))).toBe("pass");
    expect(status("compose-depends-on", COMPOSE.replace("    depends_on:\n      - api\n", ""))).toBe("todo");
    expect(status("compose-depends-on", COMPOSE.replace("      - api\n", "      api:\n        condition: service_started\n"))).toBe("pass");
  });

  it("knows localhost from the service name", () => {
    expect(detail("compose-web-reaches-api", COMPOSE.replace("http://api:4000", "http://localhost:4000"))).toMatchObject({
      status: "fail",
      line: 7,
    });
    expect(status("compose-web-reaches-api", COMPOSE.replace("      API_URL: http://api:4000", "      - API_URL=http://api:4000"))).toBe("pass");
    expect(status("compose-web-reaches-api", COMPOSE.replace("http://api:4000", "https://example.com"))).toBe("todo");
  });

  it("refuses a secret written in the file", () => {
    const leaked = COMPOSE.replace("${DATABASE_URL}", "postgres://admin:hunter2@db:5432/app");
    expect(detail("compose-no-secrets", leaked)).toMatchObject({ status: "fail", line: 13 });
    expect(status("compose-api-env", leaked)).toBe("todo");
    expect(status("compose-no-secrets", COMPOSE)).toBe("pass");
  });
});

describe("the report", () => {
  it("counts passes and is ok only when every rule passes and the file parses", () => {
    const good = checkConfig(["pinned-base", "npm-ci"], NODE_APP);
    expect(good).toMatchObject({ passed: 2, ok: true, diagnostics: [] });
    const half = checkConfig(["pinned-base", "npm-ci"], "FROM node:22");
    expect(half).toMatchObject({ passed: 1, ok: false });
    const broken = checkConfig(["pinned-base"], "FROM node:22\nCOPPY . .");
    expect(broken).toMatchObject({ passed: 1, ok: false });
    expect(broken.diagnostics).toHaveLength(1);
  });

  it("refuses a rule id that does not exist", () => {
    expect(() => checkConfig(["no-such-rule"], "")).toThrow("Unknown rule");
  });
});

describe("the texts of the rules", () => {
  const SAMPLES = [
    "",
    "FROM node:latest\nCOPY . .\nRUN npm install\nCOPY .env .env\nEXPOSE 3000\nCMD node server.js",
    "FROM node:22 AS build\nWORKDIR /app\nRUN npm run build\nFROM nginx\nCOPY ./dist /var/www\nUSER root\nENV API_KEY=abc",
    "FROM python:3.12\nENV NODE_ENV=development\nARG NEXT_PUBLIC_X\nCOPPY . .\nWORKDIR",
    "*.json\nsrc",
    "services:\n  web:\n    image: node\n    ports:\n      - \"3000\"\n    environment:\n      API_URL: http://localhost:4000\n      API_TOKEN: abc",
    "services:\n  web:\n   ports:\n      - 1",
  ];

  it("keep their code terms in pairs of backticks, in every message they can give", () => {
    const paired = (text: string) => text.split("`").length % 2 === 1;
    for (const id of allRuleIds()) {
      for (const sample of SAMPLES) {
        for (const strict of [false, true]) {
          const report = checkConfig([id], sample, { strict });
          const rule = report.rules[0];
          expect(paired(rule.title), id + " title").toBe(true);
          expect(paired(rule.why), id + " why").toBe(true);
          expect(paired(rule.detail ?? ""), id + " detail: " + rule.detail).toBe(true);
          expect(rule.title.length, id).toBeGreaterThan(5);
          expect(rule.why.length, id).toBeGreaterThan(40);
          // A rule that does not pass always says what is missing or wrong.
          if (rule.status !== "pass") expect((rule.detail ?? "").length, id + " on " + JSON.stringify(sample)).toBeGreaterThan(0);
          for (const diagnostic of report.diagnostics) expect(paired(diagnostic.message), diagnostic.message).toBe(true);
        }
      }
    }
  });

  it("has a different id and title for every rule", () => {
    const ids = allRuleIds();
    expect(new Set(ids).size).toBe(ids.length);
    // GitHub Actions and Azure Pipelines have the same rule under the same
    // title, so titles are compared inside one kind of file.
    const families = new Map<string, string[]>();
    for (const id of ids) {
      const family = /^(gh|az|ci|compose)-/.exec(id)?.[1] ?? "docker";
      const titles = families.get(family) ?? [];
      titles.push(checkConfig([id], "").rules[0].title);
      families.set(family, titles);
    }
    for (const [family, titles] of families) expect(new Set(titles).size, family).toBe(titles.length);
  });
});

describe("a file that is meant to be complete", () => {
  it("counts a rule that is not met as a problem", () => {
    expect(checkConfig(["non-root"], "FROM node:22").rules[0].status).toBe("todo");
    const strict = checkConfig(["non-root"], "FROM node:22", { strict: true }).rules[0];
    expect(strict.status).toBe("fail");
    expect(strict.detail).toContain("root");
    expect(checkConfig(["non-root"], "FROM node:22\nUSER node", { strict: true }).rules[0].status).toBe("pass");
  });
});

describe("markers for the editor", () => {
  it("gives syntax errors, and broken rules that know their line, as plain text", () => {
    const report = checkConfig(["pinned-base", "npm-ci", "non-root"], "FROM node:latest\nRUN npm install\nCOPPY . .");
    expect(markersOf(report)).toEqual([
      { line: 3, severity: "error", message: expect.stringContaining("COPPY") },
      { line: 1, severity: "warning", message: expect.stringContaining("latest") },
      { line: 2, severity: "warning", message: expect.stringContaining("npm install") },
    ]);
    for (const marker of markersOf(report)) expect(marker.message).not.toContain("`");
  });

  it("is empty for a good file", () => {
    expect(markersOf(checkConfig(["pinned-base", "npm-ci"], NODE_APP))).toEqual([]);
  });
});
