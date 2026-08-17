import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY,
  PERIOD_PAID_ANALYSIS_COMPRESSION_POLICY,
  RELATIONSHIP_PAID_ANALYSIS_COMPRESSION_POLICY,
  getPaidAnalysisCompressionPolicy,
} from "../app/lib/paidAnalysisCompressionPolicy";
import { compressCareerDetailStructure } from "../app/lib/paidAnalysisDetailService";
import { parsePaidAnalysisDetailOutputV3 } from "../app/lib/paidAnalysisDetailOutputParser";
import type { PaidAnalysisDetailOutputV3 } from "../app/lib/paidAnalysisDetailOutput";
import type { PeriodAnalysisBlock } from "../app/lib/analysisPeriodOutput";
import { buildReferencePeriodSnapshot } from "../app/lib/analysisReferencePeriod";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const legacyReport = JSON.parse(
  readFileSync(join(process.cwd(), "scripts/fixtures/paid-report-v3.json"), "utf-8"),
) as Record<string, unknown>;

const LONG_DESCRIPTION =
  "이번 구간에서는 수입과 지출의 균형이 달라질 수 있는 조건이 확인되며, 확대와 조정 중 어느 쪽이 우선인지 판단하려면 계약 조건과 고정비 구조를 먼저 확인해야 하고, 흐름이 바뀌는 신호는 생활 리듬과 연락 빈도에서 함께 나타날 수 있습니다.";

assert(LONG_DESCRIPTION.length > 92, "fixture description must exceed the default limit");

const periodAnalysis: PeriodAnalysisBlock = {
  productId: "monthly-current",
  scale: "monthly",
  headline: "이번 달은 확장보다 기준 정리를 먼저 해야 하는 흐름입니다",
  timelineItems: [
    {
      periodKey: "segment-1",
      label: "이번 달 초반",
      title: "기준 정리",
      summary: "초반에는 실행보다 판단 기준을 먼저 정리해야 하는 흐름이 확인됩니다.",
      intensity: "조정",
      actions: ["우선순위를 한 줄로 정리해 둔다"],
    },
    {
      periodKey: "segment-2",
      label: "이번 달 중반",
      title: "조건 확인",
      summary: "중반에는 정리한 기준이 실제 조건과 맞는지 확인할 여지가 커집니다.",
    },
  ],
  keyPoints: ["속도보다 기준이 우선입니다", "조건 확인 이후 범위를 조정합니다"],
};

const referencePeriod = buildReferencePeriodSnapshot({
  productId: "monthly-current",
  anchorDate: "2026-08-17",
})!;

type BuildOptions = {
  actionGuide?: string[];
  withPeriodBlocks?: boolean;
};

function buildDetail(options: BuildOptions = {}): PaidAnalysisDetailOutputV3 {
  const base = parsePaidAnalysisDetailOutputV3({
    ...legacyReport,
    ...(options.withPeriodBlocks ? { periodAnalysis, referencePeriod } : {}),
  });

  base.futureTimeline = base.futureTimeline.map((item) => ({
    ...item,
    description: LONG_DESCRIPTION,
  }));

  if (options.actionGuide) {
    base.actionGuide = [...options.actionGuide];
  }

  return base;
}

const TWO_ACTIONS = [
  "현재 계획의 우선순위를 문서로 다시 정리합니다",
  "실행 전에 필요한 조건과 기준을 구체적으로 확인합니다",
];

// --- policy resolver contract ---
assert(
  getPaidAnalysisCompressionPolicy(undefined, undefined) === DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY
    && getPaidAnalysisCompressionPolicy("CAREER") === DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY
    && getPaidAnalysisCompressionPolicy("MONEY", "TOPIC") === DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY
    && getPaidAnalysisCompressionPolicy("HEALTH", "TOPIC") === DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY
    && getPaidAnalysisCompressionPolicy("COMMON", "TOPIC") === DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY,
  "resolver: non-period, non-relationship products must keep the default policy",
);
assert(
  getPaidAnalysisCompressionPolicy("RELATIONSHIP") === RELATIONSHIP_PAID_ANALYSIS_COMPRESSION_POLICY
    && getPaidAnalysisCompressionPolicy("RELATIONSHIP", "TOPIC") === RELATIONSHIP_PAID_ANALYSIS_COMPRESSION_POLICY,
  "resolver: RELATIONSHIP must keep its own fallbacks",
);
assert(
  getPaidAnalysisCompressionPolicy("FORTUNE", "PERIOD") === PERIOD_PAID_ANALYSIS_COMPRESSION_POLICY
    && getPaidAnalysisCompressionPolicy(undefined, "PERIOD") === PERIOD_PAID_ANALYSIS_COMPRESSION_POLICY,
  "resolver: kind PERIOD must win regardless of plugin",
);
assert(
  getPaidAnalysisCompressionPolicy("FORTUNE", "TOPIC") === DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY,
  "resolver: FORTUNE alone must not switch the policy",
);

