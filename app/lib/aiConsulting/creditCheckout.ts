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
import { getPaymentByOrderIdFromToss } from "../toss/server";
import {
  getAiConsultingCreditBundle,
  type AiConsultingCreditBundleId,
} from "./commercialPolicy";
import { getAiConsultingCreditBalance } from "./server";

export const AI_CONSULTING_CREDIT_PAYMENT_PROVIDER = "toss_ai_credit";

export function isAiConsultingCreditCheckoutEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_CONSULTING_CREDIT_CHECKOUT_ENABLED === "true";
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
  if (!isAiConsultingCreditCheckoutEnabled()) {
    throw new Error("AI_CONSULTING_CREDIT_CHECKOUT_DISABLED");
  }

  await assertPaidPurchaseEligibility(input.userId);
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

async function getAiConsultingCreditOrderById(orderId: string): Promise<OrderRecord | null> {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();

  return error || !data ? null : toOrderRecord(data);
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
    if (
      record?.reconciliationStatus === "paid" ||
      record?.reconciliationStatus === "terminal_mismatch" ||
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

      const provider = await getPaymentByOrderIdFromToss(order.id);
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
