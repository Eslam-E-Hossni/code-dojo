// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { hoistMocks } from "@/lib/testing/frame/modules";
import { runFiles } from "@/lib/testing/frame/run";
import { runPassed, type TestRunResult } from "@/lib/testing/protocol";

/**
 * The Jest-compatible runner of the Testing track, run here on jsdom.
 * In the app the same code runs in an isolated iframe on the real DOM.
 */

const COUNTER = `import { useState } from "react";
export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
    </div>
  );
}`;

const LOGIN = `import { useState } from "react";
export default function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return setError("Email is required");
    setError("");
    onSubmit({ email });
  };
  return (
    <form onSubmit={submit}>
      <label htmlFor="email">Email</label>
      <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Log in</button>
    </form>
  );
}`;

const USERS = `import { useEffect, useState } from "react";
export default function Users() {
  const [users, setUsers] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then(setUsers)
      .catch(() => setFailed(true));
  }, []);
  if (failed) return <p role="alert">Failed</p>;
  if (!users) return <p>Loading...</p>;
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}`;

const TIMER = `import { useEffect, useState } from "react";
export default function Timer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return (
    <div>
      <p>Seconds: {seconds}</p>
      <button onClick={() => setRunning(true)}>Start</button>
    </div>
  );
}`;

const DEBOUNCE = `export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}`;

const API = `export async function getUser(id) {
  const res = await fetch("/api/users/" + id);
  return res.json();
}
export const VERSION = 2;`;

const PROFILE = `import { useEffect, useState } from "react";
import { getUser } from "./api";
export default function Profile({ id }) {
  const [name, setName] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    getUser(id).then((user) => setName(user.name)).catch(() => setFailed(true));
  }, [id]);
  if (failed) return <p role="alert">Failed</p>;
  return <p>{name === null ? "Loading..." : name}</p>;
}`;

const RTL = `import { render, screen, within, act, renderHook, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
`;

function run(test: string, files: Record<string, string> = {}): Promise<TestRunResult> {
  return runFiles({ files: { ...files, "/it.test.js": test }, entry: "/it.test.js" });
}

function summary(result: TestRunResult): string[] {
  return result.tests.map((t) => [...t.blocks, t.name].join(" > ") + ": " + t.status);
}

describe("the test framework", () => {
  it("collects describe blocks and reports every test", async () => {
    const result = await run(`
      describe("outer", () => {
        it("passes", () => { expect(1 + 1).toBe(2); });
        describe("inner", () => {
          it("fails", () => { expect(1 + 1).toBe(3); });
          it.skip("is skipped", () => { throw new Error("never"); });
        });
      });
      test("top level", () => {});
    `);
    expect(result.fatal).toBeNull();
    expect(summary(result)).toEqual([
      "outer > passes: pass",
      "outer > inner > fails: fail",
      "outer > inner > is skipped: skip",
      "top level: pass",
    ]);
    expect(runPassed(result)).toBe(false);
  });

  it("words a failure the way Jest does", async () => {
    const result = await run(`it("adds", () => { expect(1 + 1).toBe(3); });`);
    expect(result.tests[0].message).toContain("expect(received).toBe(expected) // Object.is equality");
    expect(result.tests[0].message).toContain("Expected: 3");
    expect(result.tests[0].message).toContain("Received: 2");
    expect(result.tests[0].message).not.toContain("\u001b[");
  });

  it("runs hooks in Jest's order", async () => {
    const result = await run(`
      const order = [];
      beforeAll(() => order.push("beforeAll"));
      beforeEach(() => order.push("outer beforeEach"));
      afterEach(() => order.push("outer afterEach"));
      afterAll(() => console.log(order.join(", ")));
      describe("block", () => {
        beforeEach(() => order.push("inner beforeEach"));
        afterEach(() => order.push("inner afterEach 1"));
        afterEach(() => order.push("inner afterEach 2"));
        it("a", () => order.push("a"));
        it("b", () => order.push("b"));
      });
    `);
    expect(result.logs[0].text).toBe(
      "beforeAll, outer beforeEach, inner beforeEach, a, inner afterEach 1, inner afterEach 2, outer afterEach, " +
        "outer beforeEach, inner beforeEach, b, inner afterEach 1, inner afterEach 2, outer afterEach",
    );
  });

  it("supports it.each, it.only and async tests", async () => {
    const each = await run(`it.each([[1, 1, 2], [2, 3, 5]])("adds %i + %i", (a, b, sum) => { expect(a + b).toBe(sum); });`);
    expect(summary(each)).toEqual(["adds 1 + 1: pass", "adds 2 + 3: pass"]);

    const only = await run(`it("a", () => { throw new Error("x"); }); it.only("b", () => {});`);
    expect(summary(only)).toEqual(["a: skip", "b: pass"]);
    expect(runPassed(only)).toBe(true);

    const asyncTest = await run(`it("waits", async () => { await expect(Promise.resolve(5)).resolves.toBe(5); await expect(Promise.reject(new Error("no"))).rejects.toThrow("no"); });`);
    expect(summary(asyncTest)).toEqual(["waits: pass"]);
  });

  it("counts the assertions of each test", async () => {
    const result = await run(`it("none", () => {}); it("two", () => { expect(1).toBe(1); expect(2).toBe(2); }); it("must have one", () => { expect.hasAssertions(); });`);
    expect(result.tests.map((t) => t.assertions)).toEqual([0, 2, 0]);
    expect(result.tests.map((t) => t.status)).toEqual(["pass", "pass", "fail"]);
  });

  it("a file with no test does not count as passed", async () => {
    const result = await run(`const x = 1;`);
    expect(result.fatal).toBeNull();
    expect(result.tests).toEqual([]);
    expect(runPassed(result)).toBe(false);
  });

  it("fails a test that never finishes, and a failing hook fails its tests", async () => {
    const stuck = await run(`jest.setTimeout(40); it("hangs", async () => { await new Promise(() => {}); }); it("next still runs", () => {});`);
    expect(summary(stuck)).toEqual(["hangs: fail", "next still runs: pass"]);
    expect(stuck.tests[0].message).toContain("Exceeded timeout of 40 ms");

    const hook = await run(`beforeEach(() => { throw new Error("setup broke"); }); it("a", () => {});`);
    expect(hook.tests[0]).toMatchObject({ status: "fail", message: "setup broke" });
  });
});

