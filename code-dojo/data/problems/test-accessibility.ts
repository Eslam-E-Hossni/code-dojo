import type { TestingProblem } from "../types";
import { buggy, swap, tline } from "./testing-helpers";

const NEWSLETTER = `import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);

  function subscribe() {
    if (agreed) setDone(true);
  }

  function handleSubmit(event) {
    event.preventDefault();
    subscribe();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>Newsletter</h2>
      <label htmlFor="newsletter-email">Email</label>
      <input
        id="newsletter-email"
        data-testid="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <label>
        <input
          type="checkbox"
          data-testid="agree"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        I agree to the terms
      </label>
      <button type="submit" data-testid="submit" disabled={!agreed}>
        Subscribe
      </button>
      {done && (
        <p role="status" data-testid="message">
          Thanks, {email}
        </p>
      )}
    </form>
  );
}
`;

const CHECKBOX = 'screen.getByRole("checkbox", { name: "I agree to the terms" })';

export const testAccessibility: TestingProblem = {
  id: "test-accessibility",
  kind: "test",
  group: "testing",
  title: "Accessibility in tests: role and label first",
  difficulty: "medium",
  tag: "likely",
  statement:
    "Write the tests for Newsletter. Every element also has a data-testid, but do not use it: find things by role and by label. Cover three things: there is a heading, an input labelled Email and a disabled Subscribe button; ticking the checkbox enables the button; subscribing shows a status message with the email.",
  askFirst: [
    "How would a user, or a screen reader, find this element?",
    "Is there a role and a name I can query by?",
    "What would my test miss if I used a test id?",
  ],
  edgeCases: [
    "A div that looks like a button",
    "An input with a placeholder but no label",
    "A checkbox that is not a real checkbox",
    "A message that a screen reader does not announce",
  ],
  testFile: "/Newsletter.test.js",
  subject: { "/Newsletter.js": NEWSLETTER },
  buggy: [
    buggy(
      "div-as-button",
      "/Newsletter.js",
      swap(
        NEWSLETTER,
        `      <button type="submit" data-testid="submit" disabled={!agreed}>
        Subscribe
      </button>`,
        `      <div data-testid="submit" onClick={subscribe}>
        Subscribe
      </div>`,
      ),
      "The button is a div with a click handler. It cannot be reached with the keyboard, and a screen reader does not call it a button.",
      "اختبارك لقى الزرار بالـ test id أو بالنص، فمحسّش إنه بقى div ومش زرار حقيقي. دوّر عليه بالـ role.",
    ),
    buggy(
      "input-without-label",
      "/Newsletter.js",
      swap(
        NEWSLETTER,
        `      <label htmlFor="newsletter-email">Email</label>
      <input
        id="newsletter-email"`,
        `      <input
        placeholder="Email"`,
      ),
      "The input has a placeholder and no label, so a screen reader cannot say what it is for.",
      "اختبارك لقى الـ input بالـ test id أو بالـ placeholder، فمحسّش إن الـ label اتشال. دوّر عليه بالـ label.",
    ),
    buggy(
      "fake-checkbox",
      "/Newsletter.js",
      swap(
        NEWSLETTER,
        `      <label>
        <input
          type="checkbox"
          data-testid="agree"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        I agree to the terms
      </label>`,
        `      <span data-testid="agree" onClick={() => setAgreed(!agreed)}>
        {agreed ? "[x]" : "[ ]"} I agree to the terms
      </span>`,
      ),
      "The checkbox is a span that only looks like one.",
      "اختبارك دوّر على مربع الموافقة بالـ test id أو بالنص، فمحسّش إنه مبقاش checkbox حقيقي.",
    ),
    buggy(
      "message-without-role",
      "/Newsletter.js",
      swap(NEWSLETTER, '<p role="status" data-testid="message">', '<p data-testid="message">'),
      'The message has no role="status", so a screen reader does not announce it.',
      "اختبارك لقى الرسالة بالنص أو بالـ test id. من غير الـ role بتاعها قارئ الشاشة مش هيعلن عنها، واختبارك مش هيحس.",
    ),
    buggy(
      "button-always-enabled",
      "/Newsletter.js",
      swap(NEWSLETTER, 'data-testid="submit" disabled={!agreed}>', 'data-testid="submit">'),
      "The Subscribe button is enabled before the terms are accepted.",
      "اختبارك مش بيتأكد إن الزرار مقفول قبل الموافقة.",
    ),
  ],
  parts: [
    {
      id: "main",
      title: "Newsletter.test.js",
      signature: 'describe("Newsletter")',
      steps: [
        tline('import { render, screen } from "@testing-library/react";', {
          coach: "نبدأ يا إسلام بالـ imports المعتادة: اللي بيعرض، واللي بيدوّر.",
          accept: ['import { screen, render } from "@testing-library/react";'],
          hint1: '`render` و `screen`، من `"@testing-library/react"`.',
          explain: "render and screen come from React Testing Library.",
        }),
        tline('import userEvent from "@testing-library/user-event";\nimport "@testing-library/jest-dom";', {
          coach: "وبعده: المستخدم الوهمي، والـ matchers بتاعة الـ DOM. سطرين.",
          hint1: '`userEvent` من `"@testing-library/user-event"`، وبعده import من غير اسم لـ `"@testing-library/jest-dom"`.',
          explain: "user-event and jest-dom, as usual.",
        }),
        tline('import Newsletter from "./Newsletter";', {
          coach: "والـ component اللي هنختبره. بص عليه في التاب التاني: كل عنصر فيه `data-testid`، وإحنا مش هنستخدمه خالص.",
          hint1: '`Newsletter` كـ default import من `"./Newsletter"`.',
          explain: "I import the component under test.",
        }),
        tline('\ndescribe("Newsletter", () => {', {
          coach: "افتح مجموعة الاختبارات باسم الـ component: `Newsletter`.",
          hint1: "`describe` بالاسم `Newsletter`، وبعده arrow function.",
          explain: "One group for the component.",
        }),
        tline('  it("has a heading, a labelled input and a disabled button", () => {', {
          coach: "أول اختبار: شكل الفورم أول ما يظهر. سمّيه `has a heading, a labelled input and a disabled button`.",
          hint1: "`it` بالاسم، وبعده arrow function عادية.",
          explain: "The first test: what is on the screen at the start.",
        }),
        tline("    render(<Newsletter />);", {
          coach: "اعرض الـ component.",
          hint1: "`render` وجواها الـ component.",
          explain: "I render the form.",
        }),
        tline('    expect(screen.getByRole("heading", { name: "Newsletter" })).toBeInTheDocument();', {
          coach: "اتأكد إن فيه عنوان اسمه `Newsletter`. دوّر عليه بالـ role بتاع العناوين، مش بالنص.",
          hint1: "`screen.getByRole` بالـ role `heading` والاسم، مع `toBeInTheDocument`.",
          explain: "Role first: this passes only if the text is a real heading.",
        }),
        tline('    expect(screen.getByLabelText("Email")).toBeInTheDocument();', {
          coach:
            "اتأكد إن فيه حقل ليه label نصّه `Email`. لو الـ label اتشال واتحط placeholder مكانه، السطر ده هيفشل، وده المطلوب.",
          hint1: "`screen.getByLabelText` بالنص `Email`، مع `toBeInTheDocument`.",
          explain: "For a form field I query by its label. A placeholder alone would fail this line.",
        }),
        tline('    expect(screen.getByRole("button", { name: "Subscribe" })).toBeDisabled();\n  });', {
          coach: "واتأكد إن زرار `Subscribe` موجود ومقفول. واقفل الاختبار. سطرين.",
          hint1: "`screen.getByRole` بالـ role `button` والاسم، وبعدها الـ matcher `toBeDisabled`.",
          explain: "The button is a real button, and it is disabled at first.",
        }),
        tline('\n  it("enables the button after the checkbox is ticked", async () => {', {
          coach: "تاني اختبار: الموافقة بتفتح الزرار. سمّيه `enables the button after the checkbox is ticked`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The second test: the checkbox enables the button.",
        }),
        tline("    const user = userEvent.setup();\n    render(<Newsletter />);", {
          coach: "جهّز المستخدم الوهمي واعرض الـ component. سطرين.",
          hint1: "`userEvent.setup()` في `user`، وبعدها `render`.",
          explain: "Arrange: a user and the form.",
        }),
        tline("    await user.click(" + CHECKBOX + ");", {
          coach: "دوس على مربع الموافقة. دوّر عليه بالـ role بتاعه، واسمه هو نص الـ label: `I agree to the terms`.",
          hint1: "`user.click` على `screen.getByRole` بالـ role `checkbox` والاسم.",
          explain: "I find the checkbox by its role and its label text, and I click it.",
        }),
        tline("    expect(" + CHECKBOX + ").toBeChecked();", {
          coach: "اتأكد إن المربع بقى متعلّم عليه.",
          hint1: "`expect` على نفس الـ query، وبعدها الـ matcher `toBeChecked`.",
          explain: "The checkbox is checked.",
        }),
        tline('    expect(screen.getByRole("button", { name: "Subscribe" })).toBeEnabled();\n  });', {
          coach: "واتأكد إن الزرار اتفتح. واقفل الاختبار. سطرين.",
          hint1: "`screen.getByRole` بالـ role `button` والاسم، وبعدها `toBeEnabled`.",
          explain: "And the button is enabled now.",
        }),
        tline('\n  it("announces the result after subscribing", async () => {', {
          coach: "آخر اختبار: الاشتراك كله. سمّيه `announces the result after subscribing`.",
          hint1: "`it` بالاسم، وبعده `async` arrow function.",
          explain: "The last test: the whole flow.",
        }),
        tline("    const user = userEvent.setup();\n    render(<Newsletter />);", {
          coach: "التجهيز المعتاد: المستخدم، والعرض. سطرين.",
          hint1: "`userEvent.setup()` في `user`، وبعدها `render`.",
          explain: "Arrange again.",
        }),
        tline('    await user.type(screen.getByLabelText("Email"), "mona@example.com");', {
          coach: "اكتب الإيميل `mona@example.com` في الحقل. دوّر عليه بالـ label.",
          hint1: "`user.type` على `screen.getByLabelText` بالنص `Email`، وبعده الإيميل.",
          explain: "I type into the input that I found by its label.",
        }),
        tline("    await user.click(" + CHECKBOX + ");", {
          coach: "علّم على مربع الموافقة.",
          hint1: "`user.click` على `screen.getByRole` بالـ role `checkbox` والاسم.",
          explain: "I tick the checkbox.",
        }),
        tline('    await user.click(screen.getByRole("button", { name: "Subscribe" }));', {
          coach: "ودوس على زرار `Subscribe`.",
          hint1: "`user.click` على `screen.getByRole` بالـ role `button` والاسم.",
          explain: "I click Subscribe.",
        }),
        tline('    expect(screen.getByRole("status")).toHaveTextContent("Thanks, mona@example.com");\n  });\n});', {
          coach:
            "اتأكد من رسالة النتيجة. دوّر عليها بالـ role بتاع رسائل الحالة، علشان تتأكد إن قارئ الشاشة هيعلن عنها. والنص المفروض يكون `Thanks, mona@example.com`. واقفل الاختبار والمجموعة. تلات سطور.",
          hint1: "`screen.getByRole` بالـ role `status`، وبعدها `toHaveTextContent` بالنص. وبعده `});` مرتين.",
          explain: 'The message has the role "status", so a screen reader announces it.',
        }),
      ],
    },
  ],
  complexity:
    "The rule, in order: getByRole first, then getByLabelText for form fields, then getByText. getByTestId is the last choice.",
  idea: "دوّر على العنصر زي ما المستخدم بيلاقيه: بالـ role والاسم، أو بالـ label. كده الاختبار بيفشل لما الـ accessibility تبوظ. `getByTestId` بيعدّي حتى لو الزرار بقى div، فهو آخر اختيار.",
  interview:
    "I prefer getByRole and getByLabelText, because they find elements the way a user or a screen reader does, so the test also fails when the accessibility breaks. getByTestId is my last choice: it keeps passing even when a button becomes a div.",
  followUps: [
    {
      question: "Why is getByTestId the last choice?",
      answer: "A test id says nothing about what the user gets.",
      how: "The query finds the element by an attribute that users never see. The element can lose its role or its label and the test still passes.",
      example: 'A div with data-testid="submit" passes getByTestId("submit"), but fails getByRole("button").',
    },
    {
      question: "What is the order of queries you prefer?",
      answer: "Role, then label, then text, and test id last.",
      how: "I start from what is closest to how a person finds the element, and go down only when the one above is not possible.",
      example: 'getByRole("button", { name: "Subscribe" }), getByLabelText("Email"), getByText("Thanks").',
    },
    {
      question: "Where does the name in getByRole come from?",
      answer: "From the accessible name of the element.",
      how: "For a button it is its text. For an input it is its label. aria-label and aria-labelledby can also set it.",
      example: 'screen.getByRole("checkbox", { name: "I agree to the terms" }) uses the text of the label.',
    },
  ],
};
