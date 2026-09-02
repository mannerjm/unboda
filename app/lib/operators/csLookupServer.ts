import "server-only";

import { formatAnalysisEditionLabel } from "@/app/lib/analysisEditionLabel";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { recordOperatorAuditEvent, requireOperator } from "./server";

const MAX_EMAIL_LENGTH = 254;
const EXACT_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EXACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuditReason = { reason?: string };

export class CsLookupError extends Error {
  constructor(readonly code: "INVALID_INPUT" | "NOT_FOUND" | "INTEGRITY_ERROR" | "AUDIT_FAILED" | "LOOKUP_FAILED") {
    super(code);
    this.name = "CsLookupError";
  }
}

type AuthLookupRow = {
  auth_user_id: string;
  email: string;
  email_confirmed_at: string | null;
};

type ProfileRow = { id: string; label: string; relationship_type: "self" | "spouse" | "child" | "parent" | "sibling" | "other" };

const relationshipLabels: Record<ProfileRow["relationship_type"], string> = {
  self: "본인",
  spouse: "배우자",
  child: "자녀",
  parent: "부모",
  sibling: "형제자매",
  other: "기타",
};

export type CsCustomerLookupDto = {
  account: {
    authUserId: string;
    email: string;
    emailVerified: boolean;
    lifecycleStatus: "ACTIVE" | "DELETION_REQUESTED" | "CLOSED" | null;
    paidEligibilityStatus: "UNVERIFIED" | "VERIFIED_ADULT" | "REVOKED" | null;
    closure: { finalizationStartedAt: string | null; finalizedAt: string | null; retryCount: number; nextRetryAt: string | null; ownerReviewRequired: boolean } | null;
  };
  profiles: Array<{ id: string; label: string; relationshipLabel: string }>;
};

export type CsOrderLookupDto = {
  order: { id: string; accountId: string; accountEmail: string; profile: { id: string; label: string } | null; productId: string; productLabel: string; analysisEditionKey: string | null; analysisEditionLabel: string; amount: number; status: string; createdAt: string; paidAt: string | null };
  payment: { providerStatus: string | null; reconciliationStatus: string | null; confirmedAt: string | null; retryCount: number | null; nextRetryAt: string | null; failureCode: string | null } | null;
  purchase: { id: string; purchasedAt: string; analysisEditionKey: string | null } | null;
  entitlement: { active: boolean; grantedAt: string; revokedAt: string | null; revocationReason: string | null; analysisEditionKey: string | null } | null;
  report: { status: "none" | "generating" | "completed" | "failed"; createdAt: string | null; updatedAt: string | null; completedAt: string | null; errorCode: string | null; analysisEditionKey: string | null };
  refund: { status: string; requestedAmount: number; providerStatus: string | null; requestedAt: string; completedAt: string | null; retryCount: number; nextRetryAt: string; ownerReviewRequired: boolean; failureCode: string | null } | null;
  accountClosure: { lifecycleStatus: string | null; finalizationStartedAt: string | null; finalizedAt: string | null; retryCount: number; nextRetryAt: string | null; ownerReviewRequired: boolean } | null;
};

function normalizeExactEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized.length <= MAX_EMAIL_LENGTH && EXACT_EMAIL_PATTERN.test(normalized) ? normalized : null;
}

function normalizeExactOrderId(value: unknown): string | null {
  return typeof value === "string" && value.length === 36 && EXACT_UUID_PATTERN.test(value) ? value : null;
}

async function auditOrFail(input: Parameters<typeof recordOperatorAuditEvent>[0]): Promise<void> {
  try {
    await recordOperatorAuditEvent(input);
  } catch {
    throw new CsLookupError("AUDIT_FAILED");
  }
}

