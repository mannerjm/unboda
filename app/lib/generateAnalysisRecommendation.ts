import { generateAnalysisText } from "./ai";
import {
  buildAnalysisRecommendationRequest,
} from "./analysisRecommendationRequest";
import {
  parseAnalysisRecommendationOutput,
} from "./analysisRecommendationOutputParser";
import type {
  AnalysisRecommendationOutput,
} from "./analysisRecommendationOutput";
import type {
  BuildAnalysisRecommendationPromptInput,
} from "./analysisRecommendationPrompt";

export async function generateAnalysisRecommendation(
  input: BuildAnalysisRecommendationPromptInput
): Promise<AnalysisRecommendationOutput> {
  const prompt = buildAnalysisRecommendationRequest(input);
  const outputText = await generateAnalysisText(prompt);

  return parseAnalysisRecommendationOutput(outputText);
}