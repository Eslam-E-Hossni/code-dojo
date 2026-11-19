import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

const hookTests: TestCase[] = [
  {
    id: "debounce-first-value",
    name: "useDebounce gives the first value at once",
    part: "use-debounce",
    code: `
jest.useFakeTimers();
const { result } = renderHook(() => useDebounce("a", 300));
expect(result.current).toBe("a");`,
  },
  {
    id: "debounce-waits",
    name: "useDebounce gives a new value only after the delay",
    part: "use-debounce",
    code: `
jest.useFakeTimers();
const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: "a" } });
rerender({ value: "b" });
expect(result.current).toBe("a");
act(() => { jest.advanceTimersByTime(299); });
expect(result.current).toBe("a");
act(() => { jest.advanceTimersByTime(1); });
expect(result.current).toBe("b");`,
  },
  {
    id: "debounce-fast-changes",
    name: "useDebounce gives only the last value when the value changes fast",
    part: "use-debounce",
    code: `
jest.useFakeTimers();
const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: "a" } });
rerender({ value: "ab" });
act(() => { jest.advanceTimersByTime(200); });
expect(result.current).toBe("a");
rerender({ value: "abc" });
act(() => { jest.advanceTimersByTime(200); });
expect(result.current).toBe("a");
rerender({ value: "abcd" });
act(() => { jest.advanceTimersByTime(299); });
expect(result.current).toBe("a");
act(() => { jest.advanceTimersByTime(1); });
expect(result.current).toBe("abcd");`,
  },
  {
    id: "debounce-default-delay",
    name: "useDebounce waits 300 ms when no delay is given",
    part: "use-debounce",
    code: `
jest.useFakeTimers();
const { result, rerender } = renderHook(({ value }) => useDebounce(value), { initialProps: { value: "a" } });
rerender({ value: "b" });
act(() => { jest.advanceTimersByTime(299); });
expect(result.current).toBe("a");
act(() => { jest.advanceTimersByTime(1); });
expect(result.current).toBe("b");`,
  },
  {
    id: "debounce-delay-change",
    name: "useDebounce starts the wait again with the new delay when the delay changes",
    part: "use-debounce",
    code: `
jest.useFakeTimers();
const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
  initialProps: { value: "a", delay: 300 },
});
rerender({ value: "b", delay: 300 });
act(() => { jest.advanceTimersByTime(100); });
rerender({ value: "b", delay: 1000 });
act(() => { jest.advanceTimersByTime(800); });
expect(result.current).toBe("a");
act(() => { jest.advanceTimersByTime(200); });
expect(result.current).toBe("b");`,
  },
  {
    id: "debounce-same-value",
    name: "edge case: a new render with the same value does not start the wait again",
    part: "use-debounce",
    code: `
jest.useFakeTimers();
const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: "a" } });
rerender({ value: "b" });
act(() => { jest.advanceTimersByTime(200); });
rerender({ value: "b" });
act(() => { jest.advanceTimersByTime(100); });
expect(result.current).toBe("b");`,
  },
  {
    id: "debounce-empty-string",
    name: "edge case: an empty string is delayed like any other value",
    part: "use-debounce",
    code: `
jest.useFakeTimers();
const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: "ap" } });
rerender({ value: "" });
expect(result.current).toBe("ap");
act(() => { jest.advanceTimersByTime(300); });
expect(result.current).toBe("");`,
  },
  {
    id: "debounce-unmount",
    name: "edge case: useDebounce clears its timer on unmount",
    part: "use-debounce",
    code: `
jest.useFakeTimers();
const { rerender, unmount } = renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: "a" } });
rerender({ value: "b" });
unmount();
expect(jest.getTimerCount()).toBe(0);`,
  },
];

/**
 * How every Search test starts: fake time, and a fetch that keeps each call
 * and answers with a list. `type` changes the input, `wait` moves the time.
 */
const SEARCH_START = `
jest.useFakeTimers();
const requests = [];
jest.spyOn(global, "fetch").mockImplementation((url, options) => {
  requests.push({ url: String(url), signal: options ? options.signal : undefined });
  return Promise.resolve({ ok: true, status: 200, json: async () => ["apple", "apricot"] });
});
const aborted = (request) => Boolean(request.signal && request.signal.aborted);
const type = (value) => fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value } });
const wait = (ms) => act(() => { jest.advanceTimersByTime(ms); });`;

