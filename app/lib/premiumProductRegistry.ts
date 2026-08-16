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
      "관계의 변화, 인연의 흐름과 현재 관계에서 살펴볼 핵심 포인트를 분석합니다.",

    details: [
      "현재 관계 흐름이 나타나는 명리학적 이유",
      "새로운 인연과 관계 변화가 강해지는 시기",
      "관계를 발전시키기 좋은 흐름",
      "갈등과 거리감에 주의할 시기와 요인",
      "현재 관계에서 살펴볼 현실적인 대응 방향",
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
      "현재 재물 흐름을 수입, 지출, 축적, 계약, 투자 판단의 관점에서 심층적으로 분석합니다.",

    details: [
      "현재 재물 흐름이 나타나는 명리학적 이유",
      "돈이 들어오는 구조와 남는 구조의 차이",
      "지출·손실이 커지기 쉬운 조건과 반복 패턴",
      "현재 확대·유지·조정·보류 중 필요한 판단",
      "앞으로 3개월·6개월·1년의 재물 변화",
      "실제 생활에서 적용할 수 있는 재물 관리 기준",
    ],

    analysisType: "재물운 심층 분석",

    recommendedFor: [
      "돈을 벌어도 잘 모이지 않는 이유가 궁금한 사람",
      "수입 확대와 지출 조정 중 무엇이 우선인지 고민하는 사람",
      "투자·계약·사업 확장을 앞두고 판단 기준이 필요한 사람",
      "현재 재물운의 방향과 향후 변화를 알고 싶은 사람",
      "장기적으로 자신에게 맞는 재물 축적 방식을 알고 싶은 사람",
    ],

    analysisFocus: [
      "재성의 강약과 실제 작용",
      "식상과 재성의 연결 구조",
      "비겁에 따른 경쟁·분산·손실 가능성",
      "관성과 계약·책임 범위의 관계",
      "대운·세운에 따른 수입과 보존 흐름",
      "직업·사업·인간관계가 재물 흐름에 미치는 영향",
    ],

    expectedOutcome: [
      "현재 재물 문제의 핵심 원인 이해",
      "돈이 들어오는 경로와 새는 조건 구분",
      "확대·유지·조정·보류 중 우선 방향 확인",
      "시기별 재물 변화와 준비 기준 확보",
      "실행 가능한 지출·계약·현금 흐름 관리 기준 확보",
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
    "현재 직업 흐름과 커리어 방향, 역할 변화와 선택의 핵심 포인트를 심층적으로 분석합니다.",

  details: [
    "현재 직업 흐름이 나타나는 명리학적 이유",
    "나에게 맞는 역할과 일하는 방식",
    "현재 커리어에서 반복되는 강점과 문제",
    "이직·유지·확장 등 현재 선택에서 살펴볼 기준",
    "앞으로의 직업 흐름과 변화 가능성",
    "현실적으로 적용할 수 있는 커리어 행동 방향",
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