import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PeriodAnalysisBlockSchema,
  type PeriodAnalysisBlock,
} from "../app/lib/analysisPeriodOutput";
import { parsePaidAnalysisDetailOutputV3 } from "../app/lib/paidAnalysisDetailOutputParser";
import { compressCareerDetailStructure } from "../app/lib/paidAnalysisDetailService";
import { buildPaidAnalysisDetailPromptV3 } from "../app/lib/paidAnalysisDetailPrompt";
import { buildReferencePeriodSnapshot } from "../app/lib/analysisReferencePeriod";
import { PERIOD_ANALYSIS_STRATEGIES } from "../app/lib/analysisPeriodStrategy";
import { PERIOD_PREMIUM_PRODUCTS } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const ANCHOR = "2026-08-17";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

function buildPrompt(productId: string, analysisType: string): string {
  const referencePeriod = buildReferencePeriodSnapshot({
    productId,
    anchorDate: ANCHOR,
    fortune: { daeunOrder: 4, daeunGanji: "무인", seunGanji: "병오" },
  });

  return buildPaidAnalysisDetailPromptV3({
    productId,
    analysisType,
    birthData: "test-birth-data",
    originalChart: "test-original-chart",
    coreInterpretation: "test-core-interpretation",
    fortuneTiming: "test-fortune-timing",
    sajuSummary: "test-saju-summary",
    currentFortuneFlow: "test-current-fortune-flow",
    ...(referencePeriod ? { referencePeriod } : {}),
  });
}

const validBlock: PeriodAnalysisBlock = {
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
      cautions: ["조건을 확인하기 전에 범위를 넓히지 않는다"],
    },
    {
      periodKey: "segment-2",
      label: "이번 달 중반",
      title: "조건 확인",
      summary: "중반에는 정리한 기준이 실제 조건과 맞는지 확인할 여지가 커집니다.",
    },
  ],
  keyPoints: [
    "이번 달은 속도보다 기준이 우선입니다",
    "조건 확인 이후에 범위를 조정합니다",
  ],
};

// 1. schema accepts a valid block and rejects invalid shapes
assert(PeriodAnalysisBlockSchema.safeParse(validBlock).success, "valid block must parse");
assert(
  !PeriodAnalysisBlockSchema.safeParse({ ...validBlock, headline: "짧음" }).success,
  "headline shorter than 10 chars must fail",
);
assert(
  !PeriodAnalysisBlockSchema.safeParse({ ...validBlock, scale: "weekly" }).success,
  "scale must stay within the PERIOD scale union",
);
assert(
  !PeriodAnalysisBlockSchema.safeParse({
    ...validBlock,
    timelineItems: [validBlock.timelineItems[0]],
  }).success,
  "timelineItems below 2 must fail",
);
assert(
  !PeriodAnalysisBlockSchema.safeParse({
    ...validBlock,
    timelineItems: Array.from({ length: 13 }, (_, index) => ({
      ...validBlock.timelineItems[0],
      periodKey: `segment-${index + 1}`,
    })),
  }).success,
  "timelineItems above 12 must fail",
);
assert(
  !PeriodAnalysisBlockSchema.safeParse({
    ...validBlock,
    timelineItems: [
      { ...validBlock.timelineItems[0], summary: "너무 짧은 요약" },
      validBlock.timelineItems[1],
    ],
  }).success,
  "summary shorter than 20 chars must fail",
);
assert(
  !PeriodAnalysisBlockSchema.safeParse({
    ...validBlock,
    timelineItems: [
      { ...validBlock.timelineItems[0], actions: ["a", "b", "c", "d"] },
      validBlock.timelineItems[1],
    ],
  }).success,
  "actions above 3 must fail",
);
assert(
  !PeriodAnalysisBlockSchema.safeParse({ ...validBlock, keyPoints: ["하나만 있는 핵심 항목"] }).success,
  "keyPoints below 2 must fail",
);
assert(
  PeriodAnalysisBlockSchema.safeParse({
    productId: validBlock.productId,
    scale: validBlock.scale,
    headline: validBlock.headline,
    timelineItems: validBlock.timelineItems,
  }).success,
  "keyPoints must stay optional",
);

// 2 & 3. V3 parse keeps the block, legacy reports stay valid without it
const legacyReport = JSON.parse(read("scripts/fixtures/paid-report-v3.json")) as Record<string, unknown>;

