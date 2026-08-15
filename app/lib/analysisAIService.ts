import { generateAnalysisText } from "./ai";
import type { AnalysisRecommendation } from "./analysisRecommendation";
import type { AnalysisRecommendationOutput } from "./analysisRecommendationOutput";
import { generateAnalysisRecommendation } from "./generateAnalysisRecommendation";

export type MainAnalysisGenerationResult = {
  text: string;
  status: "completed" | "failed";
};

export async function generateMainAnalysis(
  prompt: string
): Promise<MainAnalysisGenerationResult> {
  try {
    const text = await generateAnalysisText(prompt, {
      callType: "main-analysis",
    });
    if (!text) throw new Error("OpenAI 응답이 비어 있습니다.");
    return { text, status: "completed" };
  } catch (error) {
    console.error("[generateMainAnalysis] failed", error);
    return { text: "AI 분석 결과를 생성하지 못했습니다.", status: "failed" };
  }
}

export async function generateRecommendationExplanation(
  recommendation: AnalysisRecommendation
): Promise<AnalysisRecommendationOutput> {
  return generateAnalysisRecommendation({
    recommendation,
  });
}