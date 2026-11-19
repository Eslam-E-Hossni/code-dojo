import type { TestingProblem } from "../types";
import { buggy, swap, tline } from "./testing-helpers";

const USERS_TABLE = `import { useEffect, useState } from "react";

export default function UsersTable() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    fetch("/api/users")
      .then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setUsers(data);
        setStatus("done");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") return <p>Loading...</p>;
  if (status === "error") return <p role="alert">Could not load users</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
`;

export const testUsersTable: TestingProblem = {
  id: "test-users-table",
  kind: "test",
  group: "testing",
  title: "Async: UsersTable with fetch",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write the tests for UsersTable. It calls fetch(\"/api/users\") when it mounts. Cover three things: it shows Loading... first, then the users, and the loading text goes away; it shows an alert when the request fails; it shows the same alert when the response status is not ok.",
  askFirst: [
    "Where does the data come from, and can I replace that in a test?",
    "Which states does the user see: loading, data, error?",
    "What happens with an HTTP error status like 500?",
  ],
  edgeCases: [
    "The loading state before the data arrives",
    "The loading text must go away",
    "A network error",
    "A response with status 500: fetch does not reject",
  ],
  testFile: "/UsersTable.test.js",
  subject: { "/UsersTable.js": USERS_TABLE },
  buggy: [
    buggy(
      "no-loading-state",
      "/UsersTable.js",
      swap(USERS_TABLE, 'if (status === "loading") return <p>Loading...</p>;', 'if (status === "loading") return <p></p>;'),
      "Nothing is shown while the data is loading.",
      "اختبارك مش بيتأكد من حالة التحميل اللي بتظهر قبل ما البيانات توصل.",
    ),
    buggy(
      "loading-stays",
      "/UsersTable.js",
      swap(USERS_TABLE, "  return (\n    <table>", "  return (\n    <table>\n      <caption>Loading...</caption>"),
      "The loading text stays on screen after the data arrives.",
      "اختبارك بيتأكد إن البيانات ظهرت، بس مش بيتأكد إن رسالة التحميل اختفت.",
    ),
    buggy(
      "wrong-url",
      "/UsersTable.js",
      swap(USERS_TABLE, 'fetch("/api/users")', 'fetch("/api/user")'),
      "The request goes to the wrong URL.",
      "اختبارك مش بيتأكد إن الطلب راح للعنوان الصح.",
    ),
    buggy(
      "no-email-column",
      "/UsersTable.js",
      swap(USERS_TABLE, "<td>{user.email}</td>", "<td></td>"),
      "The email column is empty.",
      "اختبارك بيتأكد من الاسم بس. باقي بيانات الصف ممكن تكون ناقصة ومش هتحس.",
    ),
    buggy(
      "no-error-state",
      "/UsersTable.js",
      swap(USERS_TABLE, 'if (active) setStatus("error");', 'if (active) setStatus("done");'),
      "When the request fails, an empty table is shown and no error.",
      "مفيش اختبار لحالة فشل الطلب.",
    ),
    buggy(
      "ignores-http-status",
      "/UsersTable.js",
      swap(USERS_TABLE, '        if (!response.ok) throw new Error("HTTP " + response.status);\n', ""),
      "A response with status 500 is treated as a success.",
      "مجرّبتش رد حالته مش ok، زي 500. fetch مش بيرمي خطأ في الحالة دي، فالـ component لازم يتأكد بنفسه.",
    ),
  ],
  parts: [
    {
      id: "main",
      title: "UsersTable.test.js",
      signature: 'describe("UsersTable")',
      steps: [
        tline('import { render, screen } from "@testing-library/react";\nimport "@testing-library/jest-dom";', {
          coach:
            "نبدأ يا إسلام: هنا مفيش ضغط ولا كتابة، فمش محتاجين المستخدم الوهمي. هات اللي بيعرض واللي بيدوّر، وبعده الـ matchers بتاعة الـ DOM. سطرين.",
          accept: ['import { screen, render } from "@testing-library/react";\nimport "@testing-library/jest-dom";'],
          hint1: '`render` و `screen` من `"@testing-library/react"`، وبعده import من غير اسم لـ `"@testing-library/jest-dom"`.',
          explain: "No clicks here, so I need only render, screen and the DOM matchers.",
        }),
        tline('import UsersTable from "./UsersTable";', {
          coach: "والـ component اللي هنختبره.",
          hint1: '`UsersTable` كـ default import من `"./UsersTable"`.',
          explain: "I import the table under test.",
        }),
        tline("\nconst users = [", {
          coach:
            "الاختبار مينفعش يكلّم سيرفر حقيقي. هنجهّز البيانات اللي السيرفر المفروض يرجّعها. افتح array اسمها `users`.",
          hint1: "`const users` بيساوي قوس array مفتوح.",
          explain: "A test must not call a real server, so I prepare the data myself.",
        }),
        tline('  { id: 1, name: "Mona", email: "mona@example.com" },', {
          coach: "أول مستخدم: الـ id واحد، والاسم `Mona`، والإيميل `mona@example.com`.",
          hint1: "object فيه `id` و `name` و `email`، وبعده فاصلة.",
          explain: "The first user.",
        }),
        tline('  { id: 2, name: "Omar", email: "omar@example.com" },\n];', {
          coach: "وتاني مستخدم: الـ id اتنين، والاسم `Omar`، والإيميل `omar@example.com`. واقفل الـ array. سطرين.",
          accept: ['{ id: 2, name: "Omar", email: "omar@example.com" }\n];'],
          hint1: "نفس الشكل للمستخدم التاني، وبعده `];`.",
          explain: "And a second user.",
        }),
        tline('\ndescribe("UsersTable", () => {', {
          coach: "افتح مجموعة الاختبارات باسم الـ component: `UsersTable`.",
          hint1: "`describe` بالاسم `UsersTable`، وبعده arrow function.",
          explain: "One group for the table.",
        }),
        tline("  afterEach(() => {", {
          coach:
            "كل اختبار هيبدّل `fetch` بدالة وهمية. لازم بعد كل اختبار نرجّع الأصلية، علشان اختبار ميأثّرش على التاني. افتح الـ hook اللي بيشتغل بعد كل اختبار.",
          hint1: "`afterEach` وجواها arrow function.",
          explain: "afterEach runs after every test. I use it to undo what the test replaced.",
        }),
        tline("    jest.restoreAllMocks();\n  });", {
          coach: "جواه: رجّع كل الدوال اللي اتبدّلت لأصلها. واقفل الـ hook. سطرين.",
          hint1: "الدالة في `jest` اللي بترجّع كل الـ mocks: `restoreAllMocks`.",
          explain: "restoreAllMocks puts the real fetch back.",
        }),
        tline('\n  it("shows loading first, then the users", async () => {', {
          coach: "أول اختبار: الحالة السليمة. سمّيه `shows loading first, then the users`. البيانات بتيجي بعدين، فلازم async.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The first test is the happy path: loading, then data.",
        }),
        tline('    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => users });', {
          coach:
            "بدّل `fetch` اللي على الـ global بدالة وهمية بترجّع promise ناجحة. الرد لازم يشبه رد حقيقي: `ok` بـ true، ودالة `json` بترجّع المستخدمين.",
          hint1: "`jest.spyOn` بياخد الـ object واسم الدالة كنص، وبعدها `mockResolvedValue` بالرد: object فيه `ok` و `json`.",
          explain: "I replace fetch with a mock that resolves like a real response: ok is true and json() gives the users.",
        }),
        tline("    render(<UsersTable />);", {
          coach: "اعرض الـ component. أول ما يتعرض هينادي `fetch` الوهمية.",
          hint1: "`render` وجواها الـ component.",
          explain: "On mount the component calls the mocked fetch.",
        }),
        tline('    expect(screen.getByText("Loading...")).toBeInTheDocument();', {
          coach: "قبل ما الرد يوصل، اتأكد إن رسالة التحميل `Loading...` ظاهرة.",
          hint1: "`expect` على `screen.getByText` بالنص، مع `toBeInTheDocument`.",
          explain: "Right after render, the user sees the loading text.",
        }),
        tline('    expect(await screen.findByText("Mona")).toBeInTheDocument();', {
          coach:
            "دلوقتي استنى البيانات. `getBy` بيدوّر في نفس اللحظة وهيفشل لأن الاسم لسه ما ظهرش. استخدم النوع اللي بيستنى لحد ما العنصر يظهر، وهو بيرجّع promise. اتأكد إن الاسم `Mona` ظهر.",
          hint1: "`screen.findByText` بالاسم، وقبله `await` جوه الـ `expect`.",
          explain: "findBy waits until the element appears. It returns a promise, so I await it.",
        }),
        tline('    expect(screen.getByText("omar@example.com")).toBeInTheDocument();', {
          coach: "البيانات وصلت خلاص، فممكن تدوّر عادي. اتأكد إن إيميل المستخدم التاني `omar@example.com` ظاهر، علشان نغطّي عمود تاني وصف تاني.",
          hint1: "`expect` على `screen.getByText` بالإيميل، مع `toBeInTheDocument`.",
          explain: "Now the data is there, so getBy is enough. I also check another row and another column.",
        }),
        tline('    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();', {
          coach: "واتأكد إن رسالة التحميل اختفت. علشان تتأكد إن حاجة مش موجودة، استخدم النوع اللي بيرجّع `null`.",
          hint1: "`screen.queryByText` بالنص، وبعدها `not.toBeInTheDocument`.",
          explain: "The loading text is gone. For that I use queryBy.",
        }),
        tline('    expect(global.fetch).toHaveBeenCalledWith("/api/users");\n  });', {
          coach: "وآخر تأكد: الطلب راح للعنوان الصح `/api/users`. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `global.fetch`، وبعدها `toHaveBeenCalledWith` بالعنوان.",
          explain: "The mock also tells me which URL was requested.",
        }),
        tline('\n  it("shows an error when the request fails", async () => {', {
          coach: "تاني اختبار: الطلب فشل، زي إن النت مقطوع. سمّيه `shows an error when the request fails`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The second test is a network error.",
        }),
        tline('    jest.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));', {
          coach: "المرة دي خلّي `fetch` الوهمية ترجّع promise فاشلة، بخطأ رسالته `Network error`.",
          hint1: "نفس `jest.spyOn`، بس بعدها `mockRejectedValue` وجواها `new Error`.",
          explain: "mockRejectedValue makes the mock reject, like a network failure.",
        }),
        tline("    render(<UsersTable />);", {
          coach: "اعرض الـ component.",
          hint1: "`render` وجواها الـ component.",
          explain: "I render the component.",
        }),
        tline('    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load users");\n  });', {
          coach:
            "استنى التنبيه يظهر، ودوّر عليه بالـ role بتاعه. واتأكد إن نصّه `Could not load users`. واقفل الاختبار. سطرين.",
          hint1: "`await screen.findByRole` بالـ role `alert`، وبعدها `toHaveTextContent` بالنص.",
          explain: "I wait for the alert and check its text.",
        }),
        tline('\n  it("shows an error when the status is not ok", async () => {', {
          coach:
            "آخر اختبار، وده اللي بيتنسي: السيرفر رد بس بحالة 500. `fetch` مش بيرمي خطأ هنا. سمّيه `shows an error when the status is not ok`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The last test: the server answers, but with an error status.",
        }),
        tline('    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 500, json: async () => [] });', {
          coach:
            "خلّي `fetch` الوهمية تنجح، بس الرد نفسه مش سليم: `ok` بـ false، و `status` بـ 500، ودالة `json` بترجّع array فاضية.",
          hint1: "`mockResolvedValue` بـ object فيه `ok: false` و `status: 500` و `json`.",
          explain: "fetch resolves even for a 500. Only ok and status say that it failed.",
        }),
        tline("    render(<UsersTable />);", {
          coach: "اعرض الـ component.",
          hint1: "`render` وجواها الـ component.",
          explain: "I render the component.",
        }),
        tline('    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load users");\n  });\n});', {
          coach: "ونفس التأكد: التنبيه ظهر بنفس النص. واقفل الاختبار والمجموعة. تلات سطور.",
          hint1: "`await screen.findByRole` بالـ role `alert`، وبعدها `toHaveTextContent`. وبعده `});` مرتين.",
          explain: "The user sees the same error message.",
        }),
      ],
    },
  ],
  complexity:
    "The rule: mock the network, never call it. getBy for now, findBy for later, queryBy for gone. Restore the mock after every test.",
  idea: "بدّل `fetch` بـ mock بيرجّع اللي إنت عايزه، واختبر التلات حالات: تحميل، بيانات، خطأ. و `getBy` للي موجود دلوقتي، و `findBy` للي هييجي بعدين، و `queryBy` للي المفروض يختفي.",
  interview:
    "For a component that fetches, I mock fetch with jest.spyOn and control what it resolves or rejects with. Then I use getBy for the loading state, findBy for the data that comes later, and queryBy to prove the loading text is gone.",
  followUps: [
    {
      question: "What is the difference between getBy, queryBy and findBy?",
      answer: "getBy is for now and throws, queryBy is for now and returns null, findBy waits and returns a promise.",
      how: "getBy and queryBy look once. findBy looks again and again until the element appears or the time is over.",
      example: 'getByText("Loading...") at once, await findByText("Mona") after the fetch, queryByText("Loading...") for gone.',
    },
    {
      question: "Why mock fetch at all?",
      answer: "So the test is fast, always gives the same result, and can produce every case.",
      how: "The mock decides the answer. I can make it succeed, reject, or answer with a 500, without a server.",
      example: 'jest.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"))',
    },
    {
      question: "Why restore the mock in afterEach?",
      answer: "So one test does not change the next one.",
      how: "A spy stays on the object until it is restored. restoreAllMocks puts the real functions back.",
      example: "afterEach(() => { jest.restoreAllMocks(); })",
    },
  ],
};
