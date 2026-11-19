// What require("process") gives inside the test frame (see build-test-frame.mjs).
const { process } = require("./test-frame-shims.js");
module.exports = process;
