import { parse, type Node } from "acorn";

/** The name of the guard function inside the learner's code. */
export const GUARD = "__dojoGuard";

export class CodeSyntaxError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.name = "SyntaxError";
    this.line = line;
  }
}

const LOOPS = new Set([
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
]);

interface Insert {
  at: number;
  text: string;
}

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && typeof (value as Node).type === "string";
}

function collect(node: Node, inserts: Insert[]): void {
  if (LOOPS.has(node.type)) {
    const body = (node as unknown as { body: Node }).body;
    if (body.type === "BlockStatement") {
      inserts.push({ at: body.start + 1, text: GUARD + "();" });
    } else {
      // A loop without braces: for (...) stack.push(x);
      inserts.push({ at: body.start, text: "{" + GUARD + "();" });
      inserts.push({ at: body.end, text: "}" });
    }
  }
  const record = node as unknown as Record<string, unknown>;
  for (const key in record) {
    const value = record[key];
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (isNode(value[i])) collect(value[i], inserts);
      }
    } else if (isNode(value)) {
      collect(value, inserts);
    }
  }
}

/**
 * Checks the syntax and adds a guard call to every loop, so an endless loop
 * throws a clear error instead of freezing the worker.
 *
 * The guard is added on the same line, so line numbers in error messages
 * still match what the learner typed.
 */
export function instrument(code: string): string {
  let ast: Node;
  try {
    ast = parse(code, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowAwaitOutsideFunction: true,
    });
  } catch (error) {
    const e = error as { message?: string; loc?: { line: number } };
    // acorn adds "(line:column)" to the message; the line is reported apart.
    const message = String(e.message ?? error).replace(/\s*\(\d+:\d+\)$/, "");
    throw new CodeSyntaxError(message, e.loc ? e.loc.line : 1);
  }

  const inserts: Insert[] = [];
  collect(ast, inserts);
  // Work from the end, so earlier positions stay valid.
  inserts.sort((a, b) => b.at - a.at);

  let out = code;
  for (let i = 0; i < inserts.length; i++) {
    out = out.slice(0, inserts[i].at) + inserts[i].text + out.slice(inserts[i].at);
  }
  return out;
}
