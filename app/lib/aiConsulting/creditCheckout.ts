import { isGeneralConsultingSource } from "./generalSource";
import { requireConsultingAdult, requireConsultingFoundation } from "./consultingFoundation";
import { assertPaidPurchaseEligibility } from "../accounts/server";
import { getCanonicalPremiumProductId } from "../premiumProductRegistry";
import { getPaidReport } from "../paidReports/server";
import {
  getActiveEntitlementForProfileEdition,
  getTossPaymentRecordForOrder,
  markOrderPaid,
  markTossPaymentReconciliationResult,
  recordTossConfirmationStarted,
  recordTossProviderConfirmation,
} from "../purchases/server";
import type { OrderRecord, PurchaseRecord } from "../purchases/types";
import { createAdminClient } from "../supabase/admin";
import { getPaymentByOrderIdFromToss, TossConfirmationError } from "../toss/server";
import { createHash } from "node:crypto";
import { getTossConfig, getTossConfigForAccount, isTossCheckoutUserAllowed, isTossHybridRoutingEnabled } from "../toss/config";
import {
  getAiConsultingCreditBundle,
  type AiConsultingCreditBundleId,
} from "./commercialPolicy";
import { getAiConsultingCreditBalance } from "./server";
import { isAiCreditLivePilotAllowed } from "./creditPilotAccess";

export const AI_CONSULTING_CREDIT_PAYMENT_PROVIDER = "toss_ai_credit";

export function isAiConsultingCreditCheckoutEnabled(userId?: string): boolean {
  // Public report checkout alone must never silently open a credit sale.
  // Full public question-credit launch requires BOTH checkout and refund approval.
  if (isTossHybridRoutingEnabled() && process.env.TOSS_LIVE_CHECKOUT_ENABLED === "true") {
    const publicCreditsEnabled = process.env.AI_CREDIT_PUBLIC_CHECKOUT_ENABLED === "true"
      && process.env.AI_CREDIT_SELF_REFUNDS_ENABLED === "true";
    if (publicCreditsEnabled) return true;
    // The only exception is a named owner-only pilot with its own refund
    // enablement and exact intersecting allowlists. The browser cannot set it.
    return typeof userId === "string"
      && process.env.AI_CREDIT_LIVE_PILOT_ENABLED === "true"
      && process.env.AI_CREDIT_REFUND_PILOT_ENABLED === "true"
      && isAiCreditLivePilotAllowed(userId);
  }
  if (process.env.NEXT_PUBLIC_AI_CONSULTING_CREDIT_CHECKOUT_ENABLED === "true") return true;

  // Permit the same already-configured, production-hosted Toss TEST review mode
  // used for paid analyses. The customer-facing commercial launch flag remains
  // off, and every checkout route separately enforces the reviewer allowlist.
  if (
    process.env.NODE_ENV !== "production"
    || process.env.TOSS_ENVIRONMENT !== "sandbox"
    || process.env.TOSS_REVIEW_MODE !== "enabled"
    || process.env.TOSS_ALLOW_LIVE === "true"
  ) return false;

  try {
    const config = getTossConfig();
    return config.environment === "sandbox" && !config.isProduction;
  } catch {
    // Invalid/missing TEST key pair or reviewer allowlist must fail closed.
    return false;
  }
}

type OrderRow = {
  id: string;
  user_id: string;
  profile_id: string;
  product_id: string;
  amount: number;
  status: string;
  payment_provider: string | null;
  transaction_id: string | null;
  created_at: string;
  paid_at: string | null;
  analysis_edition_key: string | null;
  analysis_reference_snapshot: unknown;
  analysis_input_snapshot: unknown;
};

type PurchaseRow = {
  id: string;
  user_id: string;
  profile_id: string;
  product_id: string;
  order_id: string;
  purchased_at: string;
  analysis_edition_key: string | null;
  analysis_reference_snapshot: unknown;
  analysis_input_snapshot: unknown;
};

function toOrderRecord(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    productId: row.product_id,
    amount: row.amount,
    status: row.status as OrderRecord["status"],
    paymentProvider: row.payment_provider,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    analysisEditionKey: row.analysis_edition_key,
    analysisReferenceSnapshot: row.analysis_reference_snapshot,
    analysisInputSnapshot: row.analysis_input_snapshot,
  };
}

function toPurchaseRecord(row: PurchaseRow): PurchaseRecord {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    productId: row.product_id,
    orderId: row.order_id,
    purchasedAt: row.purchased_at,
    analysisEditionKey: row.analysis_edition_key,
    analysisReferenceSnapshot: row.analysis_reference_snapshot,
    analysisInputSnapshot: row.analysis_input_snapshot,
  };
}

