export const COMPATIBILITY_ROMANTIC_PRODUCT_ID = "compatibility-romantic" as const;
export const COMPATIBILITY_ROMANTIC_SESSION_KEY = "unboda:compatibility-romantic:partner:v1" as const;
export const COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID = "compatibility-family-parent-child" as const;
export const COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY = "unboda:compatibility-family-parent-child:v1" as const;
export const COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID = "compatibility-family-siblings" as const;
export const COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY = "unboda:compatibility-family-siblings:v1" as const;
export const COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID = "compatibility-family-other" as const;
export const COMPATIBILITY_FAMILY_OTHER_SESSION_KEY = "unboda:compatibility-family-other:v1" as const;

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

export const COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT: SpecialAnalysisProductDefinition = {
  id: COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  title: "부모·자녀 궁합 분석",
  shortTitle: "부모·자녀 궁합",
  description: "부모와 자녀가 서로에게 미치는 방향, 정서적 연결과 대화, 기대와 독립, 보호와 경계, 갈등 뒤 회복과 현재 연도 흐름을 함께 살펴봅니다.",
  amount: 19_900,
  currency: "KRW",
  categoryLabel: "전문 분석 · 궁합 · 가족",
};

export const COMPATIBILITY_FAMILY_SIBLING_PRODUCT: SpecialAnalysisProductDefinition = {
  id: COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  title: "형제·자매 궁합 분석",
  shortTitle: "형제·자매 궁합",
  description: "형제·자매 사이의 정서적 연결, 대화, 비교와 경쟁, 오래 굳어진 역할과 경계, 갈등 뒤 회복과 현재 연도 흐름을 함께 살펴봅니다.",
  amount: 19_900,
  currency: "KRW",
  categoryLabel: "전문 분석 · 궁합 · 가족",
};

export const COMPATIBILITY_FAMILY_OTHER_PRODUCT: SpecialAnalysisProductDefinition = {
  id: COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  title: "기타 가족 궁합 분석",
  shortTitle: "기타 가족 궁합",
  description: "조부모·손주, 조카, 사촌, 인척 등 가족 관계의 정서적 거리, 소통, 역할과 기대, 연락·관여의 경계, 회복과 현재 연도 흐름을 살펴봅니다.",
  amount: 19_900,
  currency: "KRW",
  categoryLabel: "전문 분석 · 궁합 · 가족",
};

const SPECIAL_ANALYSIS_PRODUCT_LOOKUP: Readonly<Record<string, SpecialAnalysisProductDefinition>> = {
  [COMPATIBILITY_ROMANTIC_PRODUCT_ID]: COMPATIBILITY_ROMANTIC_PRODUCT,
  [COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID]: COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  [COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID]: COMPATIBILITY_FAMILY_SIBLING_PRODUCT,
  [COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID]: COMPATIBILITY_FAMILY_OTHER_PRODUCT,
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

export function isCompatibilityFamilyParentChildProductId(productId: string | null | undefined): boolean {
  return productId === COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID;
}

export function isCompatibilityFamilySiblingProductId(productId: string | null | undefined): boolean {
  return productId === COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID;
}

export function isCompatibilityFamilyOtherProductId(productId: string | null | undefined): boolean {
  return productId === COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID;
}

export function isCompatibilityFamilyProductId(productId: string | null | undefined): boolean {
  return isCompatibilityFamilyParentChildProductId(productId)
    || isCompatibilityFamilySiblingProductId(productId)
    || isCompatibilityFamilyOtherProductId(productId);
}
