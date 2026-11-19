/**
 * The module system of a test run.
 *
 * The files of an exercise are plain text. Each one is turned into a
 * CommonJS module (JSX and import/export are compiled by sucrase) and
 * evaluated when another file asks for it. Because the runner owns the
 * registry, it can do what jest.mock needs: hand out a mock in place of a
 * real file.
 */

import { Parser, parse } from "acorn";
import jsx from "acorn-jsx";
import { transform } from "sucrase";
import { GUARD, instrument } from "../../runner/instrument";

export interface ModuleHost {
  /** Names every file sees without importing them: jest, expect, describe ... */
  scope: Record<string, unknown>;
  /** Called at the top of every loop, so an endless loop throws. */
  guard: () => void;
  /** Builds the automatic mock of a real module: every function becomes a mock function. */
  automock(actual: unknown): unknown;
}

interface Loaded {
  exports: unknown;
}

interface MockEntry {
  factory: (() => unknown) | null;
  made: boolean;
  exports: unknown;
}

const BUILTIN = "builtin:";

const JsxParser = Parser.extend(jsx());

/**
 * The compiler below is fast but vague about where a syntax error is. So the
 * file is first read by a strict parser, only to get the right line.
 */
function checkSyntax(source: string, path: string): void {
  try {
    JsxParser.parse(source, { ecmaVersion: "latest", sourceType: "module" });
  } catch (error) {
    const e = error as { message?: string; loc?: { line: number } };
    const message = String(e.message ?? error).replace(/\s*\(\d+:\d+\)$/, "");
    const failure = new Error(message + " in " + path.slice(1) + (e.loc ? " (line " + e.loc.line + ")" : ""));
    failure.name = "SyntaxError";
    throw failure;
  }
}

function dirOf(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut <= 0 ? "/" : path.slice(0, cut);
}

function join(dir: string, relative: string): string {
  const parts = (dir + "/" + relative).split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return "/" + out.join("/");
}

/**
 * Jest moves every jest.mock() call above the imports, so the mock is in
 * place before the file under test is loaded. This does the same on the
 * compiled code: the calls are cut out and put on the first line.
 */
export function hoistMocks(code: string): string {
  let body: { type: string; start: number; end: number; expression?: unknown }[];
  try {
    body = (parse(code, { ecmaVersion: "latest", sourceType: "script" }) as unknown as { body: typeof body }).body;
  } catch {
    // The syntax error is reported by the next step, with its line.
    return code;
  }

  const calls: string[] = [];
  let rest = code;
  for (let i = body.length - 1; i >= 0; i--) {
    const statement = body[i];
    if (statement.type !== "ExpressionStatement") continue;
    const call = statement.expression as {
      type: string;
      callee?: { type: string; object?: { type: string; name?: string }; property?: { name?: string } };
    };
    const callee = call.callee;
    const isMockCall =
      call.type === "CallExpression" &&
      callee !== undefined &&
      callee.type === "MemberExpression" &&
      callee.object?.type === "Identifier" &&
      callee.object.name === "jest" &&
      (callee.property?.name === "mock" || callee.property?.name === "unmock");
    if (!isMockCall) continue;

    const text = code.slice(statement.start, statement.end);
    calls.unshift(text.replace(/\n/g, " "));
    // Blank it out in place: line numbers below stay the same.
    rest = rest.slice(0, statement.start) + text.replace(/[^\n]/g, " ") + rest.slice(statement.end);
  }
  if (calls.length === 0) return code;

  const strict = '"use strict";';
  const head = rest.startsWith(strict) ? strict : "";
  return head + calls.join(" ") + rest.slice(head.length);
}

export class Modules {
  private compiled = new Map<string, string>();
  private cache = new Map<string, Loaded>();
  private mocks = new Map<string, MockEntry>();

  constructor(
    private files: Record<string, string>,
    private builtins: Record<string, unknown>,
    private host: ModuleHost,
  ) {}