function requireBundle(bundleId: string) {
  const bundle = getAiConsultingCreditBundle(bundleId);
  if (!bundle) {
    throw new Error("AI_CONSULTING_CREDIT_BUNDLE_INVALID");
  }
  return bundle;
}

async function assertEligibleAnalysisContext(input: {
  userId: string;
  profileId: string;
  productId: string;
  analysisEditionKey: string;
}): Promise<string> {
  if (isGeneralConsultingSource(input.productId, input.analysisEditionKey)) {
    // Profile ownership and current free foundation are checked before order creation.
    return input.productId;
  }
  const productId = getCanonicalPremiumProductId(input.productId);
  const entitlement = await getActiveEntitlementForProfileEdition(
    input.userId,
    input.profileId,
    productId,
    input.analysisEditionKey,
  );

  if (!entitlement) {
    throw new Error("AI_CONSULTING_BASE_ENTITLEMENT_REQUIRED");
  }

  const report = await getPaidReport(
    input.userId,
    input.profileId,
    productId,
    input.analysisEditionKey,
  );

  if (!report || report.status !== "completed" || !report.content) {
    throw new Error("AI_CONSULTING_PAID_REPORT_UNAVAILABLE");
  }

  return productId;
}

export async function createPendingAiConsultingCreditOrder(input: {
  userId: string;
  profileId: string;
  bundleId: AiConsultingCreditBundleId;
  productId: string;
  analysisEditionKey: string;
}): Promise<OrderRecord> {
  if (!isAiConsultingCreditCheckoutEnabled(input.userId)) {
    throw new Error("AI_CONSULTING_CREDIT_CHECKOUT_DISABLED");
  }
  // Defense in depth: no internal caller may mint an order on a public
  // customer account while the site uses TEST keys for approval review.
  const checkoutConfig = getTossConfigForAccount(input.userId);
  if (!isTossCheckoutUserAllowed(input.userId)) {
    throw new Error("TOSS_REVIEW_ACCOUNT_REQUIRED");
  }

  await assertPaidPurchaseEligibility(input.userId);
  await requireConsultingAdult(input.userId);
  await requireConsultingFoundation(input.userId, input.profileId);
  const bundle = requireBundle(input.bundleId);
  await assertEligibleAnalysisContext({
    userId: input.userId,
    profileId: input.profileId,
    productId: input.productId,
    analysisEditionKey: input.analysisEditionKey,
  });

  const { data, error } = await createAdminClient()
    .from("orders")
    .insert({
      user_id: input.userId,
      profile_id: input.profileId,
      product_id: bundle.id,
      amount: bundle.priceKrw,
      status: "pending",
      payment_provider: AI_CONSULTING_CREDIT_PAYMENT_PROVIDER,
      analysis_edition_key: null,
      analysis_reference_snapshot: null,
      analysis_input_snapshot: null,
    })
    .select("*")
    .single<OrderRow>();

  if (error || !data) {
    throw new Error(`AI_CONSULTING_CREDIT_ORDER_CREATE_FAILED: ${error?.message ?? "unknown"}`);
  }

  const order = toOrderRecord(data);
  await recordTossConfirmationStarted(order);
  const { error: routeError } = await createAdminClient().from("toss_payment_records")
    .update({ checkout_route_fingerprint: creditRouteFingerprint(checkoutConfig) }).eq("order_id", order.id);
  if (routeError) throw new Error("AI_CREDIT_CHECKOUT_ROUTE_RECORD_FAILED");
  return order;
}

export type AiConsultingCreditPurchaseFinalization = {
  order: OrderRecord;
  purchase: PurchaseRecord;
  bundleId: AiConsultingCreditBundleId;
  questionsAdded: number;
  questionsRemaining: number;
};

