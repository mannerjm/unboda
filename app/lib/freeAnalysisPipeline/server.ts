import "server-only";

import { getSaju } from "../manse";
import { buildSajuResponse } from "../buildSajuResponse";
import { buildFreeAnalysis } from "../buildFreeAnalysis";
import { buildPremiumAnalysis } from "../buildPremiumAnalysis";
import { buildAnalysisProductRecommendations } from "../analysisProductRecommendations";
import { buildAnalysisRecommendation } from "../analysisRecommendationBuilder";
import { buildMainAnalysisPrompt } from "../mainAnalysisPrompt";
import { buildMainAnalysisCompactFacts } from "../mainAnalysisCompactFacts";
import { generateMainAnalysis, generateRecommendationExplanation } from "../analysisAIService";
import type { AnalyzeProfileMetadata, AnalyzeSuccessResponse } from "../analyzeApiTypes";

export async function buildFreeAnalysisResponse(input: {
  profile: AnalyzeProfileMetadata;
  includePremiumAnalysis?: boolean;
}): Promise<AnalyzeSuccessResponse> {
  const isLeapMonth = input.profile.isLeapMonth ? "윤달" : "평달";
  const saju = getSaju(
    input.profile.birthDate,
    input.profile.birthTime,
    input.profile.calendarType,
    isLeapMonth,
    input.profile.gender,
  );
  const freeAnalysis = buildFreeAnalysis(saju);
  const compactFacts = buildMainAnalysisCompactFacts({ saju, freeAnalysis });
  const recommendationAnalysis = buildPremiumAnalysis(saju);
  const productRecommendations = buildAnalysisProductRecommendations({
    fortuneBrain: recommendationAnalysis.fortuneBrain,
    strengthAnalysis: recommendationAnalysis.strengthAnalysis,
    elementRelations: recommendationAnalysis.elementRelations,
    fortuneFlow: recommendationAnalysis.fortuneFlowAnalysis,
    elementAnalysis: recommendationAnalysis.elementAnalysis,
  });

  if (!productRecommendations.engineResult) {
    throw new Error("Recommendation engine result is missing");
  }

  const recommendation = buildAnalysisRecommendation({
    engineResult: productRecommendations.engineResult,
  });
  const [result, recommendationExplanation] = await Promise.all([
    generateMainAnalysis(buildMainAnalysisPrompt({ compactFacts })),
    generateRecommendationExplanation(recommendation),
  ]);

  return {
    result: result || "AI 분석 결과를 생성하지 못했습니다.",
    saju: buildSajuResponse(saju),
    profile: input.profile,
    freeAnalysis,
    premiumAnalysis: input.includePremiumAnalysis ? recommendationAnalysis : undefined,
    productRecommendations,
    recommendationExplanation,
  };
}