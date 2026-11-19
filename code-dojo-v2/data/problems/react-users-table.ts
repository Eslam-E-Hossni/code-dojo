import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

/**
 * The preview has no real server. Three buttons choose what the API
 * answers, so every state of the table can be seen.
 */
const STAGE = `import { useState } from "react";

const SCENARIOS = ["data", "empty", "error"];

export function Stage({ Solution }) {
  const [scenario, setScenario] = useState("data");
  const [round, setRound] = useState(0);

  function choose(name) {
    window.__dojoScenario = name;
    setScenario(name);
    // A new key mounts the component again, so it fetches again.
    setRound((n) => n + 1);
  }

  return (
    <>
      <div className="dojo-stage-bar">
        The API answers with:
        {SCENARIOS.map((name) => (
          <button key={name} onClick={() => choose(name)} aria-pressed={scenario === name}>
            {name}
          </button>
        ))}
      </div>
      <Solution key={round} />
    </>
  );
}
`;

/** The answer of the API in the tests that need users. */
const USERS = `const users = [
  { id: 1, name: "Leanne Graham", email: "leanne@example.com" },
  { id: 2, name: "Ervin Howell", email: "ervin@example.com" },
  { id: 3, name: "Clementine Bauch", email: "clementine@example.com" },
];`;

const tests: TestCase[] = [
  {
    id: "loading-first",
    name: "shows Loading... first, and no table yet",
    code: `
// A request that never answers: the component stays in its first state.
jest.spyOn(global, "fetch").mockImplementation(() => new Promise(() => {}));
render(<UsersTable />);
expect(screen.getByText("Loading...")).toBeInTheDocument();
expect(screen.queryByRole("table")).not.toBeInTheDocument();
expect(screen.queryByRole("alert")).not.toBeInTheDocument();`,
  },
  {
    id: "one-row-per-user",
    name: "after the data comes, shows a table with one row per user, with name and email",
    code: `
${USERS}
jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => users });
render(<UsersTable />);
const table = await screen.findByRole("table");
expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
// The header row, then one row per user, in the order of the API.
const rows = within(table).getAllByRole("row");
expect(rows).toHaveLength(users.length + 1);
for (let i = 0; i < users.length; i++) {
  expect(rows[i + 1]).toHaveTextContent(users[i].name);
  expect(rows[i + 1]).toHaveTextContent(users[i].email);
}`,
  },
  {
    id: "caption-and-headers",
    name: "the table has the caption Users and the column headers Name and Email",
    code: `
${USERS}
jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => users });
render(<UsersTable />);
// The caption is the name of the table.
const table = await screen.findByRole("table", { name: "Users" });
const headers = within(table).getAllByRole("columnheader");
expect(headers.map((header) => header.textContent)).toEqual(["Name", "Email"]);`,
  },
  {
    id: "empty-list",
    name: "edge case: an empty list shows No users. and no table",
    code: `
jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => [] });
render(<UsersTable />);
expect(await screen.findByText("No users.")).toBeInTheDocument();
expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
expect(screen.queryByRole("table")).not.toBeInTheDocument();
expect(screen.queryByRole("alert")).not.toBeInTheDocument();`,
  },
  {
    id: "http-error",
    name: "edge case: a response that is not ok, like HTTP 500, shows the error with the alert role",
    code: `
${USERS}
// fetch does not reject here: the response comes, with ok set to false.
jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 500, json: async () => users });
render(<UsersTable />);
const alert = await screen.findByRole("alert");
expect(alert).toHaveTextContent("Could not load users.");
expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
expect(screen.queryByRole("table")).not.toBeInTheDocument();`,
  },
  {
    id: "network-error",
    name: "edge case: a request that fails shows the same error",
    code: `
jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
render(<UsersTable />);
const alert = await screen.findByRole("alert");
expect(alert).toHaveTextContent("Could not load users.");
expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
expect(screen.queryByRole("table")).not.toBeInTheDocument();`,
  },
  {
    id: "url-once",
    name: "asks for the users URL, and only once",
    code: `
${USERS}
const spy = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => users });
const { rerender } = render(<UsersTable />);
await screen.findByRole("table");
// A new render must not start a new request.
rerender(<UsersTable />);
expect(await screen.findByRole("table")).toBeInTheDocument();
expect(spy).toHaveBeenCalledTimes(1);
expect(String(spy.mock.calls[0][0])).toBe("https://jsonplaceholder.typicode.com/users");`,
  },
  {
    id: "abort-on-unmount",
    name: "edge case: the request is aborted when the component unmounts before the response",
    code: `
let signal;
jest.spyOn(global, "fetch").mockImplementation((url, options) => {
  signal = options && options.signal;
  return new Promise(() => {});
});
const { unmount } = render(<UsersTable />);
// The request got a signal, and it is still running.
expect(signal).toBeDefined();
expect(signal.aborted).toBe(false);
unmount();
expect(signal.aborted).toBe(true);`,
  },
  {
    id: "abort-no-error",
    name: "edge case: an aborted request does not show the error",
    code: `
// Like the real fetch: the promise rejects with an AbortError when its signal is aborted.
jest.spyOn(global, "fetch").mockImplementation((url, options) => {
  return new Promise((resolve, reject) => {
    const signal = options && options.signal;
    if (!signal) return;
    signal.addEventListener("abort", () => reject(new DOMException("The operation was aborted.", "AbortError")));
  });
});
// StrictMode runs the effect, its cleanup and the effect again. So the first
// request is aborted while the component is still on the page.
render(
  <React.StrictMode>
    <UsersTable />
  </React.StrictMode>,
);
await act(async () => {});
expect(screen.queryByRole("alert")).not.toBeInTheDocument();
expect(screen.getByText("Loading...")).toBeInTheDocument();`,
  },
];