export async function finalizeAiConsultingCreditPurchase(
  order: OrderRecord,
): Promise<AiConsultingCreditPurchaseFinalization> {
  if (order.status !== "paid") {
    throw new Error("AI_CONSULTING_CREDIT_ORDER_NOT_PAID");
  }
  if (order.paymentProvider !== AI_CONSULTING_CREDIT_PAYMENT_PROVIDER) {
    throw new Error("AI_CONSULTING_CREDIT_PAYMENT_PROVIDER_MISMATCH");
  }

  const bundle = requireBundle(order.productId);
  if (order.amount !== bundle.priceKrw) {
    throw new Error("AI_CONSULTING_CREDIT_ORDER_AMOUNT_MISMATCH");
  }

  const supabase = createAdminClient();
  const { error: purchaseError } = await supabase.from("purchases").upsert(
    {
      user_id: order.userId,
      profile_id: order.profileId,
      product_id: bundle.id,
      order_id: order.id,
      purchased_at: order.paidAt ?? new Date().toISOString(),
      analysis_edition_key: null,
      analysis_reference_snapshot: null,
      analysis_input_snapshot: null,
    },
    { onConflict: "order_id", ignoreDuplicates: true },
  );

  if (purchaseError) {
    throw new Error(`AI_CONSULTING_CREDIT_PURCHASE_CREATE_FAILED: ${purchaseError.message}`);
  }

  const { data: purchaseData, error: purchaseReadError } = await supabase
    .from("purchases")
    .select("*")
    .eq("order_id", order.id)
    .single<PurchaseRow>();

  if (purchaseReadError || !purchaseData) {
    throw new Error(`AI_CONSULTING_CREDIT_PURCHASE_READ_FAILED: ${purchaseReadError?.message ?? "unknown"}`);
  }

  const purchase = toPurchaseRecord(purchaseData);
  const { error: ledgerError } = await supabase.rpc("record_ai_consulting_credit_purchase", {
    p_source_purchase_id: purchase.id,
    p_bundle_id: bundle.id,
    p_quantity: bundle.questions,
  });

  if (ledgerError) {
    throw new Error(`AI_CONSULTING_CREDIT_LEDGER_GRANT_FAILED: ${ledgerError.message}`);
  }

  const questionsRemaining = await getAiConsultingCreditBalance({
    userId: order.userId,
    profileId: order.profileId,
  });

  return {
    order,
    purchase,
    bundleId: bundle.id,
    questionsAdded: bundle.questions,
    questionsRemaining,
  };
}

export async function getAiConsultingCreditOrderById(orderId: string): Promise<OrderRecord | null> {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();

  return error || !data ? null : toOrderRecord(data);
}


// This is a hash of the public client key and environment, not a stored secret.
function creditRouteFingerprint(config: ReturnType<typeof getTossConfigForAccount>): string {
  return createHash("sha256").update(config.environment + ":" + config.clientKey).digest("hex");
}

export type CreditCheckoutInspection = {
  status: string; canClose: boolean; needsDashboardConfirmation: boolean; message: string;
};

async function inspectCreditCheckout(order: OrderRecord, dashboardConfirmed = false): Promise<CreditCheckoutInspection> {
  const blocked = (status: string, message: string): CreditCheckoutInspection =>
    ({ status, message, canClose: false, needsDashboardConfirmation: false });
  if (order.paymentProvider !== AI_CONSULTING_CREDIT_PAYMENT_PROVIDER || order.status !== "pending" || order.paidAt || order.transactionId)
    return blocked("INELIGIBLE", "결제 대기 중인 미결제 질문권 주문만 종료할 수 있습니다.");
  const db = createAdminClient();
  const { data: evidence, error } = await db.from("toss_payment_records")
    .select("payment_key,confirmed_at,confirmed_amount,provider_status,checkout_route_fingerprint,credit_approval_started_at,last_confirmation_attempt_at,reconciliation_status,last_reconciliation_result,confirmation_started_at")
    .eq("order_id", order.id).maybeSingle();
  if (error || !evidence) return blocked("UNKNOWN", "내부 결제 증빙을 확인하지 못했습니다.");
  if (evidence.payment_key || evidence.confirmed_at || evidence.confirmed_amount !== null || evidence.credit_approval_started_at || evidence.last_confirmation_attempt_at
    || ["paid","externally_confirmed","expired_unpaid"].includes(evidence.reconciliation_status)
    || (evidence.provider_status && !["READY","IN_PROGRESS","EXPIRED","ABORTED"].includes(evidence.provider_status)))
    return blocked("EVIDENCE_EXISTS", "결제 승인 시도 또는 금전 증빙이 있어 자동 종료할 수 없습니다.");
  if (evidence.reconciliation_status === "terminal_mismatch" && !["internal Toss order was not found","Legacy credit checkout needs original merchant verification"].includes(evidence.last_reconciliation_result ?? ""))
    return blocked("MISMATCH", "실제 불일치 기록은 임의로 종료할 수 없습니다.");
  const config = getTossConfigForAccount(order.userId, "settlement");
  const fingerprint = creditRouteFingerprint(config);
  if (evidence.checkout_route_fingerprint && evidence.checkout_route_fingerprint !== fingerprint)
    return blocked("ROUTE_MISMATCH", "주문 당시와 현재 토스 상점 정보가 달라 종료할 수 없습니다.");
  const oldEnough = Date.now() - new Date(order.createdAt).getTime() >= 60 * 60 * 1000;
  try {
    const provider = await getPaymentByOrderIdFromToss(order.id, config);
    if (provider.orderId !== order.id || provider.totalAmount !== order.amount || provider.currency !== "KRW")
      return blocked("MISMATCH", "토스 주문번호·금액·통화가 일치하지 않습니다.");
    if (provider.approvedAt || (provider.cancels?.length ?? 0) > 0)
      return blocked(provider.status, "승인 또는 취소 이력이 있어 미결제로 종료할 수 없습니다.");
    if (["EXPIRED","ABORTED"].includes(provider.status))
      return { status: provider.status, canClose: oldEnough, needsDashboardConfirmation: false, message: oldEnough ? "토스에서 결제 미완료 종료가 확인되었습니다." : "결제 유효시간 보호를 위해 대기합니다." };
    return blocked(provider.status, "토스 결제 상태: " + provider.status + " · 미결제 종료 대상이 아닙니다.");
  } catch (err) {
    if (!(err instanceof TossConfirmationError) || err.failure.httpStatus !== 404 || err.failure.providerErrorCode !== "NOT_FOUND_PAYMENT") throw err;
    const legacy = !evidence.checkout_route_fingerprint;
    return { status: "NOT_FOUND_PAYMENT", canClose: oldEnough && (!legacy || dashboardConfirmed),
      needsDashboardConfirmation: legacy,
      message: !oldEnough ? "결제창 유효시간 보호를 위해 대기합니다." : legacy ? "이전 주문은 토스 관리자에서 원래 TEST/LIVE 상점의 승인·취소 내역이 없음을 확인해 주세요." : "주문 당시 토스 상점에서 결제 정보가 없고 유효시간이 지났습니다." };
  }
}

