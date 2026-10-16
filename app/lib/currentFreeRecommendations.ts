import type { AnalyzeProfileMetadata, AnalyzeSuccessResponse } from "./analyzeApiTypes";
import { getSaju } from "./manse";
import { buildPremiumAnalysis } from "./buildPremiumAnalysis";
import { buildAnalysisProductRecommendations } from "./analysisProductRecommendations";
import { buildMonthlyCycleFacts } from "./paidAnalysisEvidenceFacts";
import { createEvaluationContext } from "./evaluationContext";
import { buildAnalysisRecommendation } from "./analysisRecommendationBuilder";
import { buildDeterministicRecommendationExplanation } from "./generateAnalysisRecommendation";

/**
 * Single deterministic source of truth for current free TOP 3.
 *
 * Does not call AI, update stored historical analysis, or access customer data.
 * Both guest/member results and recommendation page use the same calculation.
 * Multiple people may still legitimately share a TOP 3 when evidence ties.
 */
export function buildCurrentFreeRecommendations(
  profile: Pick<AnalyzeProfileMetadata,
    "birthDate" | "birthTime" | "calendarType" | "isLeapMonth" | "gender" | "birthTimeKnown">,
  evaluationDate?: string,
): Pick<AnalyzeSuccessResponse, "productRecommendations" | "recommendationExplanation"> {
  const context = createEvaluationContext(evaluationDate);
  const saju = getSaju(
    profile.birthDate,
    profile.birthTime,
    profile.calendarType,
    profile.isLeapMonth ? "윤달" : "평달",
    profile.gender,
    context.evaluationDate,
    profile.birthTimeKnown,
  );
  const premium = buildPremiumAnalysis(saju);
  const productRecommendations = buildAnalysisProductRecommendations({
    fortuneBrain: premium.fortuneBrain,
    strengthAnalysis: premium.strengthAnalysis,
    elementRelations: premium.elementRelations,
    fortuneFlow: premium.fortuneFlowAnalysis,
    elementAnalysis: premium.elementAnalysis,
    monthlyCycle: buildMonthlyCycleFacts(saju),
    evaluationContext: context,
  });
  if (!productRecommendations.engineResult || productRecommendations.recommendations.length !== 3) {
    throw new Error("Current personal recommendation calculation did not produce three products");
  }
  const recommendationExplanation = buildDeterministicRecommendationExplanation(
    buildAnalysisRecommendation({ engineResult: productRecommendations.engineResult }),
  );
  return { productRecommendations, recommendationExplanation };
}

/** Pure projection. Caller must have already enforced ownership and result freshness. */
export function withCurrentFreeRecommendations(
  analysis: AnalyzeSuccessResponse,
  evaluationDate?: string,
): AnalyzeSuccessResponse {
  return { ...analysis, ...buildCurrentFreeRecommendations(analysis.profile, evaluationDate) };
}
