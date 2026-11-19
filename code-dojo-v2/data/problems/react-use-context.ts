import type { CodeProblem, TestCase } from "../types";
import { line } from "./helpers";

/** The three pieces need a tree to live in. The preview adds it. */
const DEMO = `// ---- Demo: only for the preview. It is not part of the answer. ----
function Page() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: dark ? "#05070a" : "#f4f1ea",
        color: dark ? "#e9edf3" : "#1b222d",
      }}
    >
      <p>This box reads the same context. Theme: {theme}</p>
      <ThemeButton />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Page />
    </ThemeProvider>
  );
}`;

const tests: TestCase[] = [
  // ---- The provider alone: the hook and the button do not exist yet. ----
  {
    id: "provider-children",
    name: "ThemeProvider renders its children",
    part: "provider",
    code: `
const { container } = render(
  <ThemeProvider>
    <p>Hello</p>
  </ThemeProvider>,
);
expect(screen.getByText("Hello")).toBeInTheDocument();
// The provider adds no text of its own.
expect(container).toHaveTextContent(/^Hello$/);`,
  },
  {
    id: "provider-many-children",
    name: "ThemeProvider renders several children, in their order",
    part: "provider",
    code: `
const { container } = render(
  <ThemeProvider>
    <h1>Title</h1>
    <p>First</p>
    <p>Second</p>
  </ThemeProvider>,
);
expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
expect(screen.getByText("First")).toBeInTheDocument();
expect(screen.getByText("Second")).toBeInTheDocument();
expect(container).toHaveTextContent(/Title.*First.*Second/);`,
  },
  {
    id: "provider-deep-children",
    name: "a provider inside a provider still renders the children",
    part: "provider",
    code: `
render(
  <ThemeProvider>
    <section>
      <ThemeProvider>
        <p>Deep inside</p>
      </ThemeProvider>
    </section>
  </ThemeProvider>,
);
expect(screen.getByText("Deep inside")).toBeInTheDocument();`,
  },
  {
    id: "provider-no-children",
    name: "edge case: a provider with no children renders nothing and does not throw",
    part: "provider",
    code: `
const { container } = render(<ThemeProvider />);
expect(container).toHaveTextContent(/^$/);`,
  },
  {
    id: "provider-new-children",
    name: "the provider shows the new children when its parent renders it again",
    part: "provider",
    code: `
const { rerender } = render(
  <ThemeProvider>
    <p>Before</p>
  </ThemeProvider>,
);
rerender(
  <ThemeProvider>
    <p>After</p>
  </ThemeProvider>,
);
expect(screen.getByText("After")).toBeInTheDocument();
expect(screen.queryByText("Before")).not.toBeInTheDocument();`,
  },
  {
    id: "provider-keeps-child-state",
    name: "edge case: the children keep their own state when the provider renders again",
    part: "provider",
    code: `
function Clicker() {
  const [clicks, setClicks] = React.useState(0);
  return <button onClick={() => setClicks(clicks + 1)}>Clicks: {clicks}</button>;
}
const user = userEvent.setup();
const { rerender } = render(
  <ThemeProvider>
    <Clicker />
  </ThemeProvider>,
);
await user.click(screen.getByRole("button"));
await user.click(screen.getByRole("button"));
rerender(
  <ThemeProvider>
    <Clicker />
  </ThemeProvider>,
);
expect(screen.getByRole("button")).toHaveTextContent("Clicks: 2");`,
  },

  // ---- The hook, with the provider. The readers are written here, in the test. ----
  {
    id: "hook-theme-and-toggle",
    name: "inside the provider, useTheme gives the theme light and a toggle function",
    part: "hook",
    code: `
const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
expect(result.current.theme).toBe("light");
expect(typeof result.current.toggle).toBe("function");`,
  },
  {
    id: "hook-toggle-dark",
    name: "toggle changes the theme from light to dark",
    part: "hook",
    code: `
const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
act(() => {
  result.current.toggle();
});
expect(result.current.theme).toBe("dark");`,
  },
  {
    id: "hook-toggle-back",
    name: "a second toggle goes back to light, and a third one to dark again",
    part: "hook",
    code: `
const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
act(() => {
  result.current.toggle();
});
act(() => {
  result.current.toggle();
});
expect(result.current.theme).toBe("light");
act(() => {
  result.current.toggle();
});
expect(result.current.theme).toBe("dark");`,
  },
  {
    id: "hook-outside-provider",
    name: "edge case: useTheme outside the provider throws a clear error",
    part: "hook",
    code: `
// React also reports the error in the console. That report is not part of this test.
jest.spyOn(console, "error").mockImplementation(() => {});
expect(() => renderHook(() => useTheme())).toThrow("useTheme must be used inside ThemeProvider");`,
  },
  {
    id: "hook-two-readers",
    name: "two readers of the same provider always show the same theme",
    part: "hook",
    code: `
function Reader({ label }) {
  const { theme } = useTheme();
  return <p>{label}: {theme}</p>;
}
function Switch() {
  const { toggle } = useTheme();
  return <button onClick={() => toggle()}>Switch</button>;
}
const user = userEvent.setup();
render(
  <ThemeProvider>
    <Reader label="First" />
    <div>
      <Reader label="Second" />
    </div>
    <Switch />
  </ThemeProvider>,
);
expect(screen.getByText("First: light")).toBeInTheDocument();
expect(screen.getByText("Second: light")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "Switch" }));
expect(screen.getByText("First: dark")).toBeInTheDocument();
expect(screen.getByText("Second: dark")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "Switch" }));
expect(screen.getByText("First: light")).toBeInTheDocument();
expect(screen.getByText("Second: light")).toBeInTheDocument();`,
  },
  {
    id: "hook-separate-providers",
    name: "two separate providers do not share their theme",
    part: "hook",
    code: `
function Panel({ label }) {
  const { theme, toggle } = useTheme();
  return <button onClick={() => toggle()}>{label}: {theme}</button>;
}
const user = userEvent.setup();
render(
  <>
    <ThemeProvider>
      <Panel label="Left" />
    </ThemeProvider>
    <ThemeProvider>
      <Panel label="Right" />
    </ThemeProvider>
  </>,
);
await user.click(screen.getByRole("button", { name: "Left: light" }));
expect(screen.getByRole("button", { name: "Left: dark" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Right: light" })).toBeInTheDocument();`,
  },
  {
    id: "hook-nearest-provider",
    name: "edge case: with a provider inside a provider, a reader gets the nearest one",
    part: "hook",
    code: `
function Panel({ label }) {
  const { theme, toggle } = useTheme();
  return <button onClick={() => toggle()}>{label}: {theme}</button>;
}
const user = userEvent.setup();
render(
  <ThemeProvider>
    <Panel label="Outer" />
    <ThemeProvider>
      <Panel label="Inner" />
    </ThemeProvider>
  </ThemeProvider>,
);
await user.click(screen.getByRole("button", { name: "Inner: light" }));
expect(screen.getByRole("button", { name: "Inner: dark" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Outer: light" })).toBeInTheDocument();`,
  },
  {
    id: "hook-stable-value",
    name: "edge case: a reader does not render again when the provider renders again with the same theme",
    part: "hook",
    code: `
let renders = 0;
function Reader() {
  renders++;
  const { theme } = useTheme();
  return <p>Theme: {theme}</p>;
}
// The same element every time: only a new context value can make it render again.
const reader = <Reader />;
function Page() {
  const [count, setCount] = React.useState(0);
  return (
    <>
      <button onClick={() => setCount(count + 1)}>Page renders: {count}</button>
      <ThemeProvider>{reader}</ThemeProvider>
    </>
  );
}
const user = userEvent.setup();
render(<Page />);
expect(screen.getByText("Theme: light")).toBeInTheDocument();
const before = renders;
await user.click(screen.getByRole("button"));
expect(screen.getByRole("button")).toHaveTextContent("Page renders: 1");
expect(renders).toBe(before);`,
  },

  // ---- The button, with the provider and the hook. ----
  {
    id: "button-current-light",
    name: "ThemeButton shows Current: light at first",
    part: "child",
    code: `
render(
  <ThemeProvider>
    <ThemeButton />
  </ThemeProvider>,
);
expect(screen.getByRole("button", { name: "Current: light" })).toBeInTheDocument();`,
  },
  {
    id: "button-click-dark",
    name: "a click on the button changes it to Current: dark",
    part: "child",
    code: `
const user = userEvent.setup();
render(
  <ThemeProvider>
    <ThemeButton />
  </ThemeProvider>,
);
await user.click(screen.getByRole("button", { name: "Current: light" }));
expect(screen.getByRole("button", { name: "Current: dark" })).toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Current: light" })).not.toBeInTheDocument();`,
  },
  {
    id: "button-click-back",
    name: "a second click on the button goes back to Current: light",
    part: "child",
    code: `
const user = userEvent.setup();
render(
  <ThemeProvider>
    <ThemeButton />
  </ThemeProvider>,
);
await user.click(screen.getByRole("button"));
await user.click(screen.getByRole("button"));
expect(screen.getByRole("button", { name: "Current: light" })).toBeInTheDocument();`,
  },
  {
    id: "button-and-reader",
    name: "the button and another reader of the same provider always show the same theme",
    part: "child",
    code: `
function Box() {
  const { theme } = useTheme();
  return <p>Box theme: {theme}</p>;
}
const user = userEvent.setup();
render(
  <ThemeProvider>
    <Box />
    <ThemeButton />
  </ThemeProvider>,
);
expect(screen.getByText("Box theme: light")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "Current: light" }));
expect(screen.getByText("Box theme: dark")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "Current: dark" }));
expect(screen.getByText("Box theme: light")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Current: light" })).toBeInTheDocument();`,
  },
  {
    id: "button-two-buttons",
    name: "two buttons in the same provider change together",
    part: "child",
    code: `
const user = userEvent.setup();
render(
  <ThemeProvider>
    <ThemeButton />
    <ThemeButton />
  </ThemeProvider>,
);
expect(screen.getAllByRole("button", { name: "Current: light" })).toHaveLength(2);
await user.click(screen.getAllByRole("button")[1]);
expect(screen.getAllByRole("button", { name: "Current: dark" })).toHaveLength(2);`,
  },
  {
    id: "button-separate-providers",
    name: "buttons in two separate providers do not change each other",
    part: "child",
    code: `
const user = userEvent.setup();
render(
  <>
    <ThemeProvider>
      <ThemeButton />
    </ThemeProvider>
    <ThemeProvider>
      <ThemeButton />
    </ThemeProvider>
  </>,
);
await user.click(screen.getAllByRole("button")[0]);
const buttons = screen.getAllByRole("button");
expect(buttons[0]).toHaveTextContent("Current: dark");
expect(buttons[1]).toHaveTextContent("Current: light");`,
  },
  {
    id: "button-outside-provider",
    name: "edge case: ThemeButton outside the provider throws the same clear error",
    part: "child",
    code: `
// React also reports the error in the console. That report is not part of this test.
jest.spyOn(console, "error").mockImplementation(() => {});
expect(() => render(<ThemeButton />)).toThrow("useTheme must be used inside ThemeProvider");`,
  },
  {
    id: "button-fast-clicks",
    name: "edge case: fast clicks on the button all count",
    part: "child",
    code: `
render(
  <ThemeProvider>
    <ThemeButton />
  </ThemeProvider>,
);
const button = screen.getByRole("button");
for (let i = 0; i < 5; i++) fireEvent.click(button);
expect(button).toHaveTextContent("Current: dark");
fireEvent.click(button);
expect(button).toHaveTextContent("Current: light");`,
  },
];