// the default policy must still describe the pre-P0-8F-3 constants
assert(
  DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY.timelineDescriptionMaxLength === 92
    && DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY.actionGuideMaxLength === 108
    && DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY.actionGuideMaxItems === 3
    && DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY.checklistMaxLength === 112
    && DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY.checklistMaxItems === 5
    && DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY.avoidGuideMaxLength === 112
    && DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY.avoidGuideMaxItems === 4
    && DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY.actionFallbacks.length === 3,
  "default policy must match the original hardcoded constants",
);
assert(
  RELATIONSHIP_PAID_ANALYSIS_COMPRESSION_POLICY.actionFallbacks[0]
    === "갈등이 생겼을 때 감정을 해석하기 전에 상대에게 사실을 먼저 확인한다.",
  "relationship fallbacks must stay unchanged",
);

// PERIOD may only differ in exactly two entries
const differingKeys = (
  Object.keys(DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY) as Array<
    keyof typeof DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY
  >
).filter(
  (key) =>
    JSON.stringify(PERIOD_PAID_ANALYSIS_COMPRESSION_POLICY[key])
    !== JSON.stringify(DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY[key]),
);
assert(
  differingKeys.sort().join(",") === "actionFallbacks,timelineDescriptionMaxLength",
  `PERIOD policy may only change two entries, got: ${differingKeys.join(",")}`,
);

// 1 & 2. PERIOD keeps the full description
const periodCompressed = compressCareerDetailStructure(
  buildDetail({ withPeriodBlocks: true }),
  "FORTUNE",
  "PERIOD",
);
for (const item of periodCompressed.futureTimeline) {
  assert(item.description === LONG_DESCRIPTION, "1: PERIOD description must stay intact");
  assert(!item.description.includes("…"), "2: PERIOD description must not gain a truncation ellipsis");
}

// 3. default path keeps the 92-char truncation
const defaultCompressed = compressCareerDetailStructure(buildDetail(), "MONEY", "TOPIC");
for (const item of defaultCompressed.futureTimeline) {
  assert(item.description.endsWith("…"), "3: default path must still truncate");
  assert(
    item.description.length === 93,
    `3: default truncation must stay at 92 chars + ellipsis, got ${item.description.length}`,
  );
  assert(
    item.description.slice(0, 92) === LONG_DESCRIPTION.slice(0, 92),
    "3: default truncation must keep the original prefix",
  );
}

// 4 & 7. PERIOD keeps exactly the model's two actions
const periodTwoActions = compressCareerDetailStructure(
  buildDetail({ actionGuide: TWO_ACTIONS, withPeriodBlocks: true }),
  "FORTUNE",
  "PERIOD",
);
assert(
  periodTwoActions.actionGuide.length === 2,
  `4: PERIOD must keep 2 actions, got ${periodTwoActions.actionGuide.length}`,
);
assert(
  periodTwoActions.actionGuide.join("|") === TWO_ACTIONS.join("|"),
  "4: PERIOD actionGuide must stay untouched",
);
assert(
  !periodTwoActions.actionGuide.some((item) => item.includes("핵심 결정을 앞두고")),
  "4: the career fallback must never reach a PERIOD report",
);

const periodFourActions = compressCareerDetailStructure(
  buildDetail({
    actionGuide: [...TWO_ACTIONS, "작은 범위에서 먼저 실행하고 결과를 점검합니다", "일정과 책임 범위를 명확하게 구분합니다"],
    withPeriodBlocks: true,
  }),
  "FORTUNE",
  "PERIOD",
);
assert(
  periodFourActions.actionGuide.length === 3,
  `7: PERIOD must still cap actionGuide at 3, got ${periodFourActions.actionGuide.length}`,
);

// 5. default path still pads with the career fallback
const defaultTwoActions = compressCareerDetailStructure(
  buildDetail({ actionGuide: TWO_ACTIONS }),
  "CAREER",
  "TOPIC",
);
assert(
  defaultTwoActions.actionGuide.length === 3
    && defaultTwoActions.actionGuide[2] === "결정 이후 부담과 이익을 함께 비교해본다.",
  "5: default path must keep the career fallback behaviour",
);

