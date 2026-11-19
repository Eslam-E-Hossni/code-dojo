import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

/** A hook draws nothing, so the preview adds a small page that uses it. */
const DEMO = `// ---- Demo: only for the preview. It is not part of the answer. ----
export default function Demo() {
  const [url, setUrl] = useState("/api/users");
  const { data, error, loading } = useFetch(url);

  return (
    <div>
      <div className="dojo-stage-bar">
        Fetch:
        <button onClick={() => setUrl("/api/users")}>/api/users</button>
        <button onClick={() => setUrl("/api/empty")}>/api/empty</button>
        <button onClick={() => setUrl("/api/broken")}>/api/broken</button>
      </div>
      <p>url: {url}</p>
      <p>loading: {String(loading)}</p>
      <p>error: {error ? error.message : "null"}</p>
      <pre>data: {JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}`;

/**
 * How every test starts: a fetch that keeps each call open until the test
 * ends it. Like the real fetch, an aborted request rejects with an AbortError.
 * `answer` and `fail` end a request and wait until the hook has taken the result.
 */
const START = `
const requests = [];
jest.spyOn(global, "fetch").mockImplementation((url, options) => {
  const request = { url: String(url), signal: options ? options.signal : undefined };
  const promise = new Promise((resolve, reject) => {
    request.resolve = resolve;
    request.reject = reject;
    if (request.signal) {
      request.signal.addEventListener("abort", () => reject(new DOMException("The operation was aborted.", "AbortError")));
    }
  });
  requests.push(request);
  return promise;
});
const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const notOk = (status) => ({ ok: false, status, json: async () => ({ message: "No such page" }) });
const aborted = (request) => Boolean(request.signal && request.signal.aborted);
const answer = (request, response) => act(async () => { request.resolve(response); });
const fail = (request, error) => act(async () => { request.reject(error); });`;

const tests: TestCase[] = [
  {
    id: "loading-then-data",
    name: "loading is true at first, then the data comes and loading is false",
    code: `${START}
const users = [{ id: 1, name: "Leanne" }, { id: 2, name: "Ervin" }];
const { result } = renderHook(() => useFetch("/api/users"));
expect(requests).toHaveLength(1);
expect(requests[0].url).toBe("/api/users");
expect(result.current.loading).toBe(true);
expect(result.current.data).toBeNull();
expect(result.current.error).toBeNull();
await answer(requests[0], ok(users));
expect(result.current.data).toEqual(users);
expect(result.current.error).toBeNull();
expect(result.current.loading).toBe(false);
// One request per URL: the new state must not start the request again.
expect(requests).toHaveLength(1);`,
  },
  {
    id: "empty-list",
    name: "edge case: an empty list is data, not an error",
    code: `${START}
const { result } = renderHook(() => useFetch("/api/empty"));
expect(requests).toHaveLength(1);
await answer(requests[0], ok([]));
expect(result.current.data).toEqual([]);
expect(result.current.error).toBeNull();
expect(result.current.loading).toBe(false);`,
  },
  {
    id: "http-error",
    name: "edge case: a status that is not ok gives an error with the status in it",
    code: `${START}
const { result } = renderHook(() => useFetch("/api/broken"));
expect(requests).toHaveLength(1);
await answer(requests[0], notOk(404));
expect(result.current.error).toBeInstanceOf(Error);
expect(result.current.error.message).toContain("404");
expect(result.current.data).toBeNull();
expect(result.current.loading).toBe(false);`,
  },
  {
    id: "network-error",
    name: "a network error gives an error and loading is false",
    code: `${START}
const { result } = renderHook(() => useFetch("/api/users"));
expect(requests).toHaveLength(1);
await fail(requests[0], new TypeError("Failed to fetch"));
expect(result.current.error).toBeInstanceOf(Error);
expect(result.current.error.message).toBe("Failed to fetch");
expect(result.current.data).toBeNull();
expect(result.current.loading).toBe(false);`,
  },
  {
    id: "refetch-on-url-change",
    name: "a new URL starts a new request, and loading is true again",
    code: `${START}
const { result, rerender } = renderHook(({ url }) => useFetch(url), { initialProps: { url: "/api/users" } });
await answer(requests[0], ok(["Leanne"]));
expect(result.current.loading).toBe(false);
rerender({ url: "/api/posts" });
expect(requests).toHaveLength(2);
expect(requests[1].url).toBe("/api/posts");
expect(result.current.loading).toBe(true);
await answer(requests[1], ok(["First post"]));
expect(result.current.data).toEqual(["First post"]);
expect(result.current.loading).toBe(false);`,
  },
  {
    id: "error-cleared",
    name: "the old error is cleared when the URL changes",
    code: `${START}
const { result, rerender } = renderHook(({ url }) => useFetch(url), { initialProps: { url: "/api/broken" } });
await answer(requests[0], notOk(404));
expect(result.current.error).toBeInstanceOf(Error);
rerender({ url: "/api/users" });
expect(result.current.error).toBeNull();
await answer(requests[1], ok(["Leanne"]));
expect(result.current.data).toEqual(["Leanne"]);
expect(result.current.error).toBeNull();
expect(result.current.loading).toBe(false);`,
  },
  {
    id: "abort-on-url-change",
    name: "edge case: the URL changes fast: the old request is aborted and the last URL wins",
    code: `${START}
const { result, rerender } = renderHook(({ url }) => useFetch(url), { initialProps: { url: "/api/slow" } });
await act(async () => { rerender({ url: "/api/fast" }); });
expect(requests).toHaveLength(2);
await answer(requests[1], ok(["fast"]));
// The slow answer of the old URL comes last. An aborted request has already dropped it.
await answer(requests[0], ok(["slow"]));
expect(result.current.data).toEqual(["fast"]);
expect(result.current.loading).toBe(false);
expect(aborted(requests[0])).toBe(true);
expect(aborted(requests[1])).toBe(false);`,
  },
  {
    id: "abort-not-error",
    name: "edge case: an aborted request does not set an error",
    code: `${START}
const { result, rerender } = renderHook(({ url }) => useFetch(url), { initialProps: { url: "/api/slow" } });
await act(async () => { rerender({ url: "/api/fast" }); });
expect(requests).toHaveLength(2);
expect(result.current.error).toBeNull();
await answer(requests[1], ok(["fast"]));
expect(result.current.error).toBeNull();
expect(result.current.data).toEqual(["fast"]);`,
  },
  {
    id: "abort-on-unmount",
    name: "edge case: unmount before the answer aborts the request",
    code: `${START}
const { unmount } = renderHook(() => useFetch("/api/users"));
expect(requests).toHaveLength(1);
expect(aborted(requests[0])).toBe(false);
await act(async () => { unmount(); });
expect(aborted(requests[0])).toBe(true);`,
  },
];

