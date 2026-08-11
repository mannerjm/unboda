import { buildDeterministicRecommendationExplanation } from "../app/lib/generateAnalysisRecommendation";

const output = buildDeterministicRecommendationExplanation({
  primaryTheme: "career-job-change",
  headline: "test",
  summary: "test",
  userMeaning: "test",
  reasons: [],
  recommendedProductId: "career-job-change",
  recommendedReason: "test",
  secondaryRecommendations: [],
});

console.log("SMOKE_OK", output.recommendationItems?.length ?? 0);
