import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { validateTopicTimelineDates } from "../app/lib/paidAnalysisV4QualityValidators";
import type { PaidAnalysisDetailOutputV4 } from "../app/lib/paidAnalysisDetailOutput";
import type { ProfileDto } from "../app/lib/profiles/types";

const profile: ProfileDto = {
  id: "00000000-0000-0000-0000-000000000000",
  label: "테스트",
  relationshipType: "self",
  birthDate: "1995-05-20",
  birthTime: "09:00",
  birthTimeKnown: true,
  calendarType: "양력",
  isLeapMonth: false,
  gender: "남성",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function fixture(label: string, changeSignal = "확인할 신호", preparation = "준비할 일"): PaidAnalysisDetailOutputV4 {
  return {
    schemaVersion: "v4",
    conclusion: { headline: "h", direction: "유지", focus: "f", rationale: "r", immediateAction: "a" },
    coreProblem: { title: "t", description: "d", whyItMatters: "w" },
    cause: { summary: "s", reasons: [] },
    evidence: [],
    current: { summary: "s", opportunities: [], cautions: [] },
    timeline: [
      { label, changeSignal, preparation },
      { label: "다음 확인", changeSignal: "확인할 신호", preparation: "준비할 일" },
      { label: "조건 변화", changeSignal: "확인할 신호", preparation: "준비할 일" },
      { label: "다시 검토", changeSignal: "확인할 신호", preparation: "준비할 일" },
    ],
    action: [],
    avoid: [],
    confidence: { level: "중간", strongestEvidence: [], uncertaintyFactors: [], limitations: "l" },
  };
}

const yearlyInput = buildPaidAnalysisInputFromProfile(
  profile,
  "money-income-stability",
  "2026-10-07",
);
const yearlyContext = {
  year: yearlyInput.evidenceFacts?.monthlyCycle?.year ?? yearlyInput.evidenceFacts?.seun?.year,
  month: yearlyInput.evidenceFacts?.monthlyCycle?.month,
};

assert.equal(yearlyContext.year, 2026);
assert(
  validateTopicTimelineDates(
    fixture("2026년 수입 기준선", "2026년에 반복되는 수입 패턴을 확인합니다."),
    "money-income-stability",
    yearlyContext,
  ).ok,
  "YEARLY money-income-stability must allow the frozen edition year",
);

assert(
  !validateTopicTimelineDates(
    fixture("2027년 수입 기준선"),
    "money-income-stability",
    yearlyContext,
  ).ok,
  "YEARLY must reject a different year",
);

assert(
  !validateTopicTimelineDates(
    fixture("2026년 10월 수입 기준선"),
    "money-income-stability",
    yearlyContext,
  ).ok,
  "YEARLY must reject month-level precision it does not own",
);

const monthlyInput = buildPaidAnalysisInputFromProfile(
  profile,
  "career-job-change",
  "2026-10-07",
);
const monthlyContext = {
  year: monthlyInput.evidenceFacts?.monthlyCycle?.year ?? monthlyInput.evidenceFacts?.seun?.year,
  month: monthlyInput.evidenceFacts?.monthlyCycle?.month,
};

assert.equal(monthlyContext.year, 2026);
assert.equal(monthlyContext.month, 10);
assert(
  validateTopicTimelineDates(
    fixture("2026년 10월 기준선", "10월에 확인할 변화 신호를 봅니다."),
    "career-job-change",
    monthlyContext,
  ).ok,
  "MONTHLY must allow its exact frozen edition year/month",
);

assert(
  !validateTopicTimelineDates(
    fixture("2026년 11월 기준선"),
    "career-job-change",
    monthlyContext,
  ).ok,
  "MONTHLY must reject a different month",
);

assert(
  !validateTopicTimelineDates(
    fixture("90일 동안 확인"),
    "career-job-change",
    monthlyContext,
  ).ok,
  "MONTHLY must continue rejecting unsupported numeric day spans",
);

assert(
  !validateTopicTimelineDates(
    fixture("2026년 기준"),
    "career-job-fit",
    { year: 2026, month: 10 },
  ).ok,
  "LIFETIME must reject artificial calendar claims",
);

assert(
  validateTopicTimelineDates(
    fixture("2026년 10월", "2027년 상반기"),
    "yearly-current",
    { year: 2026, month: 10 },
  ).ok,
  "PERIOD products keep their own period strategy and remain exempt",
);

const serviceSource = readFileSync("app/lib/paidAnalysisDetailService.ts", "utf8");
assert(
  serviceSource.includes("year: input.evidenceFacts?.monthlyCycle?.year ?? input.evidenceFacts?.seun?.year")
    && serviceSource.includes("month: input.evidenceFacts?.monthlyCycle?.month"),
  "runtime validator must receive deterministic frozen edition facts",
);

console.log("paid-analysis-v4-edition-date-regression: PASS");
