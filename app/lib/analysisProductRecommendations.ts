import type { FortuneBrainResult } from "./fortuneBrain";
import type { ElementRelationsAnalysis } from "./elementRelations";
import type { PaidAnalysisProductId } from "./paidAnalysisProducts";
import type { StrengthAnalysis } from "./strength";
import { analyzeFullFortuneFlow } from "./fortuneFlowAnalysis";
import { STRENGTH_RECOMMENDATION_RULES } from "./recommendationRules";
type FortuneFlowAnalysisResult =
  ReturnType<typeof analyzeFullFortuneFlow>;

export type AnalysisProductRecommendation = {
  productId: PaidAnalysisProductId;
  score: number;
  reasons: string[];
};

export type AnalysisProductRecommendationResult = {
  recommendations: AnalysisProductRecommendation[];
};


export interface AnalysisProductRecommendationInput {
  strengthAnalysis: StrengthAnalysis;
  fortuneBrain: FortuneBrainResult;
  elementRelations: ElementRelationsAnalysis;
  fortuneFlow: ReturnType<typeof analyzeFullFortuneFlow> | null;
}

type ProductRecommendationScore = {
  score: number;
  reasons: string[];
};

type ProductRecommendationScoreMap = Record<
  PaidAnalysisProductId,
  ProductRecommendationScore
>;

const DEFAULT_RECOMMENDATION_ORDER: PaidAnalysisProductId[] = [
  "career",
  "wealth",
  "relationship",
  "health",
  "business",
  "social",
  "job-change",
  "marriage",
  "study",
  "yearly",
  "daeun",
];

function createInitialRecommendationScores(): ProductRecommendationScoreMap {
  return {
    wealth: {
      score: 0,
      reasons: [],
    },
    relationship: {
      score: 0,
      reasons: [],
    },
    career: {
      score: 0,
      reasons: [],
    },
    health: {
      score: 0,
      reasons: [],
    },
    social: {
      score: 0,
      reasons: [],
    },
    marriage: {
      score: 0,
      reasons: [],
    },
    study: {
      score: 0,
      reasons: [],
    },
    business: {
      score: 0,
      reasons: [],
    },
    "job-change": {
      score: 0,
      reasons: [],
    },
    yearly: {
      score: 0,
      reasons: [],
    },
    daeun: {
      score: 0,
      reasons: [],
    },
  };
}

export function buildAnalysisProductRecommendations(
  input: AnalysisProductRecommendationInput
): AnalysisProductRecommendationResult {
  const {
  strengthAnalysis,
  elementRelations,
  fortuneFlow,
} = input;

const scores = createInitialRecommendationScores();

const strengthRules =
  STRENGTH_RECOMMENDATION_RULES[strengthAnalysis.level];

if (!strengthRules) {
  throw new Error(`Unknown strength level: ${strengthAnalysis.level}`);
}

for (const rule of strengthRules) {
  scores[rule.productId].score += rule.score;
  scores[rule.productId].reasons.push(rule.reason);
}

const strongRelations = elementRelations.highlights.filter(
  (relation) => relation.strength === "강함"
);

for (const relation of strongRelations) {
  if (relation.type === "생조") {
    scores.social.score += 10;
    scores.social.reasons.push(
      "서로 돕는 오행 관계가 강하게 나타나 대인관계와 협력 흐름을 살펴볼 가치가 있습니다."
    );

    scores.relationship.score += 8;
    scores.relationship.reasons.push(
      "관계에서 상호 보완과 발전 가능성이 나타납니다."
    );
  }

  if (relation.type === "극함") {
    scores.health.score += 10;
    scores.health.reasons.push(
      "강한 제어 관계가 있어 에너지 소모와 생활 균형을 점검할 필요가 있습니다."
    );

    scores.wealth.score += 8;
    scores.wealth.reasons.push(
      "긴장과 통제가 재물 판단에 영향을 줄 수 있어 지출과 기회 흐름을 세밀하게 살펴볼 필요가 있습니다."
    );
  }
}
if (fortuneFlow?.currentFlow === "기회 우세") {
  scores.career.score += 10;
  scores.career.reasons.push(
    "현재 운의 흐름이 기회 우세로 나타나 직업과 진로의 확장 가능성을 우선적으로 살펴볼 가치가 있습니다."
  );

  scores.business.score += 8;
  scores.business.reasons.push(
    "현재 흐름에서 새로운 역할이나 사업 기회를 검토할 여지가 있습니다."
  );
}

 const recommendations = Object.entries(scores)
  .map(([productId, recommendation]) => ({
    productId: productId as PaidAnalysisProductId,
    score: recommendation.score,
    reasons:
      recommendation.reasons.length > 0
        ? recommendation.reasons
        : [
            "전체 분석 결과와 기본 추천 우선순위를 바탕으로 함께 살펴볼 가치가 있습니다.",
          ],
  }))
  .sort((a, b) => {
  const scoreDifference = b.score - a.score;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return (
    DEFAULT_RECOMMENDATION_ORDER.indexOf(a.productId) -
    DEFAULT_RECOMMENDATION_ORDER.indexOf(b.productId)
  );
})
.slice(0, 3);
return {
  recommendations,
};
}
