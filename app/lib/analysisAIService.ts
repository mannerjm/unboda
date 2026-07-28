import { generateAnalysisText } from "./ai";
import type { AnalysisRecommendation } from "./analysisRecommendation";
import type { AnalysisRecommendationOutput } from "./analysisRecommendationOutput";
import { generateAnalysisRecommendation } from "./generateAnalysisRecommendation";

export async function generateMainAnalysis(
  prompt: string
): Promise<string> {
  return generateAnalysisText(prompt);
}

export async function generateRecommendationExplanation(
  recommendation: AnalysisRecommendation
): Promise<AnalysisRecommendationOutput> {
  return generateAnalysisRecommendation({
    recommendation,
  });
}