export const reactUseFetch: CodeProblem = {
  id: "react-use-fetch",
  kind: "code",
  group: "react",
  title: "React: useFetch hook",
  difficulty: "medium",
  tag: "likely",
  language: "jsx",
  api: ["useFetch"],
  plainLoops: false,
  statement: "Write a custom hook that fetches a URL and returns data, loading and error.",
  askFirst: ["Should it refetch when the URL changes?", "Should it cancel the old request?"],
  edgeCases: ["URL changes fast: race between responses", "HTTP error status", "Unmount before the response"],
  react: {
    risky: ["state-mutation", "list-key", "effect-cleanup"],
    preview: { tail: DEMO },
    screen: [
      "useFetch(url) returns an object with data, error and loading.",
      "Every request starts with loading true and error null, also after the URL changes. data is null before the first answer.",
      'A status that is not ok gives an Error with the status in its message, like "HTTP 404". A network error is an Error in error too.',
      "fetch gets { signal } as its second argument. The request is aborted when the URL changes and on unmount, and that abort does not set error.",
    ],
    tryIt: [
      "/api/users: loading is true first, then data shows five users.",
      "/api/empty: data is an empty array, and error is null.",
      "/api/broken: error shows HTTP 404.",
      "After an error, /api/users works again and the error is cleared.",
      "Click two URLs fast: the data on screen belongs to the last URL.",
    ],
  },
  parts: [
    {
      id: "main",
      title: "useFetch",
      signature: "useFetch(url)",
      steps: [
        line('import { useState, useEffect } from "react";', {
          coach:
            "Let's start, Islam. The hook keeps a result and a status and it sends a request, so we need two tools from React: one for state and one for side effects.",
          hint1: 'Import `useState` and `useEffect` from `"react"`.',
          explain: "I import useState for the result and useEffect for the request.",
        }),
        line("function useFetch(url) {", {
          coach: "We need the hook itself. It takes the address to load.",
          hint1: "A function called `useFetch` with one parameter, `url`.",
          explain: "useFetch takes the URL to load.",
        }),
        line("  const [data, setData] = useState(null);", {
          coach: "The caller wants three things back. The first is the result, and before the answer comes there is none.",
          hint1: "`useState` that starts with `null`. Take the value and its setter out of the array.",
          explain: "data starts as null, because nothing is loaded yet.",
        }),
        line("  const [error, setError] = useState(null);", {
          coach: "The second thing is the error, for a request that fails. At the start nothing has failed.",
          hint1: "The same pattern with `useState` and `null`, this time for `error` and `setError`.",
          explain: "error is state too, and null means that there is no error.",
        }),
        line("  const [loading, setLoading] = useState(true);", {
          coach:
            "The third thing tells the caller if we are still waiting. The request starts as soon as the hook runs, so we are waiting from the first render.",
          hint1: "`useState` again, and this one starts with `true`.",
          explain: "loading starts as true, because the request starts at once.",
        }),
        line("  useEffect(() => {", {
          coach: "The request is a side effect, so it does not belong in the render itself. We open an effect for it.",
          hint1: "`useEffect` with an arrow function. Only open it here.",
          explain: "The request is made in an effect, after the render.",
        }),
        line("    const controller = new AbortController();", {
          coach:
            "The URL can change, or the component can unmount, while a request is still on its way. We need a tool that can cancel that request.",
          hint1: "Create an `AbortController` with `new` and keep it in `controller`.",
          explain: "An AbortController lets me cancel the request later.",
        }),
        line("    setLoading(true);", {
          coach:
            "This effect also runs when the URL changes later, and by then the request before it has turned the waiting state off. A new request means we wait again.",
          hint1: "Call `setLoading` with `true`.",
          explain: "A new request starts, so loading is true again.",
        }),
        line("    setError(null);", {
          coach: "The request before this one may have failed. That old error says nothing about the new request, so we remove it.",
          hint1: "Call `setError` with `null`.",
          explain: "I clear the error of the last request.",
        }),
        line("    fetch(url, { signal: controller.signal })", {
          coach:
            "Now we send the request and tie it to the `controller`, so we can cancel it. The chain goes on in the next lines, so this line does not end yet.",
          hint1: "`fetch` with `url` and an options object whose `signal` comes from `controller`. No semicolon at the end.",
          explain: "I call fetch with the URL, and I pass the signal so the request can be aborted.",
        }),
        line("      .then((res) => {", {
          coach: "The first link of the chain gets the response. We have two things to do with it, so its callback needs a body.",
          hint1: "`.then` with an arrow function that takes `res` and opens a block.",
          explain: "The first then gets the response object.",
        }),
        line('        if (!res.ok) throw new Error("HTTP " + res.status);', {
          coach:
            "Careful: `fetch` does not reject for a 404 or a 500. We must check the response ourselves and throw an error that carries the status, so the chain jumps to its error handler.",
          hint1: '`res.ok` is false for a bad status. `throw` a `new Error` whose message is `"HTTP "` plus `res.status`.',
          explain: "fetch does not reject on a 404, so I check res.ok and throw an error with the status myself.",
        }),
        line("        return res.json();\n      })", {
          coach: "A good response goes on: we give its body back as JSON for the next link, and we close this callback. Two lines.",
          hint1: "`return` the `json` of `res`, then close the block and the call on the next line. No semicolon, the chain goes on.",
          explain: "If the response is fine, I return its JSON to the next then.",
        }),
        line("      .then(setData)", {
          coach: "The next link gets the parsed data, and we keep it in state. The setter itself can be the callback.",
          hint1: "A second `.then`. Pass `setData` itself, without calling it.",
          explain: "The parsed data goes into state, because setData is passed as the callback.",
        }),
        line("      .catch((err) => {", {
          coach: "A failed request, or the error we threw, lands in the next link. We open the error handler of the chain.",
          hint1: "`.catch` with an arrow function that takes `err` and opens a block.",
          explain: "catch handles a failed request and the error I threw.",
        }),
        line('        if (err.name !== "AbortError") setError(err);\n      })', {
          coach:
            "When we cancel a request ourselves, it lands here as an error named `AbortError`, so we keep the error in state only when it is not that one, and we close the handler. Two lines.",
          hint1: 'Compare `err.name` with `"AbortError"`. Only when they differ, call `setError` with `err`. Then close the block and the call.',
          explain: "An abort is not a real error, so I skip it and put every other error into state.",
        }),
        line("      .finally(() => setLoading(false));", {
          coach: "The request is over, with data or with an error. In both cases we are not waiting any more, and the chain ends here.",
          hint1: "`.finally` runs after success and after failure. Call `setLoading` with `false` in it.",
          explain: "finally runs in both cases and turns loading off.",
        }),
        line("    return () => controller.abort();", {
          coach:
            "When the URL changes or the component unmounts, the old request must not write into state any more. We give React a cleanup that cancels it.",
          hint1: "Return a function from the effect. Inside it, call `abort` on `controller`.",
          explain: "The cleanup aborts the request, and that solves the race and the update after unmount.",
        }),
        line("  }, [url]);", {
          coach: "We close the effect. A new URL needs a new request, so the effect depends on the URL.",
          hint1: "Close the callback, then the dependency array with `url` in it.",
          explain: "The effect runs again when the URL changes.",
        }),
        line("  return { data, error, loading };\n}", {
          coach: "The caller gets the three values together in one object, and we close the hook. Two lines.",
          hint1: "`return` an object with `data`, `error` and `loading`, then a closing brace.",
          explain: "The hook returns data, error and loading in one object.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "One request per URL change.",
  followUps: [
    {
      question: "What problem does the abort solve?",
      answer: "A race condition: an old response replacing a newer one, and a state update after unmount.",
    },
    {
      question: "When the URL changes fast, loading can be false for a moment. Why, and how do you fix it?",
      answer:
        "The aborted request still runs its finally, and that sets loading to false while the new request is waiting. I turn loading off only when the request was not aborted: I check controller.signal.aborted first.",
    },
    {
      question: "How would you add caching?",
      answer: "I keep a Map from URL to data outside the hook, and I return the cached value before fetching.",
    },
  ],
};
