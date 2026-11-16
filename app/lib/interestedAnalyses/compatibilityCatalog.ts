import {
  COMPATIBILITY_BUSINESS_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FRIEND_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  getSpecialAnalysisProduct,
} from "../specialAnalysisProducts";

// Favorites are *product kinds*, never a couple, a family-member record,
// a birth date, a paid report, an order, or the current year's edition.
// The family catalogue groups three relationship selectors under one card.
export const COMPATIBILITY_INTEREST_CARDS = [
  {
    productId: COMPATIBILITY_ROMANTIC_PRODUCT_ID,
    title: "연인·배우자 궁합",
    label: "연인 궁합",
    photoId: "relationship-current",
    description: "서로 잘 맞는 점과 부딪히는 이유는 무엇일까요?",
    href: "/special-analysis/compatibility/romantic",
  },
  {
    productId: COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
    title: "가족 궁합",
    label: "가족 궁합",
    photoId: "relationship-family-role",
    description: "가족의 서로 다른 마음을 어떻게 이해하면 좋을까요?",
    href: "/special-analysis/compatibility/family/parent-child#family-relationship-selector",
  },
  {
    productId: COMPATIBILITY_WORKPLACE_PRODUCT_ID,
    title: "직장·동료 궁합",
    label: "직장 궁합",
    photoId: "career-workplace-relationships",
    description: "함께 일할 때 잘 맞는 점과 갈등은 무엇일까요?",
    href: "/special-analysis/compatibility/workplace",
  },
  {
    productId: COMPATIBILITY_FRIEND_PRODUCT_ID,
    title: "친구·지인 궁합",
    label: "친구 궁합",
    photoId: "relationship-friendship",
    description: "친구 관계를 오래 편안하게 이어가려면?",
    href: "/special-analysis/compatibility/friend",
  },
  {
    productId: COMPATIBILITY_BUSINESS_PRODUCT_ID,
    title: "사업·동업 궁합",
    label: "동업 궁합",
    photoId: "business-team-management",
    description: "함께 사업할 때 역할과 결정 방식이 잘 맞을까요?",
    href: "/special-analysis/compatibility/business",
  },
] as const;

export type CompatibilityInterestCard = (typeof COMPATIBILITY_INTEREST_CARDS)[number];

export function getCompatibilityInterestCard(
  productId: string,
): CompatibilityInterestCard | undefined {
  return COMPATIBILITY_INTEREST_CARDS.find((item) =>
    item.productId === productId && Boolean(getSpecialAnalysisProduct(item.productId)),
  );
}
