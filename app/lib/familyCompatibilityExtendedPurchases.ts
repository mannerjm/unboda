import type { PaymentStatus } from "./payment";
import { assertPaidPurchaseEligibility } from "./accounts/server";
import { buildAnalysisInputSnapshot } from "./analysisInputSnapshot";
import {
  buildFamilyOtherPaidEditionKey,
  buildFamilySiblingPaidEditionKey,
  type FamilyOtherPaidInputSnapshot,
  type FamilySiblingPaidInputSnapshot,
} from "./familyCompatibilityExtendedPaidAnalysis";
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
import {
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
} from "./specialAnalysisProducts";
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

async function getActiveOrder(input: {
  userId: string;
  profileId: string;
  productId: string;
  analysisEditionKey: string;
}): Promise<OrderRecord | null> {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("*")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("product_id", input.productId)
    .eq("analysis_edition_key", input.analysisEditionKey)
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<OrderRow>();
  return error || !data ? null : toOrderRecord(data);
}

async function createFamilyExtendedPendingOrder(input: {
  userId: string;
  profile: ProfileDto;
  productId: typeof COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID | typeof COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID;
  snapshot: FamilySiblingPaidInputSnapshot | FamilyOtherPaidInputSnapshot;
  analysisEditionKey: string;
  label: string;
  paymentProvider?: string;
}): Promise<OrderRecord> {
  await assertPaidPurchaseEligibility(input.userId);
  const resolved = resolveLaunchPurchasableProduct(input.productId);
  if (!resolved.ok || resolved.productId !== input.productId) throw new InvalidProductError(input.productId);

  if (await getActiveEntitlementForProfileEdition(
    input.userId,
    input.profile.id,
    input.productId,
    input.analysisEditionKey,
  )) {
    throw new AlreadyOwnedError(input.productId);
  }

  const analysisInputSnapshot = buildAnalysisInputSnapshot(input.profile);
  const { data, error } = await createAdminClient()
    .from("orders")
    .insert({
      user_id: input.userId,
      profile_id: input.profile.id,
      product_id: input.productId,
      amount: resolved.amount,
      status: "pending" satisfies PaymentStatus,
      payment_provider: input.paymentProvider ?? "mock",
      analysis_edition_key: input.analysisEditionKey,
      analysis_reference_snapshot: input.snapshot,
      analysis_input_snapshot: analysisInputSnapshot,
    })
    .select("*")
    .single<OrderRow>();

  if (error?.code === "23505") {
    const existing = await getActiveOrder({
      userId: input.userId,
      profileId: input.profile.id,
      productId: input.productId,
      analysisEditionKey: input.analysisEditionKey,
    });
    if (existing?.status === "pending") return existing;
    if (existing?.status === "paid") throw new ActiveEditionOrderAlreadyPaidError(existing.id);
  }

  if (error || !data) throw new Error(`${input.label} 주문 생성에 실패했습니다: ${error?.message ?? "unknown"}`);
  const order = toOrderRecord(data);
  if (order.paymentProvider === "toss") await recordTossConfirmationStarted(order);
  return order;
}

export async function createFamilySiblingPendingOrder(input: {
  userId: string;
  profile: ProfileDto;
  snapshot: FamilySiblingPaidInputSnapshot;
  paymentProvider?: string;
}): Promise<OrderRecord> {
  let analysisEditionKey: string;
  try {
    analysisEditionKey = buildFamilySiblingPaidEditionKey(input.snapshot);
  } catch {
    throw new AnalysisEditionUnavailableError(COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID);
  }
  return createFamilyExtendedPendingOrder({
    ...input,
    productId: COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
    analysisEditionKey,
    label: "형제·자매 궁합",
  });
}

export async function createFamilyOtherPendingOrder(input: {
  userId: string;
  profile: ProfileDto;
  snapshot: FamilyOtherPaidInputSnapshot;
  paymentProvider?: string;
}): Promise<OrderRecord> {
  let analysisEditionKey: string;
  try {
    analysisEditionKey = buildFamilyOtherPaidEditionKey(input.snapshot);
  } catch {
    throw new AnalysisEditionUnavailableError(COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID);
  }
  return createFamilyExtendedPendingOrder({
    ...input,
    productId: COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
    analysisEditionKey,
    label: "기타 가족 궁합",
  });
}
