import { describe, expect, it } from "vitest";
import { checkConfig } from "@/lib/config";
import { kindsOf, nearestKey, usesNpmInstall } from "@/lib/config/pipeline";
import type { RuleStatus } from "@/lib/config/types";
import { parseYaml } from "@/lib/config/yaml";

function verdict(rule: string, text: string) {
  return checkConfig([rule], text).rules[0];
}

function status(rule: string, text: string): RuleStatus {
  return verdict(rule, text).status;
}

/** A GitHub Actions workflow with one job. `steps` are lines at 6 spaces. */
function workflow(steps: string[], options: { on?: string; job?: string[] } = {}): string {
  return [
    "name: CI",
    options.on ?? "on:\n  push:\n    branches: [main]\n  pull_request:",
    "jobs:",
    "  build:",
    ...(options.job ?? ["    runs-on: ubuntu-latest"]),
    "    steps:",
    ...steps.map((line) => "      " + line),
  ].join("\n");
}

/** An Azure pipeline with steps at the top. `steps` are lines at 2 spaces. */
function pipeline(steps: string[], head = "trigger:\n  - main\npr:\n  - main\npool:\n  vmImage: ubuntu-latest"): string {
  return [head, "steps:", ...steps.map((line) => "  " + line)].join("\n");
}

describe("reading a YAML file", () => {
  it("explains a syntax error in Arabic, keeps the parser's message, and gives the line", () => {
    const file = parseYaml("jobs:\n  build:\n    steps:\n   - run: npm ci\n");
    // One mistake, one diagnostic: the parser's three complaints are merged.
    // It cannot tell which of the two lines is wrong, so both are given.
    expect(file.diagnostics).toHaveLength(1);
    expect(file.diagnostics[0]).toMatchObject({ line: 3, endLine: 4 });
    expect(file.diagnostics[0].message).toMatch(/[؀-ۿ]/);
    expect((file.diagnostics[0].raw ?? "").length).toBeGreaterThan(0);
    expect(file.data).toBeNull();
  });

  it("gives one line when the parser knows it, and each separate mistake once", () => {
    const one = parseYaml("jobs:\n  build:\n    runs-on: x\n   steps:\n      - run: a\n");
    expect(one.diagnostics).toHaveLength(1);
    expect(one.diagnostics[0].line).toBe(4);
    expect(one.diagnostics[0].endLine).toBeUndefined();
    const deeper = parseYaml("jobs:\n  build:\n    runs-on: x\n      steps:\n      - run: a\n");
    expect(deeper.diagnostics[0]).toMatchObject({ line: 3, endLine: 4 });
    const two = parseYaml("a:\n  b: 1\n c: 2\nd:\n  e: 1\n f: 2\n");
    expect(two.diagnostics.map((d) => d.line)).toEqual([3, 6]);
  });

  it("names a tab and a key written twice", () => {
    expect(parseYaml("jobs:\n\tbuild: 1").diagnostics[0].message).toContain("Tab");
    const twice = parseYaml("name: a\nname: b");
    expect(twice.diagnostics[0]).toMatchObject({ line: 2, message: expect.stringContaining("مرتين") });
  });

  it("finds the line of a key and of a list item", () => {
    const file = parseYaml("on:\n  push:\n    branches: [main]\njobs:\n  build:\n    steps:\n      - run: a\n      - run: b");
    expect(file.lineOfKey(["on", "push", "branches"])).toBe(3);
    expect(file.lineOfKey(["jobs", "build", "steps"])).toBe(6);
    expect(file.lineOf(["jobs", "build", "steps", 1])).toBe(8);
    expect(file.lineOfKey(["jobs", "nothing"])).toBeUndefined();
  });

  it("keeps on as a key, not as the YAML 1.1 word for true", () => {
    expect(Object.keys(parseYaml("on: push").data as object)).toEqual(["on"]);
  });
});

