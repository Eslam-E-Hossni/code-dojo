import { describe, expect, it } from "vitest";
import { configShape } from "@/data/problems/config-helpers";
import { checkLine, normalize, type Syntax } from "@/lib/check";

function ok(input: string, expected: string, syntax: Syntax, accept?: string[]): boolean {
  return checkLine(input, { expected, accept }, syntax).ok;
}

describe("line check: Dockerfile", () => {
  it("ignores spacing between words, and around the line", () => {
    expect(ok("FROM   node:22-alpine", "FROM node:22-alpine", "dockerfile")).toBe(true);
    expect(ok("  COPY package*.json   ./  ", "COPY package*.json ./", "dockerfile")).toBe(true);
    expect(ok('CMD ["node","server.js"]', 'CMD ["node", "server.js"]', "dockerfile")).toBe(true);
    expect(ok('CMD [ "node" , "server.js" ]', 'CMD ["node", "server.js"]', "dockerfile")).toBe(true);
  });

  it("reads the instruction in any case, and AS in a FROM line", () => {
    expect(ok("from node:22-alpine as build", "FROM node:22-alpine AS build", "dockerfile")).toBe(true);
    expect(ok("run npm ci", "RUN npm ci", "dockerfile")).toBe(true);
  });

  it("keeps the case of everything else", () => {
    expect(ok("FROM Node:22-alpine", "FROM node:22-alpine", "dockerfile")).toBe(false);
    expect(ok("ENV node_env=production", "ENV NODE_ENV=production", "dockerfile")).toBe(false);
    // "as" is only special in FROM.
    expect(ok("RUN echo AS", "RUN echo as", "dockerfile")).toBe(false);
  });

  it("does not take single quotes for double quotes: the exec form needs double", () => {
    expect(ok("CMD ['node', 'server.js']", 'CMD ["node", "server.js"]', "dockerfile")).toBe(false);
  });

  it("keeps a string with a space as one word", () => {
    expect(ok('CMD ["nginx", "-g", "daemon off;"]', 'CMD ["nginx", "-g", "daemon off;"]', "dockerfile")).toBe(true);
    expect(ok('CMD ["nginx", "-g", "daemon  off;"]', 'CMD ["nginx", "-g", "daemon off;"]', "dockerfile")).toBe(false);
  });

  it("takes the alternatives of a step", () => {
    const accept = ["FROM node:20-alpine", "COPY package.json package-lock.json ./"];
    expect(checkLine("FROM node:20-alpine", { expected: "FROM node:22-alpine", accept }, "dockerfile")).toEqual({
      ok: true,
      via: "accept",
    });
    expect(ok("FROM node:18-alpine", "FROM node:22-alpine", "dockerfile", accept)).toBe(false);
  });

  it("skips comment lines and joins a line that ends with a backslash", () => {
    expect(normalize("# build stage\nFROM node:22-alpine", "dockerfile")).toBe("FROM node:22-alpine");
    expect(normalize("RUN npm ci && \\\n    npm run build", "dockerfile")).toBe("RUN npm ci && npm run build");
  });

  it("points at the first wrong word, and never offers a rename", () => {
    const result = checkLine("FROM node:latest", { expected: "FROM node:22-alpine" }, "dockerfile");
    expect(result).toMatchObject({ ok: false, rename: null, diff: { kind: "wrong", start: 5, end: 16, got: "node:latest" } });
    const short = checkLine("COPY package*.json", { expected: "COPY package*.json ./" }, "dockerfile");
    expect(short).toMatchObject({ ok: false, diff: { kind: "missing", want: "./" } });
    const long = checkLine("USER node extra", { expected: "USER node" }, "dockerfile");
    expect(long).toMatchObject({ ok: false, diff: { kind: "extra", got: "extra" } });
  });

  it("says when nothing was typed", () => {
    expect(checkLine("   ", { expected: "USER node" }, "dockerfile")).toEqual({ ok: false, empty: true });
    expect(checkLine("# only a comment", { expected: "USER node" }, "dockerfile")).toEqual({ ok: false, empty: true });
  });
});

describe("line check: YAML", () => {
  it("counts the indentation, because it is part of the meaning", () => {
    expect(ok("    build: ./web", "    build: ./web", "yaml")).toBe(true);
    expect(ok("  build: ./web", "    build: ./web", "yaml")).toBe(false);
    expect(ok("build: ./web", "    build: ./web", "yaml")).toBe(false);
    const result = checkLine("  ports:", { expected: "    ports:" }, "yaml");
    expect(result).toMatchObject({ ok: false, diff: { kind: "wrong", start: 0, end: 2, want: "4 spaces" } });
  });

  it("ignores spacing after the indentation, and both quote styles are the same", () => {
    expect(ok("    build:   ./web  ", "    build: ./web", "yaml")).toBe(true);
    expect(ok("      - '3000:3000'", '      - "3000:3000"', "yaml")).toBe(true);
    // Quoted and unquoted are different tokens. A step lists the other form in `accept`.
    expect(ok("      - 3000:3000", '      - "3000:3000"', "yaml")).toBe(false);
    expect(ok("      - 3000:3000", '      - "3000:3000"', "yaml", ["      - 3000:3000"])).toBe(true);
  });

  it("needs the space after the colon and after the dash", () => {
    expect(ok("    build:./web", "    build: ./web", "yaml")).toBe(false);
    expect(ok("      -api", "      - api", "yaml")).toBe(false);
  });

  it("skips comments", () => {
    expect(ok("  web: # the front-end", "  web:", "yaml")).toBe(true);
    expect(normalize("# services\nservices:", "yaml")).toBe("0 spaces services:");
  });

  it("keeps ${...} as it is", () => {
    expect(ok("      DATABASE_URL: ${DATABASE_URL}", "      DATABASE_URL: ${DATABASE_URL}", "yaml")).toBe(true);
    expect(ok("      DATABASE_URL: $DATABASE_URL", "      DATABASE_URL: ${DATABASE_URL}", "yaml")).toBe(false);
  });
});