  /** The id of what `specifier` means when written in the file `from`. */
  resolve(from: string, specifier: string): string {
    if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
      if (specifier in this.builtins) return BUILTIN + specifier;
      throw new Error(
        "Cannot find module '" +
          specifier +
          "' from '" +
          from.slice(1) +
          "'. Here a test can import react, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, and the files of this exercise.",
      );
    }
    const base = specifier.startsWith("/") ? specifier : join(dirOf(from), specifier);
    const candidates = [base, base + ".js", base + ".jsx", base + "/index.js"];
    for (const candidate of candidates) {
      if (candidate in this.files) return candidate;
    }
    throw new Error("Cannot find module '" + specifier + "' from '" + from.slice(1) + "'. Check the path and the file name.");
  }

  private compile(path: string): string {
    const known = this.compiled.get(path);
    if (known !== undefined) return known;

    checkSyntax(this.files[path], path);

    let code: string;
    try {
      code = transform(this.files[path], {
        transforms: ["jsx", "imports"],
        jsxRuntime: "automatic",
        production: true,
        filePath: path,
      }).code;
      code = instrument(hoistMocks(code));
    } catch (error) {
      const e = error as { message?: string; loc?: { line: number }; line?: number };
      const raw = String(e.message ?? error);
      // Both compilers end the message with "(line:column)".
      const place = /\((\d+):\d+\)$/.exec(raw);
      const line = place ? Number(place[1]) : (e.line ?? e.loc?.line);
      const message = raw.replace(/^Error transforming [^:]+: /, "").replace(/\s*\(\d+:\d+\)$/, "");
      const failure = new Error(message + " in " + path.slice(1) + (line ? " (line " + line + ")" : ""));
      failure.name = "SyntaxError";
      throw failure;
    }
    this.compiled.set(path, code);
    return code;
  }

  /** Loads the real file, mock or not. */
  private load(path: string): unknown {
    const known = this.cache.get(path);
    if (known) return known.exports;

    const code = this.compile(path);
    const loaded: Loaded = { exports: {} };
    // Registered before it runs, so two files that import each other do not loop.
    this.cache.set(path, loaded);

    const names = Object.keys(this.host.scope);
    const values = names.map((name) => this.host.scope[name]);
    try {
      const run = new Function("require", "module", "exports", GUARD, ...names, code + "\n//# sourceURL=dojo-test" + path);
      run((specifier: string) => this.require(path, specifier), loaded, loaded.exports, this.host.guard, ...values);
    } catch (error) {
      this.cache.delete(path);
      throw error;
    }
    return loaded.exports;
  }

  require(from: string, specifier: string): unknown {
    const id = this.resolve(from, specifier);
    if (id.startsWith(BUILTIN)) return this.builtins[id.slice(BUILTIN.length)];

    const mock = this.mocks.get(id);
    if (!mock) return this.load(id);
    if (!mock.made) {
      mock.exports = mock.factory ? mock.factory() : this.host.automock(this.load(id));
      mock.made = true;
    }
    return mock.exports;
  }

  /** jest.mock */
  mock(from: string, specifier: string, factory: (() => unknown) | null): void {
    const id = this.resolve(from, specifier);
    if (id.startsWith(BUILTIN)) {
      throw new Error("jest.mock('" + specifier + "') is not supported here. Mock the files of the exercise, like \"./api\".");
    }
    this.mocks.set(id, { factory, made: false, exports: undefined });
  }

  /** jest.unmock */
  unmock(from: string, specifier: string): void {
    this.mocks.delete(this.resolve(from, specifier));
  }

  /** jest.requireActual */
  requireActual(from: string, specifier: string): unknown {
    const id = this.resolve(from, specifier);
    return id.startsWith(BUILTIN) ? this.builtins[id.slice(BUILTIN.length)] : this.load(id);
  }

  /** jest.resetModules: the next import evaluates the file again. */
  reset(): void {
    this.cache.clear();
    for (const mock of this.mocks.values()) mock.made = false;
  }

  /** Evaluates the test file. Its tests are collected, not run yet. */
  run(entry: string): void {
    if (!(entry in this.files)) throw new Error("The test file " + entry.slice(1) + " is missing.");
    this.load(entry);
  }
}
