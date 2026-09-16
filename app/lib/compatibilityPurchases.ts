import type { PaymentStatus } from "./payment";
import { assertPaidPurchaseEligibility } from "./accounts/server";
import { buildAnalysisInputSnapshot } from "./analysisInputSnapshot";
import {
  buildCompatibilityPaidEditionKey,
  type CompatibilityPaidInputSnapshot,
} from "./compatibilityPaidAnalysis";
import type { ProfileDto } from "./profiles/types";
import { resolveLaunchPurchasableProduct } from "./purchases/products";
import {
  ActiveEditionOrderAlreadyPaidError,
  AlreadyOwnedError,
  AnalysisEditionUnavailableError,
  InvalidProductError,
  getActiveEntitlementForProfileEdition,
  recordTossConfirmationStarted,
} from "./purchases/server";
import type { OrderRecord } from "./purchases/types";
import { COMPATIBILITY_ROMANTIC_PRODUCT_ID } from "./specialAnalysisProducts";
import { createAdminClient } from "./supabase/admin";

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
    analysisEditionKey: row.analysis_edition_key,
    analysisReferenceSnapshot: row.analysis_reference_snapshot,
    analysisInputSnapshot: row.analysis_input_snapshot,
  };
}

async function getActiveCompatibilityOrder(input: {
  userId: string;
  profileId: string;
  analysisEditionKey: string;
}): Promise<OrderRecord | null> {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("*")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("product_id", COMPATIBILITY_ROMANTIC_PRODUCT_ID)
    .eq("analysis_edition_key", input.analysisEditionKey)
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<OrderRow>();

  return error || !data ? null : toOrderRecord(data);
}

/**
 * Dedicated order boundary for paid compatibility. Raw partner birth inputs
 * are validated and converted before this function is called. The order keeps
 * only the derived pair snapshot in analysis_reference_snapshot; the ordinary
 * analysis_input_snapshot remains the user's own canonical profile snapshot so
 * existing purchase/reconciliation integrity checks continue to work.
 */
export async function createCompatibilityPendingOrder(input: {
  userId: string;
  profile: ProfileDto;
  snapshot: CompatibilityPaidInputSnapshot;
  paymentProvider?: string;
}): Promise<OrderRecord> {
  await assertPaidPurchaseEligibility(input.userId);

  const resolved = resolveLaunchPurchasableProduct(COMPATIBILITY_ROMANTIC_PRODUCT_ID);
  if (!resolved.ok || resolved.productId !== COMPATIBILITY_ROMANTIC_PRODUCT_ID) {
    throw new InvalidProductError(COMPATIBILITY_ROMANTIC_PRODUCT_ID);
  }

  let analysisEditionKey: string;
  try {
    analysisEditionKey = buildCompatibilityPaidEditionKey(input.snapshot);
  } catch {
    throw new AnalysisEditionUnavailableError(COMPATIBILITY_ROMANTIC_PRODUCT_ID);
  }

  if (await getActiveEntitlementForProfileEdition(
    input.userId,
    input.profile.id,
    COMPATIBILITY_ROMANTIC_PRODUCT_ID,
    analysisEditionKey,
  )) {
    throw new AlreadyOwnedError(COMPATIBILITY_ROMANTIC_PRODUCT_ID);
  }

  const analysisInputSnapshot = buildAnalysisInputSnapshot(input.profile);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId,
      profile_id: input.profile.id,
      product_id: COMPATIBILITY_ROMANTIC_PRODUCT_ID,
      amount: resolved.amount,
      status: "pending" satisfies PaymentStatus,
      payment_provider: input.paymentProvider ?? "mock",
      analysis_edition_key: analysisEditionKey,
      analysis_reference_snapshot: input.snapshot,
      analysis_input_snapshot: analysisInputSnapshot,
    })
    .select("*")
    .single<OrderRow>();

  if (error?.code === "23505") {
    const existing = await getActiveCompatibilityOrder({
      userId: input.userId,
      profileId: input.profile.id,
      analysisEditionKey,
    });
    if (existing?.status === "pending") return existing;
    if (existing?.status === "paid") throw new ActiveEditionOrderAlreadyPaidError(existing.id);
  }

  if (error || !data) {
    throw new Error(`궁합 주문 생성에 실패했습니다: ${error?.message ?? "unknown"}`);
  }

  const order = toOrderRecord(data);
  if (order.paymentProvider === "toss") {
    await recordTossConfirmationStarted(order);
  }
  return order;
}
