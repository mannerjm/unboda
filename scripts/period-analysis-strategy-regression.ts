import {
  PERIOD_ANALYSIS_STRATEGIES,
  getPeriodAnalysisStrategy,
} from "../app/lib/analysisPeriodStrategy";
import { PERIOD_ANALYSIS_PRODUCTS } from "../app/lib/analysisPeriodProducts";
import {
  PERIOD_PREMIUM_PRODUCTS,
  PREMIUM_PRODUCT_REGISTRY,
  TOPIC_PREMIUM_PRODUCTS,
} from "../app/lib/premiumProductRegistry";
import { buildReferencePeriodSnapshot } from "../app/lib/analysisReferencePeriod";
import {
  buildPaidAnalysisDetailPromptV3,
  type PaidAnalysisDetailPromptInput,
} from "../app/lib/paidAnalysisDetailPrompt";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const ANCHOR = "2026-08-17";

const LEGACY_TIMELINE_SECTION_RULE =
  "현재, 앞으로 3개월, 앞으로 6개월, 앞으로 1년의 정확히 4개 항목을 작성한다.";

const CAREER_TIMELINE_SECTION_RULE =
  "현재 흐름, 다음 변화의 조건, 중기적으로 확인할 신호, 장기적으로 준비할 방향의 정확히 4개 항목을 작성한다.";

function buildPrompt(productId: string, analysisType: string): string {
  const referencePeriod = buildReferencePeriodSnapshot({
    productId,
    anchorDate: ANCHOR,
    fortune: { daeunOrder: 4, daeunGanji: "무인", seunGanji: "병오" },
  });

  const input: PaidAnalysisDetailPromptInput = {
    productId,
    analysisType,
    birthData: "test-birth-data",
    originalChart: "test-original-chart",
    coreInterpretation: "test-core-interpretation",
    fortuneTiming: "test-fortune-timing",
    sajuSummary: "test-saju-summary",
    currentFortuneFlow: "test-current-fortune-flow",
    ...(referencePeriod ? { referencePeriod } : {}),
  };

  return buildPaidAnalysisDetailPromptV3(input);
}

// A~C. strategy table integrity
assert(PERIOD_ANALYSIS_STRATEGIES.length === 8, `strategies must be 8, got ${PERIOD_ANALYSIS_STRATEGIES.length}`);
const strategyIds = PERIOD_ANALYSIS_STRATEGIES.map((strategy) => strategy.productId);
assert(new Set(strategyIds).size === strategyIds.length, "strategy productIds must be unique");
for (const product of PERIOD_PREMIUM_PRODUCTS) {
  assert(
    getPeriodAnalysisStrategy(product.id) !== null,
    `PERIOD product "${product.id}" must have a strategy`,
  );
}

// D. strategy ids and periodTypes must mirror the PERIOD product source
const productIds = PERIOD_ANALYSIS_PRODUCTS.map((product) => product.id);
assert(
  [...strategyIds].sort().join(",") === [...productIds].sort().join(","),
  `strategy ids must match PERIOD_ANALYSIS_PRODUCTS exactly: ${strategyIds.join(",")}`,
);
for (const strategy of PERIOD_ANALYSIS_STRATEGIES) {
  const definition = PERIOD_ANALYSIS_PRODUCTS.find((product) => product.id === strategy.productId);
  assert(definition !== undefined, `${strategy.productId}: missing PERIOD definition`);
  assert(
    definition!.type === strategy.periodType,
    `${strategy.productId}: periodType must stay bound to the product definition`,
  );
  assert(
    strategy.timelineSpec.labels.length >= 4,
    `${strategy.productId}: timelineSpec must keep at least 4 labels for the V3 schema`,
  );
  assert(
    new Set(strategy.timelineSpec.labels).size === strategy.timelineSpec.labels.length,
    `${strategy.productId}: timeline labels must be unique`,
  );
  assert(strategy.focus.length >= 3, `${strategy.productId}: focus needs at least 3 entries`);
  assert(
    strategy.prohibitedPatterns.length >= 2,
    `${strategy.productId}: prohibitedPatterns needs at least 2 entries`,
  );
}

