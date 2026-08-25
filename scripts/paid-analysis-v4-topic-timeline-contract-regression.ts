import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { validateTopicTimelineDates } from "../app/lib/paidAnalysisV4QualityValidators";
import {
  PAID_ANALYSIS_DETAIL_SCHEMA_VERSION_V4,
  type PaidAnalysisDetailOutputV4,
} from "../app/lib/paidAnalysisDetailOutput";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const profile: ProfileDto = {
  id: "00000000-0000-0000-0000-000000000000",
  label: "Synthetic calibration persona",
  relationshipType: "self",
  birthDate: "1995-05-20",
  birthTime: "09:00",
  calendarType: "양력",
  isLeapMonth: false,
  gender: "남성",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const topicPrompt = buildPaidAnalysisDetailPromptV4(
  buildPaidAnalysisInputFromProfile(profile, "career-job-change"),
);
const periodPrompt = buildPaidAnalysisDetailPromptV4(
  buildPaidAnalysisInputFromProfile(profile, "yearly-current", "2026-08-25"),
);

assert(topicPrompt.includes("observedStructure") && topicPrompt.includes("제공된 계산 구조"), "TOPIC cause fields must require structure-grounded explanations");
assert(topicPrompt.includes("situation은 현재 현실에서 형성되는 조건·장면"), "TOPIC situation must have a distinct semantic role");
assert(topicPrompt.includes("implication은 situation이 이 상품의 질문에 갖는 의미"), "TOPIC implication must have a distinct semantic role");
assert(topicPrompt.includes("없는 근거를 창작하지 않는다"), "TOPIC prompt must preserve fabricated-evidence protection");

const timelineStart = topicPrompt.indexOf("timeline 작성 규칙:");
const actionStart = topicPrompt.indexOf("action 작성 규칙:", timelineStart);
assert(timelineStart >= 0 && actionStart > timelineStart, "TOPIC prompt must expose a distinct timeline rules block");
const topicTimelineRules = topicPrompt.slice(timelineStart, actionStart);
const topicPromptLines = topicTimelineRules.split(/\r?\n/);
const negativeDurationContext = ["금지", "사용하지 않는다", "쓰지 않는다", "제공하지 않는다", "확정하지 않는다", "예측하지 않는다", "약속"];
for (const phrase of ["30일", "60일", "90일", "3개월", "6개월", "1년"]) {
  const durationLines = topicPromptLines.filter((line) => line.includes(phrase));
  assert(
    topicPrompt.includes(phrase),
    `TOPIC prompt must forbid unsupported duration ${phrase}`,
  );
  assert(
    durationLines.every((line) => negativeDurationContext.some((context) => line.includes(context))),
    `TOPIC prompt must not export positive unsupported duration ${phrase}`,
  );
}
assert(topicPrompt.includes("기간 계산 근거 없이 숫자로 된 일·주·개월·년 기간을 쓰지 않는다"), "TOPIC prompt must define numeric duration prohibition");
assert(periodPrompt.includes("기간별 분석 전략"), "PERIOD prompt must retain period strategy contract");
assert(!periodPrompt.includes("TOPIC 상품의 timeline"), "PERIOD prompt must not receive TOPIC-only restriction");

const timelineFixture = (preparation: string): PaidAnalysisDetailOutputV4 => ({
  schemaVersion: PAID_ANALYSIS_DETAIL_SCHEMA_VERSION_V4,
  conclusion: { headline: "h", direction: "유지", focus: "f", rationale: "r", immediateAction: "a" },
  coreProblem: { title: "t", description: "description", whyItMatters: "why" },
  cause: { summary: "summary", reasons: [] },
  evidence: [],
  current: { summary: "summary", opportunities: [], cautions: [] },
  timeline: [
    { label: "초기 단계", changeSignal: "신호", preparation },
  ],
  action: [],
  avoid: [],
  confidence: { level: "중간", strongestEvidence: [], uncertaintyFactors: [], limitations: "limitations" },
});

assert(!validateTopicTimelineDates(timelineFixture("90일 동안 확인"), "career-job-change").ok, "validator must continue rejecting unsupported duration");
assert(validateTopicTimelineDates(timelineFixture("조건이 충족되면 다음 단계에서 확인"), "career-job-change").ok, "conditional relative wording must remain allowed");

console.log("paid-analysis-v4-topic-timeline-contract-regression passed ✓");