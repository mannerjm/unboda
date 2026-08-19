import { formatTopicConfigForPrompt, getLaunchProductIds, getPaidAnalysisPremiumDepthContract, getPaidAnalysisTopicConfig } from "../app/lib/paidAnalysisTopicConfig";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { validatePremiumDepthSiblingDistinction } from "../app/lib/paidAnalysisV4QualityValidators";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }

const batchProductIds = ["relationship-friendship", "relationship-family-role", "health-energy-recovery", "health-sleep-rhythm", "health-stress-regulation", "health-burnout-risk", "health-habit-continuity", "health-body-signal-review"] as const;
const siblingPairs = [
  ["relationship-friendship", "relationship-boundary"],
  ["relationship-family-role", "relationship-boundary"],
  ["health-energy-recovery", "career-workload-recovery"],
  ["health-sleep-rhythm", "health-energy-recovery"],
  ["health-stress-regulation", "health-burnout-risk"],
  ["health-burnout-risk", "career-workload-recovery"],
  ["health-habit-continuity", "money-saving-discipline"],
  ["health-body-signal-review", "health-energy-recovery"],
] as const;
const basePromptInput = { analysisType: "테스트 분석", birthData: "birth", originalChart: "chart", coreInterpretation: "core", fortuneTiming: "timing", sajuSummary: "summary", currentFortuneFlow: "flow" };

const launchIds = getLaunchProductIds();
assert(launchIds.length === 48, "Batch 5 must preserve launch catalog at 48 products");
assert(new Set(launchIds).size === launchIds.length, "launch IDs must be unique");
for (const productId of batchProductIds) {
  const config = getPaidAnalysisTopicConfig(productId);
  if (!config) throw new Error(`FAIL: missing ${productId}`);
  assert(Boolean(getPremiumProduct(productId)), `${productId} must be in registry`);
  assert(config.userQuestion.trim().length > 0, `${productId} needs customer question`);
  assert(config.requiredInsights.length === 4 && new Set(config.requiredInsights.map((item) => item.id)).size === 4, `${productId} needs four unique insights`);
  assert(config.evidenceFocus.length >= 3, `${productId} needs resolver-backed evidence`);
  assert(config.actionFocus.length >= 3 && config.prohibitedClaims.length > 0 && config.excludedFocus?.length === 3, `${productId} needs action, safety, exclusions`);
  const prompt = buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId });
  assert(prompt.includes(config.userQuestion) && prompt.includes("[상품 중심 추론 계약]"), `${productId} generic prompt compatibility`);
  for (const insight of config.requiredInsights) assert(prompt.includes(insight.prompt), `${productId} must include ${insight.id}`);
  const formatted = formatTopicConfigForPrompt(config);
  for (const claim of config.prohibitedClaims) assert(formatted.includes(claim), `${productId} safety must remain visible`);
}
for (const [leftId, rightId] of siblingPairs) {
  const left = getPaidAnalysisTopicConfig(leftId); const right = getPaidAnalysisTopicConfig(rightId);
  if (!left || !right) throw new Error(`FAIL: missing sibling pair ${leftId}/${rightId}`);
  assert(left.userQuestion !== right.userQuestion, `${leftId}/${rightId} distinct question`);
  assert(JSON.stringify(left.requiredInsights) !== JSON.stringify(right.requiredInsights), `${leftId}/${rightId} distinct mechanism`);
  assert(JSON.stringify(left.actionFocus) !== JSON.stringify(right.actionFocus), `${leftId}/${rightId} distinct action`);
  assert(validatePremiumDepthSiblingDistinction(getPaidAnalysisPremiumDepthContract(left), getPaidAnalysisPremiumDepthContract(right)).ok, `${leftId}/${rightId} positive ownership separation`);
}
const burnout = getPaidAnalysisTopicConfig("health-burnout-risk");
const workload = getPaidAnalysisTopicConfig("career-workload-recovery");
if (!burnout || !workload) throw new Error("FAIL: medium overlap configs missing");
assert((burnout.excludedFocus ?? []).some((item) => item.id === "work-cycle-priority-redesign"), "burnout must yield work-cycle redesign to workload recovery");
assert((workload.excludedFocus ?? []).some((item) => item.id === "medical-burnout-or-treatment"), "workload recovery must yield medical burnout to health boundary");
console.log("paid-analysis-v4-catalog-batch-4-regression passed ✓");