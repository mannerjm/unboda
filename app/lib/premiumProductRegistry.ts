import {
  ANALYSIS_TOPICS,
  type AnalysisTopicCategory,
  type AnalysisTopicDefinition,
  type AnalysisTopicRiskLevel,
} from "./analysisTopics";

import {
  PERIOD_ANALYSIS_PRODUCTS,
  type PeriodAnalysisProductDefinition,
  type PeriodAnalysisProductType,
} from "./analysisPeriodProducts";
// app/lib/premiumProductRegistry.ts

export type PremiumProductKind =
  | "TOPIC"
  | "PERIOD";

export type PremiumProductCategory =
  | AnalysisTopicCategory
  | "period";

export type PremiumProductPlugin =
  | "MONEY"
  | "CAREER"
  | "RELATIONSHIP"
  | "HEALTH"
  | "FORTUNE"
  | "COMMON";

export type PremiumProductReleaseLevel =
  | "V1"
  | "V2"
  | "V3"
  | "ULTIMATE";

export type PremiumProductRiskLevel =
  AnalysisTopicRiskLevel;

export type RecommendationSignalKey =
  | "career_change"
  | "career_stability"
  | "career_independence"
  | "wealth_growth"
  | "wealth_risk"
  | "wealth_control"
  | "relationship_new"
  | "relationship_commitment"
  | "relationship_conflict"
  | "relationship_recovery"
  | "social_support"
  | "health_recovery"
  | "health_stress"
  | "business_growth"
  | "business_control"
  | "growth_learning"
  | "growth_transition";

export type RecommendationProfile = {
  weights: Partial<Record<RecommendationSignalKey, number>>;
  requiredSignals?: readonly RecommendationSignalKey[];
  excludedSignals?: readonly RecommendationSignalKey[];
};

export type PremiumProductDefinition = {
  id: string;

  title: string;

  shortTitle?: string;

  category: PremiumProductCategory;

  plugin: PremiumProductPlugin;

  kind: PremiumProductKind;

  /** Only set for kind === "PERIOD"; analysisPeriodProducts stays the source of truth. */
  periodType?: PeriodAnalysisProductType;

  releaseLevel: PremiumProductReleaseLevel;

  description: string;

  details?: readonly string[];

  riskLevel?: PremiumProductRiskLevel;

  analysisType: string;

  recommendedFor?: readonly string[];

  analysisFocus?: readonly string[];

  expectedOutcome?: readonly string[];

  recommendationProfile?: RecommendationProfile;
};

function createTopicPremiumProduct(
  topic: AnalysisTopicDefinition,
): PremiumProductDefinition {
  return {
    id: topic.id,
    title: topic.title,

    category: topic.category,
    plugin: getPremiumPluginByCategory(topic.category),
    kind: "TOPIC",
    releaseLevel: "V2",

    description: topic.shortDescription,

    details: topic.details,

    riskLevel: topic.riskLevel,

    analysisType: topic.title,

    recommendationProfile: createTopicRecommendationProfile(topic.id),
  };
}