export async function verifyCreditCheckoutForOperator(orderId: string, dashboardConfirmed = false): Promise<CreditCheckoutInspection> {
  const order = await getAiConsultingCreditOrderById(orderId);
  if (!order) return { status: "UNKNOWN", canClose: false, needsDashboardConfirmation: false, message: "주문을 확인할 수 없습니다." };
  return inspectCreditCheckout(order, dashboardConfirmed);
}

export async function closeVerifiedCreditCheckout(orderId: string, dashboardConfirmed = false): Promise<CreditCheckoutInspection> {
  const order = await getAiConsultingCreditOrderById(orderId);
  if (!order) throw new Error("AI_CREDIT_ORDER_NOT_FOUND");
  // Never trust a client-supplied provider status; every execution performs a new lookup.
  const inspection = await inspectCreditCheckout(order, dashboardConfirmed);
  if (!inspection.canClose) return inspection;
  const fingerprint = creditRouteFingerprint(getTossConfigForAccount(order.userId, "settlement"));
  const { data, error } = await createAdminClient().rpc("close_verified_unpaid_ai_credit_order", {
    p_order_id: order.id, p_provider_status: inspection.status, p_expected_amount: order.amount,
    p_route_fingerprint: fingerprint, p_legacy_dashboard_confirmed: dashboardConfirmed,
  });
  if (error || data !== true) throw new Error("AI_CREDIT_UNPAID_CLOSE_SAFETY_CHECK_FAILED");
  return { status: "CLOSED", canClose: false, needsDashboardConfirmation: false, message: "미결제 주문을 정상 종료했습니다. 결제 취소·환불·질문권 지급은 실행하지 않았습니다." };
}

async function deferCreditCheckout(orderId: string, previousStatus: string, message: string) {
  const now = new Date();
  const { error } = await createAdminClient().from("toss_payment_records").update({
    reconciliation_status: "confirmation_started", last_reconciliation_result: message,
    last_reconciled_at: now.toISOString(), updated_at: now.toISOString(),
    next_retry_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
  }).eq("order_id", orderId).eq("reconciliation_status", previousStatus)
    .is("payment_key", null).is("credit_approval_started_at", null);
  if (error) throw new Error("AI_CREDIT_CHECKOUT_DEFER_FAILED");
}

export type AiConsultingCreditReconciliationSummary = {
  scanned: number;
  eligible: number;
  converged: number;
  retryPending: number;
  failed: number;
};

