import type { PaymentStatus } from "../payment";
import { createAdminClient } from "../supabase/admin";
import { resolvePurchasableProduct } from "./products";
import {
  PAID_ANALYSIS_RESOURCE_TYPE,
  type EntitlementRecord,
  type OrderRecord,
  type PurchaseRecord,
  type TossPaymentRecord,
} from "./types";
import {
  getPaymentByOrderIdFromToss,
  type TossConfirmationFailure,
  type TossConfirmResponse,
} from "../toss/server";

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
};

type PurchaseRow = {
  id: string;
  user_id: string;
  profile_id: string;
  product_id: string;
  order_id: string;
  purchased_at: string;
};

type EntitlementRow = {
  id: string;
  user_id: string;
  profile_id: string;
  resource_id: string;
  resource_type: string;
  is_active: boolean;
  purchase_id: string | null;
  source: "purchase" | "subscription" | "credit" | "grant";
  created_at: string;
};

type TossPaymentRow = {
  id: string;
  order_id: string;
  payment_key: string | null;
  provider_order_id: string | null;
  expected_amount: number;
  confirmed_amount: number | null;
  currency: string | null;
  provider_status: string | null;
  confirmation_started_at: string | null;
  confirmed_at: string | null;
  reconciliation_status: TossPaymentRecord["reconciliationStatus"];
  last_reconciliation_result: string | null;
  last_reconciled_at: string | null;
  retry_count: number;
  max_retry_count: number;
  next_retry_at: string;
  last_attempt_at: string | null;
  last_confirmation_http_status: number | null;
  last_provider_error_code: string | null;
  last_provider_error_message: string | null;
  last_confirmation_attempt_at: string | null;
  last_confirmation_retryability: TossPaymentRecord["lastConfirmationRetryability"];
  last_confirmation_correlation_id: string | null;
};

function toOrderRecord(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    productId: row.product_id,
    amount: row.amount,
    status: row.status as PaymentStatus,
    paymentProvider: row.payment_provider,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    paidAt: row.paid_at,
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
  };
}

function toEntitlementRecord(row: EntitlementRow): EntitlementRecord {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    resourceId: row.resource_id,
    resourceType: row.resource_type,
    isActive: row.is_active,
    purchaseId: row.purchase_id,
    source: row.source,
    createdAt: row.created_at,
  };
}

function toTossPaymentRecord(row: TossPaymentRow): TossPaymentRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    paymentKey: row.payment_key,
    providerOrderId: row.provider_order_id,
    expectedAmount: row.expected_amount,
    confirmedAmount: row.confirmed_amount,
    currency: row.currency,
    providerStatus: row.provider_status,
    confirmationStartedAt: row.confirmation_started_at,
    confirmedAt: row.confirmed_at,
    reconciliationStatus: row.reconciliation_status,
    lastReconciliationResult: row.last_reconciliation_result,
    lastReconciledAt: row.last_reconciled_at,
    retryCount: row.retry_count,
    maxRetryCount: row.max_retry_count,
    nextRetryAt: row.next_retry_at,
    lastAttemptAt: row.last_attempt_at,
    lastConfirmationHttpStatus: row.last_confirmation_http_status,
    lastProviderErrorCode: row.last_provider_error_code,
    lastProviderErrorMessage: row.last_provider_error_message,
    lastConfirmationAttemptAt: row.last_confirmation_attempt_at,
    lastConfirmationRetryability: row.last_confirmation_retryability,
    lastConfirmationCorrelationId: row.last_confirmation_correlation_id,
  };
}

export async function recordTossConfirmationStarted(
  order: OrderRecord,
): Promise<TossPaymentRecord> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("toss_payment_records")
    .upsert(
      {
        order_id: order.id,
        expected_amount: order.amount,
        reconciliation_status: "confirmation_started",
        confirmation_started_at: now,
        updated_at: now,
        last_attempt_at: now,
      },
      { onConflict: "order_id" },
    )
    .select("*")
    .single<TossPaymentRow>();

  if (error || !data) {
    throw new Error(`Toss 결제 시도 기록에 실패했습니다: ${error?.message ?? "unknown"}`);
  }

  return toTossPaymentRecord(data);
}

export async function getTossPaymentRecordForOrder(orderId: string): Promise<TossPaymentRecord | null> {
  const { data, error } = await createAdminClient().from("toss_payment_records").select("*").eq("order_id", orderId).maybeSingle<TossPaymentRow>();
  if (error || !data) return null;
  return toTossPaymentRecord(data);
}

