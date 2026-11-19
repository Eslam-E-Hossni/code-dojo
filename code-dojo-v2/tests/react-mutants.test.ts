// @vitest-environment jsdom
/**
 * Do the hidden tests of the React problems really test?
 *
 * Each case below breaks the reference solution in one way that an
 * interviewer would notice: a missing cleanup, a stale value, a wrong
 * item removed. At least one hidden test must fail on it.
 */
import { describe, expect, it } from "vitest";
import { getProblem } from "@/data/problems";
import type { CodeProblem } from "@/data/types";
import { solutionText } from "@/lib/checker/check";
import { bannedIn } from "@/lib/practice";
import { runReactTests } from "./helpers";

interface Mutant {
  problem: string;
  name: string;
  /** Text of the reference, and what it becomes. */
  from: string;
  to: string;
}

const MUTANTS: Mutant[] = [
  // Timer
  { problem: "react-timer", name: "the interval is never cleared", from: "    return () => clearInterval(intervalRef.current);\n", to: "" },
  { problem: "react-timer", name: "Reset does not stop the timer", from: "    setRunning(false);\n    setSeconds(0);", to: "    setSeconds(0);" },
  { problem: "react-timer", name: "the callback reads a stale value", from: "setSeconds((s) => s + 1);", to: "setSeconds(seconds + 1);" },
  { problem: "react-timer", name: "Start is never disabled", from: " disabled={running}>Start", to: ">Start" },
  { problem: "react-timer", name: "the seconds are not padded", from: 'String(seconds % 60).padStart(2, "0")', to: "String(seconds % 60)" },
  { problem: "react-timer", name: "minutes are not split from seconds", from: "seconds % 60", to: "seconds" },

  // Auto counter
  { problem: "react-auto-counter", name: "the interval is never cleared", from: "    return () => clearInterval(intervalRef.current);\n", to: "" },
  { problem: "react-auto-counter", name: "the effect does not follow the step", from: "  }, [step]);", to: "  }, []);" },
  { problem: "react-auto-counter", name: "it always counts up", from: "setCount((c) => c + step);", to: "setCount((c) => c + 1);" },
  { problem: "react-auto-counter", name: "Stop does nothing", from: "onClick={() => setStep(0)}", to: "onClick={() => {}}" },

  // Todos
  { problem: "react-todos", name: "an empty text is added", from: "    if (!text.trim()) return;\n", to: "" },
  { problem: "react-todos", name: "the input is not cleared", from: '    setText("");\n', to: "" },
  { problem: "react-todos", name: "Delete removes the other items", from: "t.id !== id", to: "t.id === id" },
  { problem: "react-todos", name: "the checkbox marks every item", from: "(t.id === id ? { ...t, done: !t.done } : t)", to: "({ ...t, done: !t.done })" },
  { problem: "react-todos", name: "the form reloads the page", from: "    e.preventDefault();\n", to: "" },

  // Wizard
  { problem: "react-wizard", name: "a step is not validated", from: "    if (message) return setError(message);\n", to: "" },
  { problem: "react-wizard", name: "Back loses the typed values", from: 'setError(""); setIndex(index - 1);', to: 'setError(""); setValues({ name: "", email: "" }); setIndex(index - 1);' },
  { problem: "react-wizard", name: "Back keeps the old error", from: 'onClick={() => { setError(""); setIndex(index - 1); }}', to: "onClick={() => { setIndex(index - 1); }}" },
  { problem: "react-wizard", name: "onSubmit is called on the first step", from: "    if (isLast) onSubmit(values);\n    else setIndex(index + 1);", to: "    onSubmit(values);\n    if (!isLast) setIndex(index + 1);" },
  { problem: "react-wizard", name: "aria-invalid never changes", from: 'aria-invalid={error ? "true" : "false"}', to: 'aria-invalid="false"' },
  { problem: "react-wizard", name: "the error stays after a valid step", from: '    setError("");\n    if (isLast)', to: "    if (isLast)" },

  // useDebounce + Search
  { problem: "react-debounce-search", name: "the timeout is never cleared", from: "    return () => clearTimeout(id);\n", to: "" },
  { problem: "react-debounce-search", name: "the default delay is wrong", from: "delay = 300", to: "delay = 100" },
  { problem: "react-debounce-search", name: "the request is never aborted", from: "    return () => controller.abort();\n", to: "" },
  { problem: "react-debounce-search", name: "the text is not encoded", from: "encodeURIComponent(query)", to: "query" },
  { problem: "react-debounce-search", name: "an empty text is searched", from: "    if (!query) return;\n", to: "" },
  { problem: "react-debounce-search", name: "the search is not debounced", from: "const query = useDebounce(text, 400);", to: "const query = text;" },

  // useFetch
  { problem: "react-use-fetch", name: "the request is never aborted", from: "    return () => controller.abort();\n", to: "" },
  { problem: "react-use-fetch", name: "an abort is shown as an error", from: 'if (err.name !== "AbortError") setError(err);', to: "setError(err);" },
  { problem: "react-use-fetch", name: "a bad status is not an error", from: '        if (!res.ok) throw new Error("HTTP " + res.status);\n', to: "" },
  { problem: "react-use-fetch", name: "loading is not set again", from: "    setLoading(true);\n", to: "" },
  { problem: "react-use-fetch", name: "the old error is kept", from: "    setError(null);\n", to: "" },
  { problem: "react-use-fetch", name: "a new URL is not fetched", from: "  }, [url]);", to: "  }, []);" },
  { problem: "react-use-fetch", name: "loading never ends", from: "      .finally(() => setLoading(false));", to: "      .finally(() => {});" },

  // Context
  { problem: "react-use-context", name: "the hook does not throw outside the provider", from: '  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");\n', to: "" },
  { problem: "react-use-context", name: "the theme never goes back to light", from: '(t === "light" ? "dark" : "light")', to: '"dark"' },
  { problem: "react-use-context", name: "the value is a new object on every render", from: "    [theme]\n", to: "    [theme, {}]\n" },
  { problem: "react-use-context", name: "the button does not toggle", from: "<button onClick={toggle}>", to: "<button>" },
  { problem: "react-use-context", name: "the provider drops its children", from: "{children}</ThemeContext.Provider>", to: "</ThemeContext.Provider>" },

  // Users table
  { problem: "react-users-table", name: "a bad status is not an error", from: '        if (!res.ok) throw new Error("HTTP " + res.status);\n', to: "" },
  { problem: "react-users-table", name: "an empty list shows an empty table", from: "  if (users.length === 0) return <p>No users.</p>;\n", to: "" },
  { problem: "react-users-table", name: "the request is never aborted", from: "    return () => controller.abort();\n", to: "" },
  { problem: "react-users-table", name: "the error has no alert role", from: '<p role="alert">Could not load users.</p>', to: "<p>Could not load users.</p>" },
  { problem: "react-users-table", name: "loading never ends on an error", from: 'if (err.name !== "AbortError") setStatus("error");', to: "" },
  { problem: "react-users-table", name: "the email column is missing", from: "            <td>{u.email}</td>\n", to: "" },

  // Review: the bugs of the original, put back one at a time
  { problem: "react-review", name: "the listener is never removed", from: '    return () => window.removeEventListener("resize", onResize);\n', to: "" },
  { problem: "react-review", name: "the search cares about upper and lower case", from: "u.name.toLowerCase().includes(q)", to: "u.name.includes(query)" },
  { problem: "react-review", name: "nothing is said for an empty result", from: "filtered.length === 0 ? (", to: "false ? (" },
  { problem: "react-review", name: "the click is on a div", from: '<button type="button" onClick={() => onSelect(u)}>{u.name}</button>', to: "<div onClick={() => onSelect(u)}>{u.name}</div>" },
  { problem: "react-review", name: "the input has no label", from: '      <label htmlFor="q">Search users</label>\n', to: "" },
  { problem: "react-review", name: "the list ignores a new users prop", from: "  }, [users, query]);", to: "  }, [query]);" },
];