const searchTests: TestCase[] = [
  {
    id: "search-input",
    name: "Search shows an empty input that says Search while it is empty",
    part: "search",
    code: `${SEARCH_START}
render(<Search />);
const input = screen.getByPlaceholderText("Search");
expect(input.tagName).toBe("INPUT");
expect(input).toHaveValue("");`,
  },
  {
    id: "search-shows-typed",
    name: "the input shows every letter at once, before the delay ends",
    part: "search",
    code: `${SEARCH_START}
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
render(<Search />);
const input = screen.getByPlaceholderText("Search");
await user.type(input, "apple");
expect(input).toHaveValue("apple");
expect(requests).toHaveLength(0);`,
  },
  {
    id: "search-no-request-at-start",
    name: "nothing is fetched before the user types",
    part: "search",
    code: `${SEARCH_START}
render(<Search />);
wait(2000);
expect(requests).toHaveLength(0);`,
  },
  {
    id: "search-waits",
    name: "fetch is called 400 ms after the last change, with the text in the URL",
    part: "search",
    code: `${SEARCH_START}
render(<Search />);
type("ap");
wait(399);
expect(requests).toHaveLength(0);
wait(1);
expect(requests).toHaveLength(1);
expect(requests[0].url).toBe("/api/search?q=ap");`,
  },
  {
    id: "search-one-request",
    name: "typing fast makes one request, with the last text",
    part: "search",
    code: `${SEARCH_START}
render(<Search />);
type("a");
wait(200);
type("ap");
wait(200);
type("app");
wait(399);
expect(requests).toHaveLength(0);
wait(1);
expect(requests.map((request) => request.url)).toEqual(["/api/search?q=app"]);
wait(2000);
expect(requests).toHaveLength(1);`,
  },
  {
    id: "search-cleared",
    name: "edge case: an empty text makes no request",
    part: "search",
    code: `${SEARCH_START}
render(<Search />);
type("ap");
wait(400);
expect(requests).toHaveLength(1);
type("");
wait(2000);
expect(requests).toHaveLength(1);`,
  },
  {
    id: "search-url-encoded",
    name: "edge case: a space and an & in the text are encoded in the URL",
    part: "search",
    code: `${SEARCH_START}
render(<Search />);
type("red & blue");
wait(400);
expect(requests).toHaveLength(1);
// Read the URL back the way a server does. Without encoding, the text is cut at the &.
const sent = new URL(requests[0].url, "http://localhost");
expect(sent.pathname).toBe("/api/search");
expect(sent.searchParams.get("q")).toBe("red & blue");`,
  },
  {
    id: "search-abort-older",
    name: "the request of an older text is aborted when the text changes",
    part: "search",
    code: `${SEARCH_START}
render(<Search />);
type("ap");
wait(400);
expect(requests).toHaveLength(1);
expect(aborted(requests[0])).toBe(false);
type("app");
wait(400);
expect(requests).toHaveLength(2);
expect(aborted(requests[0])).toBe(true);
expect(aborted(requests[1])).toBe(false);`,
  },
  {
    id: "search-abort-unmount",
    name: "edge case: the open request is aborted on unmount",
    part: "search",
    code: `${SEARCH_START}
const { unmount } = render(<Search />);
type("ap");
wait(400);
expect(requests).toHaveLength(1);
expect(aborted(requests[0])).toBe(false);
unmount();
expect(aborted(requests[0])).toBe(true);`,
  },
];

const tests: TestCase[] = [...hookTests, ...searchTests];

function idsOf(part: string): string[] {
  const out: string[] = [];
  for (const test of tests) {
    if (test.part === part) out.push(test.id);
  }
  return out;
}

