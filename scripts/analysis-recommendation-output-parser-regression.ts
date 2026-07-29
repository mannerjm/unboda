import { parseAnalysisRecommendationOutput } from "../app/lib/analysisRecommendationOutputParser";

const result = parseAnalysisRecommendationOutput(
  JSON.stringify({
    headline: "재물 흐름을 먼저 점검해보세요.",
    summary: "현재 사주 구조에서는 재물과 관련된 흐름을 우선적으로 살펴볼 필요가 있습니다.",
    userMeaning: "지금의 선택과 방향을 정리하는 데 도움이 될 수 있습니다.",

    cardReasons: {
  first: "재물의 흐름을 우선 점검하는 것이 현재 가장 중요합니다.",
  second: "건강은 생활 리듬을 함께 살펴보는 것이 좋습니다.",
  third: "관계의 변화도 함께 고려해보는 것이 좋습니다.",
},
  })
);

console.log("headline 검증:", result.headline.length > 0);
console.log("summary 검증:", result.summary.length > 0);
console.log("userMeaning 검증:", result.userMeaning.length > 0);
console.log(
  "cardReasons.first 검증:",
  result.cardReasons.first.length > 0
);