import type { FortuneBrainResult } from "./fortuneBrain";
import type { ElementRelationsAnalysis } from "./elementRelations";
import type { StrengthAnalysis } from "./strength";
import { analyzeFullFortuneFlow } from "./fortuneFlowAnalysis";
import { STRENGTH_RECOMMENDATION_RULES } from "./recommendationRules";
import type { RecommendationEngineResult } from "./analysisRecommendation";
import {
  TOPIC_PREMIUM_PRODUCTS,
  type RecommendationSignalKey,
} from "./premiumProductRegistry";
import { normalizeRecommendationSignals } from "./recommendationSignals";

type FortuneFlowAnalysisResult =
  ReturnType<typeof analyzeFullFortuneFlow>;

export type RecommendationEvidence = {
  signal: string;
  source: string;
  contribution: number;
};

export type AnalysisProductRecommendation = {
  productId: string;
  score: number;
  reasons: string[];
  evidence?: RecommendationEvidence[];
};

export type AnalysisProductRecommendationResult = {
  recommendations: AnalysisProductRecommendation[];
  engineResult?: RecommendationEngineResult;
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
  evidence: RecommendationEvidence[];
};

type ProductRecommendationScoreMap = Record<string, ProductRecommendationScore>;

const DEFAULT_RECOMMENDATION_ORDER: string[] = [
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
      evidence: [],
    },
    relationship: {
      score: 0,
      reasons: [],
      evidence: [],
    },
    career: {
      score: 0,
      reasons: [],
      evidence: [],
    },
    health: {
      score: 0,
      reasons: [],
      evidence: [],
    },
    social: {
      score: 0,
      reasons: [],
      evidence: [],
    },
    marriage: {
      score: 0,
      reasons: [],
      evidence: [],
    },
    study: {
      score: 0,
      reasons: [],
      evidence: [],
    },
    business: {
      score: 0,
      reasons: [],
      evidence: [],
    },
    "job-change": {
      score: 0,
      reasons: [],
      evidence: [],
    },
    yearly: {
      score: 0,
      reasons: [],
      evidence: [],
    },
    daeun: {
      score: 0,
      reasons: [],
      evidence: [],
    },
  };
}

export function buildTopicAwareRecommendations(
  input: AnalysisProductRecommendationInput,
): AnalysisProductRecommendationResult {
  const normalizedSignals = normalizeRecommendationSignals({
    strengthLevel: input.strengthAnalysis.level,
    strongestElements: input.strengthAnalysis.dayElement
      ? [input.strengthAnalysis.dayElement]
      : [],
    weakestElements: [],
    flowLabel: input.fortuneFlow?.currentFlow,
    relationHighlights: input.elementRelations.highlights.map((entry) => ({
      type: entry.type,
      strength: entry.strength,
    })),
  });

  const topicCandidates = TOPIC_PREMIUM_PRODUCTS.filter(
    (product) => product.kind === "TOPIC" && product.recommendationProfile,
  );

  const scored = topicCandidates
    .map((product) => {
      const profile = product.recommendationProfile!;
      const evidence = Object.entries(profile.weights)
        .flatMap(([signalKey, weight]) => {
          const signal = normalizedSignals.signals.find(
            (entry) => entry.key === signalKey as RecommendationSignalKey,
          );

          if (!signal) {
            return [];
          }

          const contribution = Number((signal.score * weight).toFixed(2));

          return [
            {
              signal: signal.key,
              source: signal.source,
              contribution,
            },
          ];
        })
        .sort((a, b) => b.contribution - a.contribution);

      const score = Number(
        evidence.reduce((total, item) => total + item.contribution, 0).toFixed(2),
      );

      return {
        productId: product.id,
        score,
        reasons: evidence.map((item) => `${item.signal}:${item.source}`),
        evidence,
      } satisfies AnalysisProductRecommendation;
    })
    .filter((item) => item.score > 0 && item.evidence && item.evidence.length > 0)
    .sort((a, b) => {
      const scoreDifference = b.score - a.score;

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return a.productId.localeCompare(b.productId);
    });

  const uniqueRecommendations = scored.filter(
    (recommendation, index, items) =>
      items.findIndex((entry) => entry.productId === recommendation.productId) === index,
  );

  const topRecommendations = uniqueRecommendations.slice(0, 3);

  if (topRecommendations.length >= 3) {
    const engineResult: RecommendationEngineResult = {
      primary: {
        theme: topRecommendations[0].productId,
        score: topRecommendations[0].score,
        confidence: 1,
        reasons: topRecommendations[0].reasons,
      },
      secondary: topRecommendations.slice(1).map((recommendation) => ({
        theme: recommendation.productId,
        score: recommendation.score,
        confidence: 1,
        reasons: recommendation.reasons,
      })),
    };

    return {
      recommendations: topRecommendations,
      engineResult,
    };
  }

  return {
    recommendations: [],
  };
}

export function buildAnalysisProductRecommendations(
  input: AnalysisProductRecommendationInput,
): AnalysisProductRecommendationResult {
  const topicAwareResult = buildTopicAwareRecommendations(input);

  if (topicAwareResult.recommendations.length >= 3 && topicAwareResult.engineResult) {
    return topicAwareResult;
  }

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
    (relation) => relation.strength === "강함",
  );

  for (const relation of strongRelations) {
    if (relation.type === "생조") {
      scores.social.score += 10;
      scores.social.reasons.push(
        "서로 돕는 오행 관계가 강하게 나타나 대인관계와 협력 흐름을 살펴볼 가치가 있습니다.",
      );

      scores.relationship.score += 8;
      scores.relationship.reasons.push(
        "관계에서 상호 보완과 발전 가능성이 나타납니다.",
      );
    }

    if (relation.type === "극함") {
      scores.health.score += 10;
      scores.health.reasons.push(
        "강한 제어 관계가 있어 에너지 소모와 생활 균형을 점검할 필요가 있습니다.",
      );

      scores.wealth.score += 8;
      scores.wealth.reasons.push(
        "긴장과 통제가 재물 판단에 영향을 줄 수 있어 지출과 기회 흐름을 세밀하게 살펴볼 필요가 있습니다.",
      );
    }
  }

  if (fortuneFlow?.currentFlow === "기회 우세") {
    scores.career.score += 10;
    scores.career.reasons.push(
      "현재 운의 흐름이 기회 우세로 나타나 직업과 진로의 확장 가능성을 우선적으로 살펴볼 가치가 있습니다.",
    );

    scores.business.score += 8;
    scores.business.reasons.push(
      "현재 흐름에서 새로운 역할이나 사업 기회를 검토할 여지가 있습니다.",
    );
  }

  const recommendations = Object.entries(scores)
    .map(([productId, recommendation]) => ({
      productId,
      score: recommendation.score,
      reasons:
        recommendation.reasons.length > 0
          ? recommendation.reasons
          : [
              "전체 분석 결과와 기본 추천 우선순위를 바탕으로 함께 살펴볼 가치가 있습니다.",
            ],
      evidence: recommendation.evidence,
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

  const engineResult: RecommendationEngineResult = {
    primary: {
      theme: recommendations[0].productId,
      score: recommendations[0].score,
      confidence: 1,
      reasons: recommendations[0].reasons,
    },
    secondary: recommendations.slice(1).map((recommendation) => ({
      theme: recommendation.productId,
      score: recommendation.score,
      confidence: 1,
      reasons: recommendation.reasons,
    })),
  };

  return {
    recommendations,
    engineResult,
  };
}
