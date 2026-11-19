import { describe, expect, it } from "vitest";
import type { CodeProblem, Step } from "@/data/types";
import { acceptSteps, checkFast, EMPTY_STATE, flattenSteps, type CheckState } from "@/lib/checker/check";
import { scan } from "@/lib/checker/scan";
import { story, type } from "./helpers";

/** A small JSX problem made of the given reference lines. Names in `api` cannot be renamed. */
function tiny(expected: (string | Partial<Step>)[], api: string[] = []): CodeProblem {
  const steps: Step[] = expected.map((item) => ({
    coach: "",
    hint1: "",
    hint2: "",
    explain: "",
    expected: "",
    ...(typeof item === "string" ? { expected: item } : item),
  }));
  return {
    id: "tiny",
    kind: "code",
    group: "react",
    title: "tiny",
    difficulty: "easy",
    tag: "likely",
    language: "jsx",
    api,
    plainLoops: false,
    statement: "",
    askFirst: [],
    edgeCases: [],
    complexity: "",
    followUps: [],
    parts: [{ id: "main", title: "main", signature: "main()", steps }],
    tests: [],
  };
}

/** The verdict for typing `input` as the next step, after the first `done` reference steps. */
function verdictOf(problem: CodeProblem, input: string, done = 0) {
  const steps = flattenSteps(problem);
  let state: CheckState = EMPTY_STATE;
  for (let i = 0; i < done; i++) {
    const before = checkFast(problem, state, steps[i].expected);
    if (before.kind !== "accept") throw new Error("the reference line " + i + " was not accepted: " + JSON.stringify(before));
    state = acceptSteps(problem, state, steps[i].expected, before.steps, before.names, null);
  }
  return checkFast(problem, state, input);
}

/** One JSX expression against another, inside a component, so both are in a place where JSX is allowed. */
function same(reference: string, typed: string, api: string[] = []): void {
  const problem = tiny(["const view = " + reference + ";"], api);
  const verdict = verdictOf(problem, "const view = " + typed + ";");
  expect(verdict.kind === "reject" ? verdict.message : verdict.kind, typed).toBe("accept");
}

function different(reference: string, typed: string, api: string[] = []): string {
  const problem = tiny(["const view = " + reference + ";"], api);
  const verdict = verdictOf(problem, "const view = " + typed + ";");
  expect(verdict.kind, typed).toBe("reject");
  return verdict.kind === "reject" ? verdict.message : "";
}

const COUNTER = [
  'import { useState } from "react";',
  "export default function Counter() {",
  "  const [count, setCount] = useState(0);",
  "  return (",
  "    <div>",
  "      <p>Count: {count}</p>",
  "      <button onClick={() => setCount(count + 1)}>+</button>",
  "      <button onClick={() => setCount(count - 1)}>-</button>",
  "    </div>\n  );\n}",
];

describe("the scanner knows what is open in JSX", () => {
  const open = (text: string) => scan(text, true).open;

  it("an element waits for its closing tag, and a finished one is closed", () => {
    expect(open("return (\n  <div>")).toEqual(["(", "<div>"]);
    expect(open("return (\n  <div>\n    <p>Count: {count}</p>")).toEqual(["(", "<div>"]);
    expect(open("return (\n  <div>\n  </div>\n);")).toEqual([]);
    expect(open("const a = <input />;")).toEqual([]);
    expect(open("return (\n  <>\n    <h1>Hi</h1>")).toEqual(["(", "<>"]);
  });

  it("an opening tag over several lines is open until its > or />", () => {
    expect(open("return (\n  <input")).toEqual(["(", "<input"]);
    expect(open("return (\n  <input\n    value={text}")).toEqual(["(", "<input"]);
    expect(open("return (\n  <input\n    value={text}\n    onChange={(e) => setText(e.target.value)}\n  />")).toEqual(["("]);
    expect(open('return (\n  <button\n    type="button"\n  >')).toEqual(["(", "<button>"]);
  });

  it("text between tags is only text: a quote or a bracket in it opens nothing", () => {
    expect(open("return <p>Don't stop (yet</p>;")).toEqual([]);
    expect(open("return <p>It's {count} o'clock")).toEqual(["<p>"]);
  });

  it("code inside { } is code again, and can hold more JSX", () => {
    expect(open("return (\n  <ul>\n    {items.map((item) => (")).toEqual(["(", "<ul>", "{", "(", "("]);
    expect(open("return (\n  <ul>\n    {items.map((item) => (\n      <li key={item.id}>")).toEqual(["(", "<ul>", "{", "(", "(", "<li>"]);
  });

  it("a comparison is not a tag", () => {
    expect(open("if (a < b) {")).toEqual(["{"]);
    expect(open("for (let i = 0; i < n; i++) {")).toEqual(["{"]);
    expect(open("const ok = count <limit;")).toEqual([]);
    expect(scan("const view = <div>", false).open).toEqual([]);
  });
});

