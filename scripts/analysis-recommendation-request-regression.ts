import { buildAnalysisRecommendationRequest } from "../app/lib/analysisRecommendationRequest";

const result = buildAnalysisRecommendationRequest({
  recommendation: {
    primaryTheme: "wealth",
    headline: "재물 흐름을 먼저 점검해보세요.",
    summary: "재물과 관련된 흐름을 우선적으로 살펴볼 필요가 있습니다.",
    userMeaning: "현재 선택과 방향을 정리하는 데 도움이 될 수 있습니다.",
    reasons: [
      {
        id: "wealth-1",
        label: "추천 근거 1",
        explanation: "재물 흐름을 우선 점검할 필요가 있습니다.",
      },
    ],
    recommendedProductId: "wealth",
    recommendedReason: "재물 흐름을 우선 점검할 필요가 있습니다.",
    secondaryRecommendations: [],
  },
});

console.log(
  "core rules 포함:",
  result.includes("AI는 입력 데이터를 변경하지 않는다.")
);

console.log(
  "추천 데이터 포함:",
  result.includes("주요 주제: wealth")
);

console.log(
  "JSON 출력 규칙 포함:",
  result.includes("반드시 아래 JSON 형식으로만 답변하세요.")
);