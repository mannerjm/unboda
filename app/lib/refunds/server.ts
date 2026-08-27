import { randomUUID } from "node:crypto";
import { getPaidReport } from "../paidReports/server";
import { emitPaymentEvent } from "../payments/observability";
import {
  getTossPaymentRecordForOrder,
  revokeEntitlementForRefund,
} from "../purchases/server";
import type { OrderRecord, RefundStatus, RefundWorkflowRecord } from "../purchases/types";
import { createAdminClient } from "../supabase/admin";
import {
  cancelPaymentWithToss,
  getPaymentByOrderIdFromToss,
  TossCancellationError,
  type TossCancellationResponse,
} from "../toss/server";
import {
  assessFullRefundEligibility,
  type RefundReasonCategory,
} from "./policy";

type RefundRow = {
  id: string;
  order_id: string;
  payment_record_id: string;
  user_id: string;
  profile_id: string;
  product_id: string;
  requested_amount: number;
  currency: string;
  reason_category: RefundReasonCategory;
  reason_text: string | null;
  status: RefundStatus;
  provider_status: string | null;
  provider_cancellation_reference: string | null;
  requested_at: string;
  processing_started_at: string | null;
  provider_confirmed_at: string | null;
  completed_at: string | null;
  entitlement_revoked_at: string | null;
  retry_count: number;
  max_retry_count: number;
  next_retry_at: string;
  last_attempt_at: string | null;
  last_provider_http_status: number | null;
  last_provider_error_code: string | null;
  last_provider_error_message: string | null;
  last_retryability: RefundWorkflowRecord["lastRetryability"];
  correlation_id: string;
  reconciliation_claim_token: string | null;
  reconciliation_claimed_at: string | null;
  reconciliation_claim_expires_at: string | null;
};

function toRefundRecord(row: RefundRow): RefundWorkflowRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    paymentRecordId: row.payment_record_id,
    userId: row.user_id,
    profileId: row.profile_id,
    productId: row.product_id,
    requestedAmount: row.requested_amount,
    currency: row.currency,
    reasonCategory: row.reason_category,
    reasonText: row.reason_text,
    status: row.status,
    providerStatus: row.provider_status,
    providerCancellationReference: row.provider_cancellation_reference,
    requestedAt: row.requested_at,
    processingStartedAt: row.processing_started_at,
    providerConfirmedAt: row.provider_confirmed_at,
    completedAt: row.completed_at,
    entitlementRevokedAt: row.entitlement_revoked_at,
    retryCount: row.retry_count,
    maxRetryCount: row.max_retry_count,
    nextRetryAt: row.next_retry_at,
    lastAttemptAt: row.last_attempt_at,
    lastProviderHttpStatus: row.last_provider_http_status,
    lastProviderErrorCode: row.last_provider_error_code,
    lastProviderErrorMessage: row.last_provider_error_message,
    lastRetryability: row.last_retryability,
    correlationId: row.correlation_id,
    reconciliationClaimToken: row.reconciliation_claim_token,
    reconciliationClaimedAt: row.reconciliation_claimed_at,
    reconciliationClaimExpiresAt: row.reconciliation_claim_expires_at,
  };
}

export async function getRefundWorkflowForOrder(orderId: string): Promise<RefundWorkflowRecord | null> {
  const { data, error } = await createAdminClient().from("refund_workflows").select("id,order_id,payment_record_id,user_id,profile_id,product_id,requested_amount,currency,reason_category,reason_text,status,provider_status,provider_cancellation_reference,requested_at,processing_started_at,provider_confirmed_at,completed_at,entitlement_revoked_at,retry_count,max_retry_count,next_retry_at,last_attempt_at,last_provider_http_status,last_provider_error_code,last_provider_error_message,last_retryability,correlation_id,reconciliation_claim_token,reconciliation_claimed_at,reconciliation_claim_expires_at").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1).maybeSingle<RefundRow>();
  if (error || !data) return null;
  return toRefundRecord(data);
}

async function updateRefund(orderId: string, values: Record<string, unknown>, claimToken?: string): Promise<RefundWorkflowRecord> {
  let query = createAdminClient().from("refund_workflows").update(values).eq("order_id", orderId);
  if (claimToken) query = query.eq("reconciliation_claim_token", claimToken);
  const { data, error } = await query.select("*").single<RefundRow>();
  if (error || !data) throw new Error(`환불 상태를 저장하지 못했습니다: ${error?.message ?? "unknown"}`);
  return toRefundRecord(data);
}