function problemOf(id: string): CodeProblem {
  const problem = getProblem(id);
  if (problem === undefined || problem.kind !== "code") throw new Error("No code problem " + id);
  return problem;
}

describe("a broken React solution fails at least one hidden test", () => {
  it.each(MUTANTS)("$problem: $name", async (mutant) => {
    const problem = problemOf(mutant.problem);
    const reference = solutionText(problem);
    expect(reference, "the reference has the text to break").toContain(mutant.from);
    const broken = reference.replace(mutant.from, mutant.to);
    const report = await runReactTests(problem, broken, problem.tests);
    expect(report.passed, "every hidden test passed on the broken code").toBeLessThan(problem.tests.length);
  }, 30_000);
});

describe("what the tests cannot see is caught by the risky rules", () => {
  it("todos: pushing into the state array still shows the item, and is refused with its reason", () => {
    const problem = problemOf("react-todos");
    const pushed = solutionText(problem).replace(
      "setTodos((list) => [...list, { id: crypto.randomUUID(), text, done: false }]);",
      "todos.push({ id: crypto.randomUUID(), text, done: false });\n    setTodos(todos);",
    );
    expect(pushed).toContain("todos.push");
    const found = bannedIn(problem, pushed);
    expect(found).not.toBeNull();
    expect(found?.message).toContain("`push`");
  });

  it("review: the component as it is given loops, and one of its risky patterns is named", async () => {
    const problem = problemOf("react-review");
    const starter = problem.react?.starter ?? "";
    const report = await runReactTests(problem, starter, problem.tests);
    expect(report.passed).toBe(0);
    expect(report.failures[0].message).toContain("Render loop");
    expect(bannedIn(problem, starter)).not.toBeNull();
  }, 30_000);
});