describe("what a command does", () => {
  it("knows the kinds, in the order they appear", () => {
    expect(kindsOf("npm ci")).toEqual(["install"]);
    expect(kindsOf("npm ci && npm run lint && npm test")).toEqual(["install", "lint", "test"]);
    expect(kindsOf("npm run type-check")).toEqual(["typecheck"]);
    expect(kindsOf("npx tsc --noEmit")).toEqual(["typecheck"]);
    expect(kindsOf("npm run build")).toEqual(["build"]);
    expect(kindsOf("./scripts/deploy.sh dist")).toEqual([]);
    expect(kindsOf("npm run test:e2e")).toEqual(["test"]);
  });

  it("tells npm install from npm ci and from a global tool", () => {
    expect(usesNpmInstall("npm install")).toBe(true);
    expect(usesNpmInstall("npm i")).toBe(true);
    expect(usesNpmInstall("npm ci")).toBe(false);
    expect(usesNpmInstall("npm install -g vercel")).toBe(false);
  });

  it("suggests the key that was meant", () => {
    expect(nearestKey("runs_on", ["runs-on", "steps"])).toBe("runs-on");
    expect(nearestKey("step", ["runs-on", "steps"])).toBe("steps");
    expect(nearestKey("vmimage", ["vmImage", "name"])).toBe("vmImage");
    expect(nearestKey("zzzzzz", ["runs-on", "steps"])).toBeNull();
  });
});

