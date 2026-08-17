import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compressCareerDetailStructure } from "../app/lib/paidAnalysisDetailService";
import { parsePaidAnalysisDetailOutputV3 } from "../app/lib/paidAnalysisDetailOutputParser";
import type { PaidAnalysisDetailOutputV3 } from "../app/lib/paidAnalysisDetailOutput";
import type { PeriodAnalysisBlock } from "../app/lib/analysisPeriodOutput";
import { buildReferencePeriodSnapshot } from "../app/lib/analysisReferencePeriod";
import { DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY } from "../app/lib/paidAnalysisCompressionPolicy";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const legacyReport = JSON.parse(
  readFileSync(join(process.cwd(), "scripts/fixtures/paid-report-v3.json"), "utf-8"),
) as Record<string, unknown>;

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
    },
    {
      periodKey: "segment-2",
      label: "이번 달 중반",
      title: "조건 확인",
      summary: "중반에는 정리한 기준이 실제 조건과 맞는지 확인할 여지가 커집니다.",
    },
  ],
};

const referencePeriod = buildReferencePeriodSnapshot({
  productId: "monthly-current",
  anchorDate: "2026-08-17",
})!;

const CHECKLIST_MAX_ITEMS = DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY.checklistMaxItems;
const CHECKLIST_MAX_LENGTH = DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY.checklistMaxLength;

function makeChecklist(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `${index + 1}번 항목을 실제 조건과 비교해 확인합니다`,
  );
}

function buildDetail(checklist: string[]): PaidAnalysisDetailOutputV3 {
  const detail = parsePaidAnalysisDetailOutputV3({
    ...legacyReport,
    periodAnalysis,
    referencePeriod,
  });

  detail.checklist = [...checklist];

  return detail;
}

function compress(checklist: string[], plugin?: string, kind?: string): string[] {
  return compressCareerDetailStructure(buildDetail(checklist), plugin, kind).checklist;
}

// 1 ~ 5 & 6. exact item count with the original order preserved
const cases: Array<{ input: number; expectedKept: number }> = [
  { input: 0, expectedKept: 0 },
  { input: 1, expectedKept: 1 },
  { input: 2, expectedKept: 2 },
  { input: 3, expectedKept: 3 },
  { input: 4, expectedKept: 4 },
  { input: 5, expectedKept: 5 },
  { input: 6, expectedKept: 5 },
  { input: 7, expectedKept: 5 },
];

for (const testCase of cases) {
  const source = makeChecklist(testCase.input);
  const result = compress(source);

  assert(
    result.length === CHECKLIST_MAX_ITEMS,
    `input ${testCase.input}: checklist must always be ${CHECKLIST_MAX_ITEMS}, got ${result.length}`,
  );

  const kept = source.slice(0, testCase.expectedKept);
  assert(
    result.slice(0, kept.length).join("|") === kept.join("|"),
    `input ${testCase.input}: original checklist items must keep their order`,
  );

  const fallbackCount = CHECKLIST_MAX_ITEMS - testCase.expectedKept;
  assert(
    result.length - kept.length === fallbackCount,
    `input ${testCase.input}: expected ${fallbackCount} fallback items`,
  );
  assert(
    result.slice(kept.length).every((item) => item.endsWith("?")),
    `input ${testCase.input}: fallback items must be the decision questions`,
  );
}

// 7. per-item truncation contract stays at 112 chars
const longItem = "가".repeat(200);
const truncated = compress([longItem, longItem, longItem, longItem, longItem]);
assert(
  truncated.every((item) => item.length === CHECKLIST_MAX_LENGTH + 1 && item.endsWith("…")),
  "7: checklist items must keep the 112-char truncation",
);

// blank-only entries are still dropped before padding
const withBlank = compress(["   ", ...makeChecklist(4)]);
assert(
  withBlank.length === CHECKLIST_MAX_ITEMS && withBlank[0] === makeChecklist(4)[0],
  "blank checklist entries must be filtered out before padding",
);

// 8. identical checklist handling across policies
for (const count of [3, 4, 5, 6, 7]) {
  const source = makeChecklist(count);
  const period = compress(source, "FORTUNE", "PERIOD");
  const fallbackDefault = compress(source, "MONEY", "TOPIC");
  const relationship = compress(source, "RELATIONSHIP", "TOPIC");

  assert(
    JSON.stringify(period) === JSON.stringify(fallbackDefault)
      && JSON.stringify(period) === JSON.stringify(relationship),
    `8: checklist result must match across policies for ${count} items`,
  );
  assert(period.length === CHECKLIST_MAX_ITEMS, `8: ${count} items must still produce 5`);
}

// 9. period blocks stay untouched
const periodCompressed = compressCareerDetailStructure(
  buildDetail(makeChecklist(7)),
  "FORTUNE",
  "PERIOD",
);
assert(
  JSON.stringify(periodCompressed.periodAnalysis) === JSON.stringify(periodAnalysis),
  "9: periodAnalysis must stay byte-equivalent",
);
assert(
  JSON.stringify(periodCompressed.referencePeriod) === JSON.stringify(referencePeriod),
  "9: referencePeriod must stay byte-equivalent",
);

// other compression policies must not have shifted
assert(
  periodCompressed.futureTimeline.every((item) => !item.description.endsWith("…")),
  "PERIOD timeline description policy must stay unchanged",
);
const defaultCompressed = compressCareerDetailStructure(
  buildDetail(makeChecklist(7)),
  "MONEY",
  "TOPIC",
);
assert(defaultCompressed.avoidGuide.length === 4, "avoidGuide policy must stay unchanged");
assert(
  defaultCompressed.actionGuide.length === 3,
  "actionGuide policy must stay unchanged",
);

// 10. the compressed report must re-parse against the V3 schema
for (const count of [3, 4, 5, 6, 7]) {
  for (const [plugin, kind] of [["FORTUNE", "PERIOD"], ["MONEY", "TOPIC"], ["RELATIONSHIP", "TOPIC"]]) {
    const compressed = compressCareerDetailStructure(
      buildDetail(makeChecklist(count)),
      plugin,
      kind,
    );
    const reparsed = parsePaidAnalysisDetailOutputV3(JSON.parse(JSON.stringify(compressed)));

    assert(
      reparsed.checklist.length >= 5,
      `10: ${plugin}/${kind} with ${count} items must satisfy checklist min(5)`,
    );
    assert(reparsed.actionGuide.length >= 2, "10: actionGuide min(2) must hold");
    assert(reparsed.avoidGuide.length >= 4, "10: avoidGuide min(4) must hold");
    assert(reparsed.futureTimeline.length >= 4, "10: futureTimeline min(4) must hold");
  }
}

console.log("checklist compression results:");
for (const testCase of cases) {
  const result = compress(makeChecklist(testCase.input));
  console.log(
    `  input ${testCase.input} → ${result.length}개 (기존 ${testCase.expectedKept} + fallback ${CHECKLIST_MAX_ITEMS - testCase.expectedKept})`,
  );
}

console.log("\npaid analysis checklist invariant regression passed ✓");