export const reactUsersTable: CodeProblem = {
  id: "react-users-table",
  kind: "code",
  group: "react",
  title: "Fetch data and show it in a table",
  difficulty: "medium",
  tag: "reported",
  language: "jsx",
  api: ["UsersTable"],
  plainLoops: false,
  statement: "Call an API and show the result in an HTML table.",
  askFirst: ["Which fields should I show?", "Do you want loading and error states?", "Is there pagination?"],
  edgeCases: [
    "Request fails or returns a non-200 status",
    "Empty list",
    "Component unmounts before the response",
  ],
  react: {
    risky: ["state-mutation", "list-key", "effect-cleanup"],
    preview: { stage: STAGE },
    screen: [
      'The text "Loading..." until the answer comes',
      'A table with the caption "Users", the column headers "Name" and "Email", and one row per user with the name and the email',
      'The text "No users." and no table for an empty list',
      'The text "Could not load users." with role="alert" when the request fails or the response is not ok',
      'One request to "https://jsonplaceholder.typicode.com/users" with a signal: it is aborted on unmount, and an aborted request shows no error',
    ],
    tryIt: [
      "data: Loading... shows first, then a table with five users.",
      "The table has a caption and two column headers.",
      "empty: it shows No users.",
      "error: it shows Could not load users.",
      "Switch fast between the three: the screen always matches the last choice.",
    ],
  },
  parts: [
    {
      id: "main",
      title: "UsersTable",
      signature: "UsersTable()",
      steps: [
        line('import { useEffect, useState } from "react";', {
          coach: "Let's start, Islam. We need an effect to load the data, and state to hold the result and the status of the request.",
          hint1: 'Import `useEffect` and `useState` from `"react"`. The order does not matter.',
          explain: "I import useEffect for the request and useState for the result.",
        }),
        line("export default function UsersTable() {", {
          coach: "We need the component itself. The preview and the tests import it, so it must be the default export.",
          hint1: "`export default function`, with the name `UsersTable` and no props.",
          explain: "UsersTable is a function component with no props, and it is the default export.",
        }),
        line("  const [users, setUsers] = useState([]);", {
          coach: "The first state holds the list of users. It starts empty, because nothing is loaded yet.",
          hint1: "Call `useState` with an empty array, and take the value and its setter out of the array it gives back.",
          explain: "The users are state, and the list starts as an empty array.",
        }),
        line('  const [status, setStatus] = useState("loading"); // loading | error | done', {
          coach:
            "The second state says where the request is: loading, error or done. We use one value and not several booleans, because two booleans can be true together by mistake.",
          hint1: 'Call `useState` with `"loading"`. A short comment at the end of the line can list the three values.',
          explain: "One status value holds loading, error or done, so two states can never be true at the same time.",
        }),
        line("  useEffect(() => {", {
          coach: "Loading data is a side effect, so it does not belong in the render itself. We open an effect that runs after the component shows up.",
          hint1: "Call `useEffect` and open an arrow function with no parameters.",
          explain: "The request is made inside an effect, after the first render.",
        }),
        line("    const controller = new AbortController();", {
          coach: "The component can unmount before the response arrives. So we prepare the tool that can cancel the request in that case.",
          hint1: "`new AbortController()` gives an object with a `signal` and an `abort` method.",
          explain: "An AbortController lets me cancel the request when the component unmounts.",
        }),
        line("    async function load() {", {
          coach:
            "The callback of an effect cannot be async, because React expects it to return a cleanup and not a promise. So we write an async function inside it, to use `await`.",
          hint1: "An `async function` with the name `load` and no parameters.",
          explain: "The effect callback cannot be async, so I declare an async function inside it.",
        }),
        line("      try {", {
          coach: "The request can fail, so the risky code goes in a block that lets us catch the failure.",
          hint1: "The `try` keyword and an opening brace.",
          explain: "Everything that can throw goes inside this try block.",
        }),
        line('        const res = await fetch("https://jsonplaceholder.typicode.com/users", {', {
          coach:
            "Now we send the request to the users URL that the task shows, and we wait for the response. The options object comes on the next line, so here we only open it.",
          hint1: "`await` the call to `fetch`. The first argument is the users URL as a string, then a comma and an opening brace for the options.",
          explain: "I call fetch with the users URL and wait for the response.",
        }),
        line("          signal: controller.signal,\n        });", {
          coach: "The request must know about our controller, or the controller cannot cancel it, and then we close the call. Two lines.",
          hint1: "The `signal` option gets `controller.signal`. Then close the object and the call on the next line.",
          explain: "I pass the signal of the controller, so this request can be aborted.",
        }),
        line('        if (!res.ok) throw new Error("HTTP " + res.status);', {
          coach:
            "Careful here: `fetch` does not fail for a 404 or a 500, it only fails when the network fails. So we check the response ourselves and throw an error with the status code.",
          hint1: 'An `if` on `res.ok` being false, then `throw new Error` with the text "HTTP " and `res.status` after it.',
          explain: "fetch does not reject on a 404, so I check res.ok and throw the error myself.",
        }),
        line("        setUsers(await res.json());", {
          coach: "The response is good, so we read its body as JSON and store it as the list of users.",
          hint1: "`res.json()` returns a promise, so `await` it inside the call to `setUsers`.",
          explain: "I parse the body as JSON and store the result in the users state.",
        }),
        line('        setStatus("done");', {
          coach: "The data is in state now, so the status must say that the request is finished.",
          hint1: 'Call `setStatus` with `"done"`.',
          explain: "The status becomes done, so the component leaves the loading text.",
        }),
        line("      } catch (err) {", {
          coach: "Now the other path: we close the first block and catch whatever went wrong in it.",
          hint1: "A closing brace, then `catch` with one parameter, and an opening brace.",
          explain: "The catch block gets every error from the request, the status check and the parsing.",
        }),
        line('        if (err.name !== "AbortError") setStatus("error");', {
          coach:
            "Our own cancel also arrives here, as an error with the name `AbortError`, and that is not a real failure. So we set the error status only for every other error.",
          hint1: 'Compare `err.name` with `"AbortError"` in an `if`, and call `setStatus` with `"error"` only when they differ.',
          explain: "An abort is not a real error, so only other errors set the status to error.",
        }),
        line("      }\n    }", {
          coach: "We close the catch block, and then the async function. Two lines.",
          hint1: "Two closing braces, each on its own line.",
          explain: "The first brace ends the catch block and the second ends load.",
        }),
        line("    load();", {
          coach: "So far the function is only declared. We call it, so the request really starts.",
          hint1: "Call `load` with no arguments.",
          explain: "I call load, and that starts the request.",
        }),
        line("    return () => controller.abort();", {
          coach:
            "The cleanup: when the component unmounts before the response, we cancel the request, so no late answer tries to update a component that is gone.",
          hint1: "`return` an arrow function that calls `controller.abort()`.",
          explain: "The cleanup aborts the request when the component unmounts.",
        }),
        line("  }, []);", {
          coach: "We close the effect. It depends on nothing from the component, so it must run only once, when the component mounts.",
          hint1: "A closing brace, a comma and an empty dependency array, then the end of the call.",
          explain: "The empty dependency array makes the effect run once, on mount.",
        }),
        line('  if (status === "loading") return <p>Loading...</p>;', {
          coach:
            "Before the table we handle each state, one by one. The first one: the request is still running, so we show a short text and stop there.",
          hint1: 'An `if` that compares `status` with `"loading"` and returns a `p` with the text `Loading...` on the same line.',
          explain: "While the request is running, the component returns only a loading text.",
        }),
        line('  if (status === "error") return <p role="alert">Could not load users.</p>;', {
          coach: "The second state: the request failed. We show an error text, and a screen reader should announce it at once.",
          hint1: 'The same early return for `"error"`. The `p` gets `role="alert"` and the text `Could not load users.`',
          explain: "On an error the component returns a message with the alert role, so a screen reader announces it.",
        }),
        line("  if (users.length === 0) return <p>No users.</p>;", {
          coach: "The third state: the request worked, but the list is empty. An empty table says nothing, so we show a clear text.",
          hint1: "An `if` on `users.length` being 0 that returns a `p` with the text `No users.`",
          explain: "An empty list gets its own message, so the user never sees an empty table.",
        }),
        line("  return (\n    <table>", {
          coach: "After these three checks we know there is data, so we start the table. Two lines.",
          hint1: "`return` with an opening parenthesis, then an opening `table` tag on the next line.",
          explain: "I return the table, which is only reached when there are users to show.",
        }),
        line("      <caption>Users</caption>", {
          coach: "A table needs a name that says what is in it, for a screen reader and for everyone else.",
          hint1: "The `caption` element, with the text Users inside it.",
          explain: "The caption gives the table a name that a screen reader can read.",
        }),
        line("      <thead>\n        <tr>", {
          coach: "The column names go in the head of the table, in one row. Two lines.",
          hint1: "An opening `thead` tag, then an opening `tr` tag on the next line.",
          explain: "I open the table head and the header row inside it.",
        }),
        line('          <th scope="col">Name</th>', {
          coach:
            "The first header cell names the first column. We also say that it is the header of a column, so a screen reader can link each cell to it.",
          hint1: 'A `th` with `scope="col"` and the text Name.',
          explain: "The first header cell says Name, and its scope tells that it heads a column.",
        }),
        line('          <th scope="col">Email</th>', {
          coach: "The second header cell does the same for the email column.",
          hint1: 'The same `th` with `scope="col"`, this time with the text Email.',
          explain: "The second header cell names the email column in the same way.",
        }),
        line("        </tr>\n      </thead>", {
          coach: "The header has its two cells, so we close the row and the head. Two lines.",
          hint1: "A closing `tr` tag, then a closing `thead` tag on the next line.",
          explain: "I close the header row and the table head.",
        }),
        line("      <tbody>", {
          coach: "The rows with the data go in the body of the table.",
          hint1: "An opening `tbody` tag.",
          explain: "The table body holds one row per user.",
        }),
        line("        {users.map((u) => (", {
          coach:
            "We need one row for every user, so we turn the list of users into a list of rows. Here we only open the loop and the markup it returns.",
          hint1: "Open braces for an expression, then `users.map` with an arrow function that returns JSX in parentheses.",
          explain: "I map over the users, and each one becomes a table row.",
        }),
        line("          <tr key={u.id}>", {
          coach: "Each row needs a stable identity, so React can tell the rows apart when the list changes. Every user has an id of its own.",
          hint1: "A `tr` with a `key` prop, and the value is `u.id`.",
          explain: "The key of each row is the user id, which is stable and unique.",
        }),
        line("            <td>{u.name}</td>", {
          coach: "The first cell of the row is for the name of the user.",
          hint1: "A `td` with `u.name` in braces.",
          explain: "The first cell shows the name.",
        }),
        line("            <td>{u.email}</td>", {
          coach: "And the second cell is for the email of the same user.",
          hint1: "A `td` with `u.email` in braces.",
          explain: "The second cell shows the email.",
        }),
        line("          </tr>\n        ))}", {
          coach: "The row is complete, so we close it, and then we close the loop. Two lines.",
          hint1: "A closing `tr` tag, then two closing parentheses and a closing brace on the next line.",
          explain: "I close the row, then the arrow function, the map call and the JSX expression.",
        }),
        line("      </tbody>\n    </table>\n  );\n}", {
          coach: "Last, we close everything that is still open: the body, the table, the return and the component. Four lines.",
          hint1: "A closing `tbody` tag, a closing `table` tag, a closing parenthesis with a semicolon, then a closing brace.",
          explain: "The body ends first, then the table, the return and UsersTable.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "One request. Render is O(n) rows.",
  followUps: [
    {
      question: "Why check res.ok?",
      answer: "fetch only rejects on a network error. A 404 or 500 still resolves.",
    },
    {
      question: "Why status as one value?",
      answer: "Two booleans can be true together by mistake.",
    },
  ],
};