describe("GitHub Actions rules", () => {
  it("trigger: push to main and pull requests", () => {
    expect(status("gh-trigger", "")).toBe("todo");
    expect(status("gh-trigger", "name: CI")).toBe("todo");
    expect(status("gh-trigger", "on: [push, pull_request]")).toBe("pass");
    expect(verdict("gh-trigger", "on: push")).toMatchObject({ status: "todo", detail: expect.stringContaining("pull_request") });
    expect(status("gh-trigger", "on:\n  push:\n    branches: [main]\n  pull_request:")).toBe("pass");
    expect(status("gh-trigger", "on:\n  push:\n    branches:\n      - main\n  pull_request:\n    branches: [main]")).toBe("pass");
    expect(verdict("gh-trigger", "on:\n  push:\n    branches: [dev]\n  pull_request:")).toMatchObject({ status: "fail", line: 3 });
    expect(status("gh-trigger", "on:\n  push:\n    branches-ignore: [main]\n  pull_request:")).toBe("fail");
  });

  it("trigger for a workflow that publishes: main only, no pull requests", () => {
    expect(status("gh-trigger-main-only", "on:\n  push:")).toBe("todo");
    expect(status("gh-trigger-main-only", "on:\n  push:\n    branches: [main]")).toBe("pass");
    expect(status("gh-trigger-main-only", "on:\n  push:\n    branches: [main, dev]")).toBe("fail");
    expect(verdict("gh-trigger-main-only", "on:\n  push:\n    branches: [main]\n  pull_request:")).toMatchObject({
      status: "fail",
      line: 4,
    });
  });

  it("runs-on on every job, with the wrong spelling pointed out", () => {
    expect(status("gh-runs-on", "name: CI")).toBe("todo");
    expect(status("gh-runs-on", workflow([]))).toBe("pass");
    expect(status("gh-runs-on", workflow([], { job: ["    needs: x"] }))).toBe("todo");
    const wrong = verdict("gh-runs-on", workflow([], { job: ["    runs_on: ubuntu-latest"] }));
    expect(wrong).toMatchObject({ status: "fail", line: 8, detail: expect.stringContaining("runs_on") });
  });

  it("checkout before the first command, in every job", () => {
    expect(status("gh-checkout", workflow([]))).toBe("todo");
    expect(status("gh-checkout", workflow(["- uses: actions/setup-node@v7"]))).toBe("todo");
    expect(status("gh-checkout", workflow(["- uses: actions/checkout@v7"]))).toBe("pass");
    expect(status("gh-checkout", workflow(["- uses: actions/checkout@v7", "- run: npm ci"]))).toBe("pass");
    expect(verdict("gh-checkout", workflow(["- uses: actions/setup-node@v7", "- run: npm ci"]))).toMatchObject({
      status: "fail",
      line: 11,
    });
    expect(status("gh-checkout", workflow(["- run: npm ci", "- uses: actions/checkout@v7"]))).toBe("fail");
    // A Docker build from the local folder needs the files too.
    expect(status("gh-checkout", workflow(["- uses: docker/build-push-action@v7", "  with:", "    context: ."]))).toBe("fail");
  });

  it("Node version, and the indentation mistake that hides it", () => {
    expect(status("gh-node-version", workflow(["- uses: actions/checkout@v7"]))).toBe("todo");
    expect(status("gh-node-version", workflow(["- uses: actions/setup-node@v7"]))).toBe("todo");
    expect(status("gh-node-version", workflow(["- uses: actions/setup-node@v7", "  with:", "    node-version: 22"]))).toBe("pass");
    expect(status("gh-node-version", workflow(["- uses: actions/setup-node@v7", "  with:", "    node-version-file: .nvmrc"]))).toBe("pass");
    const misplaced = verdict("gh-node-version", workflow(["- uses: actions/setup-node@v7", "  with:", "  node-version: 22"]));
    expect(misplaced).toMatchObject({ status: "fail", line: 12, detail: expect.stringContaining("with") });
  });

  it("cache, npm ci and the tests", () => {
    const setup = ["- uses: actions/setup-node@v7", "  with:", "    node-version: 22"];
    expect(status("gh-cache", workflow(setup))).toBe("todo");
    expect(status("gh-cache", workflow([...setup, "    cache: npm"]))).toBe("pass");
    expect(status("gh-cache", workflow(["- uses: actions/cache@v4"]))).toBe("pass");
    expect(status("gh-npm-ci", workflow(["- run: npm ci"]))).toBe("pass");
    expect(verdict("gh-npm-ci", workflow(["- run: npm install"]))).toMatchObject({ status: "fail", line: 10 });
    expect(status("gh-npm-ci", workflow(["- run: npm install -g vercel", "- run: npm ci"]))).toBe("pass");
    expect(status("gh-npm-ci", workflow([]))).toBe("todo");
    expect(status("gh-runs-tests", workflow(["- run: npm ci"]))).toBe("todo");
    expect(status("gh-runs-tests", workflow(["- run: npm test"]))).toBe("pass");
  });

  it("the order of the steps", () => {
    expect(status("gh-order", workflow([]))).toBe("todo");
    expect(status("gh-order", workflow(["- run: npm test"]))).toBe("todo");
    expect(status("gh-order", workflow(["- run: npm ci", "- run: npm test"]))).toBe("pass");
    expect(verdict("gh-order", workflow(["- run: npm test", "- run: npm ci"]))).toMatchObject({
      status: "fail",
      line: 11,
      detail: expect.stringContaining("npm ci"),
    });
    const all = ["- run: npm ci", "- run: npm run lint", "- run: npm run type-check", "- run: npm test", "- run: npm run build"];
    expect(status("gh-order-full", workflow(all))).toBe("pass");
    expect(verdict("gh-order-full", workflow(all.slice(0, 3)))).toMatchObject({ status: "todo", detail: expect.stringContaining("build") });
    expect(status("gh-order-full", workflow([all[0], all[1], all[4], all[3]]))).toBe("fail");
    expect(status("gh-order-full", workflow([all[0], all[3], all[1]]))).toBe("fail");
    // One step with several commands is read in order too.
    expect(status("gh-order-full", workflow(["- run: npm ci && npm run lint && npm run type-check && npm test && npm run build"]))).toBe("pass");
  });

  it("a failing step stops the job", () => {
    expect(status("gh-stops-on-failure", workflow([]))).toBe("todo");
    expect(status("gh-stops-on-failure", workflow(["- run: npm test"]))).toBe("pass");
    expect(verdict("gh-stops-on-failure", workflow(["- run: npm test", "  continue-on-error: true"]))).toMatchObject({
      status: "fail",
      line: 11,
    });
    expect(status("gh-stops-on-failure", workflow(["- run: npm test || true"]))).toBe("fail");
    expect(status("gh-stops-on-failure", workflow(["- run: npm test"], { job: ["    runs-on: x", "    continue-on-error: true"] }))).toBe("fail");
  });

  it("secrets: never in the file, always from the store", () => {
    const step = ["- run: ./deploy.sh", "  env:"];
    expect(status("gh-no-plain-secrets", workflow([]))).toBe("todo");
    expect(status("gh-no-plain-secrets", workflow([...step, "    DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}"]))).toBe("pass");
    expect(verdict("gh-no-plain-secrets", workflow([...step, "    DEPLOY_TOKEN: abc123"]))).toMatchObject({ status: "fail", line: 12 });
    expect(status("gh-no-plain-secrets", workflow(["- uses: docker/login-action@v4", "  with:", "    password: hunter2"]))).toBe("fail");
    expect(status("gh-no-plain-secrets", workflow([...step, "    API_URL: https://api.example.com"]))).toBe("pass");
    expect(status("gh-uses-secrets", workflow([...step, "    API_URL: https://api.example.com"]))).toBe("todo");
    expect(status("gh-uses-secrets", workflow([...step, "    DEPLOY_TOKEN: ${{secrets.DEPLOY_TOKEN}}"]))).toBe("pass");
  });

  const TWO_JOBS = (deploy: string[]) =>
    ["jobs:", "  build:", "    runs-on: ubuntu-latest", "  deploy:", ...deploy.map((line) => "    " + line)].join("\n");

  it("deploy only on main and only after the build", () => {
    expect(status("gh-deploy-gated", workflow([]))).toBe("todo");
    expect(verdict("gh-deploy-gated", TWO_JOBS(["runs-on: x"]))).toMatchObject({ status: "todo", detail: expect.stringContaining("needs") });
    expect(status("gh-deploy-gated", TWO_JOBS(["needs: build"]))).toBe("todo");
    expect(status("gh-deploy-gated", TWO_JOBS(["needs: build", "if: github.ref == 'refs/heads/main'"]))).toBe("pass");
    expect(status("gh-deploy-gated", TWO_JOBS(["needs: [build]", "if: github.ref_name == 'main'"]))).toBe("pass");
    expect(status("gh-deploy-gated", TWO_JOBS(["needs: build", "if: github.ref == 'refs/heads/dev'"]))).toBe("todo");
    expect(verdict("gh-deploy-gated", TWO_JOBS(["needs: test", "if: github.ref == 'refs/heads/main'"]))).toMatchObject({
      status: "fail",
      line: 5,
    });
    expect(status("gh-deploy-gated", TWO_JOBS(["needs: build", "if: always() && github.ref == 'refs/heads/main'"]))).toBe("fail");
  });

  it("environment and artifacts", () => {
    expect(status("gh-environment", TWO_JOBS(["needs: build"]))).toBe("todo");
    expect(status("gh-environment", TWO_JOBS(["environment: production"]))).toBe("pass");
    expect(status("gh-environment", TWO_JOBS(["environment:", "  name: production"]))).toBe("pass");
    expect(status("gh-upload-artifact", workflow(["- uses: actions/upload-artifact@v7"]))).toBe("todo");
    expect(status("gh-upload-artifact", workflow(["- uses: actions/upload-artifact@v7", "  with:", "    name: dist", "    path: dist"]))).toBe("pass");
    expect(status("gh-download-artifact", TWO_JOBS(["steps:", "  - uses: actions/checkout@v7"]))).toBe("todo");
    expect(status("gh-download-artifact", TWO_JOBS(["steps:", "  - uses: actions/download-artifact@v8"]))).toBe("pass");
  });

  it("matrix: Node 20 and 22, read from the matrix", () => {
    const job = (version: string, list = "[20, 22]") =>
      workflow(["- uses: actions/setup-node@v7", "  with:", "    node-version: " + version], {
        job: ["    runs-on: ubuntu-latest", "    strategy:", "      matrix:", "        node-version: " + list],
      });
    expect(status("gh-matrix", workflow([]))).toBe("todo");
    expect(status("gh-matrix", job("${{ matrix.node-version }}"))).toBe("pass");
    expect(status("gh-matrix", job("${{ matrix.node-version }}", '["20.x", "22.x"]'))).toBe("pass");
    expect(verdict("gh-matrix", job("22"))).toMatchObject({ status: "todo", detail: expect.stringContaining("matrix.node-version") });
    expect(status("gh-matrix", job("${{ matrix.node-version }}", "[18, 20]"))).toBe("todo");
  });

  it("Docker: login, then build and push, with a tag per commit", () => {
    const login = ["- uses: docker/login-action@v4"];
    const build = (extra: string[]) => ["- uses: docker/build-push-action@v7", "  with:", ...extra.map((line) => "    " + line)];
    expect(status("gh-docker-push", workflow(login))).toBe("todo");
    expect(status("gh-docker-push", workflow([...login, ...build(["tags: a/b:1"])]))).toBe("todo");
    expect(status("gh-docker-push", workflow([...login, ...build(["push: true", "tags: a/b:${{ github.sha }}"])]))).toBe("pass");
    expect(status("gh-docker-push", workflow([...build(["push: true", "tags: a/b:1"]), ...login]))).toBe("fail");
    expect(status("gh-image-tag", workflow(login))).toBe("todo");
    expect(status("gh-image-tag", workflow(build(["tags: a/b:${{ github.sha }}"])))).toBe("pass");
    expect(verdict("gh-image-tag", workflow(build(["push: true", "tags: a/b:latest"])))).toMatchObject({ status: "fail", line: 13 });
  });

  it("pinned actions, known keys and plain variables", () => {
    expect(status("gh-pinned-actions", workflow(["- uses: actions/checkout@v7"]))).toBe("pass");
    expect(status("gh-pinned-actions", workflow(["- uses: actions/checkout"]))).toBe("fail");
    expect(status("gh-pinned-actions", workflow(["- uses: actions/checkout@main"]))).toBe("fail");
    expect(status("gh-pinned-actions", workflow(["- run: npm ci"]))).toBe("todo");

    expect(status("gh-known-keys", workflow(["- run: npm ci"]))).toBe("pass");
    expect(verdict("gh-known-keys", workflow(["- run: npm ci"], { job: ["    runs_on: x"] }))).toMatchObject({
      status: "fail",
      detail: expect.stringContaining("runs-on"),
    });
    expect(verdict("gh-known-keys", workflow(["- script: npm ci"]))).toMatchObject({ status: "fail", line: 10 });
    expect(verdict("gh-known-keys", "name: CI\njob:\n  build: 1")).toMatchObject({ status: "fail", detail: expect.stringContaining("jobs") });
    expect(status("gh-known-keys", "name: CI")).toBe("todo");

    expect(status("gh-variables", workflow([]))).toBe("todo");
    expect(status("gh-variables", "env:\n  VITE_API_URL: https://api.example.com\n" + workflow([]))).toBe("pass");
    expect(status("gh-variables", "env:\n  API_TOKEN: x\n" + workflow([]))).toBe("todo");
  });
});

