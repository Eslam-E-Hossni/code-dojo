import type { TestingProblem } from "../types";
import { buggy, swap, tline } from "./testing-helpers";

const API = `export async function getUser(id) {
  const response = await fetch("/api/users/" + id);
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}
`;

const USER_PROFILE = `import { useEffect, useState } from "react";
import { getUser } from "./api";

export default function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUser(null);
    setFailed(false);

    getUser(userId)
      .then((data) => {
        if (active) setUser(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (failed) return <p role="alert">Could not load the user</p>;
  if (!user) return <p>Loading...</p>;

  return (
    <section>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </section>
  );
}
`;

export const testModuleMock: TestingProblem = {
  id: "test-module-mock",
  kind: "test",
  group: "testing",
  title: "Mocking a module: jest.mock",
  difficulty: "hard",
  tag: "likely",
  statement:
    "Write the tests for UserProfile. It imports getUser from ./api and calls it with the userId prop. Mock the whole ./api module. Cover two things: it asks for the right user once and shows the name; it shows an alert when getUser rejects. Clear the mocks between the tests.",
  askFirst: [
    "Does the component call fetch itself, or a function from another file?",
    "Should the test know about the URL, or only about getUser?",
    "Do calls from one test leak into the next one?",
  ],
  edgeCases: [
    "getUser rejects",
    "getUser called with the wrong id",
    "getUser called more than once",
    "Calls counted from an earlier test",
  ],
  testFile: "/UserProfile.test.js",
  subject: { "/UserProfile.js": USER_PROFILE, "/api.js": API },
  buggy: [
    buggy(
      "wrong-id",
      "/UserProfile.js",
      swap(USER_PROFILE, "getUser(userId)", "getUser(1)"),
      "The component always asks for user 1 and ignores the userId prop.",
      "اختبارك مش بيتأكد إن الدالة اتنادت بالـ id اللي اتبعت للـ component.",
    ),
    buggy(
      "calls-twice",
      "/UserProfile.js",
      swap(USER_PROFILE, "    getUser(userId)\n      .then", "    getUser(userId).catch(() => {});\n    getUser(userId)\n      .then"),
      "The component asks for the user twice.",
      "اختبارك مش بيتأكد إن الطلب اتبعت مرة واحدة بس.",
    ),
    buggy(
      "shows-email-as-title",
      "/UserProfile.js",
      swap(USER_PROFILE, "<h2>{user.name}</h2>", "<h2>{user.email}</h2>"),
      "The heading shows the email, not the name.",
      "اختبارك مش بيتأكد إن الاسم هو اللي ظاهر في العنوان.",
    ),
    buggy(
      "no-error-state",
      "/UserProfile.js",
      swap(USER_PROFILE, "if (active) setFailed(true);", "if (active) setFailed(false);"),
      "When getUser rejects, the component stays on Loading... forever.",
      "مفيش اختبار لحالة إن الدالة ترجّع خطأ.",
    ),
  ],
  parts: [
    {
      id: "main",
      title: "UserProfile.test.js",
      signature: 'describe("UserProfile")',
      steps: [
        tline('import { render, screen } from "@testing-library/react";\nimport "@testing-library/jest-dom";', {
          coach: "نبدأ يا إسلام بالـ imports المعتادة: اللي بيعرض واللي بيدوّر، وبعده الـ matchers بتاعة الـ DOM. سطرين.",
          accept: ['import { screen, render } from "@testing-library/react";\nimport "@testing-library/jest-dom";'],
          hint1: '`render` و `screen` من `"@testing-library/react"`، وبعده import من غير اسم لـ `"@testing-library/jest-dom"`.',
          explain: "render, screen and the DOM matchers.",
        }),
        tline('import UserProfile from "./UserProfile";', {
          coach: "والـ component اللي هنختبره.",
          hint1: '`UserProfile` كـ default import من `"./UserProfile"`.',
          explain: "I import the component under test.",
        }),
        tline('import { getUser } from "./api";', {
          coach:
            "الـ component مش بينادي `fetch` بنفسه، ده بينادي دالة من ملف تاني. هات نفس الدالة هنا، علشان نتحكم فيها من الاختبار.",
          hint1: '`getUser` كـ named import من `"./api"`.',
          explain: "I import the same function the component uses, so the test can control it.",
        }),
        tline('\njest.mock("./api");', {
          coach:
            "ودلوقتي أهم سطر: قول لـ Jest يبدّل الملف `./api` كله بنسخة وهمية. كل دالة فيه هتبقى `jest.fn()`. Jest بيرفع السطر ده لفوق قبل الـ imports، فالـ component والاختبار الاتنين هياخدوا النسخة الوهمية.",
          hint1: "`jest.mock` بياخد مسار الملف كنص: `\"./api\"`.",
          explain: "jest.mock replaces the whole module. Every function in it becomes a mock function, for the test and for the component.",
        }),
        tline('\ndescribe("UserProfile", () => {', {
          coach: "افتح مجموعة الاختبارات باسم الـ component: `UserProfile`.",
          hint1: "`describe` بالاسم `UserProfile`، وبعده arrow function.",
          explain: "One group for the component.",
        }),
        tline("  beforeEach(() => {\n    jest.clearAllMocks();\n  });", {
          coach:
            "الدالة الوهمية بتفضل فاكرة كل نداءاتها من اختبار للتاني. قبل كل اختبار امسح اللي اتسجّل، علشان العدّ يبدأ من صفر. تلات سطور.",
          hint1: "`beforeEach` وجواها `jest.clearAllMocks()`.",
          explain: "A mock remembers its calls across tests. clearAllMocks resets the counts before each test.",
        }),
        tline('\n  it("asks for the user by id and shows the name", async () => {', {
          coach: "أول اختبار: الحالة السليمة. سمّيه `asks for the user by id and shows the name`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The first test is the happy path.",
        }),
        tline('    getUser.mockResolvedValue({ name: "Mona", email: "mona@example.com" });', {
          coach:
            "`getUser` بقت دالة وهمية. قول لها ترجّع promise ناجحة بمستخدم: الاسم `Mona` والإيميل `mona@example.com`.",
          hint1: "`getUser.mockResolvedValue` بـ object فيه `name` و `email`.",
          explain: "I tell the mocked getUser what to resolve with.",
        }),
        tline("    render(<UserProfile userId={7} />);", {
          coach: "اعرض الـ component وابعتله الـ id رقم 7.",
          hint1: "`render` للـ component، مع الـ prop `userId` بقيمة 7.",
          explain: "I render the component with a user id.",
        }),
        tline('    expect(await screen.findByRole("heading", { name: "Mona" })).toBeInTheDocument();', {
          coach:
            "استنى الاسم يظهر، ودوّر عليه كعنوان بالـ role والاسم. البيانات بتيجي بعدين، فاستخدم النوع اللي بيستنى.",
          hint1: "`await screen.findByRole` بالـ role `heading` والاسم `Mona`، مع `toBeInTheDocument`.",
          explain: "I wait for the heading with the name.",
        }),
        tline("    expect(getUser).toHaveBeenCalledTimes(1);", {
          coach: "اتأكد إن الدالة اتنادت مرة واحدة بس.",
          hint1: "`expect` على `getUser`، وبعدها `toHaveBeenCalledTimes(1)`.",
          explain: "The module was called once.",
        }),
        tline("    expect(getUser).toHaveBeenCalledWith(7);\n  });", {
          coach: "واتأكد إنها اتنادت بنفس الـ id اللي بعتّه. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `getUser`، وبعدها `toHaveBeenCalledWith(7)`.",
          explain: "And with the id from the prop.",
        }),
        tline('\n  it("shows an error when the request fails", async () => {', {
          coach: "تاني اختبار: الدالة فشلت. سمّيه `shows an error when the request fails`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The second test: the module rejects.",
        }),
        tline('    getUser.mockRejectedValue(new Error("Network error"));', {
          coach: "المرة دي قول للدالة الوهمية ترجّع promise فاشلة، بخطأ رسالته `Network error`.",
          hint1: "`getUser.mockRejectedValue` وجواها `new Error`.",
          explain: "Now the mock rejects.",
        }),
        tline("    render(<UserProfile userId={7} />);", {
          coach: "اعرض الـ component بنفس الـ id.",
          hint1: "`render` للـ component، مع `userId` بقيمة 7.",
          explain: "I render the component.",
        }),
        tline('    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the user");', {
          coach: "استنى التنبيه يظهر، واتأكد إن نصّه `Could not load the user`.",
          hint1: "`await screen.findByRole` بالـ role `alert`، وبعدها `toHaveTextContent` بالنص.",
          explain: "The user sees the error message.",
        }),
        tline("    expect(getUser).toHaveBeenCalledTimes(1);\n  });\n});", {
          coach:
            "واتأكد إن الدالة اتنادت مرة واحدة في الاختبار ده. لو مكنتش مسحت الـ mocks فوق، العدد هنا كان هيبقى 2. واقفل الاختبار والمجموعة. تلات سطور.",
          hint1: "`expect` على `getUser`، وبعدها `toHaveBeenCalledTimes(1)`. وبعده `});` مرتين.",
          explain: "One call in this test. Without clearAllMocks the count would include the first test.",
        }),
      ],
    },
  ],
  complexity:
    "The rule: mock at the edge of your code. jest.mock the module the component imports, set what it returns in each test, and clear the mocks between tests.",
  idea: "`jest.mock(\"./api\")` بيبدّل الملف كله، فالـ component بياخد دوال وهمية من غير ما يعرف. في كل اختبار بتحدد الدالة ترجّع إيه، وبتمسح النداءات بين الاختبارات.",
  interview:
    "jest.mock replaces a whole module with automatic mocks. In each test I set what the function resolves or rejects with, and I clear the mocks in beforeEach so the call counts do not leak between tests.",
  followUps: [
    {
      question: "What does jest.mock do?",
      answer: "It replaces a module with a mocked version for the whole test file.",
      how: "Jest moves the call above the imports. Every exported function becomes a jest.fn that returns undefined until I say otherwise.",
      example: 'jest.mock("./api"); then getUser.mockResolvedValue({ name: "Mona" })',
    },
    {
      question: "What is the difference between clearAllMocks, resetAllMocks and restoreAllMocks?",
      answer: "clear forgets the calls. reset also removes the fake return values. restore puts back the original function of a spy.",
      how: "Each one does more than the one before it. I pick the smallest one that gives the next test a clean start.",
      example: "beforeEach(() => { jest.clearAllMocks(); })",
    },
    {
      question: "When do you mock a module and when do you mock fetch?",
      answer: "I mock the thing the component talks to directly.",
      how: "If the component calls fetch, I mock fetch. If it calls a function from an api file, I mock that file, and the URL stays out of the test.",
      example: "UserProfile imports getUser, so the test mocks ./api and never mentions a URL.",
    },
  ],
};
