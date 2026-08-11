import type {
  AnalysisRecommendation,
  RecommendationEngineResult,
} from "./analysisRecommendation";
import {
  PREMIUM_PRODUCT_LOOKUP,
  type PremiumProductDefinition,
} from "./premiumProductRegistry";

export type BuildAnalysisRecommendationInput = {
  engineResult: RecommendationEngineResult;
};

function buildRecommendationContext(
  engineResult: RecommendationEngineResult,
) {
  const contextItems = [engineResult.primary, ...engineResult.secondary].map((signal) => {
    const product = PREMIUM_PRODUCT_LOOKUP[signal.theme] as PremiumProductDefinition | undefined;

    return {
      productId: signal.theme,
      title: product?.title,
      category: product?.category,
      plugin: product?.plugin,
      analysisFocus: product?.analysisFocus,
      expectedOutcome: product?.expectedOutcome,
      score: signal.score,
      evidence: signal.reasons.map((reason, index) => ({
        signal: reason,
        source: "recommendationEngine",
        contribution: Number((signal.score / Math.max(1, engineResult.secondary.length + 1)).toFixed(2)),
      })),
    };
  });

  return contextItems;
}

export function buildAnalysisRecommendation(
  input: BuildAnalysisRecommendationInput
): AnalysisRecommendation {
  const { engineResult } = input;
  const { primary } = engineResult;

  return {
    primaryTheme: primary.theme,
    headline: `${primary.theme} 심층분석이 우선 추천됩니다.`,
    summary: primary.reasons.join(" "),
    userMeaning:
      "현재 사주 구조와 운의 흐름을 종합했을 때, 이 주제를 우선적으로 점검할 필요가 있습니다.",
    reasons: primary.reasons.map((reason, index) => ({
      id: `${primary.theme}-${index + 1}`,
      label: `추천 근거 ${index + 1}`,
      explanation: reason,
    })),
    recommendedProductId: primary.theme,
    recommendedReason: primary.reasons[0] ?? "",
    secondaryRecommendations: engineResult.secondary.map((signal) => ({
      productId: signal.theme,
      reason: signal.reasons[0] ?? "",
    })),
    recommendationContext: buildRecommendationContext(engineResult),
  };
}