describe("Azure Pipelines rules", () => {
  it("trigger and pr", () => {
    expect(status("az-trigger", "")).toBe("todo");
    expect(status("az-trigger", "trigger:\n  - main")).toBe("todo");
    expect(status("az-trigger", "trigger:\n  - main\npr:\n  - main")).toBe("pass");
    expect(status("az-trigger", "trigger: [main]\npr: [main]")).toBe("pass");
    expect(status("az-trigger", "trigger:\n  branches:\n    include:\n      - main\npr:\n  branches:\n    include: [main]")).toBe("pass");
    expect(verdict("az-trigger", "trigger: none\npr:\n  - main")).toMatchObject({ status: "fail", line: 1 });
    expect(verdict("az-trigger", "trigger:\n  - main\npr:\n  - dev")).toMatchObject({ status: "fail", line: 3 });
    // Still being typed: the key is there, its value is not.
    expect(status("az-trigger", "trigger:")).toBe("todo");
  });

  it("trigger for a pipeline that publishes", () => {
    expect(status("az-trigger-main-only", "trigger:\n  - main")).toBe("todo");
    expect(status("az-trigger-main-only", "trigger:\n  - main\npr: none")).toBe("pass");
    expect(status("az-trigger-main-only", "trigger:\n  - main\npr:\n  - main")).toBe("fail");
    expect(status("az-trigger-main-only", "trigger:\n  - main\n  - dev\npr: none")).toBe("fail");
  });

  it("pool, with the case of vmImage", () => {
    expect(status("az-pool", "trigger:\n  - main")).toBe("todo");
    expect(status("az-pool", "pool:")).toBe("todo");
    expect(status("az-pool", "pool:\n  vmImage: ubuntu-latest")).toBe("pass");
    expect(status("az-pool", "pool: MyAgents")).toBe("pass");
    expect(verdict("az-pool", "pool:\n  vmimage: ubuntu-latest")).toMatchObject({ status: "fail", line: 2 });
    expect(status("az-pool", "jobs:\n  - job: A\n    pool:\n      vmImage: ubuntu-latest\n    steps:\n      - script: a")).toBe("pass");
    expect(status("az-pool", "jobs:\n  - job: A\n    steps:\n      - script: a")).toBe("todo");
  });

  it("Node version: each task has its own input name", () => {
    expect(status("az-node-version", pipeline([]))).toBe("todo");
    expect(status("az-node-version", pipeline(["- task: UseNode@1"]))).toBe("todo");
    expect(status("az-node-version", pipeline(["- task: UseNode@1", "  inputs:", '    version: "22.x"']))).toBe("pass");
    expect(status("az-node-version", pipeline(["- task: NodeTool@0", "  inputs:", '    versionSpec: "22.x"']))).toBe("pass");
    expect(verdict("az-node-version", pipeline(["- task: UseNode@1", "  inputs:", '    versionSpec: "22.x"']))).toMatchObject({
      status: "fail",
      line: 10,
    });
    expect(verdict("az-node-version", pipeline(["- task: UseNode@1", "  inputs:", '  version: "22.x"']))).toMatchObject({
      status: "fail",
      detail: expect.stringContaining("inputs"),
    });
  });

  it("cache, npm ci and the tests", () => {
    expect(status("az-cache", pipeline([]))).toBe("todo");
    expect(verdict("az-cache", pipeline(["- task: Cache@2", "  inputs:", "    key: npm"]))).toMatchObject({
      status: "todo",
      detail: expect.stringContaining("path"),
    });
    expect(status("az-cache", pipeline(["- task: Cache@2", "  inputs:", "    key: npm", "    path: $(npm_config_cache)"]))).toBe("pass");
    expect(status("az-npm-ci", pipeline(["- script: npm ci"]))).toBe("pass");
    expect(status("az-npm-ci", pipeline(["- bash: npm ci"]))).toBe("pass");
    expect(status("az-npm-ci", pipeline(["- task: Npm@1", "  inputs:", "    command: ci"]))).toBe("pass");
    expect(verdict("az-npm-ci", pipeline(["- script: npm install"]))).toMatchObject({ status: "fail", line: 8 });
    expect(status("az-runs-tests", pipeline(["- script: npm ci"]))).toBe("todo");
    expect(status("az-runs-tests", pipeline(["- script: npm test"]))).toBe("pass");
  });

  it("the order of the steps, and stopping on failure", () => {
    expect(status("az-order", pipeline(["- script: npm ci", "- script: npm test"]))).toBe("pass");
    expect(verdict("az-order", pipeline(["- script: npm run build", "- script: npm ci"]))).toMatchObject({ status: "fail", line: 9 });
    const all = ["- script: npm ci", "- script: npm run lint", "- script: npm run type-check", "- script: npm test", "- script: npm run build"];
    expect(status("az-order-full", pipeline(all))).toBe("pass");
    expect(status("az-order-full", pipeline(all.slice(0, 4)))).toBe("todo");
    expect(status("az-order-full", pipeline([all[0], all[2], all[1]]))).toBe("fail");
    expect(status("az-stops-on-failure", pipeline([]))).toBe("todo");
    expect(status("az-stops-on-failure", pipeline(all))).toBe("pass");
    expect(verdict("az-stops-on-failure", pipeline(["- script: npm test", "  continueOnError: true"]))).toMatchObject({
      status: "fail",
      line: 9,
    });
    expect(status("az-stops-on-failure", pipeline(["- script: npm test || true"]))).toBe("fail");
  });

  it("secrets: a secret variable or a service connection, never plain text", () => {
    const step = ["- script: ./deploy.sh", "  env:"];
    expect(status("az-no-plain-secrets", pipeline([...step, "    DEPLOY_TOKEN: $(DEPLOY_TOKEN)"]))).toBe("pass");
    expect(verdict("az-no-plain-secrets", pipeline([...step, "    DEPLOY_TOKEN: abc123"]))).toMatchObject({ status: "fail", line: 10 });
    expect(verdict("az-no-plain-secrets", "variables:\n  API_TOKEN: abc123\nsteps:\n  - script: a")).toMatchObject({ status: "fail", line: 2 });
    expect(status("az-no-plain-secrets", "variables:\n  - name: API_TOKEN\n    value: abc123\nsteps:\n  - script: a")).toBe("fail");
    expect(status("az-no-plain-secrets", "variables:\n  VITE_API_URL: https://api.example.com\nsteps:\n  - script: a")).toBe("pass");
    expect(status("az-no-plain-secrets", "trigger:\n  - main")).toBe("todo");

    expect(status("az-uses-secrets", pipeline([...step, "    API_URL: $(API_URL)"]))).toBe("todo");
    expect(status("az-uses-secrets", pipeline([...step, "    DEPLOY_TOKEN: $(DEPLOY_TOKEN)"]))).toBe("pass");
    expect(status("az-uses-secrets", pipeline(["- task: Docker@2", "  inputs:", "    containerRegistry: docker-hub"]))).toBe("pass");
  });

  const STAGES = (deploy: string[]) =>
    [
      "stages:",
      "  - stage: Build",
      "    jobs:",
      "      - job: Build",
      "        steps:",
      "          - script: npm run build",
      "  - stage: Deploy",
      ...deploy.map((line) => "    " + line),
    ].join("\n");
  const ON_MAIN = "condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))";

  it("deploy only on main and only after the build", () => {
    expect(status("az-deploy-gated", pipeline([]))).toBe("todo");
    expect(verdict("az-deploy-gated", STAGES([]))).toMatchObject({ status: "todo", detail: expect.stringContaining("condition") });
    expect(status("az-deploy-gated", STAGES(["dependsOn: Build", ON_MAIN]))).toBe("pass");
    // A stage waits for the stage before it, so dependsOn may be left out.
    expect(status("az-deploy-gated", STAGES([ON_MAIN]))).toBe("pass");
    expect(status("az-deploy-gated", STAGES(["dependsOn: Build", "condition: and(succeeded(), eq(variables['Build.SourceBranchName'], 'main'))"]))).toBe("pass");
    // The classic mistake: the branch check alone replaces succeeded().
    const alone = verdict("az-deploy-gated", STAGES(["dependsOn: Build", "condition: eq(variables['Build.SourceBranch'], 'refs/heads/main')"]));
    expect(alone).toMatchObject({ status: "fail", line: 9, detail: expect.stringContaining("succeeded()") });
    expect(status("az-deploy-gated", STAGES(["dependsOn: Test", ON_MAIN]))).toBe("fail");
    expect(status("az-deploy-gated", STAGES(["dependsOn: []", ON_MAIN]))).toBe("fail");
    expect(status("az-deploy-gated", STAGES(["condition: always()"]))).toBe("fail");
    // Jobs of one stage run in parallel, so there dependsOn must be written.
    const jobs = (deploy: string[]) =>
      ["jobs:", "  - job: Build", "    steps:", "      - script: a", "  - deployment: Deploy", ...deploy.map((line) => "    " + line)].join("\n");
    expect(verdict("az-deploy-gated", jobs([ON_MAIN]))).toMatchObject({ status: "todo", detail: expect.stringContaining("dependsOn") });
    expect(status("az-deploy-gated", jobs(["dependsOn: Build", ON_MAIN]))).toBe("pass");
  });

  it("environment needs a deployment job", () => {
    const deployment = (lines: string[]) => STAGES(["jobs:", "  - deployment: Deploy", ...lines.map((line) => "    " + line)]);
    expect(status("az-environment", STAGES([]))).toBe("todo");
    expect(status("az-environment", deployment([]))).toBe("todo");
    expect(status("az-environment", deployment(["environment: production"]))).toBe("todo");
    const full = ["environment: production", "strategy:", "  runOnce:", "    deploy:", "      steps:", "        - checkout: self"];
    expect(status("az-environment", deployment(full))).toBe("pass");
    expect(verdict("az-environment", STAGES(["jobs:", "  - job: Deploy", "    environment: production"]))).toMatchObject({
      status: "fail",
      line: 10,
    });
  });

  it("artifact, matrix and Docker", () => {
    expect(status("az-publish-artifact", pipeline(["- script: npm run build"]))).toBe("todo");
    expect(status("az-publish-artifact", pipeline(["- publish: dist", "  artifact: dist"]))).toBe("pass");
    expect(status("az-publish-artifact", pipeline(["- task: PublishPipelineArtifact@1"]))).toBe("pass");

    const matrix = (version: string, second = '"22.x"') =>
      ["strategy:", "  matrix:", "    node_20:", '      nodeVersion: "20.x"', "    node_22:", "      nodeVersion: " + second, "steps:", "  - task: UseNode@1", "    inputs:", "      version: " + version].join("\n");
    expect(status("az-matrix", pipeline([]))).toBe("todo");
    expect(status("az-matrix", matrix("$(nodeVersion)"))).toBe("pass");
    expect(verdict("az-matrix", matrix('"22.x"'))).toMatchObject({ status: "todo", detail: expect.stringContaining("$(nodeVersion)") });
    expect(status("az-matrix", matrix("$(nodeVersion)", '"18.x"'))).toBe("todo");

    const docker = (inputs: string[]) => pipeline(["- task: Docker@2", "  inputs:", ...inputs.map((line) => "    " + line)]);
    expect(status("az-docker-push", pipeline([]))).toBe("todo");
    expect(verdict("az-docker-push", docker(["containerRegistry: hub", "repository: a/b", "command: build"]))).toMatchObject({
      status: "todo",
      detail: expect.stringContaining("buildAndPush"),
    });
    expect(verdict("az-docker-push", docker(["repository: a/b", "command: buildAndPush"]))).toMatchObject({
      status: "todo",
      detail: expect.stringContaining("containerRegistry"),
    });
    expect(status("az-docker-push", docker(["containerRegistry: hub", "repository: a/b", "command: buildAndPush"]))).toBe("pass");
    expect(status("az-image-tag", docker(["command: buildAndPush"]))).toBe("todo");
    expect(status("az-image-tag", docker(["tags: $(Build.BuildId)"]))).toBe("pass");
    expect(verdict("az-image-tag", docker(["tags: latest"]))).toMatchObject({ status: "fail", line: 10 });
  });

  it("known keys and plain variables", () => {
    expect(status("az-known-keys", pipeline(["- script: npm ci"]))).toBe("pass");
    expect(status("az-known-keys", "trigger:\n  - main")).toBe("todo");
    expect(verdict("az-known-keys", "pools:\n  vmImage: ubuntu-latest\nsteps:\n  - script: a")).toMatchObject({
      status: "fail",
      line: 1,
      detail: expect.stringContaining("pool"),
    });
    expect(verdict("az-known-keys", pipeline(["- scripts: npm ci"]))).toMatchObject({ status: "fail", detail: expect.stringContaining("script") });
    expect(status("az-known-keys", pipeline(["- run: npm ci"]))).toBe("fail");

    expect(status("az-variables", "variables:\n  npm_config_cache: $(Pipeline.Workspace)/.npm")).toBe("todo");
    expect(status("az-variables", "variables:\n  VITE_API_URL: https://api.example.com")).toBe("pass");
    expect(status("az-variables", "variables:\n  - name: VITE_API_URL\n    value: https://api.example.com")).toBe("pass");
  });
});

