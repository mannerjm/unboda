import { buildAnalysisPrompt } from "./ai";
import {
  buildAnalysisRecommendationPrompt,
  type BuildAnalysisRecommendationPromptInput,
} from "./analysisRecommendationPrompt";

export function buildAnalysisRecommendationRequest(
  input: BuildAnalysisRecommendationPromptInput
): string {
  const userPrompt = buildAnalysisRecommendationPrompt(input);

  return buildAnalysisPrompt(userPrompt);
}