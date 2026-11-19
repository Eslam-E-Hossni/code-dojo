/**
 * Arabic counts things in four ways: one, two, three to ten, and eleven or
 * more. "يوم", "يومين", "3 أيام", "11 يوم".
 */
export interface CountForms {
  /** The whole phrase for 1. */
  one: string;
  /** The whole phrase for 2. */
  two: string;
  /** The word after a number from 3 to 10. */
  few: string;
  /** The word after 0, or a number from 11 up. */
  many: string;
}

export function countText(count: number, forms: CountForms): string {
  if (count === 1) return forms.one;
  if (count === 2) return forms.two;
  if (count >= 3 && count <= 10) return count + " " + forms.few;
  return count + " " + forms.many;
}

export const DAYS: CountForms = { one: "يوم", two: "يومين", few: "أيام", many: "يوم" };
export const WEAK_LINES: CountForms = { one: "سطر ضعيف", two: "سطرين ضعاف", few: "سطور ضعيفة", many: "سطر ضعيف" };
export const PROBLEMS: CountForms = { one: "مسألة واحدة", two: "مسألتين", few: "مسائل", many: "مسألة" };
export const RULES: CountForms = { one: "قاعدة واحدة", two: "قاعدتين", few: "قواعد", many: "قاعدة" };
