import {
  formatTopicConfigForPrompt,
  getLaunchProductIds,
  getPaidAnalysisPremiumDepthContract,
  getPaidAnalysisTopicConfig,
} from "../app/lib/paidAnalysisTopicConfig";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { validatePremiumDepthSiblingDistinction } from "../app/lib/paidAnalysisV4QualityValidators";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const batchProductIds = [
  "career-workload-recovery",
  "career-workplace-relationships",
  "money-income-stability",
  "money-debt-repayment",
  "money-emergency-buffer",
] as const;

const siblingPairs = [
  ["career-workload-recovery", "career"],
  ["career-workplace-relationships", "relationship"],
  ["money-income-stability", "money-wealth-accumulation"],
  ["money-debt-repayment", "money-leak-risk"],
  ["money-emergency-buffer", "money-wealth-accumulation"],
] as const;

const basePromptInput = {
  analysisType: "테스트 분석",
  birthData: "birth",
  originalChart: "chart",
  coreInterpretation: "core",
  fortuneTiming: "timing",
  sajuSummary: "summary",
  currentFortuneFlow: "flow",
};

const launchProductIds = getLaunchProductIds();
assert(launchProductIds.length === 50, "Final batch must preserve the implemented launch catalog at 50 products");
assert(new Set(launchProductIds).size === launchProductIds.length, "launch product IDs must be unique");

for (const productId of batchProductIds) {
  const config = getPaidAnalysisTopicConfig(productId);
  if (!config) throw new Error(`FAIL: ${productId} must have a TopicConfig`);

  assert(Boolean(getPremiumProduct(productId)), `${productId} must be in the premium registry`);
  assert(config.requiredInsights.length === 4, `${productId} needs exactly four required insights`);
  assert(new Set(config.requiredInsights.map((insight) => insight.id)).size === 4, `${productId} insight IDs must be unique`);
  assert(config.userQuestion.trim().length > 0, `${productId} needs a customer question`);
  assert(config.evidenceFocus.length >= 3, `${productId} needs resolver-backed evidence focus`);
  assert(config.actionFocus.length >= 3, `${productId} needs a commercial action artifact`);
  assert(config.prohibitedClaims.length > 0, `${productId} needs prohibited claims`);
  assert(config.excludedFocus?.length === 3, `${productId} needs explicit sibling exclusions`);

  const prompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId });
  assert(prompt.includes(config.userQuestion), `${productId} prompt must include customer question`);
  assert(prompt.includes("[상품 중심 추론 계약]"), `${productId} must use generic TopicConfig narrative contract`);
  for (const insight of config.requiredInsights) {
    assert(prompt.includes(insight.prompt), `${productId} prompt must include ${insight.id}`);
  }
  const formatted = formatTopicConfigForPrompt(config);
  for (const claim of config.prohibitedClaims) {
    assert(formatted.includes(claim), `${productId} must retain safety claim: ${claim}`);
  }
}

for (const [leftId, rightId] of siblingPairs) {
  const left = getPaidAnalysisTopicConfig(leftId);
  const right = getPaidAnalysisTopicConfig(rightId);
  if (!left || !right) throw new Error(`FAIL: missing sibling pair ${leftId}/${rightId}`);

  assert(left.userQuestion !== right.userQuestion, `${leftId} and ${rightId} need separate customer jobs`);
  assert(JSON.stringify(left.requiredInsights) !== JSON.stringify(right.requiredInsights), `${leftId} and ${rightId} need separate mechanisms`);
  assert(JSON.stringify(left.actionFocus) !== JSON.stringify(right.actionFocus), `${leftId} and ${rightId} need separate action artifacts`);
  assert(validatePremiumDepthSiblingDistinction(getPaidAnalysisPremiumDepthContract(left), getPaidAnalysisPremiumDepthContract(right)).ok, `${leftId} and ${rightId} must have distinct positive ownership`);
}

const workload = getPaidAnalysisTopicConfig("career-workload-recovery");
const accumulation = getPaidAnalysisTopicConfig("money-wealth-accumulation");
const buffer = getPaidAnalysisTopicConfig("money-emergency-buffer");
if (!workload || !accumulation || !buffer) throw new Error("FAIL: Batch 2 medium-overlap configs must exist");

const workloadExcluded = workload.excludedFocus ?? [];
const bufferExcluded = buffer.excludedFocus ?? [];
assert(workloadExcluded.some((item) => item.id === "broad-career-operating-portfolio"), "workload recovery must yield broad career operation to career");
assert(bufferExcluded.some((item) => item.id === "wealth-accumulation-target-or-product"), "emergency buffer must yield accumulation targets to wealth accumulation");
assert(accumulation.requiredInsights.some((item) => item.id === "preservation-capacity-design"), "wealth accumulation must retain preservation ownership");

console.log("paid-analysis-v4-catalog-batch-2-regression passed ✓");