import {
  getPeriodAnalysisStrategy,
  PERIOD_ANALYSIS_STRATEGIES,
} from "../app/lib/analysisPeriodStrategy";
import { buildReferencePeriodSnapshot } from "../app/lib/analysisReferencePeriod";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPaidAnalysisV4ExpectedInsightCount } from "../app/lib/paidAnalysisV4DiagnosticCapture";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const CANONICAL_PERIOD_IDS = [
  "monthly-current",
  "monthly-next",
  "yearly-current",
  "annual-next",
  "annual-3years",
  "daeun-current",
  "lifetime-overview",
] as const;

const strategy = (productId: string) => {
  const value = getPeriodAnalysisStrategy(productId);
  assert(value !== null, `${productId} must have a strategy`);
  return value!;
};

for (const productId of CANONICAL_PERIOD_IDS) {
  const value = strategy(productId);
  assert(value.requiredInsights.length === 4, `${productId} must expose exactly four responsibilities`);
  assert(getPaidAnalysisV4ExpectedInsightCount(productId) === 4, `${productId} diagnostic count must be four`);
  for (const insight of value.requiredInsights) {
    assert(insight.id.length > 0, `${productId}: responsibility id must be explicit`);
    assert(insight.evidenceInterpretation.length > 10, `${productId}: evidence responsibility must be explicit`);
    assert(insight.mechanismResponsibility.length > 10, `${productId}: mechanism responsibility must be explicit`);
    assert(insight.observableSignal.length > 10, `${productId}: observable signal must be explicit`);
    assert(insight.actionResponsibility.length > 10, `${productId}: action responsibility must be explicit`);
  }
  assert(value.evidenceArchitecture.length > 20, `${productId}: evidence architecture must be explicit`);
  assert(value.causeArchitecture.length > 20, `${productId}: cause architecture must be explicit`);
  assert(value.reviewArtifact.length > 10, `${productId}: review artifact must be explicit`);
}

const monthlyCurrent = strategy("monthly-current");
const monthlyNext = strategy("monthly-next");
const yearlyCurrent = strategy("yearly-current");
const annualNext = strategy("annual-next");
const annualThreeYears = strategy("annual-3years");
const daeun = strategy("daeun-current");
const lifetime = strategy("lifetime-overview");

assert(monthlyCurrent.requiredInsights.every((item) => !item.id.includes("incoming")), "monthly-current must not own incoming-month preparation");
assert(monthlyNext.requiredInsights.some((item) => item.id === "previous-month-change"), "monthly-next must own previous-month comparison");
assert(monthlyNext.evidenceArchitecture.includes("직전 달"), "monthly-next evidence must name the previous-month comparison");
assert(monthlyNext.causeArchitecture.includes("직전 달 대비 변화"), "monthly-next cause must start from change from the preceding month");
assert(yearlyCurrent.requiredInsights.some((item) => item.id === "annual-pressure-resource-structure"), "yearly-current must own annual pressure/resource accumulation");
assert(yearlyCurrent.requiredInsights.some((item) => item.id === "annual-carry-forward-review"), "yearly-current must own year-end carry-forward/reset");
assert(yearlyCurrent.evidenceArchitecture.includes("연간 누적·지속성"), "yearly-current evidence must own annual accumulation/persistence");
assert(yearlyCurrent.causeArchitecture.includes("연간 축적 조건"), "yearly-current cause must own annual accumulation");
assert(annualNext.evidenceArchitecture.includes("다음 해"), "annual-next must own forward annual preparation");
assert(annualThreeYears.evidenceArchitecture.includes("1·2·3년차"), "annual-3years must own cross-year sequencing");
assert(daeun.evidenceArchitecture.includes("대운 장기 테마"), "daeun-current must own the multi-year structural phase");
assert(lifetime.causeArchitecture.includes("cross-phase synthesis"), "lifetime-overview must own recurring cross-phase synthesis");

const input = {
  productId: "monthly-next",
  analysisType: "다음달 운",
  birthData: "test",
  originalChart: "test",
  coreInterpretation: "test",
  fortuneTiming: "test",
  sajuSummary: "test",
  currentFortuneFlow: "test",
  referencePeriod: buildReferencePeriodSnapshot({ productId: "monthly-next", anchorDate: "2026-08-17" })!,
};
const monthlyNextPrompt = buildPaidAnalysisDetailPromptV4(input);
assert(monthlyNextPrompt.includes("비교 기준 월: 2026년 8월"), "monthly-next prompt must carry deterministic previous-month context");
assert(monthlyNextPrompt.includes("실제 사건을 추정하지 말고"), "previous-month context must prohibit invented events");

const annualMonthlyDimensions = [
  [yearlyCurrent.coreQuestion, monthlyNext.coreQuestion, "customer question"],
  [JSON.stringify(yearlyCurrent.requiredInsights), JSON.stringify(monthlyNext.requiredInsights), "required responsibilities"],
  [yearlyCurrent.evidenceArchitecture, monthlyNext.evidenceArchitecture, "evidence interpretation"],
  [yearlyCurrent.causeArchitecture, monthlyNext.causeArchitecture, "cause architecture"],
  [yearlyCurrent.timelineSpec.rule, monthlyNext.timelineSpec.rule, "review window"],
  [JSON.stringify(yearlyCurrent.timelineSpec.labels), JSON.stringify(monthlyNext.timelineSpec.labels), "timeline"],
  [yearlyCurrent.reviewArtifact, monthlyNext.reviewArtifact, "action artifact"],
  [yearlyCurrent.requiredInsights[3].actionResponsibility, monthlyNext.requiredInsights[3].actionResponsibility, "conclusion responsibility"],
] as const;

for (const [annualValue, monthlyValue, label] of annualMonthlyDimensions) {
  assert(annualValue !== monthlyValue, `renamed-report implementation must fail: ${label} is identical`);
}

assert(PERIOD_ANALYSIS_STRATEGIES.length === 8, "technical strategy inventory must preserve the dormant monthly-12months strategy");
assert(getPeriodAnalysisStrategy("annual-current")?.productId === "yearly-current", "annual-current alias must remain compatibility-only");

console.log("paid-analysis-v4-period-ownership-regression passed ✓");
