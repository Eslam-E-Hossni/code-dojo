import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

/** The component as the interviewer shows it. Every problem of the review is in it. */
const STARTER = `import { useEffect, useState } from "react";

export default function UserList({ users, onSelect }) {
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState("");
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    setFiltered(users.filter((u) => u.name.includes(query)));
  });

  useEffect(() => {
    window.addEventListener("resize", () => setWidth(window.innerWidth));
  }, []);

  async function load() {
    const res = await fetch("/api/users?q=" + query);
    const data = await res.json();
    users.push(...data);
  }

  return (
    <div>
      <input onChange={(e) => setQuery(e.target.value)} />
      <p>Window width: {width}</p>
      {filtered.map((u, i) => (
        <div key={i} onClick={() => onSelect(u)}>{u.name}</div>
      ))}
    </div>
  );
}`;

/** The preview plays the parent: it owns the users and shows what onSelect got. */
const STAGE = `import { useState } from "react";

const USERS = [
  { id: 1, name: "Leanne Graham" },
  { id: 2, name: "Ervin Howell" },
  { id: 3, name: "Clementine Bauch" },
  { id: 4, name: "Patricia Lebsack" },
  { id: 5, name: "Chelsey Dietrich" },
];

export function Stage({ Solution }) {
  const [users, setUsers] = useState(USERS);
  const [picked, setPicked] = useState(null);

  return (
    <>
      <div className="dojo-stage-bar">
        The parent passes {users.length} users:
        <button onClick={() => setUsers(users.slice(1))} disabled={users.length === 0}>
          Remove the first user
        </button>
        <button onClick={() => setUsers(USERS)}>All users</button>
      </div>
      <Solution users={users} onSelect={setPicked} />
      <p className="dojo-stage-note">onSelect got: {picked ? picked.name : "nothing yet"}</p>
    </>
  );
}
`;

const SETUP = `const USERS = [
  { id: 1, name: "Leanne Graham" },
  { id: 2, name: "Ervin Howell" },
  { id: 3, name: "Clementine Bauch" },
];`;

