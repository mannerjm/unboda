import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const profileA: ProfileDto = {
  id: "11111111-1111-4111-8111-111111111111",
  label: "본인",
  relationshipType: "self",
  birthDate: "1987-02-03",
  birthTime: "22:48",
  gender: "남성",
  calendarType: "양력",
  isLeapMonth: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const profileB: ProfileDto = {
  ...profileA,
  id: "22222222-2222-4222-8222-222222222222",
  label: "배우자",
  birthDate: "1992-12-31",
  birthTime: "08:30",
  gender: "여성",
};

const inputA = buildPaidAnalysisInputFromProfile(profileA, "relationship-conflict");
const inputB = buildPaidAnalysisInputFromProfile(profileB, "relationship-conflict");

assert(inputA.productId === "relationship-conflict", "canonical product id must be retained");
assert(inputA.birthData.includes("1987-02-03"), "A report input must contain A profile birth data");
assert(inputB.birthData.includes("1992-12-31"), "B report input must contain B profile birth data");
assert(inputA.birthData !== inputB.birthData, "A and B report inputs must be profile-separated");
assert(inputA.analysisType.length > 0 && inputB.analysisType.length > 0, "report input must resolve product analysis type");
console.log("1. profile-specific deterministic paid input is separated by Profile ✓");

console.log("\npaid-report-profile-input-regression passed ✓");
