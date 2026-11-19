// Jest's own packages were written for Node. In the test frame there is no
// terminal and no file system, so they get these stand-ins. The bundler
// (scripts/build-test-frame.mjs) puts `process` in front of every module.
export const process = {
  env: { NODE_ENV: "test" },
  platform: "browser",
  argv: [],
  version: "v22.0.0",
  versions: { node: "22.0.0" },
  stdout: { isTTY: false, columns: 80, write() {} },
  stderr: { isTTY: false, columns: 80, write() {} },
  cwd: () => "/",
  nextTick: (fn, ...args) => Promise.resolve().then(() => fn(...args)),
  on() {},
  off() {},
  emitWarning() {},
  hrtime: () => [0, 0],
};
