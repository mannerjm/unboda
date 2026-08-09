import {
  ANALYSIS_TOPICS,
  type AnalysisTopicCategory,
  type AnalysisTopicDefinition,
  type AnalysisTopicRiskLevel,
} from "./analysisTopics";

import {
  PERIOD_ANALYSIS_PRODUCTS,
  type PeriodAnalysisProductDefinition,
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

export type PremiumProductDefinition = {
  id: string;

  title: string;

  shortTitle?: string;

  category: PremiumProductCategory;

  plugin: PremiumProductPlugin;

  kind: PremiumProductKind;

  releaseLevel: PremiumProductReleaseLevel;

  description: string;

  details?: readonly string[];
  
  riskLevel?: PremiumProductRiskLevel;

  analysisType: string;
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

    riskLevel: topic.riskLevel,

    analysisType: topic.title,
  };
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
    releaseLevel: "V2",

    description: period.shortDescription,

    analysisType: period.title,
  };
}

export const PERIOD_PREMIUM_PRODUCTS: PremiumProductDefinition[] =
  PERIOD_ANALYSIS_PRODUCTS.map(createPeriodPremiumProduct);

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