describe("a component, typed line by line", () => {
  const problem = tiny(COUNTER, ["Counter"]);

  it("every reference step is accepted at the first attempt", async () => {
    const session = await type(problem, COUNTER);
    expect(story(session).filter((line) => !line.includes("accept x1 via match"))).toEqual([]);
    expect(session.finished).toBe(true);
  });

  it("every physical line is right so far or accepted, never wrong", async () => {
    const lines: string[] = [];
    for (const step of COUNTER) for (const line of step.split("\n")) lines.push(line);
    const session = await type(problem, lines);
    expect(story(session).filter((line) => line.includes("REJECT"))).toEqual([]);
    expect(session.finished).toBe(true);
  });

  it("other names for the state, and a handler with a block body", async () => {
    const session = await type(problem, [
      'import { useState } from "react"',
      "export default function Counter() {",
      "  const [value, setValue] = useState(0)",
      "  return (",
      "    <div>",
      "      <p>Count: {value}</p>",
      "      <button onClick={() => { setValue(value + 1) }}>+</button>",
      "      <button onClick={() => setValue(value - 1)}>-</button>",
      "    </div>",
      "  )",
      "}",
    ]);
    expect(story(session).filter((line) => line.includes("REJECT"))).toEqual([]);
    expect(session.finished).toBe(true);
    expect(session.state.names).toMatchObject({ count: "value", setCount: "setValue" });
  });

  it("the component must be exported, and the message says why", () => {
    const verdict = verdictOf(problem, "function Counter() {", 1);
    expect(verdict.kind).toBe("reject");
    if (verdict.kind === "reject") expect(verdict.message).toContain("export");
  });

  it("the name of the component cannot change", () => {
    const verdict = verdictOf(problem, "export default function Clicker() {", 1);
    expect(verdict.kind).toBe("reject");
    if (verdict.kind === "reject") expect(verdict.message).toContain("Counter");
  });

  it("a wrong text, a wrong tag and a handler that runs at once are refused with a reason", () => {
    const text = verdictOf(problem, "      <p>Total: {count}</p>", 5);
    expect(text.kind).toBe("reject");
    const tag = verdictOf(problem, "      <span>Count: {count}</span>", 5);
    expect(tag.kind === "reject" ? tag.message : "").toContain("<span>");
    const runs = verdictOf(problem, "      <button onClick={setCount(count + 1)}>+</button>", 6);
    expect(runs.kind === "reject" ? runs.message : "").toContain("now");
  });
});

describe("JSX that means the same", () => {
  it("the order of the attributes, and the two ways to close an empty tag", () => {
    same('<input type="text" value={name} onChange={save} />', '<input onChange={save} value={name} type="text" />', ["name", "save"]);
    same('<input type="text" />', '<input type="text"></input>');
    same("<Row />", "<Row></Row>", ["Row"]);
  });

  it("a string attribute with or without { }, and an attribute that is just there", () => {
    same('<div className="box" />', '<div className={"box"} />');
    same("<button disabled>Go</button>", "<button disabled={true}>Go</button>");
  });

  it("spaces and line breaks around the children", () => {
    same("<p>Count: {count}</p>", "<p>\n  Count: {count}\n</p>", ["count"]);
    same("<div><p>Hi</p><p>Bye</p></div>", "<div>\n  <p>Hi</p>\n  <p>Bye</p>\n</div>");
    same("<p>Hello world</p>", '<p>{"Hello world"}</p>');
    same("<p>Count: {count}</p>", "<p>{`Count: ${count}`}</p>", ["count"]);
  });

  it("a fragment in its three forms", () => {
    same("<><p>a</p><p>b</p></>", "<Fragment><p>a</p><p>b</p></Fragment>");
    same("<><p>a</p></>", "<React.Fragment><p>a</p></React.Fragment>");
  });

  it("a handler that returns its call or only makes it", () => {
    same("<button onClick={() => save(1)}>Go</button>", "<button onClick={() => { save(1); }}>Go</button>", ["save"]);
    same("<button onClick={() => { save(1); }}>Go</button>", "<button onClick={() => save(1)}>Go</button>", ["save"]);
    same("<button onClick={save}>Go</button>", "<button onClick={save}>Go</button>", ["save"]);
  });

  it("showing something only when a condition is true: && or a ternary with null", () => {
    same("<div>{open === true && <p>Yes</p>}</div>", "<div>{open === true ? <p>Yes</p> : null}</div>", ["open"]);
    same("<div>{count > 0 ? <p>Some</p> : null}</div>", "<div>{count > 0 && <p>Some</p>}</div>", ["count"]);
    // With a number in front, && can show a 0 on the page. That is another result.
    different("<div>{list.length > 0 && <p>Some</p>}</div>", "<div>{list.length && <p>Some</p>}</div>", ["list"]);
  });

  it("the order of the names in an import, and an extra React import", () => {
    const problem = tiny(['import { useState, useEffect, useRef } from "react";']);
    expect(verdictOf(problem, 'import { useRef, useState, useEffect } from "react";').kind).toBe("accept");
    expect(verdictOf(problem, 'import React, { useEffect, useRef, useState } from "react";').kind).toBe("accept");
    expect(verdictOf(problem, "import { useState, useEffect, useRef } from 'react'").kind).toBe("accept");
    // A hook that is missing, and a hook too many, are not the same import.
    expect(verdictOf(problem, 'import { useState, useEffect } from "react";').kind).not.toBe("accept");
    expect(verdictOf(problem, 'import { useState, useEffect, useRef, useMemo } from "react";').kind).toBe("reject");
  });
});

