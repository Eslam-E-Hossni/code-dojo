import type { TestingProblem } from "../types";
import { buggy, swap, tline } from "./testing-helpers";

const LOGIN_FORM = `import { useState } from "react";

export default function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    onSubmit({ email, password });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Log in</button>
    </form>
  );
}
`;

const SETUP = "    const user = userEvent.setup();\n    const onSubmit = jest.fn();\n    render(<LoginForm onSubmit={onSubmit} />);";

export const testLoginForm: TestingProblem = {
  id: "test-login-form",
  kind: "test",
  group: "testing",
  title: "Forms: LoginForm",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write the tests for LoginForm. It takes an onSubmit prop. Cover three things: with a valid email and password it calls onSubmit once with both values; with an email that is not valid it shows an alert and does not submit; with a password shorter than 6 characters it shows an alert and does not submit.",
  askFirst: [
    "What does the form do when the data is valid: call a prop, or send a request?",
    "What are the validation rules and the exact messages?",
    "How are errors shown to the user and to a screen reader?",
  ],
  edgeCases: [
    "Submit with an email that has no @",
    "Submit with a password that is too short",
    "The callback must be called once, not twice",
    "The callback must not be called when the data is not valid",
  ],
  testFile: "/LoginForm.test.js",
  subject: { "/LoginForm.js": LOGIN_FORM },
  buggy: [
    buggy(
      "submits-twice",
      "/LoginForm.js",
      swap(LOGIN_FORM, "    onSubmit({ email, password });", "    onSubmit({ email, password });\n    onSubmit({ email, password });"),
      "onSubmit is called twice for one click.",
      "اختبارك بيتأكد إن الـ callback اتنادى، بس مش بيتأكد إنه اتنادى مرة واحدة بس.",
    ),
    buggy(
      "no-password-in-data",
      "/LoginForm.js",
      swap(LOGIN_FORM, "    onSubmit({ email, password });", "    onSubmit({ email });"),
      "onSubmit gets the email but not the password.",
      "اختبارك مش بيتأكد من القيم اللي الـ callback اتنادى بيها، أو بيتأكد من جزء منها بس.",
    ),
    buggy(
      "submits-invalid-email",
      "/LoginForm.js",
      swap(
        LOGIN_FORM,
        '      setError("Enter a valid email");\n      return;',
        '      setError("Enter a valid email");\n      onSubmit({ email, password });\n      return;',
      ),
      "With a wrong email the error shows, but onSubmit is still called.",
      "اختبارك بيتأكد إن رسالة الخطأ ظهرت، بس مش بيتأكد إن الفورم ما اتبعتش.",
    ),
    buggy(
      "error-without-role",
      "/LoginForm.js",
      swap(LOGIN_FORM, '{error && <p role="alert">{error}</p>}', "{error && <p>{error}</p>}"),
      'The error message has no role="alert", so a screen reader does not announce it.',
      "اختبارك بيدوّر على رسالة الخطأ بالنص بس. المفروض تتأكد إنها تنبيه، علشان قارئ الشاشة يعلن عنها.",
    ),
    buggy(
      "no-password-rule",
      "/LoginForm.js",
      swap(LOGIN_FORM, "if (password.length < 6) {", "if (password.length < 0) {"),
      "A password that is too short is accepted.",
      "مفيش اختبار للباسورد القصير.",
    ),
  ],
  parts: [
    {
      id: "main",
      title: "LoginForm.test.js",
      signature: 'describe("LoginForm")',
      steps: [
        tline('import { render, screen } from "@testing-library/react";', {
          coach: "نبدأ يا إسلام بالـ imports المعتادة. الأول: اللي بيعرض الـ component، واللي بندوّر بيه في الشاشة.",
          accept: ['import { screen, render } from "@testing-library/react";'],
          hint1: '`render` و `screen`، من `"@testing-library/react"`.',
          explain: "render and screen come from React Testing Library.",
        }),
        tline('import userEvent from "@testing-library/user-event";\nimport "@testing-library/jest-dom";', {
          coach: "وبعده: المستخدم الوهمي، والـ matchers بتاعة الـ DOM. سطرين.",
          hint1: '`userEvent` من `"@testing-library/user-event"`، وبعده import من غير اسم لـ `"@testing-library/jest-dom"`.',
          explain: "user-event for typing and clicking, jest-dom for the DOM matchers.",
        }),
        tline('import LoginForm from "./LoginForm";', {
          coach: "والـ component اللي هنختبره.",
          hint1: '`LoginForm` كـ default import من `"./LoginForm"`.',
          explain: "I import the form under test.",
        }),
        tline('\ndescribe("LoginForm", () => {', {
          coach: "افتح مجموعة الاختبارات باسم الـ component: `LoginForm`.",
          hint1: "`describe` بالاسم `LoginForm`، وبعده arrow function.",
          explain: "One group for the form.",
        }),
        tline('  it("submits the email and the password", async () => {', {
          coach: "أول اختبار: الحالة السليمة. سمّيه `submits the email and the password`. فيه كتابة وضغط، فلازم async.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The first test is the happy path.",
        }),
        tline("    const user = userEvent.setup();", {
          coach: "جهّز المستخدم الوهمي.",
          hint1: "`userEvent.setup()` في متغير اسمه `user`.",
          explain: "I create the user.",
        }),
        tline("    const onSubmit = jest.fn();", {
          coach:
            "الفورم بياخد دالة كـ prop وبيناديها لما يتبعت. عايزين دالة وهمية بتسجّل هي اتنادت كام مرة وبإيه. سمّيها `onSubmit`.",
          hint1: "`jest.fn()` بيعمل دالة وهمية. خزّنها في `onSubmit`.",
          explain: "jest.fn() makes a mock function. It records every call and its arguments.",
        }),
        tline("    render(<LoginForm onSubmit={onSubmit} />);", {
          coach: "اعرض الفورم وابعتله الدالة الوهمية.",
          hint1: "`render` للـ component، مع الـ prop `onSubmit` بقيمة الدالة.",
          explain: "I render the form with the mock as its prop.",
        }),
        tline('    await user.type(screen.getByLabelText("Email"), "sara@example.com");', {
          coach:
            "اكتب الإيميل `sara@example.com` في الحقل بتاعه. دوّر على الحقل زي المستخدم: بالنص اللي في الـ label بتاعه.",
          hint1: "`user.type` بياخد العنصر وبعده النص. العنصر من `screen.getByLabelText` بالنص `Email`. ومتنساش `await`.",
          explain: "I find the input by its label, the way a user does, and I type into it.",
        }),
        tline('    await user.type(screen.getByLabelText("Password"), "secret123");', {
          coach: "ونفس الطريقة للباسورد: اكتب `secret123`.",
          hint1: "نفس السطر، بالـ label `Password` والنص `secret123`.",
          explain: "The same for the password.",
        }),
        tline('    await user.click(screen.getByRole("button", { name: "Log in" }));', {
          coach: "دوس على زرار الإرسال. دوّر عليه بالـ role والاسم.",
          hint1: "`user.click` على `screen.getByRole` بالـ role `button` والاسم `Log in`.",
          explain: "I click the submit button.",
        }),
        tline("    expect(onSubmit).toHaveBeenCalledTimes(1);", {
          coach: "أول تأكد: الدالة اتنادت مرة واحدة بالظبط، مش مرتين.",
          hint1: "`expect` على `onSubmit`، وبعدها الـ matcher اللي بيعدّ النداءات.",
          explain: "The callback was called once, not twice.",
        }),
        tline(
          '    expect(onSubmit).toHaveBeenCalledWith({ email: "sara@example.com", password: "secret123" });\n  });',
          {
            coach: "وتاني تأكد: اتنادت بـ object فيه الإيميل والباسورد اللي اتكتبوا. واقفل الاختبار. سطرين.",
            hint1: "الـ matcher اللي بيتأكد من الـ arguments، وجواه object فيه `email` و `password`.",
            explain: "And it got the values that were typed.",
          },
        ),
        tline('\n  it("shows an error and does not submit when the email is not valid", async () => {', {
          coach: "تاني اختبار: إيميل غلط. سمّيه `shows an error and does not submit when the email is not valid`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The second test is a validation error.",
        }),
        tline(SETUP, {
          coach: "نفس التجهيز: المستخدم، والدالة الوهمية، وعرض الفورم. تلات سطور.",
          hint1: "`userEvent.setup()`، وبعدها `jest.fn()`، وبعدها `render` بالـ prop.",
          explain: "Arrange: a user, a mock function, and the form.",
        }),
        tline('    await user.type(screen.getByLabelText("Email"), "sara");', {
          coach: "اكتب إيميل غلط، من غير علامة @: الكلمة `sara` بس.",
          hint1: "`user.type` في حقل `Email` بالنص `sara`.",
          explain: "I type an email with no at sign.",
        }),
        tline('    await user.click(screen.getByRole("button", { name: "Log in" }));', {
          coach: "ودوس على زرار الإرسال.",
          hint1: "`user.click` على الزرار اللي اسمه `Log in`.",
          explain: "I submit the form.",
        }),
        tline('    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email");', {
          coach:
            "اتأكد من رسالة الخطأ. دوّر عليها بالـ role بتاع التنبيه، مش بالنص: كده بتتأكد كمان إن قارئ الشاشة هيعلن عنها. والنص المفروض يكون `Enter a valid email`.",
          hint1: "`screen.getByRole` بالـ role `alert`، وبعدها الـ matcher `toHaveTextContent` بالنص.",
          explain: 'I look for the role "alert", so the test also checks that a screen reader announces the error.',
        }),
        tline("    expect(onSubmit).not.toHaveBeenCalled();\n  });", {
          coach: "والتأكد اللي ناس كتير بتنساه: الفورم ما اتبعتش. واقفل الاختبار. سطرين.",
          hint1: "`expect` على `onSubmit`، وبعدها `not` وبعدها الـ matcher بتاع النداء.",
          explain: "And the callback was not called.",
        }),
        tline('\n  it("shows an error when the password is too short", async () => {', {
          coach: "آخر اختبار: باسورد قصير. سمّيه `shows an error when the password is too short`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The last test is the second validation rule.",
        }),
        tline(SETUP, {
          coach: "التجهيز المعتاد: المستخدم، والدالة الوهمية، وعرض الفورم. تلات سطور.",
          hint1: "`userEvent.setup()`، وبعدها `jest.fn()`، وبعدها `render` بالـ prop.",
          explain: "Arrange again, fresh for this test.",
        }),
        tline(
          '    await user.type(screen.getByLabelText("Email"), "sara@example.com");\n    await user.type(screen.getByLabelText("Password"), "123");',
          {
            coach: "المرة دي الإيميل سليم `sara@example.com`، والباسورد قصير: `123`. سطرين.",
            hint1: "`user.type` في `Email`، وبعده `user.type` في `Password`.",
            explain: "A valid email and a password that is too short.",
          },
        ),
        tline('    await user.click(screen.getByRole("button", { name: "Log in" }));', {
          coach: "ودوس على زرار الإرسال.",
          hint1: "`user.click` على الزرار اللي اسمه `Log in`.",
          explain: "I submit the form.",
        }),
        tline(
          '    expect(screen.getByRole("alert")).toHaveTextContent("Password must be at least 6 characters");\n    expect(onSubmit).not.toHaveBeenCalled();\n  });\n});',
          {
            coach:
              "اتأكد إن التنبيه نصّه `Password must be at least 6 characters`، وإن الدالة ما اتنادتش. واقفل الاختبار والمجموعة. أربع سطور.",
            hint1: "سطر للتنبيه بـ `toHaveTextContent`، وسطر بـ `not.toHaveBeenCalled`، وبعده `});` مرتين.",
            explain: "The right message shows, and nothing was submitted.",
          },
        ),
      ],
    },
  ],
  complexity:
    "The rule: a form test types like a user, then checks two things: what the callback got, and what the user sees when the data is wrong.",
  idea: "اختبار الفورم ليه وشّين: لما البيانات سليمة تتأكد إن الـ callback اتنادى مرة واحدة وبالقيم الصح، ولما تكون غلط تتأكد إن الرسالة ظهرت وإن الـ callback ما اتنادتش.",
  interview:
    "For a form I pass a jest.fn() as the callback, fill the inputs through their labels with user-event, and assert both the arguments of the callback and the error message the user sees.",
  followUps: [
    {
      question: "What does jest.fn() give you?",
      answer: "A mock function that records how it was called.",
      how: "It keeps every call and its arguments, so matchers can ask how many times and with what.",
      example: 'expect(onSubmit).toHaveBeenCalledWith({ email: "sara@example.com", password: "secret123" })',
    },
    {
      question: "Why getByLabelText for an input?",
      answer: "It finds the input the way a user does: by reading its label.",
      how: "The query follows the link between the label and the input. If the label is missing, the test fails.",
      example: 'screen.getByLabelText("Email")',
    },
    {
      question: "Why assert not.toHaveBeenCalled in the error test?",
      answer: "Showing an error is not enough. The form must also stop.",
      how: "A form can show the message and still submit. Only the negative assertion catches that.",
      example: "expect(onSubmit).not.toHaveBeenCalled()",
    },
  ],
};
