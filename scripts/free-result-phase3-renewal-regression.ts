import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const result = readFileSync("app/result/page.tsx", "utf8");
const recommendationPage = readFileSync("app/recommendations/page.tsx", "utf8");
const recommendationCards = readFileSync("app/components/RecommendationTop3.tsx", "utf8");

for (const preserved of [
  "restoreStoredResult",
  "calculateWeightedElements",
  "calculateSeun",
  "SajuRelationStarsSection",
  "FortuneCycleSections",
  "MAX_MAIN_ANALYSIS_RETRY_COUNT",
]) {
  assert(result.includes(preserved), `phase 3 must preserve free-result runtime: ${preserved}`);
}

for (const presentation of [
  "무료 분석 결과",
  "지금 내 흐름을 읽는",
  "첫 번째 리포트",
  "이번 결과를 보고,",
  "무엇이 더 궁금해졌나요?",
  "recommendationQuestionPreviews",
  "getPaidAnalysisTopicConfig",
  "내 결과에서 이어지는 질문 보기",
  "원하는 주제로 직접 찾기",
]) {
  assert(result.includes(presentation), `phase 3 free-result presentation missing: ${presentation}`);
}

assert(
  result.includes('providedResult ? "/auth/login?returnTo=/recommendations&origin=guest-result"'),
  "guest personalized recommendation must keep the existing login/save boundary",
);
assert(
  result.includes('/deep-analysis?profileId=${currentProfileId}'),
  "manual deep-analysis discovery must remain available from the free result",
);
assert(!result.includes("<RecommendationTop3"), "free result must stay concise and not embed the full recommendation experience");
assert(!result.includes("buildAnalysisProductRecommendations"), "free result must not recompute recommendations");

for (const pageCopy of [
  "무료 결과에서 이어보기",
  "이번 결과를 보고,",
  "무엇이 더 궁금해졌나요?",
  "상품 이름보다 지금 궁금한 질문을 먼저",
  "원하는 주제로 직접 찾기",
]) {
  assert(recommendationPage.includes(pageCopy), `phase 3 recommendation page copy missing: ${pageCopy}`);
}

for (const contract of [
  "buildCurrentRecommendations",
  "mergeRecommendationStoryline",
  "storedRecommendations[0]",
  "RecommendationTop3",
  "listUserPaidAnalysisSummaries",
]) {
  assert(recommendationPage.includes(contract), `phase 3 must preserve recommendation logic: ${contract}`);
}

for (const cardCopy of [
  "getRecommendationQuestion",
  "purchaseDecision.decisionQuestion",
  "내 결과에서 이어지는 질문 3가지",
  "이번 결과에서 이어지는 질문",
  "왜 지금 이 질문이 이어졌나요?",
  "이 질문 더 깊게 보기",
]) {
  assert(recommendationCards.includes(cardCopy), `phase 3 question-first recommendation UI missing: ${cardCopy}`);
}

for (const preserved of [
  "item.profileId === profileId",
  "getPremiumAnalysisHref",
  "toPremiumAnalysisProductState",
  "getProductPricing",
  "formatTopicExpectedUnderstanding",
]) {
  assert(recommendationCards.includes(preserved), `phase 3 must preserve purchase/profile contract: ${preserved}`);
}

console.log("Free-result phase 3 renewal regression passed ✓");
