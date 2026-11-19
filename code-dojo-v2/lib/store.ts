"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_STATE, type CheckState } from "./checker/check";
import type { Tier } from "./learn";

/** All progress and settings live in one localStorage entry. Nothing leaves the browser. */
const STORAGE_KEY = "code-dojo:v2";

/** A piece of code the learner wrote and the checker accepted. */
export interface Block {
  partId: string;
  /** The steps it covers. More than one when several steps were written at once. */
  steps: number[];
  /** The learner's own text. */
  text: string;
  tier: Tier;
  /** match = same meaning as the reference, tests = passed the hidden tests, judge = the AI judge said yes. */
  via: "match" | "tests" | "judge";
}

/** An unfinished Learn session, so a reload does not lose it. */
export interface LearnSession {
  check: CheckState;
  /** Misses on the step being written, 0 to 3. */
  misses: number;
  /** Everything accepted so far, in the order it was written. */
  blocks: Block[];
}

export const NEW_SESSION: LearnSession = { check: EMPTY_STATE, misses: 0, blocks: [] };

/** The three ways to practise a problem, and "output": the single screen of an output question. */
export type Mode = "learn" | "recall" | "exam" | "output";

export interface RunRecord {
  /** ISO date of when the session finished. */
  at: string;
  mode: Mode;
  points: number;
  max: number;
  /** Recall and Exam: how many times the tests were run before all passed. */
  runs?: number;
  /** Exam: the time taken. */
  seconds?: number;
  /**
   * Recall and Exam: the Solution panel was opened during the attempt. The
   * score is kept here only: it is not added to the total, and the problem
   * does not count as mastered by this attempt.
   */
  assisted?: boolean;
}

/** Unfinished work in Recall or Exam, so a reload does not lose it. */
export interface PracticeDraft {
  code: string;
  /** How many times the tests were run in this attempt. */
  runs: number;
  /** Exam only: when the timer started, in ms since 1970. */
  startedAt?: number;
  /** The Solution panel was opened in this attempt. */
  assisted?: boolean;
}

export interface ProblemProgress {
  learn?: LearnSession;
  recall?: PracticeDraft;
  exam?: PracticeDraft;
  /** The output typed so far in an output question. */
  prediction?: string;
  /** Keys of steps that had to be revealed. They come back first. */
  weak: string[];
  /** Finished sessions, oldest first. */
  runs: RunRecord[];
}

export interface Settings {
  /** The optional AI judge. Off unless the learner turns it on. */
  judgeEnabled: boolean;
  /** The learner's own Anthropic API key. It is stored here, in this browser, and nowhere else. */
  apiKey: string;
}

export interface Store {
  version: 2;
  /** Points from finished sessions. */
  points: number;
  problems: Record<string, ProblemProgress>;
  settings: Settings;
}

const EMPTY: Store = { version: 2, points: 0, problems: {}, settings: { judgeEnabled: false, apiKey: "" } };
const EMPTY_PROGRESS: ProblemProgress = { weak: [], runs: [] };

let cache: Store | null = null;
const listeners = new Set<() => void>();

function read(): Store {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Store;
    if (parsed.version !== 2 || typeof parsed.problems !== "object") return EMPTY;
    return { ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...parsed.settings } };
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): Store {
  if (cache === null) cache = read();
  return cache;
}

function getServerSnapshot(): Store {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep two open tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateStore(change: (store: Store) => Store): void {
  const next = change(getSnapshot());
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked. The session still works in memory.
  }
  for (const listener of listeners) listener();
}

export function useStore(): Store {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function progressOf(store: Store, problemId: string): ProblemProgress {
  return store.problems[problemId] ?? EMPTY_PROGRESS;
}

/** Returns a new store with one problem's progress changed. */
export function withProgress(
  store: Store,
  problemId: string,
  change: (progress: ProblemProgress) => ProblemProgress,
): Store {
  return {
    ...store,
    problems: { ...store.problems, [problemId]: change(progressOf(store, problemId)) },
  };
}

/** A saved session is usable only if it still fits the problem's steps. */
export function isValidSession(session: LearnSession | undefined, stepCount: number): session is LearnSession {
  if (session === undefined || !Array.isArray(session.blocks) || typeof session.check !== "object") return false;
  if (!Array.isArray(session.check.done) || session.check.done.length >= stepCount) return false;
  let covered = 0;
  for (const block of session.blocks) covered += block.steps.length;
  return covered === session.check.done.length && session.misses >= 0 && session.misses <= 3;
}
