import { describe, expect, it } from "vitest";
import { problems } from "@/data/problems";
import type { Problem } from "@/data/types";
import { DRILL_SIZE, countWeakSteps, pickDrill } from "@/lib/drill";
import {
  activeDays,
  addDays,
  bandOf,
  countMastery,
  dayOf,
  daysBetween,
  dueToday,
  nextUp,
  reviewAll,
  reviewOf,
  streakOf,
  suggestedMode,
  withStepResult,
} from "@/lib/review";
import { flattenSteps } from "@/lib/steps";
import type { Mode, ProblemProgress, RunRecord, Store } from "@/lib/store";

/** A session that finished at noon, local time, on the given day. */
function run(day: string, score: number, mode: Mode = "learn", hour = 12): RunRecord {
  const [y, m, d] = day.split("-").map(Number);
  return { at: new Date(y, m - 1, d, hour).toISOString(), mode, points: Math.round(score * 100), max: 100 };
}

function progress(runs: RunRecord[], weak: string[] = [], shaky: string[] = []): ProblemProgress {
  return { runs, weak, shaky };
}

function storeOf(entries: Record<string, ProblemProgress>, drills: Store["drills"] = []): Store {
  return { version: 1, points: 0, problems: entries, drills };
}

function find(id: string): Problem {
  const problem = problems.find((p) => p.id === id);
  if (!problem) throw new Error("no problem " + id);
  return problem;
}

const D1 = "2026-11-18";