export async function revokeEntitlementForRefund(input: {
  userId: string;
  profileId: string;
  productId: string;
  reason: string;
  orderId?: string;
  claimToken?: string;
}): Promise<EntitlementRecord | null> {
  const supabase = createAdminClient();
  if (input.orderId && input.claimToken) {
    const { data, error } = await supabase.rpc("revoke_refund_entitlement", {
      target_order_id: input.orderId,
      claim_token: input.claimToken,
      reason: input.reason,
    });
    if (error || !data?.[0]) return null;
    return toEntitlementRecord(data[0] as EntitlementRow);
  }
  const { data, error } = await supabase.from("entitlements").update({
    is_active: false,
    revoked_at: new Date().toISOString(),
    revocation_reason: input.reason,
  }).eq("user_id", input.userId).eq("profile_id", input.profileId).eq("resource_id", input.productId).eq("is_active", true).select("*").maybeSingle<EntitlementRow>();
  if (error || !data) return null;
  return toEntitlementRecord(data);
}

export async function recordTossConfirmationFailure(
  orderId: string,
  failure: TossConfirmationFailure,
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const reconciliationStatus = failure.retryability === "RETRYABLE"
    ? "reconciliation_required"
    : "terminal_mismatch";
  const { error } = await supabase
    .from("toss_payment_records")
    .update({
      last_confirmation_http_status: failure.httpStatus,
      last_provider_error_code: failure.providerErrorCode,
      last_provider_error_message: failure.safeMessage,
      last_confirmation_attempt_at: now,
      last_confirmation_retryability: failure.retryability,
      last_confirmation_correlation_id: failure.correlationId,
      reconciliation_status: reconciliationStatus,
      last_reconciliation_result: failure.safeMessage,
      last_reconciled_at: now,
      updated_at: now,
      last_attempt_at: now,
    })
    .eq("order_id", orderId);

  if (error) {
    throw new Error(`Toss 결제 실패 진단 저장에 실패했습니다: ${error.message}`);
  }
}

export async function recordTossProviderConfirmation(
  order: OrderRecord,
  provider: TossConfirmResponse,
  reconciliationStatus: TossPaymentRecord["reconciliationStatus"] = "externally_confirmed",
): Promise<TossPaymentRecord> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("toss_payment_records")
    .upsert(
      {
        order_id: order.id,
        payment_key: provider.paymentKey,
        provider_order_id: provider.orderId,
        expected_amount: order.amount,
        confirmed_amount: provider.totalAmount,
        currency: provider.currency,
        provider_status: provider.status,
        confirmed_at: provider.approvedAt ?? now,
        reconciliation_status: reconciliationStatus,
        last_reconciliation_result: "provider confirmation recorded",
        last_reconciled_at: now,
        updated_at: now,
      },
      { onConflict: "order_id" },
    )
    .select("*")
    .single<TossPaymentRow>();

  if (error || !data) {
    throw new Error(`Toss 결제 증거 저장에 실패했습니다: ${error?.message ?? "unknown"}`);
  }

  return toTossPaymentRecord(data);
}

export async function markTossPaymentReconciliationResult(
  orderId: string,
  status: TossPaymentRecord["reconciliationStatus"],
  result: string,
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data: current, error: readError } = await supabase
    .from("toss_payment_records")
    .select("retry_count,max_retry_count")
    .eq("order_id", orderId)
    .single<{ retry_count: number; max_retry_count: number }>();

  if (readError || !current) {
    throw new Error(`Toss reconciliation 상태를 읽지 못했습니다: ${readError?.message ?? "unknown"}`);
  }

  const retryCount = status === "paid" || status === "terminal_mismatch"
    ? current.retry_count
    : current.retry_count + 1;
  const exhausted = retryCount >= current.max_retry_count;
  const finalStatus = exhausted && status !== "paid" && status !== "terminal_mismatch"
    ? "reconciliation_failed"
    : status;
  const nextRetryAt = new Date(
    Date.now() + Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** Math.min(retryCount, 6)),
  ).toISOString();
  const { error } = await supabase
    .from("toss_payment_records")
    .update({
      reconciliation_status: finalStatus,
      last_reconciliation_result: result,
      last_reconciled_at: now,
      updated_at: now,
      retry_count: retryCount,
      next_retry_at: nextRetryAt,
      last_attempt_at: now,
    })
    .eq("order_id", orderId);

  if (error) {
    throw new Error(`Toss reconciliation 상태 저장에 실패했습니다: ${error.message}`);
  }
}

