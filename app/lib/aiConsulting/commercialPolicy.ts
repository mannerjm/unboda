// Phase 10 commercial policy for profile-scoped AI consulting credits.
//
// Credits are a shared balance for one profile. They are not tied to the
// paid-analysis product that happened to be open when the credit bundle was
// purchased. Access to an AI consultation topic remains independently gated
// by an active paid-analysis entitlement + completed report for that exact
// product/edition.

export const AI_CONSULTING_CREDIT_BUNDLES = [
  { id: "ai-consulting-3", questions: 3, priceKrw: 2900 },
  { id: "ai-consulting-5", questions: 5, priceKrw: 4900, recommended: true },
  { id: "ai-consulting-10", questions: 10, priceKrw: 8900 },
] as const;

export type AiConsultingCreditBundleId =
  (typeof AI_CONSULTING_CREDIT_BUNDLES)[number]["id"];

export function getAiConsultingCreditBundle(id: string) {
  return AI_CONSULTING_CREDIT_BUNDLES.find((bundle) => bundle.id === id) ?? null;
}

export const AI_CONSULTING_CREDIT_POLICY = {
  scope: "PROFILE" as const,
  expiresByDefault: false,
  deductOnlyAfterCompletedAnswer: true,
  allowAcrossPurchasedAnalyses: true,
  requireExactAnalysisEntitlement: true,
  requireCompletedAnalysisReport: true,
  chargeOnClarify: false,
  chargeOnDeny: false,
  chargeOnSafetyRedirect: false,
  chargeOnGenerationFailure: false,
} as const;
