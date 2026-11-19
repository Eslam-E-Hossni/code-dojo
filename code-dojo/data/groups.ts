import type { Group } from "./types";

/** The order here is the order on the home page. */
export const groups: Group[] = [
  { id: "most-repeated", title: "Most repeated", titleAr: "الأكتر تكرارًا" },
  { id: "polyfills", title: "Polyfills", titleAr: "اكتبها بإيدك" },
  { id: "algorithms", title: "Algorithms", titleAr: "خوارزميات" },
  { id: "output", title: "Output questions", titleAr: "الكود ده هيطبع إيه؟" },
  { id: "react", title: "React", titleAr: "مسائل React" },
  { id: "event-emitter", title: "EventEmitter", titleAr: "pub / sub" },
  { id: "testing", title: "Testing", titleAr: "اكتب الاختبار: Jest و React Testing Library" },
  { id: "docker", title: "Docker", titleAr: "اكتب الـ Dockerfile" },
  { id: "ci-github", title: "CI/CD · GitHub Actions", titleAr: "اكتب الـ workflow" },
  { id: "ci-azure", title: "CI/CD · Azure Pipelines", titleAr: "اكتب الـ pipeline" },
];
