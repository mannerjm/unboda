import {
  createAdminClient,
  hasAdminClientConfig,
} from "../app/lib/supabase/admin";
import {
  createPendingOrder,
  createPurchaseFromPaidOrder,
  getActiveEntitlementForProfile,
  grantEntitlement,
  markOrderPaid,
  reconcileTossPayment,
  recordTossProviderConfirmation,
} from "../app/lib/purchases/server";
import type { OrderRecord, TossPaymentRecord } from "../app/lib/purchases/types";
import {
  confirmPaymentWithToss,
  type TossConfirmResponse,
} from "../app/lib/toss/server";

const PRODUCT_ID = "money-leak-risk";
const AMOUNT = 16900;
const CURRENCY = "KRW";

type OrderDbRow = {
  id: string;
  profile_id: string;
  amount: number;
  status: string;
};

type PaymentDbRow = {
  reconciliation_status: string;
  payment_key: string | null;
  provider_order_id: string | null;
  expected_amount: number;
  confirmed_amount: number | null;
  currency: string | null;
  provider_status: string | null;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function localTargetGuard(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert(url === "http://127.0.0.1:54321", "integration target must be local 127.0.0.1:54321");
  assert(
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.length),
    "local service role key must be configured",
  );
}

function providerResponse(orderId: string, paymentKey: string): TossConfirmResponse {
  return {
    paymentKey,
    orderId,
    totalAmount: AMOUNT,
    status: "DONE",
    method: "card",
    currency: CURRENCY,
    mId: "local-toss",
    approvedAt: "2026-08-26T00:00:00.000Z",
  };
}

