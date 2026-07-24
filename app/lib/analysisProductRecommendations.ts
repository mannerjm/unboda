import type { FortuneBrainResult } from "./fortuneBrain";
import type { PaidAnalysisProductId } from "./paidAnalysisProducts";


export type AnalysisProductRecommendation = {
  productId: PaidAnalysisProductId;
  score: number;
  reasons: string[];
};

export type AnalysisProductRecommendationResult = {
  recommendations: AnalysisProductRecommendation[];
};


export type AnalysisProductRecommendationInput = {
  fortuneBrain: FortuneBrainResult;
};

export function buildAnalysisProductRecommendations(
  input: AnalysisProductRecommendationInput
): AnalysisProductRecommendationResult {
  void input;

  return {
    recommendations: [
      {
        productId: "career",
        score: 100,
        reasons: ["직업과 진로 방향을 우선적으로 점검할 수 있습니다."],
      },
      {
        productId: "wealth",
        score: 90,
        reasons: ["재물 흐름과 지출·기회 시기를 자세히 확인할 수 있습니다."],
      },
      {
        productId: "relationship",
        score: 80,
        reasons: ["연애와 관계의 흐름을 심층적으로 살펴볼 수 있습니다."],
      },
    ],
  };
}