export async function listTossPaymentsForReconciliation(): Promise<TossPaymentRecord[]> {
  const supabase = createAdminClient();
  const { data: recordData, error: recordError } = await supabase
    .from("toss_payment_records")
    .select("*")
    .in("reconciliation_status", ["pending", "confirmation_started", "externally_confirmed", "reconciliation_required"])
    .lte("next_retry_at", new Date().toISOString())
    .order("updated_at", { ascending: true });

  if (recordError || !recordData) {
    throw new Error(`Toss reconciliation 대상을 조회하지 못했습니다: ${recordError?.message ?? "unknown"}`);
  }

  const records = (recordData as TossPaymentRow[]).map(toTossPaymentRecord);
  const knownOrderIds = new Set(records.map((record) => record.orderId));
  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("payment_provider", "toss")
    .eq("status", "pending");

  if (orderError || !orders) {
    throw new Error(`Toss pending 주문을 조회하지 못했습니다: ${orderError?.message ?? "unknown"}`);
  }

  for (const row of orders as OrderRow[]) {
    if (!knownOrderIds.has(row.id)) {
      records.push(await recordTossConfirmationStarted(toOrderRecord(row)));
    }
  }

  return records.slice(0, 50);
}

export class InvalidProductError extends Error {
  constructor(productId: unknown) {
    super(`유효하지 않은 분석 상품입니다: ${String(productId)}`);
    this.name = "InvalidProductError";
  }
}

export async function createPendingOrder(input: {
  userId: string;
  profileId: string;
  productId: string;
  paymentProvider?: string;
}): Promise<OrderRecord> {
  const resolved = resolvePurchasableProduct(input.productId);

  if (!resolved.ok) {
    throw new InvalidProductError(input.productId);
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId,
      profile_id: input.profileId,
      product_id: resolved.productId,
      amount: resolved.amount,
      status: "pending" satisfies PaymentStatus,
      payment_provider: input.paymentProvider ?? "mock",
    })
    .select("*")
    .single<OrderRow>();

  if (error || !data) {
    throw new Error(`주문 생성에 실패했습니다: ${error?.message ?? "unknown"}`);
  }

  const order = toOrderRecord(data);

  if (order.paymentProvider === "toss") {
    await recordTossConfirmationStarted(order);
  }

  return order;
}

/** Loads an order only when it belongs to the given user. */
export async function getOrderForUser(
  orderId: string,
  userId: string,
): Promise<OrderRecord | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle<OrderRow>();

  if (error || !data) {
    return null;
  }

  return toOrderRecord(data);
}

async function getOrderById(orderId: string): Promise<OrderRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();

  return error || !data ? null : toOrderRecord(data);
}

export async function markOrderPaid(
  order: OrderRecord,
  transactionId: string,
): Promise<OrderRecord> {
  if (order.status === "paid") {
    return order;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "paid" satisfies PaymentStatus,
      paid_at: new Date().toISOString(),
      transaction_id: transactionId,
      payment_provider: order.paymentProvider ?? "mock",
    })
    .eq("id", order.id)
    .eq("user_id", order.userId)
    .select("*")
    .single<OrderRow>();

  if (error || !data) {
    throw new Error(`주문 결제 처리에 실패했습니다: ${error?.message ?? "unknown"}`);
  }

  return toOrderRecord(data);
}