describe("errors outside the tests", () => {
  it("reports a syntax error with the file and the line", async () => {
    const result = await run(`it("a", () => {\n  expect(1).toBe(1;\n});`);
    expect(result.fatal).toContain("SyntaxError");
    expect(result.fatal).toContain("it.test.js");
    expect(result.fatal).toContain("line 2");
    expect(result.tests).toEqual([]);
  });

  it("explains an import that does not exist", async () => {
    const missing = await run(`import Counter from "./Countr";\nit("a", () => {});`, { "/Counter.js": COUNTER });
    expect(missing.fatal).toContain("Cannot find module './Countr' from 'it.test.js'");

    const library = await run(`import axios from "axios";\nit("a", () => {});`);
    expect(library.fatal).toContain("Cannot find module 'axios'");
    expect(library.fatal).toContain("@testing-library/react");
  });

  it("stops an endless loop", async () => {
    const result = await run(`it("loops", () => { while (true) {} });`);
    expect(result.tests[0].status).toBe("fail");
    expect(result.tests[0].message).toContain("Loop guard");
  });

  it("refuses it() inside a test and an async describe", async () => {
    const nested = await run(`it("outer", () => { it("inner", () => {}); });`);
    expect(nested.tests[0].message).toContain("cannot be called inside a test");
    const asyncDescribe = await run(`describe("x", async () => { it("a", () => {}); });`);
    expect(asyncDescribe.fatal).toContain("must not be async");
  });
});

