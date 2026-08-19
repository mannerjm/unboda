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
  "career-promotion-readiness",
  "career-workplace-adaptation",
  "career-leadership-readiness",
  "career-freelance-transition",
] as const;

const siblingPairs = [
  ["career-promotion-readiness", "career-specialization"],
  ["career-promotion-readiness", "career-leadership-readiness"],
  ["career-workplace-adaptation", "career-job-fit"],
  ["career-freelance-transition", "career-job-change"],
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
assert(launchProductIds.length === 22, "Batch 1 must raise the implemented launch catalog to 22 products");
assert(new Set(launchProductIds).size === launchProductIds.length, "launch product IDs must be unique");

for (const productId of batchProductIds) {
  const config = getPaidAnalysisTopicConfig(productId);
  if (!config) throw new Error(`FAIL: ${productId} must have a TopicConfig`);

  assert(Boolean(getPremiumProduct(productId)), `${productId} must be in the premium registry`);
  assert(config.userQuestion.trim().length > 0, `${productId} needs a customer question`);
  assert(config.requiredInsights.length === 4, `${productId} needs exactly four required insights`);
  assert(new Set(config.requiredInsights.map((insight) => insight.id)).size === 4, `${productId} insight IDs must be product-specific`);
  assert(config.prohibitedClaims.length > 0, `${productId} needs a prohibited-claim boundary`);
  assert(config.actionFocus.length >= 3, `${productId} needs commercial action responsibility`);
  assert(config.excludedFocus?.length === 3, `${productId} needs three sibling exclusions`);

  const prompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId });
  assert(prompt.includes(config.userQuestion), `${productId} prompt must include its customer question`);
  assert(prompt.includes("[상품 중심 추론 계약]"), `${productId} prompt must use the generic TopicConfig narrative contract`);
  for (const insight of config.requiredInsights) {
    assert(prompt.includes(insight.prompt), `${productId} prompt must include ${insight.id}`);
  }

  const formatted = formatTopicConfigForPrompt(config);
  for (const prohibitedClaim of config.prohibitedClaims) {
    assert(formatted.includes(prohibitedClaim), `${productId} must preserve prohibited claim: ${prohibitedClaim}`);
  }
}

for (const [leftId, rightId] of siblingPairs) {
  const left = getPaidAnalysisTopicConfig(leftId);
  const right = getPaidAnalysisTopicConfig(rightId);
  if (!left || !right) throw new Error(`FAIL: missing sibling pair ${leftId}/${rightId}`);
  assert(left.userQuestion !== right.userQuestion, `${leftId} and ${rightId} need separate customer questions`);
  assert(JSON.stringify(left.requiredInsights) !== JSON.stringify(right.requiredInsights), `${leftId} and ${rightId} need separate insight ownership`);
  assert(JSON.stringify(left.actionFocus) !== JSON.stringify(right.actionFocus), `${leftId} and ${rightId} need separate principal actions`);
  assert(validatePremiumDepthSiblingDistinction(getPaidAnalysisPremiumDepthContract(left), getPaidAnalysisPremiumDepthContract(right)).ok, `${leftId} and ${rightId} must not have high positive-ownership overlap`);
}

const promotion = getPaidAnalysisTopicConfig("career-promotion-readiness");
const leadership = getPaidAnalysisTopicConfig("career-leadership-readiness");
const adaptation = getPaidAnalysisTopicConfig("career-workplace-adaptation");
const freelance = getPaidAnalysisTopicConfig("career-freelance-transition");
if (!promotion || !leadership || !adaptation || !freelance) {
  throw new Error("FAIL: every Batch 1 TopicConfig must exist");
}

assert(promotion.excludedFocus!.some((item) => item.id === "leadership-daily-team-management"), "promotion must yield daily team leadership to leadership readiness");
assert(leadership.excludedFocus!.some((item) => item.id === "promotion-approval-outcome"), "leadership readiness must yield promotion outcome to promotion readiness");
assert(adaptation.excludedFocus!.some((item) => item.id === "job-change-decision"), "workplace adaptation must yield movement decision to job change");
assert(freelance.excludedFocus!.some((item) => item.id === "business-startup-market-readiness"), "freelance transition must yield startup market readiness to a business product");

console.log("paid-analysis-v4-catalog-batch-1-regression passed ✓");