async function createFixture(): Promise<{
  userId: string;
  profileId: string;
}> {
  const supabase = createAdminClient();
  const email = `step-57d-43p-${Date.now()}@local.test`;
  const { data: userData, error: userError } =
    await supabase.auth.admin.createUser({
      email,
      password: "local-test-password-57d43p",
      email_confirm: true,
    });

  if (userError || !userData.user) {
    throw new Error(`fixture user creation failed: ${userError?.message ?? "unknown"}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      user_id: userData.user.id,
      label: "STEP 57D-43P synthetic profile",
      relationship_type: "self",
      birth_date: "1990-01-01",
      birth_time: "12:00:00",
      gender: "male",
      calendar_type: "solar",
      is_leap_month: false,
    })
    .select("id")
    .single<{ id: string }>();

  if (profileError || !profile) {
    await supabase.auth.admin.deleteUser(userData.user.id);
    throw new Error(`fixture profile creation failed: ${profileError?.message ?? "unknown"}`);
  }

  return { userId: userData.user.id, profileId: profile.id };
}

async function cleanupFixture(userId: string, profileId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("entitlements").delete().eq("user_id", userId);
  await supabase.from("purchases").delete().eq("user_id", userId);
  await supabase.from("orders").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", profileId);
  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch {
    // Local auth may already remove a user through a cascading fixture cleanup.
  }

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    throw new Error(`synthetic auth fixture cleanup verification failed: ${usersError.message}`);
  }
  assert(
    !users?.users?.some((user) => user.email?.startsWith("step-57d-43p-")),
    "synthetic auth fixtures must be cleaned up",
  );

  const { data: remainingOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", userId);
  assert(!remainingOrders?.length, "fixture orders must be cleaned up");
}

async function assertFinalState(
  orderId: string,
  userId: string,
  profileId: string,
  expectedPaymentKey: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single<OrderDbRow>();
  const { data: purchases } = await supabase
    .from("purchases")
    .select("*")
    .eq("order_id", orderId);
  const { data: entitlements } = await supabase
    .from("entitlements")
    .select("*")
    .eq("user_id", userId)
    .eq("profile_id", profileId)
    .eq("resource_id", PRODUCT_ID)
    .eq("is_active", true);
  const { data: payment } = await supabase
    .from("toss_payment_records")
    .select("*")
    .eq("order_id", orderId)
    .single<PaymentDbRow>();

  assert(order?.status === "paid", "exactly one order must be paid");
  assert(order?.amount === AMOUNT, "order amount must remain server-authoritative");
  assert(order?.profile_id === profileId, "order profile must match fixture");
  assert(purchases?.length === 1, "exactly one purchase must exist");
  assert(entitlements?.length === 1, "exactly one effective entitlement must exist");
  if (!payment) {
    throw new Error("FAIL: payment record must exist");
  }
  assert(payment.reconciliation_status === "paid", "payment record must converge to paid");
  assert(payment.payment_key === expectedPaymentKey, "payment key must remain stable");
  assert(payment.provider_order_id === orderId, "provider order reference must match internal order");
  assert(payment.expected_amount === AMOUNT && payment.confirmed_amount === AMOUNT, "payment amounts must match");
  assert(payment.currency === CURRENCY && payment.provider_status === "DONE", "provider evidence must match");
  assert(purchases?.[0].profile_id === profileId, "purchase profile must match order profile");
  assert(entitlements?.[0].profile_id === profileId, "entitlement profile must match order profile");

  const access = await getActiveEntitlementForProfile(userId, profileId, PRODUCT_ID);
  assert(access !== null, "paid report access dependency must recognize entitlement");
}

async function prepareOrder(userId: string, profileId: string, caseName: string): Promise<{
  order: OrderRecord;
  paymentKey: string;
  provider: TossConfirmResponse;
}> {
  const order = await createPendingOrder({
    userId,
    profileId,
    productId: PRODUCT_ID,
    paymentProvider: "toss",
  });
  const paymentKey = `pay_local_${caseName}`;
  const provider = providerResponse(order.id, paymentKey);
  return { order, paymentKey, provider };
}

async function externallyConfirm(
  order: OrderRecord,
  provider: TossConfirmResponse,
): Promise<void> {
  await recordTossProviderConfirmation(order, provider, "externally_confirmed");
}

async function runCase(
  caseName: string,
  fixture: { userId: string; profileId: string },
  providerByOrder: Map<string, TossConfirmResponse>,
  execute: (context: {
    order: OrderRecord;
    provider: TossConfirmResponse;
    paymentKey: string;
  }) => Promise<void>,
): Promise<void> {
  const context = await prepareOrder(fixture.userId, fixture.profileId, caseName);
  providerByOrder.set(context.order.id, context.provider);
  try {
    await execute(context);
  } catch (error) {
    assert(error instanceof Error, `${caseName} must throw an injected failure`);
  }
  const persistedClient = createAdminClient();
  const { data: persistedOrder, error: persistedOrderError } = await persistedClient
    .from("orders")
    .select("id,payment_provider")
    .eq("id", context.order.id)
    .single<{ id: string; payment_provider: string }>();
  assert(!persistedOrderError && persistedOrder?.id === context.order.id, `${caseName} order must persist with its original id`);
  assert(
    persistedOrder?.payment_provider === "toss",
    `${caseName} order must persist as Toss; actual=${JSON.stringify(persistedOrder)}`,
  );
  const paymentRecord = {
    orderId: context.order.id,
    paymentKey: context.paymentKey,
  } as TossPaymentRecord;
  await reconcileTossPayment(paymentRecord);
  await assertFinalState(
    context.order.id,
    fixture.userId,
    fixture.profileId,
    context.paymentKey,
  );
  await reconcileTossPayment(paymentRecord);
  await assertFinalState(
    context.order.id,
    fixture.userId,
    fixture.profileId,
    context.paymentKey,
  );
  const supabase = createAdminClient();
  await supabase.from("entitlements").delete().eq("user_id", fixture.userId);
  await supabase.from("purchases").delete().eq("order_id", context.order.id);
  await supabase.from("orders").delete().eq("id", context.order.id);
  console.log(`${caseName}: PASS`);
}

async function main(): Promise<void> {
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "test";
  env.TOSS_SECRET_KEY = "test_sk_local_reconciliation";
  localTargetGuard();
  assert(hasAdminClientConfig(), "local Supabase admin configuration must be available");

  const originalFetch = globalThis.fetch;
  let lookupCalls = 0;
  let confirmCalls = 0;
  const providerByOrder = new Map<string, TossConfirmResponse>();
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (!request.url.startsWith("https://api.tosspayments.com/v1/")) {
      return originalFetch(input, init);
    }
    if (request.method === "POST" && request.url.endsWith("/payments/confirm")) {
      confirmCalls += 1;
      const body = (await request.clone().json()) as { orderId?: string };
      const provider = body.orderId
        ? providerByOrder.get(body.orderId) ?? providerResponse(body.orderId, "unknown")
        : providerResponse("unknown", "unknown");
      return Response.json(provider);
    }
    if (request.method === "GET" && request.url.includes("/payments/orders/")) {
      lookupCalls += 1;
    }
    const orderId = decodeURIComponent(
      request.url.split("/payments/orders/")[1] ?? "unknown",
    );
    const provider = providerByOrder.get(orderId) ?? providerResponse(orderId, "unknown");
    return Response.json(provider);
  };

  const fixture = await createFixture();
  try {
    await runCase("case-1-provider-success-internal-failure", fixture, providerByOrder, async ({ order, provider }) => {
      await confirmPaymentWithToss({
        paymentKey: provider.paymentKey,
        orderId: order.id,
        amount: order.amount,
      });
      throw new Error("injected application interruption after mocked provider success");
    });

    await runCase("case-2-paid-order-entitlement-failure", fixture, providerByOrder, async ({ order, provider }) => {
      await externallyConfirm(order, provider);
      const paidOrder = await markOrderPaid(order, provider.paymentKey);
      await createPurchaseFromPaidOrder(paidOrder);
      throw new Error("injected entitlement persistence failure");
    });

    await runCase("case-3-purchase-created-entitlement-failure", fixture, providerByOrder, async ({ order, provider }) => {
      await externallyConfirm(order, provider);
      const paidOrder = await markOrderPaid(order, provider.paymentKey);
      await createPurchaseFromPaidOrder(paidOrder);
      throw new Error("injected entitlement write failure after purchase");
    });

    await runCase("case-4-process-interruption-after-evidence", fixture, providerByOrder, async ({ order, provider }) => {
      await externallyConfirm(order, provider);
      throw new Error("simulated worker process interruption");
    });

    await runCase("case-5-duplicate-reconciliation", fixture, providerByOrder, async ({ order, provider }) => {
      await externallyConfirm(order, provider);
      await markOrderPaid(order, provider.paymentKey);
      const paidOrder = { ...order, status: "paid", transactionId: provider.paymentKey } as OrderRecord;
      await createPurchaseFromPaidOrder(paidOrder);
      await grantEntitlement({
        userId: fixture.userId,
        profileId: fixture.profileId,
        resourceId: PRODUCT_ID,
        purchaseId: "already-created",
        analysisEditionKey: "LEGACY",
        source: "purchase",
      });
    });

    assert(confirmCalls === 1, "one initial confirmation must not be repeated by reconciliation");
    assert(lookupCalls >= 2, `each unresolved case must re-verify provider state by lookup; actual=${lookupCalls}`);
    console.log(`provider calls: confirm=${confirmCalls}, lookup=${lookupCalls}`);
  } finally {
    await cleanupFixture(fixture.userId, fixture.profileId);
    globalThis.fetch = originalFetch;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