function createTopicRecommendationProfile(
  topicId: string,
): RecommendationProfile | undefined {
  const profileMap: Record<string, RecommendationProfile> = {
    "career-job-change": {
      weights: {
        career_change: 1.4,
        career_stability: 0.8,
      },
      requiredSignals: ["career_change"],
    },
    "career-promotion": {
      weights: {
        career_stability: 1.2,
        career_independence: 0.6,
      },
      requiredSignals: ["career_stability"],
    },
    "career-independence": {
      weights: {
        career_independence: 1.4,
        wealth_control: 0.5,
      },
      requiredSignals: ["career_independence"],
    },
    "career-job-fit": {
      weights: {
        career_stability: 1.0,
        career_change: 0.4,
      },
      requiredSignals: ["career_stability"],
    },
    "career-organization-fit": {
      weights: {
        career_stability: 1.1,
        relationship_commitment: 0.4,
      },
      requiredSignals: ["career_stability"],
    },
    "career-leadership": {
      weights: {
        career_independence: 0.9,
        career_stability: 0.7,
      },
      requiredSignals: ["career_independence"],
    },
    "career-specialization": {
      weights: {
        growth_learning: 1.0,
        career_stability: 0.5,
      },
      requiredSignals: ["growth_learning"],
    },
    "career-burnout-risk": {
      weights: {
        health_stress: 1.1,
        career_stability: 0.6,
      },
      requiredSignals: ["health_stress"],
    },
    "money-wealth-accumulation": {
      weights: {
        wealth_growth: 1.4,
        wealth_control: 0.7,
      },
      requiredSignals: ["wealth_growth"],
    },
    "money-leak-risk": {
      weights: {
        wealth_risk: 1.4,
        wealth_control: 1.0,
      },
      requiredSignals: ["wealth_risk"],
    },
    "money-investment-style": {
      weights: {
        wealth_growth: 0.9,
        wealth_risk: 1.1,
      },
      requiredSignals: ["wealth_risk"],
    },
    "money-side-income": {
      weights: {
        wealth_growth: 1.0,
        business_growth: 0.5,
      },
      requiredSignals: ["wealth_growth"],
    },
    "money-business-income": {
      weights: {
        business_growth: 1.1,
        wealth_growth: 0.7,
      },
      requiredSignals: ["business_growth"],
    },
    "money-saving-discipline": {
      weights: {
        wealth_control: 1.2,
        wealth_risk: 0.6,
      },
      requiredSignals: ["wealth_control"],
    },
    "money-income-expansion": {
      weights: {
        wealth_growth: 1.1,
        career_change: 0.4,
      },
      requiredSignals: ["wealth_growth"],
    },
    "money-financial-turning-point": {
      weights: {
        wealth_risk: 1.0,
        wealth_growth: 0.8,
      },
      requiredSignals: ["wealth_risk"],
    },
    "relationship-current": {
      weights: {
        relationship_commitment: 1.2,
        relationship_conflict: 0.6,
      },
      requiredSignals: ["relationship_commitment"],
    },
    "relationship-new-connection": {
      weights: {
        relationship_new: 1.4,
        relationship_recovery: 0.4,
      },
      requiredSignals: ["relationship_new"],
    },
    "relationship-conflict": {
      weights: {
        relationship_conflict: 1.4,
        relationship_recovery: 1.0,
      },
      requiredSignals: ["relationship_conflict"],
    },
    "relationship-marriage": {
      weights: {
        relationship_commitment: 1.3,
        relationship_recovery: 0.5,
      },
      requiredSignals: ["relationship_commitment"],
    },
    "relationship-partner-pattern": {
      weights: {
        relationship_commitment: 1.1,
        relationship_conflict: 0.5,
      },
      requiredSignals: ["relationship_commitment"],
    },
    "relationship-boundary": {
      weights: {
        relationship_conflict: 1.0,
        relationship_recovery: 0.7,
      },
      requiredSignals: ["relationship_conflict"],
    },
    "relationship-reunion": {
      weights: {
        relationship_recovery: 1.1,
        relationship_new: 0.5,
      },
      requiredSignals: ["relationship_recovery"],
    },
    "relationship-intimacy": {
      weights: {
        relationship_commitment: 0.9,
        relationship_new: 0.6,
      },
      requiredSignals: ["relationship_commitment"],
    },
    "social-helper": {
      weights: {
        relationship_new: 1.1,
        career_change: 0.5,
      },
      requiredSignals: ["relationship_new"],
    },
    "social-friendship": {
      weights: {
        relationship_commitment: 1.1,
        relationship_new: 0.5,
      },
      requiredSignals: ["relationship_commitment"],
    },
    "social-family": {
      weights: {
        relationship_commitment: 1.0,
        career_stability: 0.5,
      },
      requiredSignals: ["relationship_commitment"],
    },
    "social-workplace": {
      weights: {
        career_stability: 1.1,
        relationship_new: 0.4,
      },
      requiredSignals: ["career_stability"],
    },
    "social-conflict": {
      weights: {
        relationship_conflict: 1.0,
        social_support: 0.6,
      },
      requiredSignals: ["relationship_conflict"],
    },
    "social-network-expansion": {
      weights: {
        relationship_new: 1.0,
        social_support: 0.6,
      },
      requiredSignals: ["relationship_new"],
    },
    "health-energy": {
      weights: {
        health_recovery: 1.2,
        health_stress: 0.8,
      },
      requiredSignals: ["health_recovery"],
    },
    "health-stress": {
      weights: {
        health_stress: 1.4,
        health_recovery: 0.7,
      },
      requiredSignals: ["health_stress"],
    },
    "health-burnout": {
      weights: {
        health_stress: 1.2,
        health_recovery: 0.6,
      },
      requiredSignals: ["health_stress"],
    },
    "health-routine": {
      weights: {
        health_recovery: 1.0,
        health_stress: 0.5,
      },
      requiredSignals: ["health_recovery"],
    },
    "health-balance": {
      weights: {
        health_recovery: 0.8,
        wealth_control: 0.4,
      },
      requiredSignals: ["health_recovery"],
    },
    "business-startup": {
      weights: {
        business_growth: 1.3,
        business_control: 0.6,
      },
      requiredSignals: ["business_growth"],
    },
    "business-partnership": {
      weights: {
        business_control: 1.0,
        relationship_commitment: 0.5,
      },
      requiredSignals: ["business_control"],
    },
    "business-growth": {
      weights: {
        business_growth: 1.2,
        wealth_growth: 0.5,
      },
      requiredSignals: ["business_growth"],
    },
    "business-decision": {
      weights: {
        business_control: 1.2,
        wealth_risk: 0.5,
      },
      requiredSignals: ["business_control"],
    },
    "business-performance": {
      weights: {
        business_growth: 1.0,
        career_stability: 0.4,
      },
      requiredSignals: ["business_growth"],
    },
    "growth-study": {
      weights: {
        growth_learning: 1.3,
        growth_transition: 0.5,
      },
      requiredSignals: ["growth_learning"],
    },
    "growth-exam": {
      weights: {
        growth_learning: 1.1,
        career_stability: 0.4,
      },
      requiredSignals: ["growth_learning"],
    },
    "growth-skill": {
      weights: {
        growth_learning: 1.2,
        growth_transition: 0.4,
      },
      requiredSignals: ["growth_learning"],
    },
    "growth-self-development": {
      weights: {
        growth_transition: 1.1,
        growth_learning: 0.6,
      },
      requiredSignals: ["growth_transition"],
    },
    "change-moving": {
      weights: {
        growth_transition: 0.9,
        career_change: 0.4,
      },
      requiredSignals: ["growth_transition"],
    },
    "change-overseas": {
      weights: {
        growth_transition: 1.0,
        relationship_new: 0.4,
      },
      requiredSignals: ["growth_transition"],
    },
    "change-transition": {
      weights: {
        growth_transition: 1.2,
        career_change: 0.6,
      },
      requiredSignals: ["growth_transition"],
    },
    "life-current-turning-point": {
      weights: {
        growth_transition: 1.1,
        career_change: 0.5,
      },
      requiredSignals: ["growth_transition"],
    },
    "life-long-term-direction": {
      weights: {
        growth_transition: 0.9,
        career_stability: 0.4,
      },
      requiredSignals: ["growth_transition"],
    },
    "life-priority": {
      weights: {
        wealth_control: 0.8,
        health_recovery: 0.5,
      },
      requiredSignals: ["wealth_control"],
    },
  };

  return profileMap[topicId];
}