const parsedLegacy = parsePaidAnalysisDetailOutputV3(legacyReport);
assert(parsedLegacy.periodAnalysis === undefined, "legacy V3 must parse without periodAnalysis");
assert(parsedLegacy.referencePeriod === undefined, "legacy V3 must keep parsing without referencePeriod");

const parsedWithBlock = parsePaidAnalysisDetailOutputV3({
  ...legacyReport,
  periodAnalysis: validBlock,
});
assert(
  JSON.stringify(parsedWithBlock.periodAnalysis) === JSON.stringify(validBlock),
  "periodAnalysis must survive parsing without being stripped",
);

// 12. the existing compress step must preserve the block untouched
const compressed = compressCareerDetailStructure(
  parsePaidAnalysisDetailOutputV3({ ...legacyReport, periodAnalysis: validBlock }),
  "FORTUNE",
);
assert(
  JSON.stringify(compressed.periodAnalysis) === JSON.stringify(validBlock),
  "compressCareerDetailStructure must not drop or mutate periodAnalysis",
);

// 4 & 5. every PERIOD prompt carries the contract and stays differentiated
const prompts = new Map<string, string>();
for (const product of PERIOD_PREMIUM_PRODUCTS) {
  const prompt = buildPrompt(product.id, product.analysisType);
  prompts.set(product.id, prompt);

  const strategy = PERIOD_ANALYSIS_STRATEGIES.find((entry) => entry.productId === product.id)!;

  assert(prompt.includes('"periodAnalysis": {'), `${product.id}: periodAnalysis JSON contract missing`);
  assert(prompt.includes("periodAnalysis 작성 규칙:"), `${product.id}: periodAnalysis rules missing`);
  assert(
    prompt.includes(`"productId": "${product.id}"`) && prompt.includes(`"scale": "${strategy.periodType}"`),
    `${product.id}: contract must pin productId and scale`,
  );
  assert(
    prompt.includes("[기간 기준 고정]") && prompt.includes("[기간별 분석 전략]"),
    `${product.id}: existing period blocks must remain`,
  );
  assert(
    prompt.includes("두 필드에 같은 문장을 그대로 복사하지 않는다."),
    `${product.id}: futureTimeline / periodAnalysis separation must be stated`,
  );
  for (const label of strategy.timelineSpec.labels) {
    assert(prompt.includes(`"label": "${label}"`), `${product.id}: label "${label}" missing from contract`);
  }
  assert(
    (prompt.match(/"recommendations": \[\]/g) ?? []).length === 1,
    `${product.id}: the recommendations marker must stay unique`,
  );
}
assert(new Set(prompts.values()).size === 8, "all 8 PERIOD prompts must stay different");

const KEY_PREFIX_BY_PRODUCT: Record<string, string> = {
  "monthly-current": "segment-1",
  "monthly-next": "segment-1",
  "annual-current": "segment-1",
  "annual-next": "segment-1",
  "annual-3years": "year-1",
  "monthly-12months": "window-1",
  "daeun-current": "phase-1",
  "lifetime-overview": "stage-1",
};
for (const [productId, expectedKey] of Object.entries(KEY_PREFIX_BY_PRODUCT)) {
  const prompt = prompts.get(productId)!;
  assert(
    prompt.includes(`"periodKey": "${expectedKey}"`),
    `${productId}: periodKey must start at ${expectedKey}`,
  );
}

// periodKey must never carry real calendar or daeun values
for (const [productId, prompt] of prompts) {
  const contract = prompt.slice(prompt.indexOf('"periodAnalysis": {'), prompt.indexOf('"recommendations": []'));
  const periodKeys = [...contract.matchAll(/"periodKey": "([^"]+)"/g)].map((match) => match[1]);

  assert(periodKeys.length >= 2, `${productId}: contract needs at least 2 periodKeys`);
  for (const key of periodKeys) {
    assert(
      /^(segment|year|window|phase|stage)-\d+$/.test(key),
      `${productId}: periodKey "${key}" must stay an opaque ordering key`,
    );
    assert(!/\d{4}/.test(key), `${productId}: periodKey "${key}" must not embed a real year`);
  }
  assert(
    prompt.includes("실제 연도·월·대운 번호를 키로 만들지 않는다."),
    `${productId}: periodKey must be declared as an internal key`,
  );
}