describe("React Testing Library and user-event", () => {
  it("renders, clicks and reads the screen", async () => {
    const result = await run(
      RTL +
        `import Counter from "./Counter";
      it("increments", async () => {
        const user = userEvent.setup();
        render(<Counter />);
        expect(screen.getByText("Count: 0")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "+" }));
        expect(screen.getByText("Count: 1")).toBeInTheDocument();
      });
      it("starts clean again", () => {
        render(<Counter />);
        expect(screen.getAllByRole("button")).toHaveLength(1);
        expect(screen.getByText("Count: 0")).toBeInTheDocument();
      });`,
      { "/Counter.js": COUNTER },
    );
    expect(result.fatal).toBeNull();
    expect(summary(result)).toEqual(["increments: pass", "starts clean again: pass"]);
  });

  it("types in a labelled input and submits a form", async () => {
    const result = await run(
      RTL +
        `import LoginForm from "./LoginForm";
      it("submits", async () => {
        const user = userEvent.setup();
        const onSubmit = jest.fn();
        render(<LoginForm onSubmit={onSubmit} />);
        await user.type(screen.getByLabelText("Email"), "a@b.c");
        await user.click(screen.getByRole("button", { name: "Log in" }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.c" });
      });
      it("shows the error", async () => {
        const user = userEvent.setup();
        const onSubmit = jest.fn();
        render(<LoginForm onSubmit={onSubmit} />);
        await user.click(screen.getByRole("button", { name: "Log in" }));
        expect(screen.getByRole("alert")).toHaveTextContent("Email is required");
        expect(onSubmit).not.toHaveBeenCalled();
      });`,
      { "/LoginForm.js": LOGIN },
    );
    expect(summary(result)).toEqual(["submits: pass", "shows the error: pass"]);
  });

  it("supports renderHook, act and a wrapper", async () => {
    const result = await run(
      RTL +
        `import { createContext, useContext, useState } from "react";
      const Ctx = createContext("none");
      it("hook", () => {
        const { result, rerender } = renderHook(({ start }) => useState(start), { initialProps: { start: 5 } });
        act(() => result.current[1](6));
        expect(result.current[0]).toBe(6);
        rerender({ start: 100 });
        expect(result.current[0]).toBe(6);
      });
      it("wrapper", () => {
        const wrapper = ({ children }) => <Ctx.Provider value="dark">{children}</Ctx.Provider>;
        const { result } = renderHook(() => useContext(Ctx), { wrapper });
        expect(result.current).toBe("dark");
      });`,
    );
    expect(summary(result)).toEqual(["hook: pass", "wrapper: pass"]);
  });
});

describe("mock functions and fetch", () => {
  it("jest.spyOn(global, fetch) reaches the component", async () => {
    const result = await run(
      RTL +
        `import Users from "./Users";
      afterEach(() => { jest.restoreAllMocks(); });
      it("shows the users", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => [{ id: 1, name: "Mona" }] });
        render(<Users />);
        expect(screen.getByText("Loading...")).toBeInTheDocument();
        expect(await screen.findByText("Mona")).toBeInTheDocument();
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledWith("/api/users");
      });
      it("shows the error", async () => {
        jest.spyOn(global, "fetch").mockRejectedValue(new Error("down"));
        render(<Users />);
        expect(await screen.findByRole("alert")).toHaveTextContent("Failed");
      });`,
      { "/Users.js": USERS },
    );
    expect(summary(result)).toEqual(["shows the users: pass", "shows the error: pass"]);
  });

  it("a test that forgets to mock fetch is told so, and never reaches the network", async () => {
    const result = await run(
      `it("calls fetch", async () => { await fetch("/api/users"); });`,
    );
    expect(result.tests[0].status).toBe("fail");
    expect(result.tests[0].message).toContain("fetch is not mocked in this test");
  });

  it("does not clear mocks between tests by itself, like Jest", async () => {
    const result = await run(`
      const fn = jest.fn();
      it("first", () => { fn(); expect(fn).toHaveBeenCalledTimes(1); });
      it("second sees the old call", () => { expect(fn).toHaveBeenCalledTimes(1); });
      it("until it is cleared", () => { jest.clearAllMocks(); expect(fn).not.toHaveBeenCalled(); });
    `);
    expect(result.tests.map((t) => t.status)).toEqual(["pass", "pass", "pass"]);
  });
});