export const TOPIC_PREMIUM_PRODUCTS: PremiumProductDefinition[] =
  ANALYSIS_TOPICS.map(createTopicPremiumProduct);  

  function createPeriodPremiumProduct(
  period: PeriodAnalysisProductDefinition,
): PremiumProductDefinition {
  return {
    id: period.id,
    title: period.title,

    category: "period",
    plugin: "FORTUNE",
    kind: "PERIOD",
    periodType: period.type,
    releaseLevel: "V2",

    description: period.shortDescription,

    analysisType: period.title,
  };
}

export const PERIOD_PREMIUM_PRODUCTS: PremiumProductDefinition[] =
  PERIOD_ANALYSIS_PRODUCTS.map(createPeriodPremiumProduct);

const PREMIUM_CATEGORY_LABELS: Record<PremiumProductCategory, string> = {
  money: "재물운",
  career: "직업운",
  relationship: "관계운",
  social: "대인관계운",
  health: "건강운",
  business: "사업운",
  growth: "성장운",
  change: "변화운",
  life: "종합운",
  period: "시기운",
};

export function getPremiumCategoryLabel(
  category: PremiumProductCategory,
): string {
  return PREMIUM_CATEGORY_LABELS[category];
}

export function getPremiumPluginByCategory(
  category: PremiumProductCategory,
): PremiumProductPlugin {
  switch (category) {
    case "money":
      return "MONEY";

    case "career":
      return "CAREER";

    case "relationship":
      return "RELATIONSHIP";

    case "health":
      return "HEALTH";

    case "period":
      return "FORTUNE";

    default:
      return "COMMON";
  }
}