const tests: TestCase[] = [
  {
    id: "shows-users",
    name: "shows one button for every user",
    code: `
render(<UserList users={USERS} onSelect={() => {}} />);
for (const user of USERS) {
  expect(screen.getByRole("button", { name: user.name })).toBeInTheDocument();
}
expect(screen.getAllByRole("button")).toHaveLength(3);`,
  },
  {
    id: "label",
    name: "the search box has the label Search users, and starts empty",
    code: `
render(<UserList users={USERS} onSelect={() => {}} />);
expect(screen.getByLabelText("Search users")).toHaveValue("");`,
  },
  {
    id: "filters",
    name: "typing shows only the users whose name contains the text",
    code: `
const user = userEvent.setup();
render(<UserList users={USERS} onSelect={() => {}} />);
await user.type(screen.getByLabelText("Search users"), "Erv");
expect(screen.getByLabelText("Search users")).toHaveValue("Erv");
expect(screen.getByRole("button", { name: "Ervin Howell" })).toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Leanne Graham" })).not.toBeInTheDocument();
expect(screen.getAllByRole("button")).toHaveLength(1);`,
  },
  {
    id: "ignores-case",
    name: "the search ignores upper and lower case",
    code: `
const user = userEvent.setup();
render(<UserList users={USERS} onSelect={() => {}} />);
await user.type(screen.getByLabelText("Search users"), "LEANNE");
expect(screen.getByRole("button", { name: "Leanne Graham" })).toBeInTheDocument();
expect(screen.getAllByRole("button")).toHaveLength(1);`,
  },
  {
    id: "no-match",
    name: "says No users found. when nothing matches",
    code: `
const user = userEvent.setup();
render(<UserList users={USERS} onSelect={() => {}} />);
expect(screen.queryByText("No users found.")).not.toBeInTheDocument();
await user.type(screen.getByLabelText("Search users"), "zzz");
expect(screen.getByText("No users found.")).toBeInTheDocument();
expect(screen.queryAllByRole("button")).toHaveLength(0);`,
  },
  {
    id: "empty-list",
    name: "edge case: an empty list of users",
    code: `
render(<UserList users={[]} onSelect={() => {}} />);
expect(screen.getByText("No users found.")).toBeInTheDocument();
expect(screen.getByLabelText("Search users")).toBeInTheDocument();`,
  },
  {
    id: "clear-search",
    name: "edge case: clearing the search brings every user back",
    code: `
const user = userEvent.setup();
render(<UserList users={USERS} onSelect={() => {}} />);
const input = screen.getByLabelText("Search users");
await user.type(input, "erv");
expect(screen.getAllByRole("button")).toHaveLength(1);
await user.clear(input);
expect(screen.getAllByRole("button")).toHaveLength(3);`,
  },
  {
    id: "follows-props",
    name: "the list follows the users prop when the parent changes it",
    code: `
const { rerender } = render(<UserList users={USERS} onSelect={() => {}} />);
rerender(<UserList users={USERS.slice(1)} onSelect={() => {}} />);
expect(screen.queryByRole("button", { name: "Leanne Graham" })).not.toBeInTheDocument();
expect(screen.getAllByRole("button")).toHaveLength(2);`,
  },
  {
    id: "select",
    name: "a click calls onSelect once, with that user",
    code: `
const user = userEvent.setup();
const onSelect = jest.fn();
render(<UserList users={USERS} onSelect={onSelect} />);
await user.click(screen.getByRole("button", { name: "Ervin Howell" }));
expect(onSelect).toHaveBeenCalledTimes(1);
expect(onSelect).toHaveBeenCalledWith(USERS[1]);`,
  },
  {
    id: "keyboard",
    name: "a user can be chosen with the keyboard",
    code: `
const user = userEvent.setup();
const onSelect = jest.fn();
render(<UserList users={USERS} onSelect={onSelect} />);
screen.getByRole("button", { name: "Leanne Graham" }).focus();
await user.keyboard("{Enter}");
expect(onSelect).toHaveBeenCalledTimes(1);
expect(onSelect).toHaveBeenCalledWith(USERS[0]);`,
  },
  {
    id: "one-render",
    name: "one typed letter renders once: the list is computed, not stored",
    code: `
let commits = 0;
render(
  <React.Profiler id="count" onRender={() => { commits++; }}>
    <UserList users={USERS} onSelect={() => {}} />
  </React.Profiler>,
);
const before = commits;
fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "e" } });
expect(commits - before).toBe(1);`,
  },
  {
    id: "width",
    name: "shows the window width, and follows a resize",
    code: `
const before = window.innerWidth;
try {
  window.innerWidth = 1024;
  render(<UserList users={USERS} onSelect={() => {}} />);
  expect(screen.getByText("Window width: 1024")).toBeInTheDocument();
  act(() => {
    window.innerWidth = 500;
    window.dispatchEvent(new Event("resize"));
  });
  expect(screen.getByText("Window width: 500")).toBeInTheDocument();
} finally {
  window.innerWidth = before;
}`,
  },
  {
    id: "listener-removed",
    name: "edge case: the resize listener is removed when the component unmounts",
    code: `
const add = jest.spyOn(window, "addEventListener");
const remove = jest.spyOn(window, "removeEventListener");
const { unmount } = render(<UserList users={USERS} onSelect={() => {}} />);
unmount();
const added = add.mock.calls.filter((call) => call[0] === "resize");
expect(added.length).toBeGreaterThan(0);
for (const call of added) {
  const removed = remove.mock.calls.some((other) => other[0] === "resize" && other[1] === call[1]);
  const options = call[2];
  const aborted = typeof options === "object" && options !== null && options.signal !== undefined && options.signal.aborted;
  expect(removed || aborted).toBe(true);
}`,
  },
  {
    id: "props-untouched",
    name: "the users prop is never changed",
    code: `
const user = userEvent.setup();
const frozen = Object.freeze(USERS.map((item) => Object.freeze({ ...item })));
render(<UserList users={frozen} onSelect={() => {}} />);
await user.type(screen.getByLabelText("Search users"), "a");
expect(frozen).toHaveLength(3);
expect(screen.getAllByRole("button")).toHaveLength(2);`,
  },
];

