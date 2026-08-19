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
  "money-shared-finance",
  "money-contract-commitment",
  "money-spending-decision",
  "relationship-long-distance",
  "relationship-unrequited",
] as const;

const siblingPairs = [
  ["money-shared-finance", "money-leak-risk"],
  ["money-contract-commitment", "money-leak-risk"],
  ["money-spending-decision", "money-saving-discipline"],
  ["relationship-long-distance", "relationship-current"],
  ["relationship-unrequited", "relationship-new-connection"],
] as const;

const basePromptInput = { analysisType: "테스트 분석", birthData: "birth", originalChart: "chart", coreInterpretation: "core", fortuneTiming: "timing", sajuSummary: "summary", currentFortuneFlow: "flow" };

const launchProductIds = getLaunchProductIds();
assert(launchProductIds.length === 54, "Period-family completion must preserve 47 topics and 7 period products");
assert(new Set(launchProductIds).size === launchProductIds.length, "launch IDs must be unique");

for (const productId of batchProductIds) {
  const config = getPaidAnalysisTopicConfig(productId);
  if (!config) throw new Error(`FAIL: missing ${productId} TopicConfig`);
  assert(Boolean(getPremiumProduct(productId)), `${productId} must be in registry`);
  assert(config.userQuestion.trim().length > 0, `${productId} needs customer question`);
  assert(config.requiredInsights.length === 4, `${productId} needs four required insights`);
  assert(new Set(config.requiredInsights.map((item) => item.id)).size === 4, `${productId} insight IDs must be unique`);
  assert(config.evidenceFocus.length >= 3, `${productId} needs resolver-backed evidence`);
  assert(config.actionFocus.length >= 3, `${productId} needs action responsibility`);
  assert(config.excludedFocus?.length === 3, `${productId} needs three exclusions`);
  assert(config.prohibitedClaims.length > 0, `${productId} needs safety boundary`);
  const prompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId });
  assert(prompt.includes(config.userQuestion) && prompt.includes("[상품 중심 추론 계약]"), `${productId} must use generic prompt contract`);
  for (const insight of config.requiredInsights) assert(prompt.includes(insight.prompt), `${productId} prompt must include ${insight.id}`);
  const formatted = formatTopicConfigForPrompt(config);
  for (const claim of config.prohibitedClaims) assert(formatted.includes(claim), `${productId} must retain ${claim}`);
}

for (const [leftId, rightId] of siblingPairs) {
  const left = getPaidAnalysisTopicConfig(leftId);
  const right = getPaidAnalysisTopicConfig(rightId);
  if (!left || !right) throw new Error(`FAIL: missing ${leftId}/${rightId}`);
  assert(left.userQuestion !== right.userQuestion, `${leftId} and ${rightId} need distinct customer jobs`);
  assert(JSON.stringify(left.requiredInsights) !== JSON.stringify(right.requiredInsights), `${leftId} and ${rightId} need distinct mechanisms`);
  assert(JSON.stringify(left.actionFocus) !== JSON.stringify(right.actionFocus), `${leftId} and ${rightId} need distinct action artifacts`);
  assert(validatePremiumDepthSiblingDistinction(getPaidAnalysisPremiumDepthContract(left), getPaidAnalysisPremiumDepthContract(right)).ok, `${leftId} and ${rightId} must have positive ownership separation`);
}

const sharedFinance = getPaidAnalysisTopicConfig("money-shared-finance");
const commitment = getPaidAnalysisTopicConfig("money-contract-commitment");
if (!sharedFinance || !commitment) throw new Error("FAIL: medium-overlap money configs must exist");
assert((sharedFinance.excludedFocus ?? []).some((item) => item.id === "general-money-leak-pattern"), "shared finance must yield broad leak exposure");
assert((commitment.excludedFocus ?? []).some((item) => item.id === "general-spending-or-saving-routine"), "contract commitment must yield routine spending");

console.log("paid-analysis-v4-catalog-batch-3-regression passed ✓");