// E~G. TOPIC, legacy and unknown ids have no strategy
for (const product of TOPIC_PREMIUM_PRODUCTS) {
  assert(
    getPeriodAnalysisStrategy(product.id) === null,
    `TOPIC product "${product.id}" must not have a strategy`,
  );
}
for (const legacyId of Object.keys(PREMIUM_PRODUCT_REGISTRY)) {
  assert(
    getPeriodAnalysisStrategy(legacyId) === null,
    `legacy product "${legacyId}" must not have a strategy`,
  );
}
assert(getPeriodAnalysisStrategy("not-a-product") === null, "unknown id must have no strategy");
assert(getPeriodAnalysisStrategy(undefined) === null, "undefined productId must have no strategy");

// every PERIOD prompt carries both blocks and drops the legacy fixed timeline
const prompts = new Map<string, string>();
for (const product of PERIOD_PREMIUM_PRODUCTS) {
  const prompt = buildPrompt(product.id, product.analysisType);
  prompts.set(product.id, prompt);

  assert(prompt.includes("[기간별 분석 전략]"), `${product.id}: strategy block missing`);
  assert(prompt.includes("[기간 기준 고정]"), `${product.id}: referencePeriod block missing`);
  assert(
    !prompt.includes(LEGACY_TIMELINE_SECTION_RULE),
    `${product.id}: the legacy 3/6/12-month futureTimeline rule must not apply to PERIOD`,
  );
  assert(
    !prompt.includes(CAREER_TIMELINE_SECTION_RULE),
    `${product.id}: the CAREER futureTimeline rule must not apply to PERIOD`,
  );
}
const uniquePrompts = new Set(prompts.values());
assert(uniquePrompts.size === 8, `all 8 PERIOD prompts must differ, got ${uniquePrompts.size} unique`);

// H. monthly-current vs monthly-next
const monthlyCurrent = prompts.get("monthly-current")!;
const monthlyNext = prompts.get("monthly-next")!;
assert(monthlyCurrent !== monthlyNext, "H: monthly prompts must differ");
assert(
  monthlyCurrent.includes("이번 달 안에서 지금 무엇을 우선해야 하는가")
    && monthlyCurrent.includes("이번 달 초반")
    && monthlyCurrent.includes("2026년 8월 이번달 운"),
  "H: monthly-current must focus on the current month interior",
);
assert(
  monthlyNext.includes("다음 달에 들어가기 전에 무엇을 준비해야 하는가")
    && monthlyNext.includes("다음 달 진입 전 준비")
    && monthlyNext.includes("2026년 9월 다음달 운"),
  "H: monthly-next must focus on entry preparation for the next month",
);
assert(
  !monthlyCurrent.includes("다음 달 진입 전 준비") && !monthlyNext.includes("이번 달 초반"),
  "H: monthly prompts must not share each other's timeline labels",
);

// I. annual-current vs annual-next
const annualCurrent = prompts.get("annual-current")!;
const annualNext = prompts.get("annual-next")!;
assert(annualCurrent !== annualNext, "I: annual prompts must differ");
assert(
  annualCurrent.includes("기준 확정일 이후 남은 기간")
    && annualCurrent.includes("기준 연도: 2026년")
    && annualCurrent.includes("2026년 올해 운"),
  "I: annual-current must center the remaining part of the current year",
);
assert(
  annualNext.includes("기준 연도: 2027년")
    && annualNext.includes("2027년 내년 운")
    && annualNext.includes("실제 기준 연도 숫자를 사용한다"),
  "I: annual-next must pin the real reference year",
);
assert(
  annualNext.includes("실제 연도 없이 '내년'이라는 상대 표현만 사용하는 서술"),
  "I: annual-next must forbid relative-only wording",
);

// J. annual-3years
const annual3years = prompts.get("annual-3years")!;
assert(
  annual3years.includes("1년차")
    && annual3years.includes("2년차")
    && annual3years.includes("3년차")
    && annual3years.includes("세 연도를 반드시 서로 비교"),
  "J: annual-3years must compare the three years explicitly",
);
assert(
  annual3years.includes("2026~2028년 향후 3년 운")
    && annual3years.includes("2026-01-01 ~ 2028-12-31"),
  "J: annual-3years must carry the real coverage years",
);
assert(
  annual3years.includes("월 단위 타이밍 분석으로 내려가는 서술"),
  "J: annual-3years must not take over the monthly timing role",
);
assert(
  !annual3years.includes("핵심 월과 강약 구간만 선별"),
  "J: annual-3years must not reuse the 12-month timing instruction",
);

