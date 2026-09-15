import type {
  PremiumProductCategory,
  PremiumProductDefinition,
} from "./premiumProductRegistry";

const PRODUCT_TITLE_OVERRIDES: Readonly<Record<string, string>> = {
  "career-workplace-relationships": "직장 협업 관계 분석",
  "relationship-current": "현재 연애 관계의 지속성과 조정",
  "relationship-conflict": "연애 갈등 패턴과 회복 방식",
  "relationship-boundary": "연애 관계의 거리 조절과 경계",
  "relationship-intimacy": "연애 관계의 친밀감 형성 속도",
  "social-helper": "도움 관계와 신뢰 분석",
};

const CATEGORY_LABEL_OVERRIDES: Partial<Record<PremiumProductCategory, string>> = {
  growth: "학업·성장운",
  relationship: "연애운",
};

/**
 * Customer-facing naming only.
 * Product ids, category ownership, recommendation logic, pricing and prompt
 * semantics intentionally remain unchanged.
 */
export function getPremiumProductDisplayTitle(
  productId: string,
  fallbackTitle: string,
): string {
  return PRODUCT_TITLE_OVERRIDES[productId] ?? fallbackTitle;
}

export function presentPremiumProduct(
  product: PremiumProductDefinition,
): PremiumProductDefinition {
  const title = getPremiumProductDisplayTitle(product.id, product.title);
  return title === product.title ? product : { ...product, title };
}

export function getPremiumCategoryDisplayLabel(
  category: PremiumProductCategory,
  fallbackLabel: string,
): string {
  return CATEGORY_LABEL_OVERRIDES[category] ?? fallbackLabel;
}
