import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { getAnalysisEditionPolicy } from "../app/lib/analysisEditionPolicy";
import {
  getLaunchProductIds,
  resolvePaidAnalysisLaunchSpecialization,
} from "../app/lib/paidAnalysisTopicConfig";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error("FAIL: " + message);
}

const profile = {
  id: "00000000-0000-0000-0000-000000000000",
  label: "테스트",
  relationshipType: "self",
  birthDate: "1995-05-20",
  birthTime: "09:00",
  birthTimeKnown: true,
  calendarType: "양력" as const,
  isLeapMonth: false,
  gender: "남성" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const launchIds = getLaunchProductIds();
const monthlyTopicIds = launchIds.filter(
  (id) =>
    getAnalysisEditionPolicy(id) === "MONTHLY" &&
    resolvePaidAnalysisLaunchSpecialization(id).kind === "topic",
);
const yearlyTopicIds = launchIds.filter(
  (id) =>
    getAnalysisEditionPolicy(id) === "YEARLY" &&
    resolvePaidAnalysisLaunchSpecialization(id).kind === "topic",
);
const lifetimeTopicIds = launchIds.filter(
  (id) =>
    getAnalysisEditionPolicy(id) === "LIFETIME" &&
    resolvePaidAnalysisLaunchSpecialization(id).kind === "topic",
);

assert(monthlyTopicIds.length === 27, "monthly TOPIC count must stay 27");
assert(yearlyTopicIds.length === 21, "yearly TOPIC count must stay 21");
assert(lifetimeTopicIds.length === 2, "lifetime TOPIC count must stay 2");

const october = buildPaidAnalysisInputFromProfile(
  profile,
  "career-promotion-readiness",
  "2026-10-07",
);
const november = buildPaidAnalysisInputFromProfile(
  profile,
  "career-promotion-readiness",
  "2026-11-07",
);

assert(october.evidenceFacts?.monthlyCycle?.year === 2026, "October monthly fact year");
assert(october.evidenceFacts?.monthlyCycle?.month === 10, "October monthly fact month");
assert(november.evidenceFacts?.monthlyCycle?.month === 11, "November monthly fact month");
assert(
  october.evidenceFacts?.monthlyCycle?.representativePillar !==
    november.evidenceFacts?.monthlyCycle?.representativePillar,
  "adjacent monthly editions must carry a materially different calculated month pillar",
);

const octoberPrompt = buildPaidAnalysisDetailPromptV4(october);
assert(
  octoberPrompt.includes("[월간 TOPIC 시기 가치 계약]"),
  "monthly TOPIC prompt must carry the monthly value contract",
);
assert(
  octoberPrompt.includes("2026년 10월") &&
    octoberPrompt.includes("monthly_cycle"),
  "monthly TOPIC prompt must expose the real edition month and month-cycle evidence",
);
assert(
  !octoberPrompt.includes("이 상품에는 구체 기간 계산 근거가 전달되지 않았다"),
  "monthly TOPIC must no longer use the timeless TOPIC timeline rule",
);

const yearly = buildPaidAnalysisInputFromProfile(profile, "career", "2026-10-07");
const yearlyPrompt = buildPaidAnalysisDetailPromptV4(yearly);
assert(
  yearlyPrompt.includes("[연간 TOPIC 시기 가치 계약]") &&
    yearlyPrompt.includes("2026년") &&
    yearlyPrompt.includes("evidence에는 seun을 반드시 정확히 1개 포함한다"),
  "yearly TOPIC prompt must expose the actual seun year",
);

const lifetime = buildPaidAnalysisInputFromProfile(
  profile,
  "career-job-fit",
  "2026-10-07",
);
const lifetimePrompt = buildPaidAnalysisDetailPromptV4(lifetime);
assert(
  !lifetimePrompt.includes("[월간 TOPIC 시기 가치 계약]") &&
    !lifetimePrompt.includes("[연간 TOPIC 시기 가치 계약]"),
  "lifetime TOPIC must remain free of artificial month/year value contracts",
);

console.log(
  `paid-analysis-v4-temporal-value-regression passed ✓ monthly=${monthlyTopicIds.length} yearly=${yearlyTopicIds.length} lifetime=${lifetimeTopicIds.length}`,
);
