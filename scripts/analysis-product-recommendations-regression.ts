import { buildAnalysisProductRecommendations } from "../app/lib/analysisProductRecommendations";
import type { ElementRelationsAnalysis } from "../app/lib/elementRelations";
import type { FortuneBrainResult } from "../app/lib/fortuneBrain";
import type { StrengthAnalysis } from "../app/lib/strength";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const strengthAnalysis = {
  level: "신강",
} as StrengthAnalysis;

const fortuneBrain: FortuneBrainResult = {
  structure: "회귀 테스트용 사주 구조",
  strengths: [],
  weaknesses: [],
  recommendations: [],
  summary: "회귀 테스트용 종합 요약",
};

const elementRelations: ElementRelationsAnalysis = {
  relations: [],
  highlights: [],
  summary: "회귀 테스트용 오행 관계 요약",
};

const result = buildAnalysisProductRecommendations({
  strengthAnalysis,
  fortuneBrain,
  elementRelations,
  fortuneFlow: null,
});

assert(
  result.recommendations.length === 3,
  "추천 결과가 정확히 3개가 아닙니다."
);

assert(
  result.recommendations.every(
    (item, index, recommendations) =>
      index === 0 ||
      recommendations[index - 1].score >= item.score
  ),
  "추천 결과가 점수 내림차순으로 정렬되지 않았습니다."
);

assert(
  result.recommendations.every(
    (item) => item.reasons.length > 0
  ),
  "추천 결과 중 추천 이유가 없는 항목이 있습니다."
);

const recommendedProductIds =
  result.recommendations.map((item) => item.productId);

assert(
  recommendedProductIds[0] === "career",
  "신강 테스트에서 career가 첫 번째 추천이 아닙니다."
);

assert(
  recommendedProductIds[1] === "business",
  "신강 테스트에서 business가 두 번째 추천이 아닙니다."
);

assert(
  recommendedProductIds[2] === "wealth",
  "동점 기본 순서에 따라 wealth가 세 번째 추천이어야 합니다."
);

console.log("추천 결과 3개: true");
console.log("점수 내림차순: true");
console.log("추천 이유 존재: true");
console.log("신강 추천 순서: career → business → wealth");
console.table(result.recommendations);

const opportunityFlowResult =
  buildAnalysisProductRecommendations({
    strengthAnalysis,
    fortuneBrain,
    elementRelations,
    fortuneFlow: {
      relations: [],
      elementFlow: {
    original: {
  목: 0,
  화: 0,
  토: 0,
  금: 0,
  수: 0,
},
adjusted: {
  목: 0,
  화: 0,
  토: 0,
  금: 0,
  수: 0,
},
changes: {
  목: 0,
  화: 0,
  토: 0,
  금: 0,
  수: 0,
},
    strongest: [],
    weakest: [],
},
      yongshinFlow: {
  primary: "목",
  secondary: [],
  primaryActive: false,
  secondaryActive: [],
  activationScore: 0,
  level: "보통",
},
      currentFlow: "기회 우세",
      opportunityScore: 1,
      cautionScore: 0,
      daeunFlow: "무호적",
      seunFlow: "무호적",
      opportunities: [],
      cautions: [],
      summary: "회귀 테스트",
      topicGuides: {
        career: "회귀 테스트",
        wealth: "회귀 테스트",
        relationship: "회귀 테스트",
        health: "회귀 테스트",
      },
    },
  });

const opportunityCareer =
  opportunityFlowResult.recommendations.find(
    (item) => item.productId === "career"
  );

const opportunityBusiness =
  opportunityFlowResult.recommendations.find(
    (item) => item.productId === "business"
  );

assert(
  opportunityCareer !== undefined,
  "기회 우세 결과에 career 추천이 없습니다."
);

assert(
  opportunityBusiness !== undefined,
  "기회 우세 결과에 business 추천이 없습니다."
);

assert(
  opportunityCareer?.score === 30,
  "기회 우세에서 career 점수가 10점 증가하지 않았습니다."
);

assert(
  opportunityBusiness?.score === 23,
  "기회 우세에서 business 점수가 8점 증가하지 않았습니다."
);

assert(
  opportunityCareer!.reasons.some((reason) =>
    reason.includes("기회 우세")
  ),
  "career 추천 이유에 운 흐름 설명이 추가되지 않았습니다."
);

assert(
  opportunityBusiness!.reasons.some((reason) =>
    reason.includes("새로운 역할이나 사업 기회")
  ),
  "business 추천 이유에 운 흐름 설명이 추가되지 않았습니다."
);

console.log("기회 우세 career 점수 30: true");
console.log("기회 우세 business 점수 23: true");
console.log("기회 우세 추천 이유 반영: true");