import { parseAnalysisRecommendationOutput } from "../app/lib/analysisRecommendationOutputParser";

const result = parseAnalysisRecommendationOutput(
  JSON.stringify({
    headline: "재물 흐름을 먼저 점검해보세요.",
    summary: "현재 사주 구조에서는 재물과 관련된 흐름을 우선적으로 살펴볼 필요가 있습니다.",
    userMeaning: "지금의 선택과 방향을 정리하는 데 도움이 될 수 있습니다.",
  })
);

console.log("headline 검증:", result.headline.length > 0);
console.log("summary 검증:", result.summary.length > 0);
console.log("userMeaning 검증:", result.userMeaning.length > 0);