export const reactDebounceSearch: CodeProblem = {
  id: "react-debounce-search",
  kind: "code",
  group: "react",
  title: "Debounce with React (search input)",
  difficulty: "medium",
  tag: "reported",
  language: "jsx",
  api: ["useDebounce", "Search"],
  plainLoops: false,
  statement: "Build a search input that calls the API only after the user stops typing.",
  askFirst: ["What delay?", "Should an old request be cancelled?", "Minimum number of characters?"],
  edgeCases: [
    "Component unmounts before the timer fires",
    "An old response arrives after a new one",
    "Empty query",
  ],
  react: {
    risky: ["state-mutation", "list-key", "effect-cleanup"],
    preview: { console: true },
    screen: [
      "useDebounce(value, delay) gives the value back only after it has stopped changing for the delay. Without a delay it waits 300 ms.",
      'Search shows one input with the placeholder "Search", and the input shows each letter at once.',
      '400 ms after the last change, Search calls fetch("/api/search?q=" + the encoded text, { signal }). An empty text makes no request.',
      "The open request is aborted through its signal when the text changes and when Search unmounts.",
    ],
    tryIt: [
      "Type 'ap' fast: one result is logged, some time after you stop.",
      "Type more letters before the delay ends: still only one log, for the last text.",
      "Clear the input: nothing new is logged.",
      "Type a word that matches nothing: an empty array is logged.",
    ],
  },
  parts: [
    {
      id: "use-debounce",
      title: "useDebounce hook",
      signature: "useDebounce(value, delay)",
      steps: [
        line('import { useState, useEffect } from "react";', {
          coach:
            "Let's start, Islam. The hook keeps a delayed copy of a value and runs a timer, so we need two tools from React: one for state and one for side effects.",
          hint1: 'Import `useState` and `useEffect` from `"react"`.',
          explain: "I import useState for the delayed value and useEffect for the timer.",
        }),
        line("function useDebounce(value, delay = 300) {", {
          coach:
            "We need the hook itself. It takes the value that changes fast and the time to wait, and the wait is 300 ms when the caller gives none.",
          hint1: "A function called `useDebounce` with two parameters. The second one, `delay`, has a default value.",
          explain: "useDebounce takes a value and a delay, and the delay is 300 milliseconds by default.",
        }),
        line("  const [debounced, setDebounced] = useState(value);", {
          coach:
            "The hook must remember the delayed copy between renders. On the first render there is nothing to wait for, so the copy starts as the value we got.",
          hint1: "Call `useState` with `value` as the start, and take the state and its setter out of the array.",
          explain: "The debounced state holds the delayed copy, and its first value is the value itself.",
        }),
        line("  useEffect(() => {", {
          coach:
            "A timer is a side effect, so it does not belong in the render itself. We open the place where React runs side effects after a render.",
          hint1: "`useEffect` with an arrow function. Only open it here, the body comes next.",
          explain: "The effect is where the timer lives, and React runs it after the render.",
        }),
        line("    const id = setTimeout(() => setDebounced(value), delay);", {
          coach:
            "Inside the effect we start the wait: when the time is over, the copy gets the new value. We keep what the timer gives back, because we need it to cancel this timer.",
          hint1: "`setTimeout` with a callback that calls `setDebounced`, and `delay` as the time. Keep its return value in `id`.",
          explain: "A timer waits for the delay and then copies the value into the state, and I keep its id.",
        }),
        line("    return () => clearTimeout(id);", {
          coach:
            "This line makes the debounce. When the value changes again, the timer of the old value must not fire, so we give React a cleanup that cancels it.",
          hint1: "Return a function from the effect. Inside it, `clearTimeout` with `id`.",
          explain: "The cleanup clears the timer before the next effect and on unmount, so only the last value gets through.",
        }),
        line("  }, [value, delay]);", {
          coach: "We close the effect and tell React when to run it again: only when one of the two things the timer uses has changed.",
          hint1: "Close the callback, then the dependency array with `value` and `delay`.",
          explain: "The effect runs again only when the value or the delay changes.",
        }),
        line("  return debounced;\n}", {
          coach: "The caller needs the delayed copy, so we give it back and close the hook. Two lines.",
          hint1: "`return` the state `debounced`, then a closing brace.",
          explain: "The hook returns the delayed value.",
          checks: idsOf("use-debounce"),
        }),
      ],
    },
    {
      id: "search",
      title: "Search component",
      signature: "Search()",
      steps: [
        line("export default function Search() {", {
          coach: "Now the component that uses the hook. The preview and the tests import it, so it must be the default export.",
          hint1: "`export default function`, with the name `Search` and no props.",
          explain: "Search is the component with the input, and it is the default export.",
        }),
        line('  const [text, setText] = useState("");', {
          coach: "The input needs state for what the user types. This value changes on every key press.",
          hint1: "`useState` with an empty string. Take the value and its setter out of the array.",
          explain: "The text state holds what is in the input right now, and it starts as an empty string.",
        }),
        line("  const query = useDebounce(text, 400);", {
          coach:
            "We must not search on every key press. We need a second value that follows the text only after the user has stopped typing for 400 ms.",
          hint1: "Call `useDebounce` with `text` and the time in milliseconds, and keep the result in `query`.",
          explain: "query is the text, delayed by 400 milliseconds.",
        }),
        line("  useEffect(() => {", {
          coach: "The request to the API is a side effect. We open an effect for it, and it will depend on the delayed value.",
          hint1: "`useEffect` with an arrow function. Only open it here.",
          explain: "The request is made in an effect, not during the render.",
        }),
        line("    if (!query) return;", {
          coach: "First the edge case: when there is no search text, there is nothing to ask the API. We leave the effect early.",
          hint1: "An `if` that checks that `query` is empty, with a `return` on the same line.",
          explain: "An empty query makes no request, because the effect stops here.",
        }),
        line("    const controller = new AbortController();", {
          coach: "The user can type again while a request is still on its way. We need a tool that can cancel that request.",
          hint1: "Create an `AbortController` with `new` and keep it in `controller`.",
          explain: "An AbortController lets me cancel the request later.",
        }),
        line('    fetch("/api/search?q=" + encodeURIComponent(query), { signal: controller.signal })', {
          coach:
            "We send the request to `/api/search?q=` plus the search text, made safe for a URL, and we tie it to the `controller` so we can cancel it. The chain goes on in the next lines, so this line does not end yet.",
          hint1:
            "`fetch` with two arguments: the address plus `encodeURIComponent` of `query`, then an options object whose `signal` comes from `controller`. No semicolon at the end.",
          explain: "I call the API with the encoded query, and I pass the signal so the request can be aborted.",
        }),
        line("      .then((r) => r.json())", {
          coach: "The first link of the chain gets the response. Its body is still raw, so we ask for it as JSON.",
          hint1: "`.then` with a callback that returns the `json` of the response.",
          explain: "The first then reads the body of the response as JSON.",
        }),
        line("      .then(console.log)", {
          coach: "The next link gets the parsed result. In this exercise we only print it, and the print function itself can be the callback.",
          hint1: "A second `.then`. Pass `console.log` itself, without calling it.",
          explain: "The second then logs the result, because console.log is passed as the callback.",
        }),
        line("      .catch(() => {});", {
          coach:
            "An aborted request rejects its promise, and that is not a real problem here. We end the chain with a link that takes any error and does nothing with it.",
          hint1: "`.catch` with an arrow function that has an empty body. The chain ends here, so now the semicolon comes.",
          explain: "The catch ignores errors, because an aborted request rejects and that is expected.",
        }),
        line("    return () => controller.abort();", {
          coach:
            "When the delayed value changes or the component unmounts, the old request must not finish after a newer one. We give React a cleanup that cancels it.",
          hint1: "Return a function from the effect. Inside it, call `abort` on `controller`.",
          explain: "The cleanup aborts the old request, so an old response cannot arrive after a new one.",
        }),
        line("  }, [query]);", {
          coach: "We close the effect. It must run again only when the delayed value changes, not on every key press.",
          hint1: "Close the callback, then the dependency array with `query` in it.",
          explain: "The effect runs only when the delayed query changes.",
        }),
        line('  return <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search" />;', {
          coach:
            "Now the markup, one input on one line. It shows the fast state and updates it on every change, and it says Search while it is empty.",
          hint1:
            "A controlled `input`: `value` comes from `text`, and `onChange` gives `e.target.value` to `setText`. One more attribute holds the word Search for the empty input.",
          explain: "The input is controlled by text and not by query, so the user sees every letter at once.",
        }),
        line("}", {
          coach: "Last, we close the component.",
          hint1: "One closing brace.",
          explain: "The closing brace ends the Search component.",
          checks: idsOf("search"),
        }),
      ],
    },
  ],
  tests,
  complexity: "One timer per keystroke, cleared on the next one.",
  followUps: [
    {
      question: "Why abort the request?",
      answer: "To avoid a race: an old slow response must not replace a newer one.",
    },
    {
      question: "Hook or a plain debounce function?",
      answer: "The hook is simpler in React. A plain function must be kept stable with useRef or useMemo.",
    },
  ],
};
