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
conversionGuidance: {
  whyNow: "현재 운의 변화가 커지는 시점이라 중요한 선택의 기준을 미리 확인할 필요가 있습니다.",
  whatYouWillLearn:
    "심층 분석에서 유리한 시기와 주의할 흐름, 상황별 대응 방향을 구체적으로 확인할 수 있습니다.",
  riskOfDelay:
    "확인을 미루면 변화가 시작된 뒤 대응하게 되어 준비할 수 있는 시점을 놓칠 수 있습니다.",
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

console.log(
  "conversionGuidance.whyNow 검증:",
  result.conversionGuidance.whyNow.length > 0
);

console.log(
  "conversionGuidance.whatYouWillLearn 검증:",
  result.conversionGuidance.whatYouWillLearn.length > 0
);

console.log(
  "conversionGuidance.riskOfDelay 검증:",
  result.conversionGuidance.riskOfDelay.length > 0
);