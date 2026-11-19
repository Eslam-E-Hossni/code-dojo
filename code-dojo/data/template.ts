import type { TemplateStep } from "./types";

/** The 7-step routine for any live-coding problem. */
export const interviewTemplate: TemplateStep[] = [
  {
    id: "repeat",
    title: "كرّر المسألة بكلامك",
    note: "علشان تتأكد إنك فاهم المطلوب، وتكسب ثواني تفكير.",
    say: "So the task is to ... and return ... Is that right?",
  },
  {
    id: "ask",
    title: "اسأل عن الـ input والـ output",
    note: "النوع، الحجم، هل أرجّع جديد ولا أعدّل الأصلي، وهل الدوال الجاهزة مسموحة.",
    say: "What is the input type? Can I change the input, or should I return a new one? Can I use built-in methods?",
  },
  {
    id: "edge-cases",
    title: "قول الـ edge cases",
    note: "فاضي، عنصر واحد، مكرر، سالب، `null` أو `undefined`، متداخل جدًا، كبير جدًا.",
    say: "Let me think about edge cases: empty input, one item, duplicates, negative numbers.",
  },
  {
    id: "plan",
    title: "قول الخطة قبل ما تكتب",
    note: "جملتين بس، واستنى موافقته. لو عندك حل بسيط وحل أسرع، قول الاتنين.",
    say: "My plan is to loop once and keep a Map. That is O(n). Should I go with this?",
  },
  {
    id: "code",
    title: "اكتب وإنت بتتكلم",
    note: "حل شغال الأول، أسماء واضحة، ومتسكتش أكتر من عشر ثواني.",
    say: "Here I save the value, so I can find it later in O(1).",
  },
  {
    id: "test",
    title: "جرّب بإيدك",
    note: "امشي على مثال سطر سطر، وبعدين على edge case واحد.",
    say: "Let me test it with [2, 7, 11] and target 9. Then with an empty array.",
  },
  {
    id: "complexity",
    title: "قول الـ complexity والتحسين",
    note: "الوقت والمساحة، وإيه اللي كنت هتزوّده لو معاك وقت.",
    say: "Time is O(n), space is O(n). With more time I would add input validation and tests.",
  },
];
