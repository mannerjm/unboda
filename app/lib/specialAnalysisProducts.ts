export const COMPATIBILITY_ROMANTIC_PRODUCT_ID = "compatibility-romantic" as const;
export const COMPATIBILITY_ROMANTIC_SESSION_KEY = "unboda:compatibility-romantic:partner:v1" as const;
export const COMPATIBILITY_WORKPLACE_PRODUCT_ID = "compatibility-workplace" as const;
export const COMPATIBILITY_WORKPLACE_SESSION_KEY = "unboda:compatibility-workplace:partner:v1" as const;
export const COMPATIBILITY_FRIEND_PRODUCT_ID = "compatibility-friend" as const;
export const COMPATIBILITY_FRIEND_SESSION_KEY = "unboda:compatibility-friend:partner:v1" as const;
export const COMPATIBILITY_BUSINESS_PRODUCT_ID = "compatibility-business" as const;
export const COMPATIBILITY_BUSINESS_SESSION_KEY = "unboda:compatibility-business:partner:v1" as const;
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

export const COMPATIBILITY_WORKPLACE_PRODUCT: SpecialAnalysisProductDefinition = {
  id: COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  title: "직장·동료 궁합 분석",
  shortTitle: "직장·동료 궁합",
  description: "상사·동료·팀원·업무 협업자 사이의 일하는 방식, 역할 분담, 소통과 갈등 흐름을 살펴봅니다.",
  amount: 19_900,
  currency: "KRW",
  categoryLabel: "전문 분석 · 궁합 · 직장",
};

export const COMPATIBILITY_FRIEND_PRODUCT: SpecialAnalysisProductDefinition = {
  id: COMPATIBILITY_FRIEND_PRODUCT_ID,
  title: "친구·지인 궁합 분석",
  shortTitle: "친구·지인 궁합",
  description: "친구와 가까운 지인 사이의 신뢰, 친밀감, 거리 조절, 오해와 관계 지속 흐름을 살펴봅니다.",
  amount: 19_900,
  currency: "KRW",
  categoryLabel: "전문 분석 · 궁합 · 친구",
};

export const COMPATIBILITY_BUSINESS_PRODUCT: SpecialAnalysisProductDefinition = {
  id: COMPATIBILITY_BUSINESS_PRODUCT_ID,
  title: "사업·동업 궁합 분석",
  shortTitle: "사업·동업 궁합",
  description: "동업자·공동창업자·사업 파트너 사이의 역할, 의사결정, 책임, 돈과 갈등 구조를 살펴봅니다.",
  amount: 19_900,
  currency: "KRW",
  categoryLabel: "전문 분석 · 궁합 · 사업",
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
  [COMPATIBILITY_WORKPLACE_PRODUCT_ID]: COMPATIBILITY_WORKPLACE_PRODUCT,
  [COMPATIBILITY_FRIEND_PRODUCT_ID]: COMPATIBILITY_FRIEND_PRODUCT,
  [COMPATIBILITY_BUSINESS_PRODUCT_ID]: COMPATIBILITY_BUSINESS_PRODUCT,
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

export function isCompatibilityWorkplaceProductId(productId: string | null | undefined): boolean {
  return productId === COMPATIBILITY_WORKPLACE_PRODUCT_ID;
}

export function isCompatibilityFriendProductId(productId: string | null | undefined): boolean {
  return productId === COMPATIBILITY_FRIEND_PRODUCT_ID;
}

export function isCompatibilityBusinessProductId(productId: string | null | undefined): boolean {
  return productId === COMPATIBILITY_BUSINESS_PRODUCT_ID;
}

export type CompatibilityPairProductId =
  | typeof COMPATIBILITY_ROMANTIC_PRODUCT_ID
  | typeof COMPATIBILITY_WORKPLACE_PRODUCT_ID
  | typeof COMPATIBILITY_FRIEND_PRODUCT_ID
  | typeof COMPATIBILITY_BUSINESS_PRODUCT_ID;

export type CompatibilityPairRelationshipType =
  | "romantic_partner"
  | "workplace_colleague"
  | "friend_acquaintance"
  | "business_partner";

export function isCompatibilityPairProductId(productId: string | null | undefined): productId is CompatibilityPairProductId {
  return isCompatibilityRomanticProductId(productId)
    || isCompatibilityWorkplaceProductId(productId)
    || isCompatibilityFriendProductId(productId)
    || isCompatibilityBusinessProductId(productId);
}

export function getCompatibilityPairSessionKey(productId: CompatibilityPairProductId): string {
  if (productId === COMPATIBILITY_WORKPLACE_PRODUCT_ID) return COMPATIBILITY_WORKPLACE_SESSION_KEY;
  if (productId === COMPATIBILITY_FRIEND_PRODUCT_ID) return COMPATIBILITY_FRIEND_SESSION_KEY;
  if (productId === COMPATIBILITY_BUSINESS_PRODUCT_ID) return COMPATIBILITY_BUSINESS_SESSION_KEY;
  return COMPATIBILITY_ROMANTIC_SESSION_KEY;
}

export function getCompatibilityPairRelationshipType(productId: CompatibilityPairProductId): CompatibilityPairRelationshipType {
  if (productId === COMPATIBILITY_WORKPLACE_PRODUCT_ID) return "workplace_colleague";
  if (productId === COMPATIBILITY_FRIEND_PRODUCT_ID) return "friend_acquaintance";
  if (productId === COMPATIBILITY_BUSINESS_PRODUCT_ID) return "business_partner";
  return "romantic_partner";
}

export function getCompatibilityPairEntryPath(productId: CompatibilityPairProductId): string {
  if (productId === COMPATIBILITY_WORKPLACE_PRODUCT_ID) return "/special-analysis/compatibility/workplace";
  if (productId === COMPATIBILITY_FRIEND_PRODUCT_ID) return "/special-analysis/compatibility/friend";
  if (productId === COMPATIBILITY_BUSINESS_PRODUCT_ID) return "/special-analysis/compatibility/business";
  return "/special-analysis/compatibility/romantic";
}

export function getCompatibilityPairReportPath(productId: CompatibilityPairProductId): string {
  if (productId === COMPATIBILITY_WORKPLACE_PRODUCT_ID) return "/special-analysis/compatibility/workplace/report";
  if (productId === COMPATIBILITY_FRIEND_PRODUCT_ID) return "/special-analysis/compatibility/friend/report";
  if (productId === COMPATIBILITY_BUSINESS_PRODUCT_ID) return "/special-analysis/compatibility/business/report";
  return "/special-analysis/compatibility/report";
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