describe("line check: .dockerignore", () => {
  it("compares the pattern as it is", () => {
    expect(ok("  node_modules  ", "node_modules", "lines")).toBe(true);
    expect(ok("node-modules", "node_modules", "lines")).toBe(false);
    expect(ok(".env", ".env*", "lines")).toBe(false);
    expect(ok("node_modules/", "node_modules", "lines", ["node_modules/"])).toBe(true);
  });
});

describe("the default is still JavaScript", () => {
  it("does not read # as a comment, and offers a rename", () => {
    expect(normalize("const a = 1; // note")).toBe("const a = 1");
    const result = checkLine("let timerId;", { expected: "let timer;" });
    expect(result).toMatchObject({ ok: false, rename: [{ want: "timer", got: "timerId" }] });
  });
});

describe("configShape: the hint with blanks for a config line", () => {
  it("keeps the instruction, AS and the flag names of a Dockerfile line", () => {
    expect(configShape("FROM node:22-alpine AS build", "dockerfile")).toBe("FROM ____:__-______ AS _____");
    expect(configShape("COPY --from=build /app/dist /usr/share/nginx/html", "dockerfile")).toBe(
      "COPY --from=_____ /___/____ /___/_____/_____/____",
    );
    expect(configShape("RUN npm ci --omit=dev", "dockerfile")).toBe("RUN ___ __ --____=___");
    expect(configShape('CMD ["node", "server.js"]', "dockerfile")).toBe('CMD ["____", "______.__"]');
    expect(configShape("EXPOSE 3000", "dockerfile")).toBe("EXPOSE ____");
  });

  it("always leaves a blank", () => {
    expect(configShape("COPY . .", "dockerfile")).toBe("COPY _ _");
  });

  it("keeps the indentation of YAML, and the punctuation everywhere", () => {
    expect(configShape("    ports:", "yaml")).toBe("    _____:");
    expect(configShape('      - "3000:3000"', "yaml")).toBe('      - "____:____"');
    expect(configShape("      DATABASE_URL: ${DATABASE_URL}", "yaml")).toBe("      ____________: ${____________}");
    expect(configShape(".env*", "dockerignore")).toBe(".___*");
    expect(configShape("*.log", "dockerignore")).toBe("*.___");
  });
});

describe("line check: the YAML of a CI pipeline", () => {
  it("reads a list in brackets with any spacing", () => {
    expect(ok("    branches: [ main ]", "    branches: [main]", "yaml")).toBe(true);
    expect(ok("        node-version: [20,22]", "        node-version: [20, 22]", "yaml")).toBe(true);
    expect(ok("        node-version: [20, 24]", "        node-version: [20, 22]", "yaml")).toBe(false);
    expect(ok("    branches: main", "    branches: [main]", "yaml")).toBe(false);
  });

  it("reads an expression with or without spaces inside ${{ }}", () => {
    const line = "          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}";
    expect(ok("          DEPLOY_TOKEN: ${{secrets.DEPLOY_TOKEN}}", line, "yaml")).toBe(true);
    expect(ok("          DEPLOY_TOKEN: ${{  secrets.DEPLOY_TOKEN  }}", line, "yaml")).toBe(true);
    expect(ok("          DEPLOY_TOKEN: ${ secrets.DEPLOY_TOKEN }", line, "yaml")).toBe(false);
    expect(ok("          DEPLOY_TOKEN: ${{ secrets.TOKEN }}", line, "yaml")).toBe(false);
    const tags = "          tags: ${{ vars.DOCKERHUB_USERNAME }}/my-app:${{ github.sha }}";
    expect(ok("          tags: ${{vars.DOCKERHUB_USERNAME}}/my-app:${{github.sha}}", tags, "yaml")).toBe(true);
    expect(ok("          tags: ${{ vars.DOCKERHUB_USERNAME }}/my-app:latest", tags, "yaml")).toBe(false);
  });

  it("keeps an Azure condition and a cache key as they are", () => {
    const condition = "    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))";
    expect(ok(condition, condition, "yaml")).toBe(true);
    expect(ok(condition.replace("and(succeeded(), ", "").replace("))", ")"), condition, "yaml")).toBe(false);
    expect(ok(condition.split("'").join('"'), condition, "yaml")).toBe(true);
    const key = "      key: 'npm | \"$(Agent.OS)\" | package-lock.json'";
    expect(ok(key, key, "yaml")).toBe(true);
    expect(ok(key.replace("package-lock.json", "package.json"), key, "yaml")).toBe(false);
  });

  it("points at the wrong key name", () => {
    const result = checkLine("    runs_on: ubuntu-latest", { expected: "    runs-on: ubuntu-latest" }, "yaml");
    expect(result).toMatchObject({ ok: false, diff: { kind: "wrong", got: "runs_on:" } });
  });

  it("still keeps the brackets of a Dockerfile and leaves .dockerignore alone", () => {
    expect(ok('CMD ["node","server.js"]', 'CMD ["node", "server.js"]', "dockerfile")).toBe(true);
    expect(normalize("[a,b]", "lines")).toBe("[a,b]");
  });
});