describe("calendar days", () => {
  it("writes a local day with two digits", () => {
    expect(dayOf(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(dayOf(new Date(2026, 10, 18, 0, 0))).toBe("2026-11-18");
  });

  it("adds and subtracts days across months and years", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 7)).toBe("2027-01-07");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2026-11-18", "2026-11-25")).toBe(7);
    expect(daysBetween("2026-11-25", "2026-11-18")).toBe(-7);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("is not thrown off by a change of the clock", () => {
    // Around the last Sunday of March and October many countries move the clock.
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(addDays("2026-10-24", 3)).toBe("2026-10-27");
  });
});

describe("the review schedule", () => {
  it("a problem with no finished session is new and never due", () => {
    const review = reviewOf(progress([]), D1);
    expect(review.mastery).toBe("new");
    expect(review.dueDay).toBeNull();
    expect(review.dueIn).toBeNull();
  });

  it("the first session comes back the next day, however good it was", () => {
    const review = reviewOf(progress([run(D1, 1)]), D1);
    expect(review.interval).toBe(1);
    expect(review.dueDay).toBe("2026-11-19");
    expect(review.dueIn).toBe(1);
    expect(review.mastery).toBe("learning");
  });

  it("climbs 1 day, 3 days, 7 days with strong scores on different days", () => {
    const runs = [run("2026-11-18", 1), run("2026-11-19", 0.9, "recall"), run("2026-11-22", 1, "exam")];
    expect(reviewOf(progress(runs.slice(0, 1)), D1).interval).toBe(1);
    expect(reviewOf(progress(runs.slice(0, 2)), D1).interval).toBe(3);
    const top = reviewOf(progress(runs), "2026-11-22");
    expect(top.interval).toBe(7);
    expect(top.dueDay).toBe("2026-11-29");
    expect(top.mastery).toBe("strong");
  });

  it("stays at 7 days after it is reached", () => {
    const runs = [run("2026-11-01", 1), run("2026-11-02", 1), run("2026-11-05", 1), run("2026-11-12", 1)];
    expect(reviewOf(progress(runs), "2026-11-12").interval).toBe(7);
  });

  it("lets the score decide how far it can go: 85% up to 7, 60% up to 3, less back to 1", () => {
    const top = [run("2026-11-01", 1), run("2026-11-02", 1), run("2026-11-05", 1)];
    expect(reviewOf(progress([...top, run("2026-11-12", 0.85)]), D1).interval).toBe(7);
    expect(reviewOf(progress([...top, run("2026-11-12", 0.84)]), D1).interval).toBe(3);
    expect(reviewOf(progress([...top, run("2026-11-12", 0.6)]), D1).interval).toBe(3);
    expect(reviewOf(progress([...top, run("2026-11-12", 0.59)]), D1).interval).toBe(1);
    expect(reviewOf(progress([...top, run("2026-11-12", 0)]), D1).mastery).toBe("learning");
    expect(bandOf(0.85)).toBe("strong");
    expect(bandOf(0.6)).toBe("ok");
    expect(bandOf(0.59)).toBe("weak");
  });

  it("an ok score does not climb past 3 days", () => {
    const runs = [run("2026-11-01", 0.7), run("2026-11-02", 0.7), run("2026-11-05", 0.7), run("2026-11-08", 0.7)];
    expect(reviewOf(progress(runs), D1).interval).toBe(3);
  });

  it("climbs one step per day, even with three sessions in one sitting", () => {
    const sameDay = [run(D1, 1, "learn", 9), run(D1, 1, "recall", 10), run(D1, 1, "exam", 11)];
    expect(reviewOf(progress(sameDay), D1).interval).toBe(1);
  });

  it("on one day the last session decides", () => {
    const start = [run("2026-11-17", 1)];
    const goodThenBad = [...start, run(D1, 1, "recall", 9), run(D1, 0.3, "exam", 10)];
    const badThenGood = [...start, run(D1, 0.3, "recall", 9), run(D1, 1, "exam", 10)];
    expect(reviewOf(progress(goodThenBad), D1).interval).toBe(1);
    expect(reviewOf(progress(badThenGood), D1).interval).toBe(3);
  });

  it("counts the days from the last session", () => {
    const review = reviewOf(progress([run("2026-11-10", 1), run("2026-11-11", 1)]), "2026-11-18");
    expect(review.dueDay).toBe("2026-11-14");
    expect(review.dueIn).toBe(-4);
  });

  it("brings a problem with weak steps back after 1 day", () => {
    const runs = [run("2026-11-01", 1), run("2026-11-02", 1), run("2026-11-05", 1)];
    const clean = reviewOf(progress(runs), "2026-11-05");
    const weak = reviewOf(progress(runs, ["main:3"]), "2026-11-05");
    expect(clean.interval).toBe(7);
    expect(clean.sooner).toBe(false);
    expect(weak.interval).toBe(1);
    expect(weak.dueDay).toBe("2026-11-06");
    expect(weak.sooner).toBe(true);
    // Weak steps also keep it from counting as strong.
    expect(weak.mastery).toBe("learning");
  });

  it("ignores a session whose date cannot be read", () => {
    const broken = { at: "not a date", mode: "learn" as const, points: 10, max: 10 };
    expect(reviewOf(progress([broken]), D1).mastery).toBe("new");
    expect(reviewOf(progress([run(D1, 1), broken]), D1).interval).toBe(1);
  });

  it("treats a session with no possible points as a weak score", () => {
    const empty = { at: run(D1, 1).at, mode: "output" as const, points: 0, max: 0 };
    expect(reviewOf(progress([empty]), D1).lastScore).toBe(0);
  });
});

describe("the mode to open for a review", () => {
  const debounce = find("debounce");
  const output = find("event-loop-order");

  function suggest(problem: Problem, p: ProblemProgress): Mode {
    return suggestedMode(problem, p, reviewOf(p, "2026-12-01"));
  }

  it("goes from Learn to Recall to Exam as the problem needs less help", () => {
    expect(suggest(debounce, progress([]))).toBe("learn");
    expect(suggest(debounce, progress([run("2026-11-01", 1)]))).toBe("recall");
    expect(suggest(debounce, progress([run("2026-11-01", 1), run("2026-11-02", 1)]))).toBe("exam");
    expect(suggest(debounce, progress([run("2026-11-01", 1), run("2026-11-02", 1), run("2026-11-05", 1)]))).toBe("exam");
  });

  it("goes back to Learn after a weak score or with weak steps", () => {
    expect(suggest(debounce, progress([run("2026-11-01", 1), run("2026-11-02", 0.3)]))).toBe("learn");
    expect(suggest(debounce, progress([run("2026-11-01", 1), run("2026-11-02", 1)], ["main:1"]))).toBe("learn");
  });

  it("an output question has one mode", () => {
    expect(suggest(output, progress([]))).toBe("output");
    expect(suggest(output, progress([run("2026-11-01", 0.2, "output")]))).toBe("output");
  });
});

describe("due today", () => {
  const today = "2026-11-18";
  const store = storeOf({
    debounce: progress([run("2026-11-17", 1)]), // due today
    throttle: progress([run("2026-11-10", 1)]), // 7 days late
    sleep: progress([run("2026-11-18", 1)]), // due tomorrow
    flatten: progress([run("2026-11-16", 1), run("2026-11-17", 1)]), // due in 2 days
    memoize: progress([run("2026-11-14", 0.2)]), // 3 days late
  });
  const items = reviewAll(problems, store, today);

  it("lists what is due, the most overdue first", () => {
    expect(dueToday(items).map((item) => item.problem.id)).toEqual(["throttle", "memoize", "debounce"]);
  });

  it("keeps study order between problems that are equally late", () => {
    const same = storeOf({
      memoize: progress([run("2026-11-17", 1)]),
      debounce: progress([run("2026-11-17", 1)]),
      sleep: progress([run("2026-11-17", 1)]),
    });
    expect(dueToday(reviewAll(problems, same, today)).map((item) => item.problem.id)).toEqual([
      "debounce",
      "sleep",
      "memoize",
    ]);
  });

  it("names the next review when nothing is due", () => {
    expect(nextUp(items)?.problem.id).toBe("sleep");
    expect(nextUp(reviewAll(problems, storeOf({}), today))).toBeNull();
  });

  it("counts the problems by mastery", () => {
    const count = countMastery(items);
    expect(count.learning).toBe(5);
    expect(count.strong).toBe(0);
    expect(count.new).toBe(problems.length - 5);
  });
});

describe("the streak", () => {
  const today = "2026-11-18";

  it("is 0 with no activity", () => {
    expect(streakOf(new Set(), today)).toEqual({ count: 0, doneToday: false });
  });

  it("counts days in a row that end today", () => {
    const days = new Set(["2026-11-16", "2026-11-17", "2026-11-18"]);
    expect(streakOf(days, today)).toEqual({ count: 3, doneToday: true });
  });

  it("is still alive when the last day was yesterday", () => {
    const days = new Set(["2026-11-16", "2026-11-17"]);
    expect(streakOf(days, today)).toEqual({ count: 2, doneToday: false });
  });

  it("is broken by a missed day", () => {
    expect(streakOf(new Set(["2026-11-15", "2026-11-16"]), today)).toEqual({ count: 0, doneToday: false });
    expect(streakOf(new Set(["2026-11-14", "2026-11-15", "2026-11-17", "2026-11-18"]), today).count).toBe(2);
  });

  it("goes across the end of a month", () => {
    expect(streakOf(new Set(["2026-11-29", "2026-11-30", "2026-12-01"]), "2026-12-01").count).toBe(3);
  });

  it("takes its days from sessions and from drills, in local time", () => {
    const store = storeOf(
      { debounce: progress([run("2026-11-16", 1, "learn", 23), run("2026-11-17", 1, "learn", 0)]) },
      [{ at: run("2026-11-18", 1).at, points: 20, max: 30 }],
    );
    expect(Array.from(activeDays(store)).sort()).toEqual(["2026-11-16", "2026-11-17", "2026-11-18"]);
    expect(streakOf(activeDays(store), today).count).toBe(3);
  });

  it("reads progress saved before drills existed", () => {
    const old = { version: 1, points: 0, problems: { debounce: { weak: [], runs: [run(today, 1)] } } } as Store;
    expect(streakOf(activeDays(old), today)).toEqual({ count: 1, doneToday: true });
  });
});

describe("weak and shaky steps", () => {
  const start = progress([], ["a"], ["b"]);

  it("a line typed right at the first try leaves both lists", () => {
    expect(withStepResult(start, "a", "first").weak).toEqual([]);
    expect(withStepResult(start, "b", "first").shaky).toEqual([]);
    expect(withStepResult(start, "c", "first")).toBe(start);
  });

  it("a line that needed a hint becomes shaky", () => {
    expect(withStepResult(start, "c", "second").shaky).toEqual(["b", "c"]);
    expect(withStepResult(start, "c", "third").shaky).toEqual(["b", "c"]);
    expect(withStepResult(start, "b", "second")).toBe(start);
  });

  it("a weak line stays weak until it is typed right at the first try", () => {
    const again = withStepResult(start, "a", "second");
    expect(again.weak).toEqual(["a"]);
    expect(again.shaky).toEqual(["b"]);
  });

  it("a revealed line becomes weak and is no longer only shaky", () => {
    const revealed = withStepResult(start, "b", "revealed");
    expect(revealed.weak).toEqual(["a", "b"]);
    expect(revealed.shaky).toEqual([]);
    expect(withStepResult(start, "a", "revealed").weak).toEqual(["a"]);
  });

  it("works on progress saved before shaky steps existed", () => {
    const old = { weak: [], runs: [] } as ProblemProgress;
    expect(withStepResult(old, "x", "second").shaky).toEqual(["x"]);
  });
});

describe("the 5-minute drill", () => {
  /** A repeatable stand-in for Math.random. */
  function seeded(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  const keyOf = (id: string, at: number) => {
    const problem = find(id);
    if (problem.kind === "output") throw new Error("no steps");
    return flattenSteps(problem)[at].key;
  };

  it("has nothing to offer before anything was studied", () => {
    expect(pickDrill(problems, storeOf({}), seeded(1))).toEqual([]);
  });

  it("picks three weak steps from three different problems", () => {
    const store = storeOf({
      debounce: progress([run(D1, 0.5)], [keyOf("debounce", 1), keyOf("debounce", 2)]),
      throttle: progress([run(D1, 0.5)], [keyOf("throttle", 1)]),
      flatten: progress([run(D1, 0.5)], [keyOf("flatten", 2)]),
      memoize: progress([run(D1, 0.5)], [keyOf("memoize", 3)]),
    });
    for (let seed = 1; seed <= 30; seed++) {
      const items = pickDrill(problems, store, seeded(seed));
      expect(items).toHaveLength(DRILL_SIZE);
      expect(new Set(items.map((item) => item.problem.id)).size).toBe(DRILL_SIZE);
      for (const item of items) {
        expect(item.reason).toBe("weak");
        expect(store.problems[item.problem.id].weak).toContain(item.step.key);
        expect(item.steps[item.step.index]).toBe(item.step);
      }
    }
  });

  it("is random: over many drills every weak step gets its turn", () => {
    const store = storeOf({
      debounce: progress([run(D1, 0.5)], [keyOf("debounce", 1), keyOf("debounce", 2)]),
      throttle: progress([run(D1, 0.5)], [keyOf("throttle", 1)]),
      flatten: progress([run(D1, 0.5)], [keyOf("flatten", 2)]),
      memoize: progress([run(D1, 0.5)], [keyOf("memoize", 3)]),
    });
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      for (const item of pickDrill(problems, store, seeded(seed))) seen.add(item.problem.id + "/" + item.step.key);
    }
    expect(seen.size).toBe(5);
  });

  it("fills up with shaky steps, then with lines of finished problems", () => {
    const store = storeOf({
      debounce: progress([run(D1, 0.5)], [keyOf("debounce", 1)]),
      throttle: progress([run(D1, 0.9)], [], [keyOf("throttle", 2)]),
      flatten: progress([run(D1, 1)]),
    });
    const items = pickDrill(problems, store, seeded(7));
    expect(items.map((item) => item.reason)).toEqual(["weak", "shaky", "random"]);
    expect(items.map((item) => item.problem.id)).toEqual(["debounce", "throttle", "flatten"]);
  });

  it("never takes two steps from one problem, even when only one problem has weak steps", () => {
    const store = storeOf({
      debounce: progress([run(D1, 0.5)], [keyOf("debounce", 1), keyOf("debounce", 2), keyOf("debounce", 3)]),
    });
    const items = pickDrill(problems, store, seeded(3));
    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe("weak");
  });

  it("does not pick a bare closing line at random", () => {
    const store = storeOf({ sleep: progress([run(D1, 1)]) });
    for (let seed = 1; seed <= 40; seed++) {
      const [item] = pickDrill(problems, store, seeded(seed));
      expect(item.step.expected.trim()).not.toBe("}");
    }
  });

  it("skips a problem that was only started, and steps that no longer exist", () => {
    const store = storeOf({
      debounce: { weak: [], runs: [], learn: { index: 2, misses: 0, results: [] } },
      throttle: progress([], ["gone:99"]),
    });
    expect(pickDrill(problems, store, seeded(1))).toEqual([]);
  });

  it("takes steps from React problems, never from output questions", () => {
    const store = storeOf({
      "react-timer": progress([run(D1, 0.5)], [keyOf("react-timer", 8)]),
      "event-loop-order": progress([run(D1, 0.2, "output")]),
    });
    const items = pickDrill(problems, store, seeded(1));
    expect(items.map((item) => item.problem.id)).toEqual(["react-timer"]);
  });

  it("counts the weak steps for the home page", () => {
    const store = storeOf({
      debounce: progress([run(D1, 0.5)], [keyOf("debounce", 1), keyOf("debounce", 2), "gone:1"]),
      throttle: progress([run(D1, 0.5)], [keyOf("throttle", 1)]),
      flatten: progress([run(D1, 1)]),
    });
    expect(countWeakSteps(problems, store)).toEqual({ steps: 3, problems: 2 });
  });
});

describe("Arabic counts", () => {
  it("uses the four forms: one, two, three to ten, eleven and more", async () => {
    const { countText, DAYS, PROBLEMS, WEAK_LINES } = await import("@/lib/arabic");
    expect([1, 2, 3, 10, 11, 25].map((n) => countText(n, DAYS))).toEqual([
      "يوم",
      "يومين",
      "3 أيام",
      "10 أيام",
      "11 يوم",
      "25 يوم",
    ]);
    expect(countText(2, WEAK_LINES)).toBe("سطرين ضعاف");
    expect(countText(5, WEAK_LINES)).toBe("5 سطور ضعيفة");
    expect(countText(1, PROBLEMS)).toBe("مسألة واحدة");
    expect(countText(0, DAYS)).toBe("0 يوم");
  });
});
