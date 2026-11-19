/**
 * Helpers that the hidden tests of the Promise polyfills share. This text
 * is put at the top of each test body, so it runs inside the worker.
 *
 *   after(ms, value)       a promise that resolves with value after ms
 *   failAfter(ms, reason)  a promise that rejects with reason after ms
 *   watch(promise)         { status, value }, updated when the promise settles
 */
export const PROMISE_HELPERS = `
const after = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
const failAfter = (ms, reason) => new Promise((resolve, reject) => setTimeout(() => reject(reason), ms));
const watch = (promise) => {
  const state = { status: "pending", value: undefined };
  promise.then(
    (value) => {
      state.status = "fulfilled";
      state.value = value;
    },
    (reason) => {
      state.status = "rejected";
      state.value = reason;
    },
  );
  return state;
};
`;