function idsOf(part: string): string[] {
  const out: string[] = [];
  for (const test of tests) {
    if (test.part === part) out.push(test.id);
  }
  return out;
}

export const reactUseContext: CodeProblem = {
  id: "react-use-context",
  kind: "code",
  group: "react",
  title: "Write code with useContext",
  difficulty: "medium",
  tag: "reported",
  language: "jsx",
  api: ["ThemeProvider", "useTheme", "ThemeButton"],
  plainLoops: false,
  statement: "Create a context, provide a value, and read it in a child component.",
  askFirst: ["What should the context hold: a theme, a user?", "Should the child be able to change the value?"],
  edgeCases: [
    "Hook used outside the provider",
    "Value object recreated on every render: all readers re-render",
  ],
  react: {
    risky: ["state-mutation", "list-key", "effect-cleanup"],
    preview: { tail: DEMO },
    screen: [
      "ThemeProvider shows its children and adds no text of its own",
      'useTheme() gives an object with "theme", which is "light" at first, and "toggle", a function that changes it to "dark" and back',
      'Outside ThemeProvider, useTheme throws an error with the message "useTheme must be used inside ThemeProvider"',
      'ThemeButton is one button with the text "Current: light" or "Current: dark", and a click changes the theme',
      "The object from useTheme stays the same while the theme does not change, so a reader does not render again for nothing",
    ],
    tryIt: [
      "The button shows Current: light at first.",
      "Click it: the button and the box around it both change to dark.",
      "Click again: both go back to light.",
      "The button and the box always show the same theme.",
    ],
  },
  parts: [
    {
      id: "provider",
      title: "Context and provider",
      signature: "ThemeProvider({ children })",
      steps: [
        line('import { createContext, useContext, useState, useMemo } from "react";', {
          coach:
            "Let's start, Islam. We need four tools from React: one to create the context, one to read it, one for state, and one that keeps the same object between renders.",
          hint1: 'Import `createContext`, `useContext`, `useState` and `useMemo` from `"react"`. The order does not matter.',
          explain: "I import createContext, useContext, useState and useMemo from React.",
        }),
        line("const ThemeContext = createContext(null);", {
          coach:
            "First we need the context itself, outside any component, so every component can share it. Its default value is `null`, so later we can tell that a provider is missing.",
          hint1: "Call `createContext` with `null`, and keep the result in a constant.",
          explain: "I create the context with null as the default, so a missing provider is easy to detect.",
        }),
        line("export function ThemeProvider({ children }) {", {
          coach:
            "Next we need the provider component. It is exported, so the app can wrap any part of the tree with it, and it takes what is inside it as a prop.",
          hint1: "`export function` with the name `ThemeProvider`. Take `children` out of the props.",
          explain: "ThemeProvider is an exported component that takes its children as a prop.",
        }),
        line('  const [theme, setTheme] = useState("light");', {
          coach: "The value we share is the name of the theme. It changes over time, so it is state inside the provider, and it starts as light.",
          hint1: 'Call `useState` with `"light"`, and take the value and its setter out of the array it gives back.',
          explain: "The theme is state that lives in the provider, and its first value is light.",
        }),
        line("  const value = useMemo(", {
          coach:
            "The provider hands out an object, and a new object on every render makes every reader render again. So we need the tool that keeps the same object, and here we only open its call.",
          hint1: "`useMemo` keeps a value between renders. Start a constant with it and leave the parenthesis open.",
          explain: "I memoize the value object, so the readers do not render again for nothing.",
        }),
        line('    () => ({ theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) }),', {
          coach:
            "The first argument builds the object: the theme, and a `toggle` function that flips it between light and dark. The new theme depends on the old one, so we let React hand us the latest value.",
          hint1:
            "An arrow function that returns an object literal in parentheses. In `toggle`, give `setTheme` a function that takes the old value and picks the other one with a ternary. The line ends with a comma.",
          explain: "The value holds the theme and a toggle function that flips it with the updater form.",
        }),
        line("    [theme]\n  );", {
          coach: "The second argument says when the object is built again, which is only when the theme changes, and then we close the call. Two lines.",
          hint1: "A dependency array with `theme` in it, then the closing parenthesis on the next line.",
          explain: "The dependency array rebuilds the value only when the theme changes.",
        }),
        line("  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;", {
          coach: "Now the provider renders: it gives the memoized object to the context and shows what was passed inside it. It all fits on one line.",
          hint1: "`return` the `Provider` of `ThemeContext` with a `value` prop, and put `children` in braces between its tags.",
          explain: "The provider gives the value to every component inside it.",
        }),
        line("}", {
          coach: "The provider is done, so we close the component.",
          hint1: "One closing brace.",
          explain: "The closing brace ends ThemeProvider.",
          checks: idsOf("provider"),
        }),
      ],
    },
    {
      id: "hook",
      title: "useTheme hook",
      signature: "useTheme()",
      steps: [
        line("export function useTheme() {", {
          coach: "Now a small custom hook that reads the context, so the components never touch the context directly. It is exported too.",
          hint1: "`export function` with the name `useTheme` and no parameters.",
          explain: "A custom hook hides the context from the components that use it.",
        }),
        line("  const ctx = useContext(ThemeContext);", {
          coach: "The hook first reads the value that the nearest provider above it gives.",
          hint1: "Call `useContext` with `ThemeContext`, and keep the result in a constant.",
          explain: "useContext reads the value of the nearest provider above the component.",
        }),
        line('  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");', {
          coach:
            "The edge case: with no provider above, the value is still the default, `null`. Then we stop with a clear error, so the mistake is easy to find.",
          hint1: 'An `if` on a missing `ctx`, then `throw new Error` with the message "useTheme must be used inside ThemeProvider".',
          explain: "Outside the provider the value is null, so the hook throws a clear error.",
        }),
        line("  return ctx;\n}", {
          coach: "With a provider above, the hook gives the value back, and then we close it. Two lines.",
          hint1: "`return` the value in `ctx`, then a closing brace on the next line.",
          explain: "The hook returns the context value, which holds the theme and the toggle.",
          checks: idsOf("hook"),
        }),
      ],
    },
    {
      id: "child",
      title: "ThemeButton: read the context",
      signature: "ThemeButton()",
      steps: [
        line("function ThemeButton() {", {
          coach: "The last piece is a child component that reads the context. It is a plain function component with no props.",
          hint1: "A `function` with the name `ThemeButton` and no parameters.",
          explain: "ThemeButton is a child component that reads the context.",
        }),
        line("  const { theme, toggle } = useTheme();", {
          coach: "The button needs the current theme and the function that changes it, and both come from our hook.",
          hint1: "Call `useTheme` and take `theme` and `toggle` out of the object with destructuring.",
          explain: "It takes the theme and the toggle function from the hook.",
        }),
        line("  return <button onClick={toggle}>Current: {theme}</button>;", {
          coach: "The component renders one button that shows the current theme and flips it on a click.",
          hint1: "A `button` with `onClick` set to `toggle`. Its text is Current: and then `theme` in braces.",
          explain: "The button shows the current theme and calls toggle on every click.",
        }),
        line("}", {
          coach: "That is all, so we close the component.",
          hint1: "One closing brace.",
          explain: "The closing brace ends ThemeButton.",
          checks: idsOf("child"),
        }),
      ],
    },
  ],
  tests,
  complexity: "Reading context is O(1). Every reader re-renders when the value changes.",
  followUps: [
    {
      question: "Why useMemo on the value?",
      answer: "So the value object is the same between renders, and readers don't re-render for nothing.",
    },
    {
      question: "When would you not use context?",
      answer: "For state that changes very often. Then I use a store with selectors.",
    },
  ],
};