export async function reconcileAiConsultingCreditPaymentsBatch(): Promise<AiConsultingCreditReconciliationSummary> {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("*")
    .eq("payment_provider", AI_CONSULTING_CREDIT_PAYMENT_PROVIDER)
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`AI_CONSULTING_CREDIT_RECONCILIATION_SCAN_FAILED: ${error.message}`);
  }

  const orders = ((data ?? []) as OrderRow[]).map(toOrderRecord);
  let eligible = 0;
  let converged = 0;
  let retryPending = 0;
  let failed = 0;

  for (const candidate of orders) {
    const record = await getTossPaymentRecordForOrder(candidate.id);
    const legacyWrongRoute = record?.reconciliationStatus === "terminal_mismatch"
      && record.lastReconciliationResult === "internal Toss order was not found";
    if (
      record?.reconciliationStatus === "paid" ||
      record?.reconciliationStatus === "expired_unpaid" ||
      (record?.reconciliationStatus === "terminal_mismatch" && !legacyWrongRoute) ||
      record?.reconciliationStatus === "reconciliation_failed"
    ) {
      continue;
    }
    if (record?.nextRetryAt && new Date(record.nextRetryAt).getTime() > Date.now()) {
      continue;
    }

    eligible += 1;

    try {
      const order = (await getAiConsultingCreditOrderById(candidate.id)) ?? candidate;

      if (order.status === "paid") {
        await finalizeAiConsultingCreditPurchase(order);
        await markTossPaymentReconciliationResult(
          order.id,
          "paid",
          "AI consulting credit purchase replay converged",
        );
        converged += 1;
        continue;
      }

      // A never-approved checkout is not a technical payment failure.
      if (record && !record.paymentKey && !record.confirmedAt) {
        const check = await inspectCreditCheckout(order);
        if (check.canClose) {
          const closed = await closeVerifiedCreditCheckout(order.id);
          if (closed.status === "CLOSED") { converged += 1; continue; }
          throw new Error("AI_CREDIT_CLOSE_RACE");
        }
        if (["READY", "IN_PROGRESS", "WAITING_FOR_DEPOSIT", "EXPIRED", "ABORTED", "NOT_FOUND_PAYMENT"].includes(check.status)) {
          // Legacy 404 is not enough to prove the original merchant. Retain it for operator review.
          if (check.needsDashboardConfirmation) {
            if (!legacyWrongRoute) await markTossPaymentReconciliationResult(order.id, "terminal_mismatch", "Legacy credit checkout needs original merchant verification");
            failed += 1;
          } else {
            await deferCreditCheckout(order.id, record.reconciliationStatus, check.message);
            retryPending += 1;
          }
          continue;
        }
        if (["MISMATCH", "ROUTE_MISMATCH"].includes(check.status)) {
          await markTossPaymentReconciliationResult(order.id, "terminal_mismatch", check.message);
          failed += 1; continue;
        }
      }
      // Hybrid mode must query the original TEST/LIVE merchant for this exact order.
      const provider = await getPaymentByOrderIdFromToss(order.id, getTossConfigForAccount(order.userId, "settlement"));
      if (
        provider.orderId !== order.id ||
        provider.totalAmount !== order.amount ||
        provider.currency !== "KRW"
      ) {
        await markTossPaymentReconciliationResult(
          order.id,
          "terminal_mismatch",
          "AI consulting credit provider boundary mismatch",
        );
        failed += 1;
        continue;
      }

      if (provider.status !== "DONE") {
        await markTossPaymentReconciliationResult(
          order.id,
          "reconciliation_required",
          `AI consulting credit provider status ${provider.status} is not DONE`,
        );
        retryPending += 1;
        continue;
      }

      await recordTossProviderConfirmation(order, provider, "externally_confirmed");
      const paidOrder = await markOrderPaid(order, provider.paymentKey);
      await finalizeAiConsultingCreditPurchase(paidOrder);
      await markTossPaymentReconciliationResult(
        order.id,
        "paid",
        "AI consulting credit provider payment verified and ledger credited",
      );
      converged += 1;
    } catch {
      // Preserve the exact legacy exception until fresh evidence resolves it.
      if (legacyWrongRoute) { failed += 1; continue; }
      await markTossPaymentReconciliationResult(
        candidate.id,
        "reconciliation_required",
        "AI consulting credit reconciliation must be retried",
      ).catch(() => undefined);
      retryPending += 1;
    }
  }

  return {
    scanned: orders.length,
    eligible,
    converged,
    retryPending,
    failed,
  };
}