export const reactReview: CodeProblem = {
  id: "react-review",
  kind: "code",
  group: "react",
  title: "Review this React component and find the problems",
  difficulty: "hard",
  tag: "reported",
  language: "jsx",
  api: ["UserList"],
  plainLoops: false,
  statement:
    "Here is a component. Tell me everything that is wrong with it, and fix it. It shows the users whose name contains the search text, and it calls onSelect when a user is chosen.",
  examples: ['<UserList users={[{ id: 1, name: "Leanne Graham" }]} onSelect={(user) => open(user)} />'],
  askFirst: ["What should the component do?", "Can I change its props?"],
  edgeCases: [
    "Read it in order: state, effects, handlers, JSX",
    "Say the problem, the risk, and the fix for each one",
    "A search that matches nobody, and an empty list",
    "The parent passes a new list while a search text is typed",
  ],
  react: {
    risky: ["state-mutation", "list-key", "index-key", "effect-cleanup"],
    preview: { stage: STAGE },
    screen: [
      'An input with the label "Search users"',
      "One button per matching user, with the name of the user as its text. The search ignores upper and lower case",
      'The text "No users found." when no user matches',
      'The text "Window width: " with the width of the window after it, kept up to date when the window is resized',
      "A click on a user calls onSelect with that user. The users prop is only read, never changed",
    ],
    tryIt: [
      "Type in the search box: only the matching users stay, in upper or lower case.",
      "Type something that matches nobody: it says No users found.",
      "Click a user, or go to one with Tab and press Enter: the line below shows who was chosen.",
      "Press Remove the first user: the list follows the new prop.",
      "Make the preview wider or narrower: the width follows.",
    ],
    testSetup: SETUP,
    starter: STARTER,
  },
  parts: [
    {
      id: "main",
      title: "UserList",
      signature: "UserList({ users, onSelect })",
      steps: [
        line('import { useEffect, useMemo, useState } from "react";', {
          coach:
            "Let's start, Islam. The fixed component keeps state, runs one effect, and caches one computed value, so we bring in a hook for each of these jobs.",
          hint1: 'Import `useEffect`, `useMemo` and `useState` from `"react"`. The order does not matter.',
          explain: "I import useState for the search text, useEffect for the listener, and useMemo for the filtered list.",
        }),
        line("export default function UserList({ users, onSelect }) {", {
          coach:
            "Now the component. The original pushed new users into the list from its parent, but props are read-only, so the fixed one only reads its two props.",
          hint1: "`export default function` with the name `UserList`. Destructure `users` and `onSelect` in the parameter.",
          explain: "UserList takes the users and an onSelect callback as props, and it never changes them.",
        }),
        line('  const [query, setQuery] = useState("");', {
          coach: "We read the state first. The search text is typed by the user, so it must be state, and it starts empty.",
          hint1: "Call `useState` with an empty string, and take the value and its setter out of the array.",
          explain: "The search text is the only thing the user types, so it is state that starts as an empty string.",
        }),
        line("  const [width, setWidth] = useState(window.innerWidth);", {
          coach: "The page also shows the width of the window, which changes outside React. We keep it in state and start from the real width.",
          hint1: "Another `useState`. Its first value is `window.innerWidth`.",
          explain: "The window width is state too, and its first value is read from the window.",
        }),
        line("  const filtered = useMemo(() => {", {
          coach:
            "The original kept the matching users in state and set it in an effect with no dependency array: an endless render loop. The list comes from `users` and `query`, so we compute it and cache it.",
          hint1: "Call `useMemo` with an arrow function, and keep what it returns in `filtered`. Leave the function open.",
          explain: "The filtered list is derived from the props and the search text, so I compute it with useMemo and keep no state for it.",
        }),
        line("    const q = query.toLowerCase();", {
          coach: "The search should not care about upper and lower case. We lower the search text once here, not once for every user.",
          hint1: "A constant `q` that holds `query` after `toLowerCase`.",
          explain: "I lower the search text one time, outside the filter callback.",
        }),
        line("    return users.filter((u) => u.name.toLowerCase().includes(q));", {
          coach: "Now we keep the users whose name contains the search text. We build a new list and leave the prop as it is.",
          hint1: "Return `users` after `filter`. The callback lowers the `name` of `u` and asks if it `includes` `q`.",
          explain: "filter returns a new array with the users whose lowered name includes the lowered search text.",
        }),
        line("  }, [users, query]);", {
          coach:
            "We close the callback and say when to compute again: only when one of the two inputs changes. With both of them listed, the cached list can never be out of date.",
          hint1: "Close the arrow function, then the dependency array with `users` and `query`, then close the call.",
          explain: "The dependency array holds users and query, so the list is computed again only when one of them changes.",
        }),
        line("  useEffect(() => {", {
          coach: "Next we read the effects. Listening to the window is a side effect outside React, so it belongs in the hook for side effects.",
          hint1: "Call `useEffect` and give it an arrow function with no parameters. Leave its body open.",
          explain: "The effect is the place where I connect the component to the window.",
        }),
        line("    const onResize = () => setWidth(window.innerWidth);", {
          coach:
            "The original gave the listener an inline function, so nobody could remove it later. We give the handler a name, because adding and removing must use the same function.",
          hint1: "A constant `onResize` that holds an arrow function. It gives `setWidth` the new `innerWidth` of `window`.",
          explain: "onResize is a named handler that saves the new window width in state.",
        }),
        line('    window.addEventListener("resize", onResize);', {
          coach: "Now we start to listen. The handler runs each time the size of the window changes.",
          hint1: 'Call `addEventListener` on `window` with the event name `"resize"` and the handler.',
          explain: "I add the handler as a listener for the resize event of the window.",
        }),
        line('    return () => window.removeEventListener("resize", onResize);', {
          coach:
            "The original never removed its listener, so each mount left one more behind: a memory leak. An effect that adds a listener returns a cleanup that removes it.",
          hint1: "Return an arrow function that calls `removeEventListener` with the same event name and the same handler.",
          explain: "The cleanup removes the same handler, so nothing listens after the component unmounts.",
        }),
        line("  }, []);", {
          coach:
            "We close the effect. It reads nothing that changes between renders, so it should run once after the first render and clean up at unmount.",
          hint1: "Close the arrow function, then an empty dependency array, then close the call.",
          explain: "The empty dependency array means the listener is added once and removed once.",
        }),
        line("  return (\n    <div>", {
          coach: "Now the markup: a component gives back one root element, so we open a wrapper for everything. Two lines.",
          hint1: "`return` with an opening parenthesis, then an opening `div` tag on the next line.",
          explain: "I return one root element that wraps the search box and the list.",
        }),
        line('      <label htmlFor="q">Search users</label>', {
          coach:
            "The original input had no label, so a screen reader could not say what it is for. We add a label and tie it to the input by an id.",
          hint1: 'A `label` with the text Search users. Its `htmlFor` is `"q"`, the id that the input gets next.',
          explain: "The label names the search box, and htmlFor points at the id of the input.",
        }),
        line('      <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} />', {
          coach:
            "The original input only had a change handler, so React did not control its text. We give it the id of the label, and the state as its text, so the state is the single source of truth.",
          hint1: 'An `input` with the `id` `"q"`, with `value` set to `query`, and with an `onChange` that gives `setQuery` the `value` of `e.target`.',
          explain: "The input is controlled: its text comes from the state, and each change goes back into the state.",
        }),
        line("      <p>Window width: {width}</p>", {
          coach: "We show the width that the resize handler keeps up to date.",
          hint1: "A `p` with the text Window width: and then `width` in braces.",
          explain: "The paragraph shows the window width from state.",
        }),
        line("      {filtered.length === 0 ? (", {
          coach:
            "The original showed nothing at all when no user matched. We handle the empty case first, so we open a choice between two outputs.",
          hint1: "Open braces, ask if the `length` of `filtered` is 0, then a question mark and an opening parenthesis.",
          explain: "A conditional expression picks between the empty message and the list.",
        }),
        line("        <p>No users found.</p>", {
          coach: "For an empty result we say so in plain words, so the user knows that the search ran.",
          hint1: "A `p` with the text No users found.",
          explain: "When the list is empty, the user reads that no users were found.",
        }),
        line("      ) : (\n        <ul>", {
          coach: "Otherwise we show the matches as a real list, because they are items of the same kind. Two lines.",
          hint1: "Close the first parenthesis, then a colon and a new opening parenthesis. On the next line an opening `ul` tag.",
          explain: "The other branch of the conditional opens an unordered list for the matches.",
        }),
        line("          {filtered.map((u) => (", {
          coach: "We need one list item for each matching user, so we turn the array of users into an array of elements.",
          hint1: "Open braces, then `map` over `filtered`. The callback takes `u` and returns JSX in parentheses, left open.",
          explain: "map turns each filtered user into one list item.",
        }),
        line("            <li key={u.id}>", {
          coach:
            "The original used the index as the key, but after a filter the same index points at another user. We use a value that belongs to the user and never changes.",
          hint1: "An opening `li` tag with a `key`. The key is the `id` of `u`.",
          explain: "Each list item has the id of its user as key, which stays the same when the list changes.",
        }),
        line('              <button type="button" onClick={() => onSelect(u)}>{u.name}</button>', {
          coach:
            "The original put the click on a plain block element, which the keyboard cannot reach. A real button gets focus, and Enter and Space work on it for free.",
          hint1: 'A `button` with the `type` `"button"`. Its `onClick` calls `onSelect` with `u`, and its text is the `name` of `u`.',
          explain: "A real button calls onSelect with the user, and it works with the mouse and with the keyboard.",
        }),
        line("            </li>", {
          coach: "We close the list item.",
          hint1: "A closing `li` tag.",
          explain: "The list item ends here.",
        }),
        line("          ))}", {
          coach: "We close the JSX of one item, then the callback with its call, and then the braces.",
          hint1: "Two closing parentheses and a closing brace.",
          explain: "The map call and its braces end here.",
        }),
        line("        </ul>\n      )}", {
          coach: "We close the list, and then the second branch of the choice with its braces. Two lines.",
          hint1: "A closing `ul` tag, then a closing parenthesis and a closing brace on the next line.",
          explain: "The list ends, and with it the conditional expression.",
        }),
        line("    </div>\n  );\n}", {
          coach: "Last, we close the wrapper, then the return, and then the component. Three lines.",
          hint1: "A closing `div` tag, then a closing parenthesis with a semicolon, then a closing brace.",
          explain: "The wrapper ends first, then the return, and then UserList.",
          checks: tests.map((test) => test.id),
        }),
      ],
    },
  ],
  tests,
  complexity: "The loop bug is the most serious: fix it first. The filter is O(n) for each change of the list or of the search text.",
  followUps: [
    {
      question: "Which problem is the most serious?",
      answer: "The effect without dependencies. It loops and can freeze the page.",
    },
    {
      question: "Why is derived state bad?",
      answer: "It can go out of sync with its source, and it costs an extra render.",
    },
    {
      question: "What was wrong with the load function of the original?",
      answer:
        "It changed a prop with push, it did not check res.ok or catch errors, it did not encode the query, and nothing called it. Loading data belongs to the parent, or to a hook with its own state.",
    },
    {
      question: "Why is the index a bad key here?",
      answer:
        "The list is filtered, so the same index points at another user after each change. React then keeps the DOM and the state of the wrong item.",
    },
  ],
};
