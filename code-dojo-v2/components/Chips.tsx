import type { Difficulty, Tag } from "@/data/types";

const DIFFICULTY: Record<Difficulty, { label: string; tone: string }> = {
  easy: { label: "easy", tone: "border-ok/40 text-ok" },
  medium: { label: "medium", tone: "border-warn/40 text-warn" },
  hard: { label: "hard", tone: "border-bad/40 text-bad" },
};

const TAG_HELP: Record<Tag, string> = {
  reported: "Asked in real interviews",
  likely: "Likely at senior level",
  polyfill: "Write your own version of a built-in",
};

const CHIP = "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium";

export function DifficultyChip({ value }: { value: Difficulty }) {
  const item = DIFFICULTY[value];
  return <span className={CHIP + " " + item.tone}>{item.label}</span>;
}

export function TagChip({ value }: { value: Tag }) {
  return (
    <span title={TAG_HELP[value]} className={CHIP + " border-line text-mut"}>
      {value}
    </span>
  );
}
