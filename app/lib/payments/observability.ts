import { createHash } from "node:crypto";

export type PaymentEventName =
  | "checkout_started"
  | "order_created"
  | "payment_attempted"
  | "payment_confirmed"
  | "payment_confirmation_failed"
  | "amount_mismatch"
  | "order_reference_mismatch"
  | "reconciliation_scheduled"
  | "reconciliation_retry"
  | "reconciliation_converged"
  | "reconciliation_exhausted"
  | "entitlement_created"
  | "report_access_granted"
  | "payment_cancellation_requested"
  | "payment_cancellation_started"
  | "payment_cancellation_confirmed"
  | "payment_cancellation_failed"
  | "refund_retry_scheduled"
  | "refund_converged"
  | "entitlement_revocation_started"
  | "entitlement_revoked"
  | "refund_owner_escalation_required"
  | "refund_reconciliation_started"
  | "refund_reconciliation_retry"
  | "refund_reconciliation_converged"
  | "refund_reconciliation_mismatch"
  | "refund_retry_budget_exhausted";

export type PaymentOperationalClass =
  | "NORMAL"
  | "RECOVERING"
  | "RETRY_PENDING"
  | "CONVERGED"
  | "OWNER_ESCALATION_REQUIRED";

export type PaymentRetryability =
  | "RETRYABLE"
  | "NON_RETRYABLE"
  | "OWNER_ESCALATION_REQUIRED";

export type PaymentEvent = {
  event: PaymentEventName;
  operationalClass: PaymentOperationalClass;
  occurredAt: string;
  runId?: string;
  orderId?: string;
  profileId?: string;
  profileReference?: string;
  productId?: string;
  providerReference?: string;
  attempt?: number;
  nextRetryAt?: string;
  failureCategory?: string;
  provider?: "toss";
  httpStatus?: number;
  providerErrorCode?: string;
  retryability?: PaymentRetryability;
  failureStage?: "confirmation" | "cancellation";
};

function redact(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function emitPaymentEvent(
  event: PaymentEventName,
  details: Omit<PaymentEvent, "event" | "occurredAt" | "operationalClass"> & {
    operationalClass?: PaymentOperationalClass;
  } = {},
): void {
  const payload: PaymentEvent = {
    event,
    operationalClass: details.operationalClass ?? "NORMAL",
    occurredAt: new Date().toISOString(),
    ...details,
    providerReference: redact(details.providerReference),
    profileReference: redact(details.profileReference),
  };

  console.info("[payment-event]", payload);
}