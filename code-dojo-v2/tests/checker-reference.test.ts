import { describe } from "vitest";
import { codeProblems } from "@/data/problems";
import { referenceRules } from "./rules";

// Every reference solution against its hidden tests, and every reference
// line through the smart checker: accepted at the first attempt.
describe.each(codeProblems)("reference of $id", (problem) => {
  referenceRules(problem);
});
