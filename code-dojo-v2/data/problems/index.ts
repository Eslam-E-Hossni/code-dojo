import type { CodeProblem, OutputProblem, Problem } from "../types";
import { anagram } from "./anagram";
import { arrayFilter } from "./array-filter";
import { arrayForEach } from "./array-for-each";
import { arrayMap } from "./array-map";
import { arrayReduce } from "./array-reduce";
import { asyncAwaitOrder } from "./async-await-order";
import { binarySearch } from "./binary-search";
import { countCharacters } from "./count-characters";
import { currying } from "./currying";
import { debounce } from "./debounce";
import { decodeString } from "./decode-string";
import { deepClone } from "./deep-clone";
import { eventEmitter } from "./event-emitter";
import { eventLoopOrder } from "./event-loop-order";
import { fibonacci } from "./fibonacci";
import { fizzBuzz } from "./fizzbuzz";
import { flatten } from "./flatten";
import { functionApply } from "./function-apply";
import { functionBind } from "./function-bind";
import { functionCall } from "./function-call";
import { hoistingTdz } from "./hoisting-tdz";
import { jsonStringify } from "./json-stringify";
import { largest } from "./largest";
import { lostThis } from "./lost-this";
import { maxSubarray } from "./max-subarray";
import { memoize } from "./memoize";
import { moveZeroes } from "./move-zeroes";
import { mySetTimeout } from "./my-set-timeout";
import { nextBiggerNumber } from "./next-bigger-number";
import { palindrome } from "./palindrome";
import { promiseAll } from "./promise-all";
import { promiseAllSettled } from "./promise-all-settled";
import { promiseAny } from "./promise-any";
import { promiseRace } from "./promise-race";
import { reactAutoCounter } from "./react-auto-counter";
import { reactCounter } from "./react-counter";
import { reactDebounceSearch } from "./react-debounce-search";
import { reactReview } from "./react-review";
import { reactTimer } from "./react-timer";
import { reactTodos } from "./react-todos";
import { reactUseContext } from "./react-use-context";
import { reactUseFetch } from "./react-use-fetch";
import { reactUsersTable } from "./react-users-table";
import { reactWizard } from "./react-wizard";
import { removeDuplicates } from "./remove-duplicates";
import { reverseString } from "./reverse-string";
import { secondLargest } from "./second-largest";
import { sleep } from "./sleep";
import { throttle } from "./throttle";
import { ttlCache } from "./ttl-cache";
import { twoSum } from "./two-sum";
import { validParentheses } from "./valid-parentheses";
import { valueVsReference } from "./value-vs-reference";
import { varInLoop } from "./var-in-loop";

/**
 * Every problem in the app, in study order. "Next problem" follows this
 * list. A problem is listed here only when all of its content is written:
 * steps, tests, questions and answers.
 */
export const problems: Problem[] = [
  // Most repeated
  debounce,
  throttle,
  sleep,
  mySetTimeout,
  flatten,
  deepClone,
  currying,
  memoize,
  ttlCache,

  // Polyfills
  arrayMap,
  arrayFilter,
  arrayReduce,
  arrayForEach,
  functionBind,
  functionCall,
  functionApply,
  promiseAll,
  promiseAllSettled,
  promiseRace,
  promiseAny,
  jsonStringify,

  // Algorithms
  twoSum,
  largest,
  secondLargest,
  reverseString,
  palindrome,
  anagram,
  moveZeroes,
  validParentheses,
  decodeString,
  maxSubarray,
  binarySearch,
  removeDuplicates,
  countCharacters,
  fizzBuzz,
  fibonacci,
  nextBiggerNumber,

  // Output questions
  eventLoopOrder,
  varInLoop,
  lostThis,
  hoistingTdz,
  asyncAwaitOrder,
  valueVsReference,

  // React
  reactCounter,
  reactTimer,
  reactAutoCounter,
  reactTodos,
  reactDebounceSearch,
  reactUseFetch,
  reactUseContext,
  reactUsersTable,
  reactWizard,
  reactReview,

  // EventEmitter
  eventEmitter,
];

/** The problems that are code to write: they have steps, the three modes and hidden tests. */
export const codeProblems: CodeProblem[] = problems.filter((problem): problem is CodeProblem => problem.kind === "code");

/** The React problems: JSX, a live preview, and hidden tests that render the component. */
export const reactProblems: CodeProblem[] = codeProblems.filter((problem) => problem.react !== undefined);

/** The code problems that are plain JavaScript: their hidden tests run in the worker. */
export const plainProblems: CodeProblem[] = codeProblems.filter((problem) => problem.react === undefined);

/** The "what does this print?" questions. */
export const outputProblems: OutputProblem[] = problems.filter(
  (problem): problem is OutputProblem => problem.kind === "output",
);

export function getProblem(id: string): Problem | undefined {
  for (let i = 0; i < problems.length; i++) {
    if (problems[i].id === id) return problems[i];
  }
  return undefined;
}

/** The problem after this one in study order, if any. */
export function nextProblem(id: string): Problem | undefined {
  for (let i = 0; i < problems.length - 1; i++) {
    if (problems[i].id === id) return problems[i + 1];
  }
  return undefined;
}