describe("a rule never crashes on a half-written or strange file", () => {
  const SAMPLES = [
    "",
    "on:",
    "jobs:",
    "jobs:\n  build:",
    "jobs:\n  build:\n    steps:",
    "jobs:\n  build:\n    steps:\n      -",
    "jobs: 5",
    "jobs:\n  - a\n  - b",
    "steps: hello",
    "stages:\n  - stage:",
    "stages:\n  - stage: A\n    jobs:\n      - deployment: D\n        strategy:\n          runOnce:",
    "strategy:\n  matrix:\n    a:",
    "variables:\n  - group: shared",
    "- just\n- a list",
    "name: [1, 2",
  ];
  const ids = [
    ...["trigger", "trigger-main-only", "runs-on", "checkout", "node-version", "cache", "npm-ci", "runs-tests", "order", "order-full", "stops-on-failure", "no-plain-secrets", "uses-secrets", "deploy-gated", "environment", "upload-artifact", "download-artifact", "matrix", "docker-push", "image-tag", "pinned-actions", "known-keys", "variables"].map((name) => "gh-" + name),
    ...["trigger", "trigger-main-only", "pool", "node-version", "cache", "npm-ci", "runs-tests", "order", "order-full", "stops-on-failure", "no-plain-secrets", "uses-secrets", "deploy-gated", "environment", "publish-artifact", "matrix", "docker-push", "image-tag", "known-keys", "variables"].map((name) => "az-" + name),
    "ci-valid-yaml",
  ];

  it("gives a verdict, and never a pass, for an empty file", () => {
    for (const id of ids) {
      for (const sample of SAMPLES) {
        expect(() => checkConfig([id], sample, { strict: true }), id + " on " + JSON.stringify(sample)).not.toThrow();
      }
      expect(status(id, ""), id).toBe("todo");
    }
  });
});
