import {
  PREMIUM_PRODUCT_REGISTRY,
  type PremiumProductDefinition,
} from "./premiumProductRegistry";

export type PaidAnalysisProduct = {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  details: readonly string[];

  category?: string;
  plugin?: string;
  releaseLevel?: "V1" | "V2" | "V3" | "ULTIMATE";
  analysisType?: string;

  recommendedFor?: readonly string[];
  analysisFocus?: readonly string[];
  expectedOutcome?: readonly string[];
};

type LegacyCompatibilityMetadata = {
  recommendedFor?: readonly string[];
  analysisFocus?: readonly string[];
  expectedOutcome?: readonly string[];
};

type LegacyProductFieldOptions = {
  includeShortTitle?: boolean;
  includeCategory?: boolean;
  includePlugin?: boolean;
  includeReleaseLevel?: boolean;
  includeAnalysisType?: boolean;
};

function createPaidAnalysisProductFromRegistry(
  registryProduct: PremiumProductDefinition,
  options: LegacyProductFieldOptions = {},
  compatibilityMetadata: LegacyCompatibilityMetadata = {},
): PaidAnalysisProduct {
  const product: PaidAnalysisProduct = {
    id: registryProduct.id,
    title: registryProduct.title,
    description: registryProduct.description,
    details: registryProduct.details ?? [],
  };

  if (options.includeShortTitle || registryProduct.shortTitle) {
    product.shortTitle = registryProduct.shortTitle;
  }

  if (options.includeCategory || registryProduct.category) {
    product.category = registryProduct.category.toUpperCase();
  }

  if (options.includePlugin || registryProduct.plugin) {
    product.plugin = registryProduct.plugin;
  }

  if (options.includeReleaseLevel || registryProduct.releaseLevel) {
    product.releaseLevel = registryProduct.releaseLevel;
  }

  if (options.includeAnalysisType || registryProduct.analysisType) {
    product.analysisType = registryProduct.analysisType;
  }

  product.description = registryProduct.description;
  product.details = registryProduct.details ?? [];

  product.recommendedFor =
    registryProduct.recommendedFor ?? compatibilityMetadata.recommendedFor;

  product.analysisFocus =
    registryProduct.analysisFocus ?? compatibilityMetadata.analysisFocus;

  product.expectedOutcome =
    registryProduct.expectedOutcome ?? compatibilityMetadata.expectedOutcome;

  return product;
}

const legacyCompatibilityMetadata: Record<string, LegacyCompatibilityMetadata> = {
  wealth: {
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
  relationship: {},
  career: {},
  health: {},
};

export const paidAnalysisProducts = {
  wealth: createPaidAnalysisProductFromRegistry(
    PREMIUM_PRODUCT_REGISTRY.wealth,
    {
      includeShortTitle: true,
      includeCategory: true,
      includePlugin: true,
      includeReleaseLevel: true,
      includeAnalysisType: true,
    },
    legacyCompatibilityMetadata.wealth,
  ),
  relationship: createPaidAnalysisProductFromRegistry(
    PREMIUM_PRODUCT_REGISTRY.relationship,
    {
      includeShortTitle: true,
    },
    legacyCompatibilityMetadata.relationship,
  ),
  career: createPaidAnalysisProductFromRegistry(
    PREMIUM_PRODUCT_REGISTRY.career,
    {},
    legacyCompatibilityMetadata.career,
  ),
  health: createPaidAnalysisProductFromRegistry(
    PREMIUM_PRODUCT_REGISTRY.health,
    {
      includeShortTitle: true,
    },
    legacyCompatibilityMetadata.health,
  ),
  // TODO: legacy compatibility entry retained until the registry covers this product explicitly.
  social: {
    id: "social",
    title: "인간관계 심층 분석",
    shortTitle: "인간관계",
    description: "대인관계의 흐름과 주의할 관계 패턴을 심층적으로 분석합니다.",
    details: [
      "현재 인간관계 흐름이 나타나는 명리학적 이유",
      "도움이 되는 인연과 멀어져야 할 관계",
      "신뢰와 협력이 강해지는 시기",
      "갈등이 커질 수 있는 관계 패턴",
      "관계를 정리하고 유지하는 현실적인 기준",
    ],
  },
  // TODO: legacy compatibility entry retained until the registry covers this product explicitly.
  marriage: {
    id: "marriage",
    title: "결혼운 심층 분석",
    description: "결혼 인연과 관계 발전 흐름을 심층적으로 분석합니다.",
    details: [
      "결혼운 흐름이 나타나는 명리학적 이유",
      "결혼 적기와 인연이 강해지는 시기",
      "배우자와의 관계에서 중요한 요소",
      "결혼을 미루면 생길 수 있는 변화",
      "안정적인 결혼을 위한 현실적인 준비",
    ],
  },
  // TODO: legacy compatibility entry retained until the registry covers this product explicitly.
  study: {
    id: "study",
    title: "학업운 심층 분석",
    description: "학업 성향과 성과가 높아지는 흐름을 심층적으로 분석합니다.",
    details: [
      "현재 학업운 흐름이 나타나는 이유",
      "집중력이 높아지는 시기",
      "시험과 평가에 유리한 흐름",
      "공부 효율이 떨어질 수 있는 시기",
      "학습 전략과 현실적인 준비 방향",
    ],
  },
  // TODO: legacy compatibility entry retained until the registry covers this product explicitly.
  business: {
    id: "business",
    title: "사업운 심층 분석",
    description: "사업 흐름과 중요한 선택 시기를 심층적으로 분석합니다.",
    details: [
      "사업운 흐름과 현재 시장 타이밍",
      "확장하기 좋은 시기",
      "투자와 계약에서 주의할 점",
      "매출 변화 가능성이 높은 흐름",
      "사업 운영 전략과 현실적인 대응",
    ],
  },
  // TODO: legacy compatibility entry retained until the registry covers this product explicitly.
  "job-change": {
    id: "job-change",
    title: "이직운 심층 분석",
    description: "이직 가능성과 직업 변화 시기를 심층적으로 분석합니다.",
    details: [
      "현재 이직운 흐름이 나타나는 이유",
      "이직에 유리한 시기",
      "지금 회사를 유지해야 하는 이유",
      "새로운 기회를 잡는 방법",
      "커리어 변화의 현실적인 방향",
    ],
  },
  // TODO: legacy compatibility entry retained until the registry covers this product explicitly.
  yearly: {
    id: "yearly",
    title: "올해운 심층 분석",
    description: "올해의 주요 흐름과 중요한 시기를 심층적으로 분석합니다.",
    details: [
      "올해 운세의 핵심 흐름",
      "기회가 커지는 시기",
      "주의해야 하는 달",
      "올해 가장 중요한 결정 포인트",
      "올해 운을 활용하는 현실적인 전략",
    ],
  },
  // TODO: legacy compatibility entry retained until the registry covers this product explicitly.
  daeun: {
    id: "daeun",
    title: "대운 심층 분석",
    description: "장기적인 운의 변화와 인생 흐름을 심층적으로 분석합니다.",
    details: [
      "현재 대운이 인생에 미치는 영향",
      "앞으로 10년의 변화 방향",
      "강해지는 운과 약해지는 운",
      "주의해야 하는 전환 시기",
      "장기적인 인생 전략",
    ],
  },
} satisfies Record<string, PaidAnalysisProduct>;

export type PaidAnalysisProductId = keyof typeof paidAnalysisProducts;

export function isPaidAnalysisProductId(
  value: unknown,
): value is PaidAnalysisProductId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(paidAnalysisProducts, value)
  );
}