import type { PaymentStatus } from "../payment";
import { createAdminClient } from "../supabase/admin";
import { resolvePurchasableProduct } from "./products";
import {
  PAID_ANALYSIS_RESOURCE_TYPE,
  type EntitlementRecord,
  type OrderRecord,
  type PurchaseRecord,
} from "./types";

type OrderRow = {
  id: string;
  user_id: string;
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
  product_id: string;
  order_id: string;
  purchased_at: string;
};

type EntitlementRow = {
  id: string;
  user_id: string;
  resource_id: string;
  resource_type: string;
  is_active: boolean;
  created_at: string;
};

function toOrderRecord(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    userId: row.user_id,
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
    productId: row.product_id,
    orderId: row.order_id,
    purchasedAt: row.purchased_at,
  };
}

function toEntitlementRecord(row: EntitlementRow): EntitlementRecord {
  return {
    id: row.id,
    userId: row.user_id,
    resourceId: row.resource_id,
    resourceType: row.resource_type,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export class InvalidProductError extends Error {
  constructor(productId: unknown) {
    super(`유효하지 않은 분석 상품입니다: ${String(productId)}`);
    this.name = "InvalidProductError";
  }
}

export async function createPendingOrder(input: {
  userId: string;
  productId: string;
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
      product_id: resolved.productId,
      amount: resolved.amount,
      status: "pending" satisfies PaymentStatus,
      payment_provider: "mock",
    })
    .select("*")
    .single<OrderRow>();

  if (error || !data) {
    throw new Error(`주문 생성에 실패했습니다: ${error?.message ?? "unknown"}`);
  }

  return toOrderRecord(data);
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

/** Idempotent: unique (user_id, resource_id, resource_type). */
export async function grantEntitlement(input: {
  userId: string;
  resourceId: string;
  resourceType?: string;
}): Promise<EntitlementRecord> {
  const resolved = resolvePurchasableProduct(input.resourceId);

  if (!resolved.ok) {
    throw new InvalidProductError(input.resourceId);
  }

  const resourceType = input.resourceType ?? PAID_ANALYSIS_RESOURCE_TYPE;
  const supabase = createAdminClient();

  const { error } = await supabase.from("entitlements").upsert(
    {
      user_id: input.userId,
      resource_id: resolved.productId,
      resource_type: resourceType,
      is_active: true,
    },
    { onConflict: "user_id,resource_id,resource_type", ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(`이용 권한 생성에 실패했습니다: ${error.message}`);
  }

  const entitlement = await getActiveEntitlement(
    input.userId,
    resolved.productId,
    resourceType,
  );

  if (!entitlement) {
    throw new Error("이용 권한을 확인하지 못했습니다.");
  }

  return entitlement;
}

export async function getActiveEntitlement(
  userId: string,
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
    .eq("resource_id", resolved.productId)
    .eq("resource_type", resourceType)
    .eq("is_active", true)
    .maybeSingle<EntitlementRow>();

  if (error || !data) {
    return null;
  }

  return toEntitlementRecord(data);
}

export async function hasActiveEntitlement(
  userId: string,
  productId: string,
): Promise<boolean> {
  return (await getActiveEntitlement(userId, productId)) !== null;
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
    resourceId: paidOrder.productId,
  });

  return { order: paidOrder, purchase, entitlement };
}