describe("fake timers", () => {
  it("advances time for a plain function", async () => {
    const result = await run(
      `import { debounce } from "./debounce";
      it("debounces", () => {
        jest.useFakeTimers();
        const fn = jest.fn();
        const d = debounce(fn, 300);
        d("a");
        d("b");
        jest.advanceTimersByTime(299);
        expect(fn).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith("b");
        expect(jest.getTimerCount()).toBe(0);
        jest.useRealTimers();
      });`,
      { "/debounce.js": DEBOUNCE },
    );
    expect(summary(result)).toEqual(["debounces: pass"]);
  });

  it("works with a component, act, and userEvent's advanceTimers", async () => {
    const result = await run(
      RTL +
        `import Timer from "./Timer";
      it("ticks", async () => {
        jest.useFakeTimers();
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        render(<Timer />);
        await user.click(screen.getByRole("button", { name: "Start" }));
        act(() => { jest.advanceTimersByTime(3000); });
        expect(screen.getByText("Seconds: 3")).toBeInTheDocument();
      });`,
      { "/Timer.js": TIMER },
    );
    expect(result.tests[0].message).toBe("");
    expect(summary(result)).toEqual(["ticks: pass"]);
  });

  it("gives the real timers back after the run, even if the test did not", async () => {
    const real = globalThis.setTimeout;
    await run(`it("leaves them on", () => { jest.useFakeTimers(); });`);
    expect(globalThis.setTimeout).toBe(real);
  });

  it("warns like Jest when time is advanced without fake timers", async () => {
    const result = await run(`it("no fake timers", () => { jest.advanceTimersByTime(100); });`);
    expect(result.tests[0].status).toBe("pass");
    expect(result.logs[0]).toMatchObject({ level: "warn" });
    expect(result.logs[0].text).toContain("jest.useFakeTimers()");
  });
});

describe("jest.mock", () => {
  const files = { "/api.js": API, "/Profile.js": PROFILE };

  it("replaces every function of the file with a mock function, before the imports run", async () => {
    const result = await run(
      RTL +
        `import Profile from "./Profile";
      import { getUser, VERSION } from "./api";
      jest.mock("./api");
      beforeEach(() => { jest.clearAllMocks(); });
      it("shows the name", async () => {
        getUser.mockResolvedValue({ name: "Mona" });
        render(<Profile id={7} />);
        expect(await screen.findByText("Mona")).toBeInTheDocument();
        expect(getUser).toHaveBeenCalledTimes(1);
        expect(getUser).toHaveBeenCalledWith(7);
      });
      it("shows the error", async () => {
        getUser.mockRejectedValue(new Error("down"));
        render(<Profile id={8} />);
        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(getUser).toHaveBeenCalledTimes(1);
      });
      it("keeps values that are not functions", () => {
        expect(jest.isMockFunction(getUser)).toBe(true);
        expect(VERSION).toBe(2);
      });`,
      files,
    );
    expect(result.fatal).toBeNull();
    expect(result.tests.map((t) => t.message)).toEqual(["", "", ""]);
  });

  it("takes a factory, and requireActual gives the real file", async () => {
    const result = await run(
      `import { getUser } from "./api";
      jest.mock("./api", () => ({ getUser: jest.fn(() => "from factory") }));
      it("uses the factory", () => {
        expect(getUser()).toBe("from factory");
        expect(jest.isMockFunction(jest.requireActual("./api").getUser)).toBe(false);
      });`,
      files,
    );
    expect(result.tests.map((t) => t.message)).toEqual([""]);
  });

  it("without jest.mock the real file is used", async () => {
    const result = await run(
      `import { getUser } from "./api";
      it("is real", () => { expect(jest.isMockFunction(getUser)).toBe(false); });`,
      files,
    );
    expect(summary(result)).toEqual(["is real: pass"]);
  });

  it("moves the call above the imports and keeps the line numbers", () => {
    const code = '"use strict";var _api = require("./api");\njest.mock("./api");\nfoo();';
    const hoisted = hoistMocks(code);
    expect(hoisted.startsWith('"use strict";jest.mock("./api");var _api')).toBe(true);
    expect(hoisted.split("\n")).toHaveLength(3);
    expect(hoisted.split("\n")[2]).toBe("foo();");
    expect(hoistMocks("foo();")).toBe("foo();");
  });
});

describe("one run does not leak into the next", () => {
  it("restores spies, the console, the page and fetch", async () => {
    const log = console.log;
    const fetchBefore = globalThis.fetch;
    const result = await run(
      RTL +
        `it("makes a mess", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        document.body.appendChild(document.createElement("section"));
        render(<p>left over</p>);
        console.log("hello", { a: 1 });
      });`,
    );
    expect(result.logs).toEqual([{ level: "log", text: 'hello {"a":1}' }]);
    expect(console.log).toBe(log);
    expect(globalThis.fetch).toBe(fetchBefore);
    expect(document.body.innerHTML).toBe("");
    expect(Math.random()).not.toBe(0.5);
    expect((globalThis as { jest?: unknown }).jest).toBeUndefined();
  });
});