async function completeRefund(order: OrderRecord, workflow: RefundWorkflowRecord, claimToken?: string, options: { beforeEntitlementRevocation?: () => Promise<void> } = {}): Promise<RefundWorkflowRecord> {
  if (claimToken) {
    const current = await createAdminClient().from("refund_workflows").select("id").eq("order_id", order.id).eq("reconciliation_claim_token", claimToken).maybeSingle<{ id: string }>();
    if (!current.data) throw new Error("환불 재조정 claim 소유권이 만료되었습니다.");
  }
  emitPaymentEvent("entitlement_revocation_started", { operationalClass: "RECOVERING", orderId: order.id, productId: order.productId, profileReference: order.profileId, runId: workflow.correlationId });
  await options.beforeEntitlementRevocation?.();
  const fencedRevoked = claimToken
    ? await revokeEntitlementForRefund({ userId: order.userId, profileId: order.profileId, productId: order.productId, orderId: order.id, claimToken })
    : await revokeEntitlementForRefund({ userId: order.userId, profileId: order.profileId, productId: order.productId });
  const remaining = await createAdminClient().from("entitlements").select("id").eq("user_id", order.userId).eq("profile_id", order.profileId).eq("resource_id", order.productId).eq("is_active", true).maybeSingle<{ id: string }>();
  if (remaining.data) throw new Error("환불 확정 후 이용 권한을 회수하지 못했습니다.");
  if (fencedRevoked) emitPaymentEvent("entitlement_revoked", { operationalClass: "CONVERGED", orderId: order.id, productId: order.productId, profileReference: order.profileId, runId: workflow.correlationId });
  return updateRefund(order.id, { status: "REFUND_COMPLETED", completed_at: new Date().toISOString(), entitlement_revoked_at: fencedRevoked ? new Date().toISOString() : null, updated_at: new Date().toISOString() }, claimToken);
}

