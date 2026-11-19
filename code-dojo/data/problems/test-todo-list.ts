import type { TestingProblem } from "../types";
import { buggy, swap, tline } from "./testing-helpers";

const TODO_LIST = `import { useState } from "react";

let nextId = 1;

export default function TodoList() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");

  function add(event) {
    event.preventDefault();
    if (!text.trim()) return;
    setTodos((list) => [...list, { id: nextId++, text: text.trim() }]);
    setText("");
  }

  function remove(id) {
    setTodos((list) => list.filter((todo) => todo.id !== id));
  }

  return (
    <div>
      <form onSubmit={add}>
        <label htmlFor="new-todo">New todo</label>
        <input id="new-todo" value={text} onChange={(event) => setText(event.target.value)} />
        <button type="submit">Add</button>
      </form>
      {todos.length === 0 ? (
        <p>No todos yet</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              {todo.text}
              <button onClick={() => remove(todo.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
`;

const ADD_MILK =
  '    await user.type(screen.getByLabelText("New todo"), "Buy milk");\n    await user.click(screen.getByRole("button", { name: "Add" }));';

export const testTodoList: TestingProblem = {
  id: "test-todo-list",
  kind: "test",
  group: "testing",
  title: "Lists: Todo list",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write the tests for TodoList. Cover three things: the empty state shows first; adding a todo shows it, clears the input and hides the empty state; Delete removes only the row that was clicked.",
  askFirst: [
    "What does the list show when it is empty?",
    "Does adding clear the input?",
    "How do I point at one row when every row has a Delete button?",
  ],
  edgeCases: [
    "The empty state before the first todo",
    "The empty state must go away after the first todo",
    "Two rows: deleting one must leave the other",
    "Several buttons with the same name",
  ],
  testFile: "/TodoList.test.js",
  subject: { "/TodoList.js": TODO_LIST },
  buggy: [
    buggy(
      "no-empty-state",
      "/TodoList.js",
      swap(TODO_LIST, "<p>No todos yet</p>", "<p></p>"),
      "The empty state has no text.",
      "مفيش اختبار للحالة الفاضية: إيه اللي بيظهر قبل ما يتضاف أي عنصر.",
    ),
    buggy(
      "empty-state-stays",
      "/TodoList.js",
      swap(
        TODO_LIST,
        `      {todos.length === 0 ? (
        <p>No todos yet</p>
      ) : (
        <ul>`,
        `      <p>No todos yet</p>
      {todos.length === 0 ? null : (
        <ul>`,
      ),
      "The empty state text stays on screen after a todo is added.",
      "اختبارك بيتأكد إن العنصر الجديد ظهر، بس مش بيتأكد إن رسالة الحالة الفاضية اختفت.",
    ),
    buggy(
      "keeps-input",
      "/TodoList.js",
      swap(TODO_LIST, '    setText("");\n', ""),
      "The input is not cleared after adding.",
      "اختبارك مش بيتأكد إن الـ input اتفضّى بعد الإضافة.",
    ),
    buggy(
      "deletes-first",
      "/TodoList.js",
      swap(TODO_LIST, "list.filter((todo) => todo.id !== id)", "list.slice(1)"),
      "Delete always removes the first todo, whichever row was clicked.",
      "اختبارك مش بيفرّق أنهي صف اتمسح. جرّب تمسح صف مش الأول، واتأكد إن هو بالذات اللي اختفى.",
    ),
    buggy(
      "deletes-all",
      "/TodoList.js",
      swap(TODO_LIST, "list.filter((todo) => todo.id !== id)", "[]"),
      "Delete removes every todo.",
      "اختبارك بيتأكد إن العنصر اتمسح، بس مش بيتأكد إن باقي العناصر لسه موجودة.",
    ),
  ],
  parts: [
    {
      id: "main",
      title: "TodoList.test.js",
      signature: 'describe("TodoList")',
      steps: [
        tline('import { render, screen, within } from "@testing-library/react";', {
          coach:
            "نبدأ يا إسلام: المرة دي محتاجين تلات حاجات من React Testing Library. الاتنين المعتادين، ومعاهم أداة بتخلّينا ندوّر جوه عنصر واحد بس بدل الشاشة كلها.",
          accept: [
            'import { render, within, screen } from "@testing-library/react";',
            'import { screen, render, within } from "@testing-library/react";',
            'import { screen, within, render } from "@testing-library/react";',
            'import { within, render, screen } from "@testing-library/react";',
            'import { within, screen, render } from "@testing-library/react";',
          ],
          hint1: '`render` و `screen` و `within`، من `"@testing-library/react"`.',
          explain: "within lets me search inside one element instead of the whole screen.",
        }),
        tline('import userEvent from "@testing-library/user-event";\nimport "@testing-library/jest-dom";', {
          coach: "وبعده: المستخدم الوهمي، والـ matchers بتاعة الـ DOM. سطرين.",
          hint1: '`userEvent` من `"@testing-library/user-event"`، وبعده import من غير اسم لـ `"@testing-library/jest-dom"`.',
          explain: "user-event and jest-dom, as usual.",
        }),
        tline('import TodoList from "./TodoList";', {
          coach: "والـ component اللي هنختبره.",
          hint1: '`TodoList` كـ default import من `"./TodoList"`.',
          explain: "I import the list under test.",
        }),
        tline('\ndescribe("TodoList", () => {', {
          coach: "افتح مجموعة الاختبارات باسم الـ component: `TodoList`.",
          hint1: "`describe` بالاسم `TodoList`، وبعده arrow function.",
          explain: "One group for the list.",
        }),
        tline('  it("shows the empty state at first", () => {', {
          coach: "أول اختبار: الحالة الفاضية. سمّيه `shows the empty state at first`. من غير ضغط، فمش async.",
          hint1: "`it` بالاسم، وبعده arrow function عادية.",
          explain: "The first test is the empty state.",
        }),
        tline('    render(<TodoList />);\n    expect(screen.getByText("No todos yet")).toBeInTheDocument();\n  });', {
          coach: "اعرض القايمة، واتأكد إن النص `No todos yet` ظاهر. واقفل الاختبار. تلات سطور.",
          hint1: "`render`، وبعدها `expect` على `screen.getByText` مع `toBeInTheDocument`، وبعدها `});`.",
          explain: "With no todos, the user sees a message.",
        }),
        tline('\n  it("adds a todo and clears the input", async () => {', {
          coach: "تاني اختبار: الإضافة. سمّيه `adds a todo and clears the input`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The second test adds a todo.",
        }),
        tline("    const user = userEvent.setup();\n    render(<TodoList />);", {
          coach: "جهّز المستخدم الوهمي واعرض القايمة. سطرين.",
          hint1: "`userEvent.setup()` في `user`، وبعدها `render`.",
          explain: "Arrange: a user and the list.",
        }),
        tline('    await user.type(screen.getByLabelText("New todo"), "Buy milk");', {
          coach: "اكتب `Buy milk` في الحقل. دوّر عليه بالـ label بتاعه: `New todo`.",
          hint1: "`user.type` على `screen.getByLabelText` بالنص `New todo`، وبعده النص اللي هيتكتب.",
          explain: "I type the text into the labelled input.",
        }),
        tline('    await user.click(screen.getByRole("button", { name: "Add" }));', {
          coach: "ودوس على زرار الإضافة.",
          hint1: "`user.click` على `screen.getByRole` بالـ role `button` والاسم `Add`.",
          explain: "I click Add.",
        }),
        tline('    expect(screen.getByText("Buy milk")).toBeInTheDocument();', {
          coach: "أول تأكد: العنصر الجديد ظهر في القايمة.",
          hint1: "`expect` على `screen.getByText` بنص العنصر، مع `toBeInTheDocument`.",
          explain: "The new todo is on the screen.",
        }),
        tline('    expect(screen.getByLabelText("New todo")).toHaveValue("");', {
          coach: "تاني تأكد: الحقل اتفضّى علشان يكتب اللي بعده.",
          hint1: "`expect` على الحقل (بالـ label)، وبعدها الـ matcher `toHaveValue` بنص فاضي.",
          explain: "The input is empty again.",
        }),
        tline('    expect(screen.queryByText("No todos yet")).not.toBeInTheDocument();\n  });', {
          coach:
            "تالت تأكد: رسالة الحالة الفاضية اختفت. خد بالك: علشان تتأكد إن حاجة مش موجودة، `getBy` هيرمي خطأ قبل ما توصل للتأكد. استخدم النوع اللي بيرجّع `null` لما ميلاقيش. واقفل الاختبار. سطرين.",
          hint1: "`screen.queryByText` بالنص، وبعدها `not.toBeInTheDocument`.",
          explain: "To assert that something is gone I use queryBy. It returns null, where getBy would throw.",
        }),
        tline('\n  it("deletes only the row that was clicked", async () => {', {
          coach: "آخر اختبار: المسح. سمّيه `deletes only the row that was clicked`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The last test deletes one row.",
        }),
        tline("    const user = userEvent.setup();\n    render(<TodoList />);", {
          coach: "التجهيز المعتاد: المستخدم، والعرض. سطرين.",
          hint1: "`userEvent.setup()` في `user`، وبعدها `render`.",
          explain: "Arrange again.",
        }),
        tline(ADD_MILK, {
          coach: "علشان نختبر المسح صح محتاجين صفّين. ضيف الأول: اكتب `Buy milk` ودوس Add. سطرين.",
          hint1: "`user.type` في حقل `New todo`، وبعده `user.click` على زرار `Add`.",
          explain: "I add the first todo.",
        }),
        tline(
          '    await user.type(screen.getByLabelText("New todo"), "Walk the dog");\n    await user.click(screen.getByRole("button", { name: "Add" }));',
          {
            coach: "وضيف التاني: `Walk the dog`. سطرين.",
            hint1: "نفس السطرين، بالنص `Walk the dog`.",
            explain: "And a second one. With one row only, I could not tell which row was deleted.",
          },
        ),
        tline('    const row = screen.getByText("Walk the dog").closest("li");', {
          coach:
            "دلوقتي فيه زرارين اسمهم Delete، فلو دوّرت على الزرار في الشاشة كلها هتلاقي اتنين. هات الصف بتاع العنصر التاني الأول: دوّر على النص `Walk the dog`، وخد أقرب `li` ليه، وخزّنه في `row`.",
          hint1: "`screen.getByText` بالنص، وبعدها `.closest` بـ `\"li\"`.",
          explain: "Both rows have a Delete button, so I first get the row I want.",
        }),
        tline('    await user.click(within(row).getByRole("button", { name: "Delete" }));', {
          coach: "ودوس على زرار Delete اللي جوه الصف ده بس.",
          hint1: "بدل `screen` استخدم `within(row)`، وبعدها `getByRole` بالـ role `button` والاسم `Delete`.",
          explain: "within(row) searches only inside that row, so I click its own Delete button.",
        }),
        tline('    expect(screen.queryByText("Walk the dog")).not.toBeInTheDocument();', {
          coach: "أول تأكد: العنصر اللي اتمسح اختفى.",
          hint1: "`screen.queryByText` بالنص، وبعدها `not.toBeInTheDocument`.",
          explain: "The deleted todo is gone.",
        }),
        tline('    expect(screen.getByText("Buy milk")).toBeInTheDocument();\n  });\n});', {
          coach: "وتاني تأكد، وده المهم: العنصر التاني لسه موجود. واقفل الاختبار والمجموعة. تلات سطور.",
          hint1: "`expect` على `screen.getByText` بالنص `Buy milk`، مع `toBeInTheDocument`. وبعده `});` مرتين.",
          explain: "And the other todo is still there.",
        }),
      ],
    },
  ],
  complexity:
    "The rule: getBy for what must be there, queryBy for what must be gone, and within() when several rows have the same button.",
  idea: "في القوايم دايمًا فيه عناصر شبه بعض. هات الصف الأول، وبعدين دوّر جواه بـ `within`. ولما تتأكد إن حاجة اختفت استخدم `queryBy` مش `getBy`.",
  interview:
    "When a list repeats the same button in every row, I get the row first and use within() to find the button inside it. To assert that something is gone I use queryBy, because getBy throws.",
  followUps: [
    {
      question: "What does within() do?",
      answer: "It gives the same queries as screen, but only inside one element.",
      how: "I pass an element and get getByRole, getByText and the rest, limited to its children.",
      example: 'within(row).getByRole("button", { name: "Delete" })',
    },
    {
      question: "Why queryBy to check that something is gone?",
      answer: "queryBy returns null when nothing is found. getBy throws.",
      how: "With getBy the test would fail with a search error before the assertion runs.",
      example: 'expect(screen.queryByText("Buy milk")).not.toBeInTheDocument()',
    },
    {
      question: "Why add two todos in the delete test?",
      answer: "With one row, a broken delete can still pass.",
      how: "A bug that removes every row, or always the first row, looks right when there is only one row.",
      example: "Add two rows, delete the second, then check that the first is still there.",
    },
  ],
};