/** Idempotent: the unique constraint on purchases.order_id prevents duplicates. */
export async function createPurchaseFromPaidOrder(
  order: OrderRecord,
): Promise<PurchaseRecord> {
  if (order.status !== "paid") {
    throw new Error("결제가 완료된 주문만 구매를 생성할 수 있습니다.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("purchases").upsert(
    {
      user_id: order.userId,
      profile_id: order.profileId,
      product_id: order.productId,
      order_id: order.id,
      purchased_at: order.paidAt ?? new Date().toISOString(),
    },
    { onConflict: "order_id", ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(`구매 생성에 실패했습니다: ${error.message}`);
  }

  const { data, error: selectError } = await supabase
    .from("purchases")
    .select("*")
    .eq("order_id", order.id)
    .single<PurchaseRow>();

  if (selectError || !data) {
    throw new Error(
      `구매 정보를 확인하지 못했습니다: ${selectError?.message ?? "unknown"}`,
    );
  }

  return toPurchaseRecord(data);
}

/**
 * Idempotent per user/profile/resource/type. A repeat purchase keeps one active
 * entitlement while updating its purchase_id to the most recent purchase.
 */
export async function grantEntitlement(input: {
  userId: string;
  profileId: string;
  resourceId: string;
  resourceType?: string;
  purchaseId: string | null;
  source?: "purchase" | "subscription" | "credit" | "grant";
}): Promise<EntitlementRecord> {
  const resolved = resolvePurchasableProduct(input.resourceId);

  if (!resolved.ok) {
    throw new InvalidProductError(input.resourceId);
  }

  const resourceType = input.resourceType ?? PAID_ANALYSIS_RESOURCE_TYPE;
  const source = input.source ?? "purchase";
  const supabase = createAdminClient();

  const { error } = await supabase.from("entitlements").upsert(
    {
      user_id: input.userId,
      profile_id: input.profileId,
      resource_id: resolved.productId,
      resource_type: resourceType,
      is_active: true,
      purchase_id: input.purchaseId,
      source,
    },
    { onConflict: "user_id,profile_id,resource_id,resource_type" },
  );

  if (error) {
    throw new Error(`이용 권한 생성에 실패했습니다: ${error.message}`);
  }

  const entitlement = await getActiveEntitlementForProfile(
    input.userId,
    input.profileId,
    resolved.productId,
    resourceType,
  );

  if (!entitlement) {
    throw new Error("이용 권한을 확인하지 못했습니다.");
  }

  return entitlement;
}

export async function getActiveEntitlementForProfile(
  userId: string,
  profileId: string,
  productId: string,
  resourceType: string = PAID_ANALYSIS_RESOURCE_TYPE,
): Promise<EntitlementRecord | null> {
  const resolved = resolvePurchasableProduct(productId);

  if (!resolved.ok) {
    return null;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("entitlements")
    .select("*")
    .eq("user_id", userId)
    .eq("profile_id", profileId)
    .eq("resource_id", resolved.productId)
    .eq("resource_type", resourceType)
    .eq("is_active", true)
    .maybeSingle<EntitlementRow>();

  if (error || !data) {
    return null;
  }

  return toEntitlementRecord(data);
}

export async function hasActiveEntitlementForProfile(
  userId: string,
  profileId: string,
  productId: string,
): Promise<boolean> {
  return (await getActiveEntitlementForProfile(userId, profileId, productId)) !== null;
}

export async function listUserEntitlements(
  userId: string,
): Promise<EntitlementRecord[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("entitlements")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !data) {
    return [];
  }

  return (data as EntitlementRow[]).map(toEntitlementRecord);
}

export type MockPaymentConfirmation = {
  order: OrderRecord;
  purchase: PurchaseRecord;
  entitlement: EntitlementRecord;
};

export async function reconcileTossPayment(
  record: TossPaymentRecord,
): Promise<MockPaymentConfirmation> {
  const order = await getOrderById(record.orderId);

  if (!order || order.paymentProvider !== "toss") {
    await markTossPaymentReconciliationResult(
      record.orderId,
      "terminal_mismatch",
      "internal Toss order was not found",
    );
    throw new Error("Toss reconciliation order mismatch");
  }

  if (order.status === "paid") {
    const purchase = await createPurchaseFromPaidOrder(order);
    const entitlement = await grantEntitlement({
      userId: order.userId,
      profileId: order.profileId,
      resourceId: order.productId,
      purchaseId: purchase.id,
      source: "purchase",
    });
    await markTossPaymentReconciliationResult(
      order.id,
      "paid",
      "order already paid; purchase and entitlement replayed",
    );
    return { order, purchase, entitlement };
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
      "provider order reference, amount, or currency mismatch",
    );
    throw new Error("Toss reconciliation provider mismatch");
  }

  if (provider.status !== "DONE") {
    await markTossPaymentReconciliationResult(
      order.id,
      "reconciliation_failed",
      `provider status ${provider.status} is not DONE`,
    );
    throw new Error("Toss payment is not complete");
  }

  await recordTossProviderConfirmation(order, provider, "externally_confirmed");

  try {
    const paidOrder = await markOrderPaid(order, provider.paymentKey);
    const purchase = await createPurchaseFromPaidOrder(paidOrder);
    const entitlement = await grantEntitlement({
      userId: paidOrder.userId,
      profileId: paidOrder.profileId,
      resourceId: paidOrder.productId,
      purchaseId: purchase.id,
      source: "purchase",
    });
    await markTossPaymentReconciliationResult(
      order.id,
      "paid",
      "provider payment verified and access restored",
    );
    return { order: paidOrder, purchase, entitlement };
  } catch (error) {
    await markTossPaymentReconciliationResult(
      order.id,
      "reconciliation_required",
      "provider confirmed; internal access persistence must be retried",
    );
    throw error;
  }
}

/**
 * Mock payment confirmation (no PG integration yet, Phase 4).
 * Ownership is enforced by the caller-supplied session userId and repeated
 * calls converge on the same order / purchase / entitlement rows.
 */
export async function confirmMockPayment(
  orderId: string,
  userId: string,
): Promise<MockPaymentConfirmation | null> {
  const order = await getOrderForUser(orderId, userId);

  if (!order) {
    return null;
  }

  const paidOrder =
    order.status === "paid"
      ? order
      : await markOrderPaid(order, `mock-${order.id}`);

  const purchase = await createPurchaseFromPaidOrder(paidOrder);

  const entitlement = await grantEntitlement({
    userId: paidOrder.userId,
    profileId: paidOrder.profileId,
    resourceId: paidOrder.productId,
    purchaseId: purchase.id,
    source: "purchase",
  });

  return { order: paidOrder, purchase, entitlement };
}
