import { generateAnalysisText } from "./ai";
import type { AnalysisRecommendation } from "./analysisRecommendation";
import type { AnalysisRecommendationOutput } from "./analysisRecommendationOutput";
import { generateAnalysisRecommendation } from "./generateAnalysisRecommendation";

export async function generateMainAnalysis(
  prompt: string
): Promise<string> {
  try {
    return await generateAnalysisText(prompt, {
      callType: "main-analysis",
    });
  } catch (error) {
    console.error("[generateMainAnalysis] failed", error);
    return "AI 분석 결과를 생성하지 못했습니다.";
  }
}

export async function generateRecommendationExplanation(
  recommendation: AnalysisRecommendation
): Promise<AnalysisRecommendationOutput> {
  return generateAnalysisRecommendation({
    recommendation,
  });
}