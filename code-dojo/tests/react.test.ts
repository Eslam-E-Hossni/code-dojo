// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { problems } from "@/data/problems";
import type { ReactProblem } from "@/data/types";
import { buildPreviewFiles } from "@/lib/sandpack";
import { solutionText } from "@/lib/steps";

/**
 * The React problems have no hidden tests in the app: the learner checks
 * the live preview by hand. Here every reference solution is mounted for
 * real (in jsdom) from the same files the preview runs, and the points of
 * its `checks` list are tried one by one, with fake time and the mock API.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Exports = Record<string, unknown>;
type Component = React.ComponentType<Record<string, unknown>>;

function find(id: string): ReactProblem {
  const problem = problems.find((p) => p.id === id);
  if (!problem || problem.kind !== "react") throw new Error("no React problem " + id);
  return problem;
}

/** Loads the preview files of a problem as modules, like the bundler does. */
function loadFiles(problem: ReactProblem): { app: Exports; Stage: Component } {
  const files = buildPreviewFiles(problem, solutionText(problem));
  const loaded = new Map<string, Exports>();

  const load = (path: string): Exports => {
    const known = loaded.get(path);
    if (known) return known;
    const js = ts.transpileModule(files[path].code, {
      fileName: path + "x",
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        allowJs: true,
      },
    }).outputText;
    const mod = { exports: {} as Exports };
    loaded.set(path, mod.exports);
    const require = (id: string): unknown => {
      if (id === "react") return React;
      if (id.endsWith(".css")) return {};
      return load("/" + id.replace(/^\.\//, "") + ".js");
    };
    new Function("require", "module", "exports", "React", js)(require, mod, mod.exports, React);
    return mod.exports;
  };

  load("/mockApi.js");
  const app = load("/App.js");
  const Stage = load("/stage.js").Stage as Component;
  return { app, Stage };
}

let container: HTMLDivElement;
let root: Root | null = null;
let consoleError: MockInstance;
let realFetch: typeof fetch;

async function mount(id: string): Promise<Exports> {
  const { app, Stage } = loadFiles(find(id));
  root = createRoot(container);
  await act(async () => {
    root!.render(React.createElement(Stage, { Solution: app.default as Component }));
  });
  return app;
}

async function unmount(): Promise<void> {
  await act(async () => {
    root?.unmount();
  });
  root = null;
}

/** Moves fake time. Timers and the mock API both follow it. */
async function tick(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function text(): string {
  return container.textContent ?? "";
}

function all<T extends Element>(selector: string): T[] {
  return Array.from(container.querySelectorAll<T>(selector));
}

function button(label: string): HTMLButtonElement {
  const found = all<HTMLButtonElement>("button").filter((b) => b.textContent === label);
  if (found.length !== 1) throw new Error(`${found.length} buttons with the text "${label}"`);
  return found[0];
}

function hasButton(label: string): boolean {
  return all<HTMLButtonElement>("button").some((b) => b.textContent === label);
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click();
  });
}

/** Types like a user: sets the value the way the browser does, then fires input. */
async function type(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  realFetch = globalThis.fetch;
  delete (window as { __dojoScenario?: string }).__dojoScenario;
  container = document.createElement("div");
  document.body.appendChild(container);
  // React reports a missing key, an update after unmount and the like here.
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  await unmount();
  container.remove();
  expect(consoleError.mock.calls, "React warnings or errors").toEqual([]);
  // The component is gone, so nothing of it may still be scheduled.
  expect(vi.getTimerCount(), "timers left after unmount").toBe(0);
  vi.restoreAllMocks();
  vi.useRealTimers();
  globalThis.fetch = realFetch;
});

describe("every React reference solution mounts from its preview files", () => {
  for (const problem of problems) {
    if (problem.kind !== "react") continue;
    it(problem.id, async () => {
      await mount(problem.id);
      expect(container.innerHTML.length).toBeGreaterThan(0);
      await tick(2000);
    });
  }
});

describe("react-counter", () => {
  it("counts up, down, below zero, and resets", async () => {
    await mount("react-counter");
    expect(text()).toContain("Count: 0");
    await click(button("+"));
    await click(button("+"));
    expect(text()).toContain("Count: 2");
    await click(button("-"));
    await click(button("-"));
    await click(button("-"));
    expect(text()).toContain("Count: -1");
    await click(button("Reset"));
    expect(text()).toContain("Count: 0");
  });

  it("counts every click of a fast burst", async () => {
    await mount("react-counter");
    const plus = button("+");
    await act(async () => {
      for (let i = 0; i < 25; i++) plus.click();
    });
    expect(text()).toContain("Count: 25");
  });

  it("announces the count to a screen reader", async () => {
    await mount("react-counter");
    expect(container.querySelector("[aria-live=polite]")?.textContent).toBe("Count: 0");
  });
});