// K. monthly-12months
const monthly12 = prompts.get("monthly-12months")!;
assert(
  monthly12.includes("핵심 월과 강약 구간만 선별")
    && monthly12.includes("가장 강하게 움직일 구간")
    && monthly12.includes("12개월을 모두 같은 분량으로 나열하지 말고"),
  "K: monthly-12months must select key months instead of listing all twelve",
);
assert(
  monthly12.includes("2026년 8월부터 12개월")
    && monthly12.includes("2026-08-01 ~ 2027-07-31"),
  "K: monthly-12months must carry the real rolling window",
);
assert(
  monthly12.includes("연 단위 중기 인생 방향으로 확장하는 서술")
    && !monthly12.includes("1년차"),
  "K: monthly-12months must not perform the 3-year comparison",
);

// L. daeun-current with and without engine metadata
const daeunWithMeta = prompts.get("daeun-current")!;
assert(
  daeunWithMeta.includes("기준 대운: 무인") && daeunWithMeta.includes("현재 대운의 진입 국면"),
  "L: daeun-current must use the snapshotted daeun when present",
);

const daeunWithoutMeta = buildPaidAnalysisDetailPromptV3({
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
assert(daeunWithoutMeta.length > 0, "L: daeun prompt must build without daeun metadata");
assert(
  !daeunWithoutMeta.includes("기준 대운:") && !daeunWithoutMeta.includes("무인"),
  "L: missing daeun metadata must not be invented",
);
assert(
  daeunWithoutMeta.includes("대운 번호나 간지를 추정해 만들어내는 서술"),
  "L: daeun prompt must forbid inventing missing metadata",
);

// M. lifetime-overview
const lifetime = prompts.get("lifetime-overview")!;
assert(
  lifetime.includes("생애 초반의 구조") && lifetime.includes("생애 전체의 큰 전환 성격"),
  "M: lifetime must use life-stage sections",
);
assert(
  lifetime.includes("3개월·6개월·1년 같은 단기 전망")
    && lifetime.includes("특정 연도나 월의 사건을 예측하는 서술"),
  "M: lifetime must forbid short-term prediction",
);
assert(
  !lifetime.includes("분석 대상 기간:"),
  "M: lifetime must not require a finite coverage",
);

// N. TOPIC prompts stay on the legacy contract
const TOPIC_SAMPLES = [
  { productId: "relationship-conflict", analysisType: "갈등 패턴과 회복 방식" },
  { productId: "money-leak-risk", analysisType: "돈이 새는 구조와 손실 위험" },
  { productId: "health-stress", analysisType: "스트레스 반응과 관리" },
  { productId: "life-priority", analysisType: "지금의 우선순위" },
];
for (const sample of TOPIC_SAMPLES) {
  const prompt = buildPrompt(sample.productId, sample.analysisType);

  assert(
    !prompt.includes("[기간별 분석 전략]") && !prompt.includes("[기간 기준 고정]"),
    `N: TOPIC "${sample.productId}" must not receive period blocks`,
  );
  assert(
    prompt.includes(LEGACY_TIMELINE_SECTION_RULE),
    `N: TOPIC "${sample.productId}" must keep the legacy futureTimeline contract`,
  );
}

// CAREER special-casing must survive untouched
const careerPrompt = buildPrompt("career-job-change", "이직과 이동");
assert(
  careerPrompt.includes(CAREER_TIMELINE_SECTION_RULE),
  "N: CAREER timeline branch must stay unchanged",
);

// O. referencePeriod semantics are unchanged (P0-8E contract re-checked here)
const monthlySnapshot = buildReferencePeriodSnapshot({
  productId: "monthly-current",
  anchorDate: ANCHOR,
})!;
assert(
  monthlySnapshot.labelSnapshot === "2026년 8월 이번달 운"
    && monthlySnapshot.coverage?.from === "2026-08-01"
    && monthlySnapshot.coverage?.to === "2026-08-31",
  "O: referencePeriod meaning must stay identical to P0-8E",
);

console.log("period strategies:");
for (const strategy of PERIOD_ANALYSIS_STRATEGIES) {
  console.log(`  ${strategy.productId} [${strategy.timeGranularity}] → ${strategy.timelineSpec.labels.join(" / ")}`);
}

console.log("\nperiod analysis strategy regression passed ✓");
