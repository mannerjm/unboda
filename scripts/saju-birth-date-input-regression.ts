import {
  formatBirthDateInput,
  getBirthDateDigits,
} from "../app/lib/birthDateInput";
import { validateAnalyzeInput } from "../app/lib/validateAnalyzeInput";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const incrementalCases: Array<[string, string]> = [
  ["1", "1"],
  ["19", "19"],
  ["198", "198"],
  ["1987", "1987"],
  ["19870", "1987-0"],
  ["198702", "1987-02"],
  ["1987020", "1987-02-0"],
  ["19870203", "1987-02-03"],
];

for (const [input, expected] of incrementalCases) {
  assert(formatBirthDateInput(input) === expected, `birth date formatting failed: ${input}`);
}
assert(formatBirthDateInput("1987-02-03") === "1987-02-03", "hyphenated paste must be accepted");
assert(formatBirthDateInput("19870203") === "1987-02-03", "numeric paste must be formatted");
console.log("1. incremental digits and date pastes format as YYYY-MM-DD ✓");

assert(formatBirthDateInput("198702031") === "1987-02-03", "ninth digit must not enter the final value");
assert(formatBirthDateInput("1987ab02cd03") === "1987-02-03", "non-date characters must not enter the final value");
assert(getBirthDateDigits("1987-02-03") === "19870203", "digit extraction must support delimiter editing");
console.log("2. ninth digit and non-date characters are excluded ✓");

for (const birthDate of ["19878-02-03", "198788-02-03", "123-02-03"]) {
  const result = validateAnalyzeInput({
    birthDate,
    birthTime: "22:48",
    calendarType: "양력",
    isLeapMonth: "평달",
    gender: "남성",
  });
  assert(!result.valid, `submit validation accepted non-four-digit year: ${birthDate}`);
}

const valid = validateAnalyzeInput({
  birthDate: "1987-02-03",
  birthTime: "22:48",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "남성",
});
assert(valid.valid, "normal YYYY-MM-DD birthDate must remain valid");
console.log("3. submit validation rejects invalid years and keeps normal date valid ✓");

console.log("\nsaju-birth-date-input-regression passed ✓");
