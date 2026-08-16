import type { FortuneBrainResult } from "./fortuneBrain";
import type { ElementRelationsAnalysis } from "./elementRelations";
import type { StrengthAnalysis } from "./strength";
import type { ElementAnalysis } from "./elements";
import { analyzeFullFortuneFlow } from "./fortuneFlowAnalysis";
import { STRENGTH_RECOMMENDATION_RULES } from "./recommendationRules";
import type { RecommendationEngineResult } from "./analysisRecommendation";
import {
  PREMIUM_PRODUCT_LOOKUP,
  TOPIC_PREMIUM_PRODUCTS,
  getCanonicalPremiumProductId,
  getPremiumProduct,
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
  elementAnalysis: ElementAnalysis;
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

/**
 * The legacy strength/relation rules still score themes that were never real
 * products. Each theme maps to the closest canonical registry product so the
 * fallback keeps its meaning instead of emitting an unbuyable id.
 */
const LEGACY_THEME_TO_CANONICAL_PRODUCT_ID: Record<string, string> = {
  business: "business-growth",
  social: "social-helper",
  marriage: "relationship-marriage",
  study: "growth-study",
  "job-change": "career-job-change",
  yearly: "life-current-turning-point",
  daeun: "change-transition",
};

/** Registry-backed products used to top the list back up to exactly three. */
const CANONICAL_BACKFILL_PRODUCT_IDS: readonly string[] = [
  "career",
  "wealth",
  "relationship",
  "health",
];

const CANONICAL_BACKFILL_REASON =
  "전체 분석 결과와 기본 추천 우선순위를 바탕으로 함께 살펴볼 가치가 있습니다.";

const TOP_RECOMMENDATION_COUNT = 3;

function resolveCanonicalRecommendationProductId(
  productId: string,
): string | null {
  const canonicalProductId =
    LEGACY_THEME_TO_CANONICAL_PRODUCT_ID[productId]
    ?? getCanonicalPremiumProductId(productId);

  return getPremiumProduct(canonicalProductId) ? canonicalProductId : null;
}

/**
 * Single integrity boundary for the engine: every emitted productId resolves in
 * the premium registry, duplicates are dropped, and the list is always exactly
 * three items long.
 */
function toCanonicalRecommendations(
  recommendations: readonly AnalysisProductRecommendation[],
): AnalysisProductRecommendation[] {
  const canonicalRecommendations: AnalysisProductRecommendation[] = [];

  for (const recommendation of recommendations) {
    const productId = resolveCanonicalRecommendationProductId(recommendation.productId);

    if (!productId) {
      continue;
    }

    if (canonicalRecommendations.some((entry) => entry.productId === productId)) {
      continue;
    }

    canonicalRecommendations.push({ ...recommendation, productId });

    if (canonicalRecommendations.length === TOP_RECOMMENDATION_COUNT) {
      return canonicalRecommendations;
    }
  }

  for (const productId of CANONICAL_BACKFILL_PRODUCT_IDS) {
    if (canonicalRecommendations.length === TOP_RECOMMENDATION_COUNT) {
      break;
    }

    if (
      !getPremiumProduct(productId)
      || canonicalRecommendations.some((entry) => entry.productId === productId)
    ) {
      continue;
    }

    canonicalRecommendations.push({
      productId,
      score: 0,
      reasons: [CANONICAL_BACKFILL_REASON],
      evidence: [],
    });
  }

  return canonicalRecommendations;
}

function buildRecommendationEngineResult(
  recommendations: readonly AnalysisProductRecommendation[],
): RecommendationEngineResult {
  return {
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
}

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
    strongestElements: input.elementAnalysis.strongest,
    weakestElements: input.elementAnalysis.weakest,
    flowLabel: input.fortuneFlow?.currentFlow,
    relationHighlights: input.elementRelations.highlights.map((entry) => ({
      type: entry.type,
      strength: entry.strength,
    })),
    fortuneFlowRelations: input.fortuneFlow?.relations ?? [],
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

  const topRecommendations: AnalysisProductRecommendation[] = [];
  const selectedCategories = new Set<string>();

  for (const recommendation of uniqueRecommendations) {
    const category = PREMIUM_PRODUCT_LOOKUP[recommendation.productId]?.category;

    if (category && selectedCategories.has(category)) {
      continue;
    }

    topRecommendations.push(recommendation);
    if (category) selectedCategories.add(category);
    if (topRecommendations.length === 3) break;
  }

  for (const recommendation of uniqueRecommendations) {
    if (topRecommendations.some((selected) => selected.productId === recommendation.productId)) {
      continue;
    }

    topRecommendations.push(recommendation);
    if (topRecommendations.length === 3) break;
  }

  topRecommendations.splice(3);

  if (topRecommendations.length >= 3) {
    return {
      recommendations: topRecommendations,
      engineResult: buildRecommendationEngineResult(topRecommendations),
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
    const canonicalRecommendations = toCanonicalRecommendations(
      topicAwareResult.recommendations,
    );

    return {
      recommendations: canonicalRecommendations,
      engineResult: buildRecommendationEngineResult(canonicalRecommendations),
    };
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
              CANONICAL_BACKFILL_REASON,
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
    });

  const canonicalRecommendations = toCanonicalRecommendations(recommendations);

  return {
    recommendations: canonicalRecommendations,
    engineResult: buildRecommendationEngineResult(canonicalRecommendations),
  };
}
