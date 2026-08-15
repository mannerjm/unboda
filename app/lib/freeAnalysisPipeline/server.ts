import "server-only";

import { getSaju } from "../manse";
import { buildSajuResponse } from "../buildSajuResponse";
import { buildFreeAnalysis } from "../buildFreeAnalysis";
import { buildPremiumAnalysis } from "../buildPremiumAnalysis";
import { buildAnalysisProductRecommendations } from "../analysisProductRecommendations";
import { buildAnalysisRecommendation } from "../analysisRecommendationBuilder";
import { buildMainAnalysisPrompt } from "../mainAnalysisPrompt";
import { buildMainAnalysisCompactFacts } from "../mainAnalysisCompactFacts";
import { generateMainAnalysis, generateRecommendationExplanation, type MainAnalysisGenerationResult } from "../analysisAIService";
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
  const [mainAnalysis, recommendationExplanation] = await Promise.all([
    generateMainAnalysis(buildMainAnalysisPrompt({ compactFacts })),
    generateRecommendationExplanation(recommendation),
  ]);

  return {
    result: mainAnalysis.text,
    generationMeta: {
      mainAnalysisStatus: mainAnalysis.status,
    },
    saju: buildSajuResponse(saju),
    profile: input.profile,
    freeAnalysis,
    premiumAnalysis: input.includePremiumAnalysis ? recommendationAnalysis : undefined,
    productRecommendations,
    recommendationExplanation,
  };
}

/**
 * Regenerates only the main-analysis AI text from an already-stored response.
 * Recomputes `getSaju()` locally (no OpenAI cost) to rebuild the compact facts,
 * reuses the stored `freeAnalysis` as-is, and calls the AI exactly once.
 * Does not touch recommendations, premium analysis, or issue any other AI call.
 * Carries no auth/ownership concerns; callers must verify ownership first.
 */
export async function regenerateMainAnalysis(
  content: Pick<AnalyzeSuccessResponse, "profile" | "freeAnalysis">,
): Promise<MainAnalysisGenerationResult> {
  if (!content.freeAnalysis) {
    throw new Error("저장된 무료 분석 결과가 없어 다시 생성할 수 없습니다.");
  }

  const isLeapMonth = content.profile.isLeapMonth ? "윤달" : "평달";
  const saju = getSaju(
    content.profile.birthDate,
    content.profile.birthTime,
    content.profile.calendarType,
    isLeapMonth,
    content.profile.gender,
  );
  const compactFacts = buildMainAnalysisCompactFacts({ saju, freeAnalysis: content.freeAnalysis });

  return generateMainAnalysis(buildMainAnalysisPrompt({ compactFacts }));
}