export async function requestFullRefund(input: {
  order: OrderRecord;
  reasonCategory: RefundReasonCategory;
  reasonText: string | null;
}): Promise<RefundWorkflowRecord> {
  const existing = await getRefundWorkflowForOrder(input.order.id);
  if (existing) return existing;
  if (input.order.status !== "paid") throw new Error("결제가 완료된 주문만 환불할 수 있습니다.");
  const payment = await getTossPaymentRecordForOrder(input.order.id);
  if (!payment?.paymentKey || payment.providerStatus !== "DONE" || payment.confirmedAmount !== input.order.amount || payment.currency !== "KRW" || payment.providerOrderId !== input.order.id) {
    throw new Error("환불 가능한 Toss 결제 상태를 확인하지 못했습니다.");
  }
  const eligibility = await assessFullRefundEligibility({ userId: input.order.userId, profileId: input.order.profileId, productId: input.order.productId, reasonCategory: input.reasonCategory });
  if (!eligibility.eligible) {
    throw new Error("현재 환불 정책상 담당자 확인이 필요합니다.");
  }
  const correlationId = randomUUID();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("refund_workflows").insert({
    order_id: input.order.id,
    payment_record_id: payment.id,
    user_id: input.order.userId,
    profile_id: input.order.profileId,
    product_id: input.order.productId,
    requested_amount: payment.confirmedAmount,
    currency: "KRW",
    reason_category: input.reasonCategory,
    reason_text: input.reasonText,
    status: "REFUND_PROCESSING",
    processing_started_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString(),
    correlation_id: correlationId,
  }).select("*").single<RefundRow>();
  if (error || !data) throw new Error(`환불 요청을 저장하지 못했습니다: ${error?.message ?? "unknown"}`);
  const workflow = toRefundRecord(data);
  emitPaymentEvent("payment_cancellation_requested", { operationalClass: "RECOVERING", orderId: input.order.id, productId: input.order.productId, profileReference: input.order.profileId, runId: correlationId });
  emitPaymentEvent("payment_cancellation_started", { operationalClass: "RECOVERING", orderId: input.order.id, productId: input.order.productId, profileReference: input.order.profileId, runId: correlationId });
  try {
    const provider = await cancelPaymentWithToss({ paymentKey: payment.paymentKey, cancelReason: input.reasonText || input.reasonCategory });
    if (provider.orderId !== input.order.id || provider.totalAmount !== input.order.amount || provider.currency !== "KRW" || provider.cancels.at(-1)?.cancelAmount !== input.order.amount) throw new TossCancellationError({ provider: "toss", httpStatus: 502, providerErrorCode: "CANCELLATION_MISMATCH", safeMessage: "결제 취소 결과를 확인하지 못했습니다.", failureStage: "cancellation", retryability: "OWNER_ESCALATION_REQUIRED", correlationId, occurredAt: new Date().toISOString() });
    await updateRefund(input.order.id, { provider_status: provider.status, provider_cancellation_reference: provider.cancels.at(-1)?.transactionKey ?? null, provider_confirmed_at: new Date().toISOString(), last_provider_http_status: 200, updated_at: new Date().toISOString() });
    emitPaymentEvent("payment_cancellation_confirmed", { operationalClass: "CONVERGED", orderId: input.order.id, productId: input.order.productId, profileReference: input.order.profileId, runId: correlationId });
    return completeRefund(input.order, workflow);
  } catch (error) {
    if (error instanceof TossCancellationError) {
      const status: RefundStatus = error.failure.retryability === "RETRYABLE" ? "REFUND_FAILED_RETRYING" : "OWNER_REVIEW_REQUIRED";
      await updateRefund(input.order.id, { status, last_provider_http_status: error.failure.httpStatus, last_provider_error_code: error.failure.providerErrorCode, last_provider_error_message: error.failure.safeMessage, last_retryability: error.failure.retryability, last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      emitPaymentEvent(status === "REFUND_FAILED_RETRYING" ? "refund_retry_scheduled" : "refund_owner_escalation_required", { operationalClass: status === "REFUND_FAILED_RETRYING" ? "RETRY_PENDING" : "OWNER_ESCALATION_REQUIRED", orderId: input.order.id, productId: input.order.productId, profileReference: input.order.profileId, runId: correlationId, retryability: error.failure.retryability });
    }
    throw error;
  }
}

export function isTossCancellationResponse(value: unknown): value is TossCancellationResponse {
  return Boolean(value && typeof value === "object");
}

export async function listRefundWorkflowsForReconciliation(): Promise<RefundWorkflowRecord[]> {
  const { data, error } = await createAdminClient().rpc("claim_refund_workflows", {
    requested_limit: 50,
    claim_token: randomUUID(),
    lease_seconds: 300,
  });
  if (error || !data) throw new Error(`환불 재조정 대상을 조회하지 못했습니다: ${error?.message ?? "unknown"}`);
  return (data as RefundRow[]).map(toRefundRecord);
}

export async function reconcileRefundWorkflow(
  workflow: RefundWorkflowRecord,
  options: { afterProviderCancellationVerified?: () => Promise<void>; beforeEntitlementRevocation?: () => Promise<void> } = {},
): Promise<RefundWorkflowRecord> {
  if (workflow.status === "REFUND_COMPLETED" || workflow.status === "OWNER_REVIEW_REQUIRED") return workflow;
  if (!workflow.reconciliationClaimToken) throw new Error("환불 재조정 claim 소유권을 확인하지 못했습니다.");
  const { data: order, error: orderError } = await createAdminClient().from("orders").select("id,user_id,profile_id,product_id,amount,status,payment_provider,transaction_id,created_at,paid_at").eq("id", workflow.orderId).maybeSingle<{ id: string; user_id: string; profile_id: string; product_id: string; amount: number; status: "paid" | "pending"; payment_provider: string | null; transaction_id: string | null; created_at: string; paid_at: string | null }>();
  if (orderError || !order || order.status !== "paid") return updateRefund(workflow.orderId, { status: "OWNER_REVIEW_REQUIRED", updated_at: new Date().toISOString() }, workflow.reconciliationClaimToken);
  emitPaymentEvent("refund_reconciliation_started", { operationalClass: "RECOVERING", orderId: workflow.orderId, productId: workflow.productId, profileReference: workflow.profileId, runId: workflow.correlationId, attempt: workflow.retryCount });
  try {
    const provider = await getPaymentByOrderIdFromToss(workflow.orderId);
    const cancellation = provider.cancels?.at(-1);
    if (provider.status === "CANCELED" && provider.orderId === workflow.orderId && provider.currency === workflow.currency && cancellation?.cancelStatus === "DONE" && cancellation.cancelAmount === workflow.requestedAmount) {
      await updateRefund(workflow.orderId, { provider_status: "CANCELED", provider_cancellation_reference: cancellation.transactionKey, provider_confirmed_at: workflow.providerConfirmedAt ?? new Date().toISOString(), last_provider_http_status: 200, updated_at: new Date().toISOString() }, workflow.reconciliationClaimToken);
      await options.afterProviderCancellationVerified?.();
      const completed = await completeRefund({ id: order.id, userId: order.user_id, profileId: order.profile_id, productId: order.product_id, amount: order.amount, status: order.status, paymentProvider: order.payment_provider, transactionId: order.transaction_id, createdAt: order.created_at, paidAt: order.paid_at }, workflow, workflow.reconciliationClaimToken, { beforeEntitlementRevocation: options.beforeEntitlementRevocation });
      emitPaymentEvent("refund_reconciliation_converged", { operationalClass: "CONVERGED", orderId: workflow.orderId, productId: workflow.productId, profileReference: workflow.profileId, runId: workflow.correlationId });
      return completed;
    }
    return updateRefund(workflow.orderId, { status: "OWNER_REVIEW_REQUIRED", last_provider_http_status: 200, last_provider_error_code: "PROVIDER_STATE_MISMATCH", last_provider_error_message: "provider state does not prove full cancellation", last_retryability: "OWNER_ESCALATION_REQUIRED", updated_at: new Date().toISOString() }, workflow.reconciliationClaimToken);
  } catch (error) {
    const nextRetryCount = workflow.retryCount + 1;
    const exhausted = nextRetryCount >= workflow.maxRetryCount;
    const status: RefundStatus = exhausted ? "OWNER_REVIEW_REQUIRED" : "REFUND_FAILED_RETRYING";
    const nextRetryAt = new Date(Date.now() + Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** Math.min(nextRetryCount, 6))).toISOString();
    const result = await updateRefund(workflow.orderId, { status, retry_count: nextRetryCount, next_retry_at: nextRetryAt, last_attempt_at: new Date().toISOString(), last_retryability: "RETRYABLE", last_provider_error_code: "LOOKUP_FAILED", last_provider_error_message: error instanceof Error ? error.message.slice(0, 240) : "provider lookup failed", updated_at: new Date().toISOString() }, workflow.reconciliationClaimToken);
    emitPaymentEvent(exhausted ? "refund_retry_budget_exhausted" : "refund_reconciliation_retry", { operationalClass: exhausted ? "OWNER_ESCALATION_REQUIRED" : "RETRY_PENDING", orderId: workflow.orderId, productId: workflow.productId, profileReference: workflow.profileId, runId: workflow.correlationId, attempt: nextRetryCount, nextRetryAt });
    return result;
  }
}

export async function recordRefundProviderEvidenceForClaim(input: {
  orderId: string;
  claimToken: string;
  providerCancellationReference: string;
}): Promise<RefundWorkflowRecord | null> {
  try {
    return await updateRefund(input.orderId, {
      provider_status: "CANCELED",
      provider_cancellation_reference: input.providerCancellationReference,
      provider_confirmed_at: new Date().toISOString(),
      last_provider_http_status: 200,
      updated_at: new Date().toISOString(),
    }, input.claimToken);
  } catch {
    return null;
  }
}

export async function updateRefundRetryForClaim(input: {
  orderId: string;
  claimToken: string;
  retryCount: number;
  nextRetryAt: string;
}): Promise<RefundWorkflowRecord | null> {
  try {
    return await updateRefund(input.orderId, {
      status: "REFUND_FAILED_RETRYING",
      retry_count: input.retryCount,
      next_retry_at: input.nextRetryAt,
      last_attempt_at: new Date().toISOString(),
      last_retryability: "RETRYABLE",
      updated_at: new Date().toISOString(),
    }, input.claimToken);
  } catch {
    return null;
  }
}

export async function escalateRefundForClaim(input: {
  orderId: string;
  claimToken: string;
}): Promise<RefundWorkflowRecord | null> {
  try {
    return await updateRefund(input.orderId, {
      status: "OWNER_REVIEW_REQUIRED",
      last_retryability: "OWNER_ESCALATION_REQUIRED",
      updated_at: new Date().toISOString(),
    }, input.claimToken);
  } catch {
    return null;
  }
}

export async function finalizeRefundForClaim(input: {
  orderId: string;
  claimToken: string;
}): Promise<RefundWorkflowRecord | null> {
  try {
    return await updateRefund(input.orderId, {
      status: "REFUND_COMPLETED",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, input.claimToken);
  } catch {
    return null;
  }
}