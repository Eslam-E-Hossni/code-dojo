import type { Problem } from "../types";
import { anagram } from "./anagram";
import { arrayFilter } from "./array-filter";
import { arrayForEach } from "./array-for-each";
import { arrayMap } from "./array-map";
import { arrayReduce } from "./array-reduce";
import { arraySum } from "./array-sum";
import { asyncAwaitOrder } from "./async-await-order";
import { binarySearch } from "./binary-search";
import { ciAzDeploy } from "./ci-az-deploy";
import { ciAzDocker } from "./ci-az-docker";
import { ciAzFull } from "./ci-az-full";
import { ciAzMatrix } from "./ci-az-matrix";
import { ciAzMinimal } from "./ci-az-minimal";
import { ciGhDeploy } from "./ci-gh-deploy";
import { ciGhDocker } from "./ci-gh-docker";
import { ciGhFix } from "./ci-gh-fix";
import { ciGhFull } from "./ci-gh-full";
import { ciGhMatrix } from "./ci-gh-matrix";
import { ciGhMinimal } from "./ci-gh-minimal";
import { ciAzTranslate, ciGhTranslate } from "./ci-translate";
import { countCharacters } from "./count-characters";
import { currying } from "./currying";
import { debounce } from "./debounce";
import { decodeString } from "./decode-string";
import { deepClone } from "./deep-clone";
import { dockerCompose } from "./docker-compose";
import { dockerFix } from "./docker-fix";
import { dockerIgnore } from "./docker-ignore";
import { dockerNextStandalone } from "./docker-next-standalone";
import { dockerNodeApp } from "./docker-node-app";
import { dockerReactNginx } from "./docker-react-nginx";
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
import { palindrome } from "./palindrome";
import { promiseAll } from "./promise-all";
import { promiseAllSettled } from "./promise-all-settled";
import { promiseAny } from "./promise-any";
import { promiseRace } from "./promise-race";
import { reactAutoCounter } from "./react-auto-counter";
import { reactCounter } from "./react-counter";
import { reactDebounceSearch } from "./react-debounce-search";
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
import { testAccessibility } from "./test-accessibility";
import { testContext } from "./test-context";
import { testCounter } from "./test-counter";
import { testCustomHooks } from "./test-custom-hooks";
import { testLoginForm } from "./test-login-form";
import { testModuleMock } from "./test-module-mock";
import { testPureFunctions } from "./test-pure-functions";
import { testTimers } from "./test-timers";
import { testTodoList } from "./test-todo-list";
import { testUsersTable } from "./test-users-table";
import { throttle } from "./throttle";
import { ttlCache } from "./ttl-cache";
import { twoSum } from "./two-sum";
import { validParentheses } from "./valid-parentheses";
import { varInLoop } from "./var-in-loop";

/**
 * Every problem in the app, in study order. A problem is listed here only
 * when all of its content is written: steps and tests for a code problem,
 * steps and checks for a React problem, the output lines for an output question,
 * steps and rules for a config file.
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
  arraySum,
  // Algorithms
  twoSum,
  secondLargest,
  largest,
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
  // Output questions
  eventLoopOrder,
  varInLoop,
  lostThis,
  hoistingTdz,
  asyncAwaitOrder,
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
  // EventEmitter
  eventEmitter,
  // Testing: here the learner writes the test, not the code
  testPureFunctions,
  testCounter,
  testLoginForm,
  testTodoList,
  testUsersTable,
  testTimers,
  testCustomHooks,
  testModuleMock,
  testContext,
  testAccessibility,
  // Docker: config files, judged line by line and by rules on the whole file
  dockerNodeApp,
  dockerReactNginx,
  dockerNextStandalone,
  dockerIgnore,
  dockerCompose,
  dockerFix,
  // CI/CD, GitHub Actions: the same pipelines as the Azure group below
  ciGhMinimal,
  ciGhFull,
  ciGhMatrix,
  ciGhDocker,
  ciGhDeploy,
  ciGhFix,
  ciGhTranslate,
  // CI/CD, Azure Pipelines
  ciAzMinimal,
  ciAzFull,
  ciAzMatrix,
  ciAzDocker,
  ciAzDeploy,
  ciAzTranslate,
];

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