export async function lookupCustomerByExactEmail(input: { email: unknown } & AuditReason): Promise<CsCustomerLookupDto> {
  await requireOperator();
  const email = normalizeExactEmail(input.email);
  const auditReference = typeof input.email === "string" ? input.email.trim().toLowerCase() : "invalid-email-input";
  if (!email) {
    await auditOrFail({ action: "CUSTOMER_LOOKUP", targetType: "ACCOUNT", targetReference: auditReference, outcome: "INVALID_INPUT", reason: input.reason });
    throw new CsLookupError("INVALID_INPUT");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("lookup_auth_user_by_exact_email", { lookup_email: email });
  if (error) {
    await auditOrFail({ action: "CUSTOMER_LOOKUP", targetType: "ACCOUNT", targetReference: email, outcome: "ERROR", reason: input.reason });
    throw new CsLookupError("LOOKUP_FAILED");
  }
  const matches = (data ?? []) as AuthLookupRow[];
  if (matches.length === 0) {
    await auditOrFail({ action: "CUSTOMER_LOOKUP", targetType: "ACCOUNT", targetReference: email, outcome: "NOT_FOUND", reason: input.reason });
    throw new CsLookupError("NOT_FOUND");
  }
  if (matches.length !== 1) {
    await auditOrFail({ action: "CUSTOMER_LOOKUP", targetType: "ACCOUNT", targetReference: email, outcome: "ERROR", reason: input.reason });
    throw new CsLookupError("INTEGRITY_ERROR");
  }

  const customer = matches[0];
  const [{ data: lifecycle, error: lifecycleError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from("account_lifecycles").select("status,paid_eligibility_status,finalization_started_at,finalized_at,closure_retry_count,closure_next_retry_at,closure_owner_review_required").eq("user_id", customer.auth_user_id).order("generation", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("id,label,relationship_type").eq("user_id", customer.auth_user_id).order("created_at", { ascending: true }),
  ]);
  if (lifecycleError || profilesError) {
    await auditOrFail({ action: "CUSTOMER_LOOKUP", targetType: "ACCOUNT", targetReference: email, outcome: "ERROR", reason: input.reason });
    throw new CsLookupError("LOOKUP_FAILED");
  }

  await auditOrFail({ action: "CUSTOMER_LOOKUP", targetType: "ACCOUNT", targetReference: email, outcome: "SUCCESS", reason: input.reason });
  const account = lifecycle as { status: CsCustomerLookupDto["account"]["lifecycleStatus"]; paid_eligibility_status: CsCustomerLookupDto["account"]["paidEligibilityStatus"]; finalization_started_at: string | null; finalized_at: string | null; closure_retry_count: number; closure_next_retry_at: string | null; closure_owner_review_required: boolean } | null;
  return {
    account: {
      authUserId: customer.auth_user_id,
      email: customer.email,
      emailVerified: Boolean(customer.email_confirmed_at),
      lifecycleStatus: account?.status ?? null,
      paidEligibilityStatus: account?.paid_eligibility_status ?? null,
      closure: account ? { finalizationStartedAt: account.finalization_started_at, finalizedAt: account.finalized_at, retryCount: account.closure_retry_count, nextRetryAt: account.closure_next_retry_at, ownerReviewRequired: account.closure_owner_review_required } : null,
    },
    profiles: ((profiles ?? []) as ProfileRow[]).map((profile) => ({ id: profile.id, label: profile.label, relationshipLabel: relationshipLabels[profile.relationship_type] })),
  };
}

export async function lookupOrderByExactId(input: { orderId: unknown } & AuditReason): Promise<CsOrderLookupDto> {
  await requireOperator();
  const orderId = normalizeExactOrderId(input.orderId);
  const auditReference = typeof input.orderId === "string" ? input.orderId : "invalid-order-input";
  if (!orderId) {
    await auditOrFail({ action: "ORDER_LOOKUP", targetType: "ORDER", targetReference: auditReference, outcome: "INVALID_INPUT", reason: input.reason });
    throw new CsLookupError("INVALID_INPUT");
  }

  const supabase = createAdminClient();
  const { data: order, error: orderError } = await supabase.from("orders").select("id,user_id,profile_id,product_id,amount,status,created_at,paid_at,analysis_edition_key").eq("id", orderId).maybeSingle();
  if (orderError) {
    await auditOrFail({ action: "ORDER_LOOKUP", targetType: "ORDER", targetReference: orderId, outcome: "ERROR", reason: input.reason });
    throw new CsLookupError("LOOKUP_FAILED");
  }
  if (!order) {
    await auditOrFail({ action: "ORDER_LOOKUP", targetType: "ORDER", targetReference: orderId, outcome: "NOT_FOUND", reason: input.reason });
    throw new CsLookupError("NOT_FOUND");
  }

  const [authResult, profileResult, paymentResult, purchaseResult, entitlementResult, reportResult, refundResult, lifecycleResult] = await Promise.all([
    supabase.auth.admin.getUserById(order.user_id),
    supabase.from("profiles").select("id,label").eq("id", order.profile_id).maybeSingle(),
    supabase.from("toss_payment_records").select("provider_status,reconciliation_status,confirmed_at,retry_count,next_retry_at,last_provider_error_code").eq("order_id", order.id).maybeSingle(),
    supabase.from("purchases").select("id,purchased_at,analysis_edition_key").eq("order_id", order.id).maybeSingle(),
    supabase.from("entitlements").select("is_active,created_at,revoked_at,revocation_reason,analysis_edition_key").eq("user_id", order.user_id).eq("profile_id", order.profile_id).eq("resource_id", order.product_id).eq("analysis_edition_key", order.analysis_edition_key).maybeSingle(),
    supabase.from("paid_reports").select("status,created_at,updated_at,completed_at,error_code,analysis_edition_key").eq("user_id", order.user_id).eq("profile_id", order.profile_id).eq("product_id", order.product_id).eq("analysis_edition_key", order.analysis_edition_key).maybeSingle(),
    supabase.from("refund_workflows").select("status,requested_amount,provider_status,requested_at,completed_at,retry_count,next_retry_at,last_provider_error_code").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("account_lifecycles").select("status,finalization_started_at,finalized_at,closure_retry_count,closure_next_retry_at,closure_owner_review_required").eq("user_id", order.user_id).order("generation", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (
    authResult.error ||
    !authResult.data.user ||
    profileResult.error ||
    paymentResult.error ||
    purchaseResult.error ||
    entitlementResult.error ||
    reportResult.error ||
    refundResult.error ||
    lifecycleResult.error
  ) {
    await auditOrFail({ action: "ORDER_LOOKUP", targetType: "ORDER", targetReference: orderId, outcome: "ERROR", reason: input.reason });
    throw new CsLookupError(authResult.error || !authResult.data.user ? "INTEGRITY_ERROR" : "LOOKUP_FAILED");
  }

  await auditOrFail({ action: "ORDER_LOOKUP", targetType: "ORDER", targetReference: orderId, outcome: "SUCCESS", reason: input.reason });
  const product = getPremiumProduct(order.product_id);
  const authUser = authResult.data.user;
  const profile = profileResult.data;
  const payment = paymentResult.data;
  const purchase = purchaseResult.data;
  const entitlement = entitlementResult.data;
  const report = reportResult.data;
  const refund = refundResult.data;
  const lifecycle = lifecycleResult.data;
  return {
    order: { id: order.id, accountId: order.user_id, accountEmail: authUser.email ?? "", profile: profile ? { id: profile.id, label: profile.label } : null, productId: order.product_id, productLabel: product?.title ?? order.product_id, analysisEditionKey: order.analysis_edition_key, analysisEditionLabel: formatAnalysisEditionLabel(order.analysis_edition_key ?? "LEGACY"), amount: order.amount, status: order.status, createdAt: order.created_at, paidAt: order.paid_at },
    payment: payment ? { providerStatus: payment.provider_status, reconciliationStatus: payment.reconciliation_status, confirmedAt: payment.confirmed_at, retryCount: payment.retry_count, nextRetryAt: payment.next_retry_at, failureCode: payment.last_provider_error_code } : null,
    purchase: purchase ? { id: purchase.id, purchasedAt: purchase.purchased_at, analysisEditionKey: purchase.analysis_edition_key } : null,
    entitlement: entitlement ? { active: entitlement.is_active, grantedAt: entitlement.created_at, revokedAt: entitlement.revoked_at, revocationReason: entitlement.revocation_reason, analysisEditionKey: entitlement.analysis_edition_key } : null,
    report: report ? { status: report.status, createdAt: report.created_at, updatedAt: report.updated_at, completedAt: report.completed_at, errorCode: report.error_code, analysisEditionKey: report.analysis_edition_key } : { status: "none", createdAt: null, updatedAt: null, completedAt: null, errorCode: null, analysisEditionKey: order.analysis_edition_key },
    refund: refund ? { status: refund.status, requestedAmount: refund.requested_amount, providerStatus: refund.provider_status, requestedAt: refund.requested_at, completedAt: refund.completed_at, retryCount: refund.retry_count, nextRetryAt: refund.next_retry_at, ownerReviewRequired: refund.status === "OWNER_REVIEW_REQUIRED", failureCode: refund.last_provider_error_code } : null,
    accountClosure: lifecycle ? { lifecycleStatus: lifecycle.status, finalizationStartedAt: lifecycle.finalization_started_at, finalizedAt: lifecycle.finalized_at, retryCount: lifecycle.closure_retry_count, nextRetryAt: lifecycle.closure_next_retry_at, ownerReviewRequired: lifecycle.closure_owner_review_required } : null,
  };
}