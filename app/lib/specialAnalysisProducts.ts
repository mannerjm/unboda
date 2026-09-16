export const COMPATIBILITY_ROMANTIC_PRODUCT_ID = "compatibility-romantic" as const;
export const COMPATIBILITY_ROMANTIC_SESSION_KEY = "unboda:compatibility-romantic:partner:v1" as const;

export type SpecialAnalysisProductDefinition = Readonly<{
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  amount: number;
  currency: "KRW";
  categoryLabel: string;
}>;

export const COMPATIBILITY_ROMANTIC_PRODUCT: SpecialAnalysisProductDefinition = {
  id: COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  title: "연인·배우자 궁합 분석",
  shortTitle: "궁합 분석",
  description: "두 사람의 관계 강점, 갈등과 회복 방식, 서로에게 미치는 영향과 현재 관계 흐름을 함께 살펴봅니다.",
  amount: 19_900,
  currency: "KRW",
  categoryLabel: "전문 분석 · 궁합",
};

const SPECIAL_ANALYSIS_PRODUCT_LOOKUP: Readonly<Record<string, SpecialAnalysisProductDefinition>> = {
  [COMPATIBILITY_ROMANTIC_PRODUCT_ID]: COMPATIBILITY_ROMANTIC_PRODUCT,
};

export function getSpecialAnalysisProduct(productId: string | null | undefined): SpecialAnalysisProductDefinition | undefined {
  return productId ? SPECIAL_ANALYSIS_PRODUCT_LOOKUP[productId] : undefined;
}

export function isSpecialAnalysisProductId(productId: string | null | undefined): boolean {
  return Boolean(getSpecialAnalysisProduct(productId));
}

export function isCompatibilityRomanticProductId(productId: string | null | undefined): boolean {
  return productId === COMPATIBILITY_ROMANTIC_PRODUCT_ID;
}