// 6. RELATIONSHIP fallback unchanged
const relationshipTwoActions = compressCareerDetailStructure(
  buildDetail({ actionGuide: TWO_ACTIONS }),
  "RELATIONSHIP",
  "TOPIC",
);
assert(
  relationshipTwoActions.actionGuide.length === 3
    && relationshipTwoActions.actionGuide[2]
      === "서로의 경계와 기대 수준을 대화로 확인한 뒤 다음 단계를 판단한다.",
  "6: RELATIONSHIP fallback must stay unchanged",
);

// 8. PERIOD keeps the existing checklist / avoidGuide limits
const longItem = "가".repeat(200);

function buildLimitDetail(): PaidAnalysisDetailOutputV3 {
  const detail = buildDetail({ withPeriodBlocks: true });
  detail.checklist = Array.from({ length: 7 }, (_, index) => `${index} ${longItem}`);
  detail.avoidGuide = Array.from({ length: 6 }, (_, index) => `${index} ${longItem}`);
  return detail;
}

const periodLimits = compressCareerDetailStructure(buildLimitDetail(), "FORTUNE", "PERIOD");
const defaultLimits = compressCareerDetailStructure(buildLimitDetail(), "MONEY", "TOPIC");

assert(
  JSON.stringify(periodLimits.checklist) === JSON.stringify(defaultLimits.checklist),
  "8: PERIOD checklist handling must stay identical to the default policy",
);
assert(
  JSON.stringify(periodLimits.avoidGuide) === JSON.stringify(defaultLimits.avoidGuide),
  "8: PERIOD avoidGuide handling must stay identical to the default policy",
);
assert(
  periodLimits.checklist.length <= 5 && periodLimits.avoidGuide.length === 4,
  "8: PERIOD must keep the existing checklist/avoidGuide caps",
);
assert(
  periodLimits.checklist.every((item) => item.length === 113)
    && periodLimits.avoidGuide.every((item) => item.length === 113),
  "8: PERIOD checklist/avoidGuide must keep the 112-char truncation",
);

// 9 & 10. period blocks survive byte-equivalent
assert(
  JSON.stringify(periodCompressed.periodAnalysis) === JSON.stringify(periodAnalysis),
  "9: periodAnalysis must stay byte-equivalent",
);
assert(
  JSON.stringify(periodCompressed.referencePeriod) === JSON.stringify(referencePeriod),
  "10: referencePeriod must stay byte-equivalent",
);

// 11. other plugins keep the default behaviour
for (const plugin of ["HEALTH", "MONEY", "COMMON", "CAREER", undefined]) {
  const compressed = compressCareerDetailStructure(
    buildDetail({ actionGuide: TWO_ACTIONS }),
    plugin,
    "TOPIC",
  );

  assert(
    compressed.actionGuide.length === 3
      && compressed.actionGuide[2] === "결정 이후 부담과 이익을 함께 비교해본다.",
    `11: plugin "${plugin ?? "undefined"}" must keep the default fallback`,
  );
  assert(
    compressed.futureTimeline.every((item) => item.description.endsWith("…")),
    `11: plugin "${plugin ?? "undefined"}" must keep the default truncation`,
  );
}

// two-argument callers must keep working
const legacyCall = compressCareerDetailStructure(buildDetail({ actionGuide: TWO_ACTIONS }), "RELATIONSHIP");
assert(
  legacyCall.actionGuide.length === 3
    && legacyCall.actionGuide[2] === "서로의 경계와 기대 수준을 대화로 확인한 뒤 다음 단계를 판단한다.",
  "two-argument compatibility must be preserved",
);

// 12. compressed output keeps the array minimums the schema depends on.
// checklist is left out on purpose: the pre-existing padding logic already caps
// it at 3 whenever the model returns 4+ items, and P0-8F-3 must not change that.
for (const compressed of [periodCompressed, defaultCompressed, periodTwoActions, relationshipTwoActions]) {
  assert(compressed.actionGuide.length >= 2, "12: actionGuide must stay at 2 or more");
  assert(compressed.avoidGuide.length >= 4, "12: avoidGuide must stay at 4 or more");
  assert(compressed.futureTimeline.length >= 4, "12: futureTimeline must stay at 4 or more");
  assert(
    compressed.heroSummary.headline.length > 0 && compressed.confidence.level.length > 0,
    "12: untouched V3 fields must survive compression",
  );
}
assert(
  JSON.stringify(periodCompressed.checklist) === JSON.stringify(defaultCompressed.checklist),
  "12: PERIOD checklist output must match the default policy output",
);

console.log(`PERIOD policy differs from default only in: ${differingKeys.join(", ")}`);
console.log(`PERIOD description length: ${periodCompressed.futureTimeline[0].description.length} (원문 ${LONG_DESCRIPTION.length})`);
console.log(`default description length: ${defaultCompressed.futureTimeline[0].description.length}`);
console.log("\npaid analysis compression policy regression passed ✓");
