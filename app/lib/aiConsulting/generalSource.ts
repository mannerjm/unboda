/** Independent consultation source; never a paid report entitlement. */
export const GENERAL_CONSULTING_PRODUCT_ID = "ai-consulting-general";
export const GENERAL_CONSULTING_EDITION = "general-v1";
export function isGeneralConsultingSource(productId: string, edition: string): boolean {
  return productId === GENERAL_CONSULTING_PRODUCT_ID && edition === GENERAL_CONSULTING_EDITION;
}
export const GENERAL_CONSULTING_SOURCE = {
  productId: GENERAL_CONSULTING_PRODUCT_ID,
  analysisEditionKey: GENERAL_CONSULTING_EDITION,
  productTitle: "일반 AI 상담",
  editionLabel: "리포트 없이 상담",
} as const;
