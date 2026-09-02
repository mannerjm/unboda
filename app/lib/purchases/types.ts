import type { PaymentStatus } from "../payment";

export const PAID_ANALYSIS_RESOURCE_TYPE = "paid_analysis";

export type OrderRecord = {
  id: string;
  userId: string;
  profileId: string;
  productId: string;
  amount: number;
  status: PaymentStatus;
  paymentProvider: string | null;
  transactionId: string | null;
  createdAt: string;
  paidAt: string | null;
  /** STEP 57D-48F-B foundation column; null/LEGACY until Phase C freezes it at order creation. */
  analysisEditionKey: string | null;
  /** STEP 57D-48F-D: frozen evaluation-date/fortune context so delayed generation never drifts to "now". */
  analysisReferenceSnapshot: unknown;
  /** STEP 57D-48F-D2: frozen canonical birth-data input; report generation must consume this, never the live profile. */
  analysisInputSnapshot: unknown;
};

export type TossPaymentRecord = {
  id: string;
  orderId: string;
  paymentKey: string | null;
  providerOrderId: string | null;
  expectedAmount: number;
  confirmedAmount: number | null;
  currency: string | null;
  providerStatus: string | null;
  confirmationStartedAt: string | null;
  confirmedAt: string | null;
  reconciliationStatus:
    | "pending"
    | "confirmation_started"
    | "externally_confirmed"
    | "paid"
    | "reconciliation_required"
    | "reconciliation_failed"
    | "terminal_mismatch";
  lastReconciliationResult: string | null;
  lastReconciledAt: string | null;
  retryCount: number;
  maxRetryCount: number;
  nextRetryAt: string;
  lastAttemptAt: string | null;
  lastConfirmationHttpStatus: number | null;
  lastProviderErrorCode: string | null;
  lastProviderErrorMessage: string | null;
  lastConfirmationAttemptAt: string | null;
  lastConfirmationRetryability: "RETRYABLE" | "NON_RETRYABLE" | "OWNER_ESCALATION_REQUIRED" | null;
  lastConfirmationCorrelationId: string | null;
};

export type PurchaseRecord = {
  id: string;
  userId: string;
  profileId: string;
  productId: string;
  orderId: string;
  purchasedAt: string;
  /** STEP 57D-48F-B foundation column; null/LEGACY until a later phase threads it through. */
  analysisEditionKey: string | null;
  /** STEP 57D-48F-D: copied verbatim from the originating order, never recomputed. */
  analysisReferenceSnapshot: unknown;
  /** STEP 57D-48F-D2: copied verbatim from the originating order, never recomputed. */
  analysisInputSnapshot: unknown;
};

export type RefundStatus =
  | "REFUND_REQUESTED"
  | "REFUND_PROCESSING"
  | "REFUND_FAILED_RETRYING"
  | "REFUND_COMPLETED"
  | "OWNER_REVIEW_REQUIRED";

export type RefundWorkflowRecord = {
  id: string;
  orderId: string;
  paymentRecordId: string;
  userId: string;
  profileId: string;
  productId: string;
  requestedAmount: number;
  currency: string;
  reasonCategory: "CHANGE_OF_MIND" | "CONTENT_NOT_PROVIDED" | "MATERIAL_DEFECT" | "MATERIALLY_DIFFERENT" | "OWNER_OVERRIDE";
  reasonText: string | null;
  status: RefundStatus;
  providerStatus: string | null;
  providerCancellationReference: string | null;
  requestedAt: string;
  processingStartedAt: string | null;
  providerConfirmedAt: string | null;
  completedAt: string | null;
  entitlementRevokedAt: string | null;
  retryCount: number;
  maxRetryCount: number;
  nextRetryAt: string;
  lastAttemptAt: string | null;
  lastProviderHttpStatus: number | null;
  lastProviderErrorCode: string | null;
  lastProviderErrorMessage: string | null;
  lastRetryability: "RETRYABLE" | "NON_RETRYABLE" | "OWNER_ESCALATION_REQUIRED" | null;
  correlationId: string;
  reconciliationClaimToken: string | null;
  reconciliationClaimedAt: string | null;
  reconciliationClaimExpiresAt: string | null;
};

export type EntitlementRecord = {
  id: string;
  userId: string;
  profileId: string;
  resourceId: string;
  resourceType: string;
  isActive: boolean;
  purchaseId: string | null;
  source: "purchase" | "subscription" | "credit" | "grant";
  createdAt: string;
  /** STEP 57D-48F-B foundation column; null/LEGACY until edition-scoped identity ships. */
  analysisEditionKey: string | null;
};
