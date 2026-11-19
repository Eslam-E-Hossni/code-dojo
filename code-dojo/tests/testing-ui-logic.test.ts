// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { problems } from "@/data/problems";
import type { TestingProblem } from "@/data/types";
import { solutionText } from "@/lib/steps";
import { countPhases, splitByPhase } from "@/lib/testing/aaa";
import { installFastTimers } from "@/lib/testing/frame/fastTimers";
import { installFocusEvents } from "@/lib/testing/frame/focus";

const exercises = problems.filter((p): p is TestingProblem => p.kind === "test");

describe("Arrange / Act / Assert: splitting a test by the shape of its lines", () => {
  const phases = (code: string) => splitByPhase(code).map((line) => line.phase);

  it("tags the lines of a component test", () => {
    const code = [
      'import { render, screen } from "@testing-library/react";',
      "",
      'describe("Counter", () => {',
      '  it("adds one", async () => {',
      "    const user = userEvent.setup();",
      "    render(<Counter />);",
      '    await user.click(screen.getByRole("button", { name: "+" }));',
      '    expect(screen.getByText("Count: 1")).toBeInTheDocument();',
      "  });",
      "});",
    ].join("\n");
    expect(phases(code)).toEqual([
      "frame",
      "frame",
      "frame",
      "frame",
      "arrange",
      "arrange",
      "act",
      "assert",
      "frame",
      "frame",
    ]);
  });

  it("keeps the lines of one statement together", () => {
    const code = [
      'it("ticks", async () => {',
      "  const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {",
      '    initialProps: { value: "a" },',
      "  });",
      "  act(() => {",
      "    jest.advanceTimersByTime(300);",
      "  });",
      '  expect(result.current).toBe("a");',
      "});",
    ].join("\n");
    expect(phases(code)).toEqual(["frame", "arrange", "arrange", "arrange", "act", "act", "act", "assert", "frame"]);
  });

  it("knows mocks and timers as arrange, and a call of the code under test as act", () => {
    const code = [
      'it("works", () => {',
      "  jest.useFakeTimers();",
      '  jest.spyOn(global, "fetch").mockResolvedValue({ ok: true });',
      '  getUser.mockResolvedValue({ name: "Mona" });',
      "  const fn = jest.fn();",
      '  debounced("a");',
      "  jest.advanceTimersByTime(300);",
      "  flatten(input);",
      '  rerender({ value: "ab" });',
      "  await expect(promise).resolves.toBe(1);",
      "});",
    ].join("\n");
    expect(phases(code)).toEqual([
      "frame",
      "arrange",
      "arrange",
      "arrange",
      "arrange",
      "act",
      "act",
      "act",
      "act",
      "assert",
      "frame",
    ]);
  });

  it("treats hooks, helpers and anything outside a test as the frame", () => {
    const code = [
      "beforeEach(() => {",
      "  jest.useFakeTimers();",
      "});",
      "function renderWithTheme(ui) {",
      "  return render(ui, { wrapper: ThemeProvider });",
      "}",
    ].join("\n");
    expect(new Set(phases(code))).toEqual(new Set(["frame"]));
  });

  it("does not break on an empty or unfinished file", () => {
    expect(splitByPhase("")).toEqual([{ text: "", phase: "frame" }]);
    expect(phases('it("a", () => {\n  expect(1')).toEqual(["frame", "assert"]);
  });

  for (const problem of exercises) {
    it(`${problem.id}: every test of the reference has an assert, and the lines are all kept`, () => {
      const code = solutionText(problem);
      const lines = splitByPhase(code);
      expect(lines.map((line) => line.text).join("\n")).toBe(code);
      const count = countPhases(lines);
      const tests = (code.match(/^\s*it\(/gm) ?? []).length;
      expect(count.assert).toBeGreaterThanOrEqual(tests);
      expect(count.arrange + count.act).toBeGreaterThan(0);
    });
  }
});

describe("focus kept by hand, for a frame the browser gives no focus to", () => {
  const view = window as Window & typeof globalThis;
  const proto = view.HTMLElement.prototype;
  const original = { focus: proto.focus, blur: proto.blur };

  afterEach(() => {
    proto.focus = original.focus;
    proto.blur = original.blur;
    delete (document as unknown as { activeElement?: unknown }).activeElement;
    document.body.innerHTML = "";
  });

  /** A browser that refuses to move the focus: focus() and blur() do nothing. */
  function refusingBrowser() {
    proto.focus = () => {};
    proto.blur = () => {};
    installFocusEvents(view);
  }

  function field(id: string): { input: HTMLInputElement; events: string[] } {
    const input = document.createElement("input");
    input.id = id;
    document.body.appendChild(input);
    const events: string[] = [];
    for (const type of ["focus", "focusin", "blur", "focusout"]) {
      input.addEventListener(type, () => events.push(id + ":" + type));
    }
    return { input, events };
  }

  it("makes the element active and fires its focus events", () => {
    refusingBrowser();
    const a = field("a");
    a.input.focus();
    expect(document.activeElement).toBe(a.input);
    expect(a.events).toEqual(["a:focus", "a:focusin"]);
  });

  it("blurs the old element when another one takes the focus", () => {
    refusingBrowser();
    const a = field("a");
    const b = field("b");
    a.input.focus();
    b.input.focus();
    expect(document.activeElement).toBe(b.input);
    expect(a.events).toEqual(["a:focus", "a:focusin", "a:blur", "a:focusout"]);
    expect(b.events).toEqual(["b:focus", "b:focusin"]);
  });

  it("focusout and focusin bubble, blur and focus do not", () => {
    refusingBrowser();
    const a = field("a");
    const heard: string[] = [];
    for (const type of ["focus", "focusin", "blur", "focusout"]) {
      document.body.addEventListener(type, () => heard.push(type));
    }
    a.input.focus();
    a.input.blur();
    expect(heard).toEqual(["focusin", "focusout"]);
  });

  it("blur gives the focus back to the page", () => {
    refusingBrowser();
    const a = field("a");
    a.input.focus();
    a.input.blur();
    expect(document.activeElement).toBe(document.body);
    expect(a.events).toEqual(["a:focus", "a:focusin", "a:blur", "a:focusout"]);
  });

  it("does nothing twice, and nothing for an element that cannot take focus", () => {
    refusingBrowser();
    const a = field("a");
    a.input.focus();
    a.input.focus();
    expect(a.events).toEqual(["a:focus", "a:focusin"]);

    const div = document.createElement("div");
    document.body.appendChild(div);
    div.focus();
    expect(document.activeElement).toBe(a.input);

    const off = field("off");
    off.input.disabled = true;
    off.input.focus();
    expect(document.activeElement).toBe(a.input);
    expect(off.events).toEqual([]);
  });

  it("forgets an element that was removed from the page", () => {
    refusingBrowser();
    const a = field("a");
    a.input.focus();
    a.input.remove();
    expect(document.activeElement).toBe(document.body);
  });

  it("stays out of the way when the browser moves the focus itself", () => {
    installFocusEvents(view);
    const a = field("a");
    const b = field("b");
    a.input.focus();
    b.input.focus();
    expect(document.activeElement).toBe(b.input);
    // Every event once: the browser's own, none added.
    expect(a.events).toEqual(["a:focus", "a:focusin", "a:blur", "a:focusout"]);
    expect(b.events).toEqual(["b:focus", "b:focusin"]);
  });
});

describe("zero-delay timers that a hidden page cannot slow down", () => {
  const view = window as Window & typeof globalThis;
  const original = { setTimeout: view.setTimeout, clearTimeout: view.clearTimeout };

  afterEach(() => {
    view.setTimeout = original.setTimeout;
    view.clearTimeout = original.clearTimeout;
  });

  /** Gives the message channel time to deliver, on the real clock. */
  const tasks = () => new Promise<void>((resolve) => original.setTimeout(resolve, 15));

  it("runs a timer with no delay without the browser's timer", async () => {
    let nativeCalls = 0;
    view.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
      nativeCalls++;
      return original.setTimeout(...args);
    }) as typeof view.setTimeout;
    installFastTimers(view);

    const order: string[] = [];
    view.setTimeout(() => order.push("a"));
    view.setTimeout(() => order.push("b"), 0);
    view.setTimeout((x: string, y: string) => order.push(x + y), 0, "c", "d");
    // Still a task of its own: nothing has run in the same turn, nor after promises alone.
    expect(order).toEqual([]);
    await Promise.resolve();
    expect(order).toEqual([]);
    await tasks();
    expect(order).toEqual(["a", "b", "cd"]);
    expect(nativeCalls).toBe(0);
  });

  it("can be cancelled", async () => {
    installFastTimers(view);
    const order: string[] = [];
    const id = view.setTimeout(() => order.push("cancelled"), 0);
    view.setTimeout(() => order.push("kept"), 0);
    view.clearTimeout(id);
    await tasks();
    expect(order).toEqual(["kept"]);
  });

  it("leaves timers with a real delay to the browser", async () => {
    installFastTimers(view);
    const order: string[] = [];
    const slow = view.setTimeout(() => order.push("slow"), 20);
    view.setTimeout(() => order.push("fast"), 0);
    const cancelled = view.setTimeout(() => order.push("never"), 20);
    view.clearTimeout(cancelled);
    expect(Number(slow)).toBeGreaterThan(0);
    await tasks();
    expect(order).toEqual(["fast"]);
    await new Promise((resolve) => original.setTimeout(resolve, 60));
    expect(order).toEqual(["fast", "slow"]);
  });
});