describe("JSX that does not mean the same", () => {
  it("a missing attribute, an extra attribute, another value", () => {
    expect(different('<input type="text" value={name} />', '<input type="text" />', ["name"])).toContain("one more attribute");
    expect(different('<input type="text" />', '<input type="text" disabled />')).toContain("disabled");
    different('<input type="text" />', '<input type="number" />');
    different("<p>Count: {count}</p>", "<p>Count: {total}</p>", ["count", "total"]);
  });

  it("a child too few or too many", () => {
    expect(different("<div><p>a</p><p>b</p></div>", "<div><p>a</p></div>")).toContain("closed too early");
    different("<div><p>a</p></div>", "<div><p>a</p><p>b</p></div>");
  });

  it("with a spread, the order of the attributes counts", () => {
    different("<input {...rest} value={name} />", "<input value={name} {...rest} />", ["rest", "name"]);
    same("<input {...rest} value={name} />", "<input {...rest} value={name} />", ["rest", "name"]);
  });
});

describe("a tag written over several lines", () => {
  const FIELD = [
    "export default function Field({ value, onChange }) {",
    "  return (",
    "    <input",
    '      type="text"',
    "      value={value}",
    "      onChange={onChange}",
    "    />\n  );\n}",
  ];
  const problem = tiny(FIELD, ["Field"]);

  it("each attribute line is its own step", async () => {
    const session = await type(problem, FIELD);
    expect(story(session).filter((line) => !line.includes("accept x1 via match"))).toEqual([]);
    expect(session.finished).toBe(true);
  });

  it("the attributes in another order are right so far, and accepted when all are there", async () => {
    const session = await type(problem, [
      "export default function Field({ value, onChange }) {",
      "  return (",
      "    <input",
      "      onChange={onChange}",
      "      value={value}",
      '      type="text"',
      "    />",
      "  );",
      "}",
    ]);
    expect(story(session).filter((line) => line.includes("REJECT"))).toEqual([]);
    expect(session.finished).toBe(true);
  });

  it("closing the tag with an attribute missing is wrong", async () => {
    const session = await type(problem, [
      "export default function Field({ value, onChange }) {",
      "  return (",
      "    <input",
      '      type="text"',
      "      value={value}",
      "    />",
    ]);
    const last = session.log[session.log.length - 1].verdict;
    expect(last.kind).toBe("reject");
  });
});

describe("a list and a component of its own", () => {
  const LIST = [
    "function Row({ label }) {",
    "  return <li>{label}</li>;\n}",
    "export default function List({ items }) {",
    "  return (",
    "    <ul>",
    "      {items.map((item) => (",
    "        <Row key={item.id} label={item.name} />",
    "      ))}",
    "    </ul>\n  );\n}",
  ];
  const problem = tiny(LIST, ["List"]);

  it("is accepted step by step", async () => {
    const session = await type(problem, LIST);
    expect(story(session).filter((line) => !line.includes("accept x1 via match"))).toEqual([]);
    expect(session.finished).toBe(true);
  });

  it("is accepted with another name for the inner component and for the item", async () => {
    const session = await type(problem, [
      "function Line({ label }) {",
      "  return <li>{label}</li>;",
      "}",
      "export default function List({ items }) {",
      "  return (",
      "    <ul>",
      "      {items.map((entry) => (",
      "        <Line key={entry.id} label={entry.name} />",
      "      ))}",
      "    </ul>",
      "  );",
      "}",
    ]);
    expect(story(session).filter((line) => line.includes("REJECT"))).toEqual([]);
    expect(session.finished).toBe(true);
    expect(session.state.names).toMatchObject({ Row: "Line", item: "entry" });
  });
});