// 8. daeun-current without engine metadata
const daeunNoMeta = buildPaidAnalysisDetailPromptV3({
  productId: "daeun-current",
  analysisType: "대운 · 10년 흐름",
  birthData: "test-birth-data",
  originalChart: "test-original-chart",
  coreInterpretation: "test-core-interpretation",
  fortuneTiming: "test-fortune-timing",
  sajuSummary: "test-saju-summary",
  currentFortuneFlow: "test-current-fortune-flow",
  referencePeriod: buildReferencePeriodSnapshot({
    productId: "daeun-current",
    anchorDate: ANCHOR,
  })!,
});
assert(daeunNoMeta.includes('"periodAnalysis": {'), "8: daeun prompt must build without daeun metadata");
assert(
  !daeunNoMeta.includes("기준 대운:") && !daeunNoMeta.includes("무인"),
  "8: missing daeun metadata must not be invented",
);
assert(
  daeunNoMeta.includes("기준 기간에 제시되지 않은 대운 번호나 간지를 만들어내지 않는다."),
  "8: daeun prompt must forbid inventing metadata",
);

// 9. lifetime must not be told to use real calendar keys
const lifetime = prompts.get("lifetime-overview")!;
assert(lifetime.includes('"periodKey": "stage-1"'), "9: lifetime must use stage keys");
assert(
  !/"periodKey": "\d{4}/.test(lifetime),
  "9: lifetime periodKey must not be a real year",
);
assert(
  lifetime.includes("특정 연도나 월의 사건을 예측하는 서술"),
  "9: lifetime must keep its short-term prediction ban",
);

// 6 & 7. TOPIC and CAREER prompts must not know about periodAnalysis
const TOPIC_SAMPLES = [
  { productId: "relationship-conflict", analysisType: "갈등 패턴과 회복 방식" },
  { productId: "money-leak-risk", analysisType: "돈이 새는 구조와 손실 위험" },
  { productId: "health-stress", analysisType: "스트레스 반응과 관리" },
  { productId: "life-priority", analysisType: "지금의 우선순위" },
];
for (const sample of TOPIC_SAMPLES) {
  const prompt = buildPrompt(sample.productId, sample.analysisType);

  assert(
    !prompt.includes("periodAnalysis"),
    `6: TOPIC "${sample.productId}" must not contain the periodAnalysis contract`,
  );
  assert(
    prompt.includes("현재, 앞으로 3개월, 앞으로 6개월, 앞으로 1년의 정확히 4개 항목을 작성한다."),
    `6: TOPIC "${sample.productId}" must keep its futureTimeline contract`,
  );
}

const careerPrompt = buildPrompt("career-job-change", "이직과 이동");
assert(!careerPrompt.includes("periodAnalysis"), "7: CAREER must not contain periodAnalysis");
assert(
  careerPrompt.includes("현재 흐름, 다음 변화의 조건, 중기적으로 확인할 신호, 장기적으로 준비할 방향의 정확히 4개 항목을 작성한다."),
  "7: CAREER futureTimeline contract must stay unchanged",
);

// 10 & 11. renderer stays conditional and never prints the machine key
const client = read("app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx");
const section = read("app/paid-analysis/[productId]/PeriodTimelineSection.tsx");

assert(
  client.includes("{detail.periodAnalysis ? (")
    && client.includes("<PeriodTimelineSection periodAnalysis={detail.periodAnalysis} />"),
  "10: the period section must render only when the block exists",
);
assert(
  client.indexOf("detail.futureTimeline.map") < client.indexOf("<PeriodTimelineSection"),
  "10: the period section must render after futureTimeline",
);
assert(
  (section.match(/item\.periodKey/g) ?? []).length === 1
    && section.includes("key={item.periodKey}"),
  "11: periodKey may only be used as a React key, never as UI text",
);
for (const field of ["headline", "item.label", "item.title", "item.summary", "item.intensity", "item.actions", "item.cautions", "keyPoints"]) {
  assert(section.includes(field), `10: renderer must handle ${field}`);
}

console.log("period analysis contract:");
for (const [productId, prompt] of prompts) {
  const contract = prompt.slice(prompt.indexOf('"periodAnalysis": {'), prompt.indexOf('"recommendations": []'));
  const keys = [...contract.matchAll(/"periodKey": "([^"]+)"/g)].map((match) => match[1]);
  console.log(`  ${productId} → ${keys.join(", ")}`);
}

console.log("\nperiod analysis output regression passed ✓");