export const PREMIUM_PRODUCT_REGISTRY = {
  relationship: {
    id: "relationship",
    title: "연애·관계 심층 분석",
    shortTitle: "연애·관계",

      category: "relationship",
    plugin: "RELATIONSHIP",
    kind: "TOPIC",
    releaseLevel: "V1",

    description:
      "여러 관계에서 반복되는 상호작용·거리·반응 구조와 관계 운영 우선순위를 분석합니다.",

    details: [
      "여러 관계에서 반복되는 상호작용·거리·반응의 운영 구조",
      "상호성의 불균형과 정서적 부담이 커지는 조건",
      "가까워짐·거리 둠·회피·과잉 대응이 반복되는 관계 습관",
      "특정 사람이나 사건 이전에 안정화할 관계 운영 우선순위",
      "다음 검토 주기에서 모니터링하고 재조정할 관계 운영 신호",
      "현재 상대 판단·갈등 수습·경계 처방 이전에 적용할 관계 습관 점검",
    ],

     analysisType: "연애·관계 심층 분석",
  },

  wealth: {
    id: "wealth",
    title: "재물운 심층 분석",
    shortTitle: "재물운",

      category: "money",
    plugin: "MONEY",
    kind: "TOPIC",
    releaseLevel: "V1",

    description:
      "수입·지출·책임·활동·계약이 연결되는 재정 운영 구조와 점검 우선순위를 분석합니다.",

    details: [
      "수입·지출·책임·활동·계약이 연결되는 재정 운영 구조",
      "수입 흐름·반복 지출·활동 비용·책임 부담이 충돌하는 조건",
      "여러 돈 운영 차원에서 비용·책임·통제 압력이 커지는 신호",
      "축적·손실 통제·저축 루틴 이전에 점검할 운영 우선순위",
      "다음 검토 주기에서 먼저 조정할 재정 운영 차원과 유지 기준",
      "투자 추천이나 시기 예측 없이 실제 운영 구조를 재정리하는 행동",
    ],

    analysisType: "재물운 심층 분석",

    recommendedFor: [
      "수입·지출·책임·활동·계약이 함께 얽힌 재정 운영이 궁금한 사람",
      "어느 돈 운영 차원부터 점검하고 조정할지 우선순위가 필요한 사람",
      "수입과 지출만이 아니라 책임과 활동 조건까지 함께 재정리하고 싶은 사람",
      "축적·손실 통제·저축 루틴 이전에 전체 운영 구조를 이해하고 싶은 사람",
    ],

    analysisFocus: [
      "수입·지출·책임·활동·계약이 연결되는 운영 구조",
      "여러 운영 차원에서 비용과 책임이 충돌하는 조건",
      "재정 통제와 우선순위가 약해지는 활동·계약 압력",
      "전체 재정 운영을 점검·조정·유지하는 검토 순서",
    ],

    expectedOutcome: [
      "현재 재정 운영 구조와 차원별 우선순위 이해",
      "수입·지출·책임·활동·계약 사이의 연결 조건 점검",
      "전체 운영에서 먼저 조정·유지·검토할 차원 확인",
      "축적·손실 통제·저축 루틴과 구분되는 운영 기준 확보",
    ],
},
    career: {
  id: "career",
  title: "직업운 심층 분석",
  shortTitle: "직업운",

    category: "career",
  plugin: "CAREER",
  kind: "TOPIC",
  releaseLevel: "V1",

  description:
    "현재 커리어의 책임·업무·에너지 배분 구조를 살피고 운영 우선순위를 재정리합니다.",

  details: [
    "현재 책임·업무·성과에 에너지가 배분되는 운영 구조",
    "반복되는 과부하·분산·우선순위 충돌이 생기는 조건",
    "안정적으로 유지할 운영 기준과 먼저 재조정할 책임",
    "커리어 전반에서 줄이거나 재배분할 업무 조합",
    "다음 검토 주기에서 확인할 운영 신호와 재정비 기준",
    "직업 적합성·이직·전문성 선택 전에 적용할 커리어 운영 행동",
  ],

  analysisType: "직업운 심층 분석",

  },
  health: {
  id: "health",
  title: "건강운 심층 분석",
  shortTitle: "건강운",

   category: "health",
  plugin: "HEALTH",
  kind: "TOPIC",
  releaseLevel: "V1",

  description:
    "현재 건강·생활 흐름을 컨디션, 생활 리듬, 과부하와 회복의 관점에서 심층적으로 분석합니다.",

  details: [
    "현재 건강·생활 흐름이 나타나는 명리학적 이유",
    "컨디션이 흔들리기 쉬운 패턴과 조건",
    "과부하와 회복이 반복되는 생활 구조",
    "현재 생활에서 조정이 필요한 부분",
    "앞으로 컨디션 변화에서 살펴볼 흐름",
    "일상에서 적용할 수 있는 현실적인 생활 관리 방향",
  ],

  analysisType: "건강운 심층 분석",
},
} as const satisfies Record<string, PremiumProductDefinition>;

export const ALL_PREMIUM_PRODUCTS: readonly PremiumProductDefinition[] = [
  ...Object.values(PREMIUM_PRODUCT_REGISTRY),
  ...TOPIC_PREMIUM_PRODUCTS,
  ...PERIOD_PREMIUM_PRODUCTS,
];

export const PREMIUM_PRODUCT_LOOKUP: Record<
  string,
  PremiumProductDefinition
> = Object.fromEntries(
  ALL_PREMIUM_PRODUCTS.map((product) => [
    product.id,
    product,
  ]),
);

export function getPremiumProduct(
  productId: string,
): PremiumProductDefinition | undefined {
  return PREMIUM_PRODUCT_LOOKUP[productId];
}

const PREMIUM_PRODUCT_ID_ALIASES: Record<string, string> = {
  love: "relationship",
  money: "wealth",
};

export function getCanonicalPremiumProductId(
  productId: string,
): string {
  return PREMIUM_PRODUCT_ID_ALIASES[productId] ?? productId;
}