describe("react-timer", () => {
  const time = () => container.querySelector("h1")?.textContent;

  it("starts stopped at 00:00", async () => {
    await mount("react-timer");
    expect(time()).toBe("00:00");
    expect(button("Start").disabled).toBe(false);
    expect(button("Pause").disabled).toBe(true);
    await tick(5000);
    expect(time()).toBe("00:00");
  });

  it("counts one second at a time, pauses and goes on", async () => {
    await mount("react-timer");
    await click(button("Start"));
    expect(button("Start").disabled).toBe(true);
    expect(button("Pause").disabled).toBe(false);
    await tick(999);
    expect(time()).toBe("00:00");
    await tick(1);
    expect(time()).toBe("00:01");
    await tick(2000);
    expect(time()).toBe("00:03");

    await click(button("Pause"));
    await tick(5000);
    expect(time()).toBe("00:03");

    await click(button("Start"));
    await tick(1000);
    expect(time()).toBe("00:04");
  });

  it("shows minutes and seconds with two digits", async () => {
    await mount("react-timer");
    await click(button("Start"));
    await tick(65_000);
    expect(time()).toBe("01:05");
  });

  it("Reset while running stops it and shows 00:00", async () => {
    await mount("react-timer");
    await click(button("Start"));
    await tick(3000);
    await click(button("Reset"));
    expect(time()).toBe("00:00");
    expect(button("Start").disabled).toBe(false);
    await tick(3000);
    expect(time()).toBe("00:00");
  });

  it("never has two intervals", async () => {
    await mount("react-timer");
    for (let i = 0; i < 4; i++) {
      await click(button("Start"));
      expect(vi.getTimerCount()).toBe(1);
      await click(button("Pause"));
      expect(vi.getTimerCount()).toBe(0);
    }
    await click(button("Start"));
    await tick(3000);
    expect(time()).toBe("00:03");
  });

  it("clears the interval when it unmounts while running", async () => {
    await mount("react-timer");
    await click(button("Start"));
    expect(vi.getTimerCount()).toBe(1);
    await unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("react-auto-counter", () => {
  it("does not move until a button is clicked", async () => {
    await mount("react-auto-counter");
    expect(text()).toContain("Count: 0");
    await tick(5000);
    expect(text()).toContain("Count: 0");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("goes up, goes down below zero, and stops", async () => {
    await mount("react-auto-counter");
    await click(button("Auto +"));
    await tick(3000);
    expect(text()).toContain("Count: 3");

    await click(button("Auto -"));
    await tick(5000);
    expect(text()).toContain("Count: -2");

    await click(button("Stop"));
    await tick(5000);
    expect(text()).toContain("Count: -2");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not go faster when a button is clicked many times", async () => {
    await mount("react-auto-counter");
    for (let i = 0; i < 5; i++) await click(button("Auto +"));
    expect(vi.getTimerCount()).toBe(1);
    await tick(4000);
    expect(text()).toContain("Count: 4");
  });

  it("has one interval when the direction changes", async () => {
    await mount("react-auto-counter");
    await click(button("Auto +"));
    await click(button("Auto -"));
    await click(button("Auto +"));
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe("react-todos", () => {
  const input = () => container.querySelector<HTMLInputElement>("input#new")!;
  const rows = () => all<HTMLLIElement>("li");
  const boxes = () => all<HTMLInputElement>("input[type=checkbox]");

  async function add(value: string) {
    await type(input(), value);
    await click(button("Add"));
  }

  it("adds an item with the button and clears the input", async () => {
    await mount("react-todos");
    expect(rows()).toHaveLength(0);
    await add("milk");
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain("milk");
    expect(input().value).toBe("");
    expect(boxes()[0].checked).toBe(false);
  });

  it("adds an item when the form is submitted, as Enter does", async () => {
    await mount("react-todos");
    await type(input(), "bread");
    const form = container.querySelector("form")!;
    let prevented = false;
    await act(async () => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
      prevented = event.defaultPrevented;
    });
    expect(rows()).toHaveLength(1);
    expect(prevented, "the page must not reload").toBe(true);
  });

  it("does not add empty or spaces-only text", async () => {
    await mount("react-todos");
    await click(button("Add"));
    await add("   ");
    expect(rows()).toHaveLength(0);
  });

  it("has a label that belongs to the input", async () => {
    await mount("react-todos");
    const label = container.querySelector("label")!;
    expect(label.textContent).toBe("New todo");
    expect(label.htmlFor).toBe(input().id);
  });

  it("toggles one item only", async () => {
    await mount("react-todos");
    await add("a");
    await add("b");
    await add("c");
    await click(boxes()[1]);
    expect(boxes().map((box) => box.checked)).toEqual([false, true, false]);
    await click(boxes()[1]);
    expect(boxes().map((box) => box.checked)).toEqual([false, false, false]);
  });

  it("deletes the right item and the others keep their state", async () => {
    await mount("react-todos");
    await add("a");
    await add("b");
    await add("c");
    await click(boxes()[0]);
    const first = rows()[0];
    const last = rows()[2];

    await click(rows()[1].querySelector("button")!);
    expect(rows().map((row) => row.textContent)).toEqual(["aDelete", "cDelete"]);
    expect(boxes().map((box) => box.checked)).toEqual([true, false]);
    // A stable key keeps the same DOM rows. With the index as key the last row would be reused.
    expect(rows()[0]).toBe(first);
    expect(rows()[1]).toBe(last);
  });

  it("can delete the last item, and allows duplicates", async () => {
    await mount("react-todos");
    await add("same");
    await add("same");
    expect(rows()).toHaveLength(2);
    await click(rows()[1].querySelector("button")!);
    await click(rows()[0].querySelector("button")!);
    expect(rows()).toHaveLength(0);
  });

  it("deleting does not submit the form", async () => {
    await mount("react-todos");
    await add("a");
    await type(input(), "typed but not added");
    await click(rows()[0].querySelector("button")!);
    expect(rows()).toHaveLength(0);
    expect(input().value).toBe("typed but not added");
  });
});

describe("react-debounce-search", () => {
  let requests: { url: string; signal: AbortSignal | undefined }[];
  let logged: MockInstance;

  /** Counts the requests that reach the mock API. */
  function watchFetch() {
    requests = [];
    const mock = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), signal: init?.signal ?? undefined });
      return mock(input, init);
    }) as typeof fetch;
  }

  async function start() {
    await mount("react-debounce-search");
    watchFetch();
    logged = vi.spyOn(console, "log").mockImplementation(() => {});
    return container.querySelector<HTMLInputElement>("input")!;
  }

  it("calls the API only after the user stops typing", async () => {
    const input = await start();
    expect(input.placeholder).toBe("Search");
    await type(input, "ap");
    expect(input.value).toBe("ap");
    await tick(399);
    expect(requests).toHaveLength(0);
    await tick(1);
    expect(requests.map((r) => r.url)).toEqual(["/api/search?q=ap"]);
    await tick(300);
    expect(logged.mock.calls).toEqual([[["apple", "apricot", "grape"]]]);
  });

  it("makes one request for a burst of letters, for the last text", async () => {
    const input = await start();
    await type(input, "l");
    await tick(200);
    await type(input, "le");
    await tick(200);
    await type(input, "lem");
    await tick(399);
    expect(requests).toHaveLength(0);
    await tick(1);
    expect(requests.map((r) => r.url)).toEqual(["/api/search?q=lem"]);
    await tick(300);
    expect(logged.mock.calls).toEqual([[["lemon"]]]);
  });

  it("makes no request for an empty query", async () => {
    const input = await start();
    await tick(1000);
    await type(input, "pe");
    await tick(700);
    expect(requests).toHaveLength(1);
    await type(input, "");
    await tick(2000);
    expect(requests).toHaveLength(1);
  });

  it("encodes the query", async () => {
    const input = await start();
    await type(input, "a b&c");
    await tick(400);
    expect(requests.map((r) => r.url)).toEqual(["/api/search?q=a%20b%26c"]);
    await tick(300);
    expect(logged.mock.calls).toEqual([[[]]]);
  });

  it("aborts the request when it unmounts, and logs nothing", async () => {
    const input = await start();
    await type(input, "ap");
    await tick(400);
    expect(requests[0].signal?.aborted).toBe(false);
    await unmount();
    expect(requests[0].signal?.aborted).toBe(true);
    await tick(1000);
    expect(logged.mock.calls).toEqual([]);
  });

  it("clears the timer when it unmounts before the delay", async () => {
    const input = await start();
    await type(input, "ap");
    await unmount();
    await tick(1000);
    expect(requests).toHaveLength(0);
  });
});

describe("react-use-fetch", () => {
  const line = (label: string) =>
    all<HTMLElement>("p, pre")
      .map((el) => el.textContent ?? "")
      .find((t) => t.startsWith(label));

  it("returns loading first, then the data", async () => {
    await mount("react-use-fetch");
    expect(line("loading:")).toBe("loading: true");
    expect(line("error:")).toBe("error: null");
    expect(line("data:")).toBe("data: null");
    await tick(700);
    expect(line("loading:")).toBe("loading: false");
    expect(line("data:")).toContain("Leanne Graham");
    expect(line("data:")).toContain("Chelsey Dietrich");
  });

  it("fetches again when the URL changes", async () => {
    await mount("react-use-fetch");
    await tick(700);
    await click(button("/api/empty"));
    expect(line("loading:")).toBe("loading: true");
    await tick(500);
    expect(line("loading:")).toBe("loading: false");
    expect(line("data:")).toBe("data: []");
    expect(line("error:")).toBe("error: null");
  });

  it("turns an HTTP error status into an error", async () => {
    await mount("react-use-fetch");
    await tick(700);
    await click(button("/api/broken"));
    await tick(500);
    expect(line("error:")).toBe("error: HTTP 404");
    expect(line("loading:")).toBe("loading: false");
  });

  it("clears the error on the next request", async () => {
    await mount("react-use-fetch");
    await click(button("/api/broken"));
    await tick(500);
    expect(line("error:")).toBe("error: HTTP 404");
    await click(button("/api/users"));
    expect(line("error:")).toBe("error: null");
    await tick(700);
    expect(line("data:")).toContain("Leanne Graham");
    expect(line("error:")).toBe("error: null");
  });

  it("keeps the answer of the last URL when the URL changes fast", async () => {
    await mount("react-use-fetch");
    // /api/users takes 700 ms, /api/empty 500 ms: without abort the slow one would win.
    await click(button("/api/broken"));
    await tick(100);
    await click(button("/api/users"));
    await tick(100);
    await click(button("/api/empty"));
    await tick(2000);
    expect(line("url:")).toBe("url: /api/empty");
    expect(line("data:")).toBe("data: []");
    expect(line("error:")).toBe("error: null");
    expect(line("loading:")).toBe("loading: false");
  });

  it("does not report its own abort as an error", async () => {
    await mount("react-use-fetch");
    await tick(100);
    await click(button("/api/empty"));
    await tick(50);
    expect(line("error:")).toBe("error: null");
  });
});

describe("react-use-context", () => {
  it("shares the theme with every reader and toggles it", async () => {
    await mount("react-use-context");
    expect(button("Current: light")).toBeTruthy();
    expect(text()).toContain("Theme: light");
    await click(button("Current: light"));
    expect(text()).toContain("Theme: dark");
    await click(button("Current: dark"));
    expect(text()).toContain("Theme: light");
    expect(hasButton("Current: light")).toBe(true);
  });

  it("throws a clear error outside the provider", async () => {
    const { app } = loadFiles(find("react-use-context"));
    const useTheme = app.useTheme as () => unknown;
    function Lonely() {
      useTheme();
      return null;
    }
    expect(() => renderToString(React.createElement(Lonely))).toThrow("useTheme must be used inside ThemeProvider");
    consoleError.mockClear();
  });

  it("keeps the same value object while the theme does not change", async () => {
    const { app } = loadFiles(find("react-use-context"));
    const Provider = app.ThemeProvider as Component;
    const useTheme = app.useTheme as () => { theme: string; toggle: () => void };
    const seen: unknown[] = [];
    let rerender = () => {};
    function Reader() {
      seen.push(useTheme());
      return null;
    }
    const reader = React.createElement(Reader);
    function Parent() {
      const [, setCount] = React.useState(0);
      rerender = () => setCount((n) => n + 1);
      return React.createElement(Provider, null, reader);
    }
    root = createRoot(container);
    await act(async () => {
      root!.render(React.createElement(Parent));
    });
    await act(async () => {
      rerender();
    });
    // The provider rendered again, but the memoized value did not change, so the reader did not.
    expect(seen).toHaveLength(1);
    await act(async () => {
      (seen[0] as { toggle: () => void }).toggle();
    });
    expect(seen).toHaveLength(2);
    expect((seen[1] as { theme: string }).theme).toBe("dark");
  });
});

describe("react-users-table", () => {
  const cells = () => all<HTMLTableCellElement>("tbody td").map((td) => td.textContent);

  it("shows loading, then the table", async () => {
    await mount("react-users-table");
    expect(text()).toContain("Loading...");
    expect(container.querySelector("table")).toBeNull();
    await tick(700);
    expect(text()).not.toContain("Loading...");
    expect(container.querySelector("caption")?.textContent).toBe("Users");
    expect(all<HTMLElement>("thead th").map((th) => th.textContent + ":" + th.getAttribute("scope"))).toEqual([
      "Name:col",
      "Email:col",
    ]);
    expect(all("tbody tr")).toHaveLength(5);
    expect(cells().slice(0, 2)).toEqual(["Leanne Graham", "leanne@example.com"]);
  });

  it("shows a message for an empty list", async () => {
    await mount("react-users-table");
    await click(button("empty"));
    expect(text()).toContain("Loading...");
    await tick(700);
    expect(text()).toContain("No users.");
    expect(container.querySelector("table")).toBeNull();
  });

  it("shows an alert when the status is not ok", async () => {
    await mount("react-users-table");
    await click(button("error"));
    await tick(700);
    expect(container.querySelector("[role=alert]")?.textContent).toBe("Could not load users.");
    expect(container.querySelector("table")).toBeNull();
  });

  it("always matches the last choice when switching fast", async () => {
    await mount("react-users-table");
    await tick(300);
    await click(button("error"));
    await tick(300);
    await click(button("empty"));
    await tick(300);
    await click(button("data"));
    await tick(2000);
    expect(all("tbody tr")).toHaveLength(5);
    expect(container.querySelector("[role=alert]")).toBeNull();
  });

  it("aborts the request when it unmounts before the response", async () => {
    await mount("react-users-table");
    await tick(300);
    await unmount();
    await tick(2000);
    // afterEach checks that React logged no update on an unmounted component.
  });
});

describe("react-wizard", () => {
  const input = () => container.querySelector<HTMLInputElement>("form input")!;
  const alert = () => container.querySelector("[role=alert]")?.textContent ?? null;
  const note = () => container.querySelector(".dojo-stage-note")?.textContent;

  it("starts on step 1 with no Back button", async () => {
    await mount("react-wizard");
    expect(text()).toContain("Step 1 of 2");
    expect(hasButton("Back")).toBe(false);
    expect(hasButton("Next")).toBe(true);
    expect(container.querySelector("label")?.textContent).toBe("Name");
    expect(container.querySelector("label")?.htmlFor).toBe(input().id);
    expect(input().getAttribute("aria-invalid")).toBe("false");
    expect(alert()).toBeNull();
  });

  it("stays on the step and shows the error when the value is not valid", async () => {
    await mount("react-wizard");
    await click(button("Next"));
    expect(text()).toContain("Step 1 of 2");
    expect(alert()).toBe("Name is required");
    expect(input().getAttribute("aria-invalid")).toBe("true");

    await type(input(), "   ");
    await click(button("Next"));
    expect(text()).toContain("Step 1 of 2");
    expect(alert()).toBe("Name is required");
  });

  it("goes to the next step with a valid value and clears the error", async () => {
    await mount("react-wizard");
    await click(button("Next"));
    await type(input(), "Islam");
    await click(button("Next"));
    expect(text()).toContain("Step 2 of 2");
    expect(alert()).toBeNull();
    expect(container.querySelector("label")?.textContent).toBe("Email");
    expect(input().value).toBe("");
    expect(hasButton("Submit")).toBe(true);
    expect(hasButton("Back")).toBe(true);
  });

  it("submits only on the last step, with valid data, and sends every value", async () => {
    await mount("react-wizard");
    await type(input(), "Islam");
    await click(button("Next"));
    expect(note()).toBe("onSubmit was not called yet.");

    await type(input(), "not an email");
    await click(button("Submit"));
    expect(alert()).toBe("Email is not valid");
    expect(note()).toBe("onSubmit was not called yet.");

    await type(input(), "islam@example.com");
    await click(button("Submit"));
    expect(alert()).toBeNull();
    expect(note()).toBe('onSubmit was called with: {"name":"Islam","email":"islam@example.com"}');
  });

  it("Back keeps the values and clears the error", async () => {
    await mount("react-wizard");
    await type(input(), "Islam");
    await click(button("Next"));
    await type(input(), "wrong");
    await click(button("Submit"));
    expect(alert()).toBe("Email is not valid");

    await click(button("Back"));
    expect(text()).toContain("Step 1 of 2");
    expect(input().value).toBe("Islam");
    expect(alert()).toBeNull();

    await click(button("Next"));
    expect(input().value).toBe("wrong");
  });

  it("Back does not submit the form", async () => {
    await mount("react-wizard");
    await type(input(), "Islam");
    await click(button("Next"));
    await type(input(), "islam@example.com");
    await click(button("Back"));
    expect(text()).toContain("Step 1 of 2");
    expect(note()).toBe("onSubmit was not called yet.");
  });
});
