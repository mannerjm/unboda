import { createAdminClient } from "../app/lib/supabase/admin";
import { GET } from "../app/api/internal/payments/reconcile/route";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function main(): Promise<void> {
  const env = process.env as Record<string, string | undefined>;
  env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  env.PAYMENT_RECONCILIATION_SECRET = "local-scheduler-secret";
  env.TOSS_SECRET_KEY = "test_sk_local_scheduler";
  const supabase = createAdminClient();
  const unauthorized = await GET(new Request("http://127.0.0.1:3000/api/internal/payments/reconcile"));
  assert(unauthorized.status === 401, "GET without cron secret must be rejected");
  const wrongSecret = await GET(new Request("http://127.0.0.1:3000/api/internal/payments/reconcile", {
    headers: { authorization: "Bearer wrong-secret" },
  }));
  assert(wrongSecret.status === 401, "GET with wrong cron secret must be rejected");
  const email = `step-57d-44a-${Date.now()}@local.test`;
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password: "local-scheduler-password",
    email_confirm: true,
  });
  if (userError || !userData.user) throw new Error(userError?.message ?? "fixture user failed");

  try {
    const { data: profile, error: profileError } = await supabase.from("profiles").insert({
      user_id: userData.user.id,
      label: "STEP 57D-44A scheduler fixture",
      relationship_type: "self",
      birth_date: "1990-01-01",
      birth_time: "12:00:00",
      gender: "male",
      calendar_type: "solar",
      is_leap_month: false,
    }).select("id").single<{ id: string }>();
    if (profileError || !profile) throw new Error(profileError?.message ?? "fixture profile failed");

    const { data: order, error: orderError } = await supabase.from("orders").insert({
      user_id: userData.user.id,
      profile_id: profile.id,
      product_id: "money-leak-risk",
      amount: 16900,
      status: "pending",
      payment_provider: "toss",
    }).select("id").single<{ id: string }>();
    if (orderError || !order) throw new Error(orderError?.message ?? "fixture order failed");

    const paymentKey = "pay_local_scheduler_1";
    const { error: paymentError } = await supabase.from("toss_payment_records").insert({
      order_id: order.id,
      payment_key: paymentKey,
      provider_order_id: order.id,
      expected_amount: 16900,
      confirmed_amount: 16900,
      currency: "KRW",
      provider_status: "DONE",
      confirmation_started_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      reconciliation_status: "externally_confirmed",
      next_retry_at: new Date().toISOString(),
    });
    if (paymentError) throw new Error(paymentError.message);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      if (!request.url.startsWith("https://api.tosspayments.com/v1/")) return originalFetch(input, init);
      return Response.json({
        paymentKey,
        orderId: order.id,
        totalAmount: 16900,
        status: "DONE",
        currency: "KRW",
        method: "card",
        mId: "local-toss",
        approvedAt: new Date().toISOString(),
      });
    };

    const first = await GET(new Request("http://127.0.0.1:3000/api/internal/payments/reconcile", {
      method: "GET",
      headers: { "x-reconciliation-secret": env.PAYMENT_RECONCILIATION_SECRET },
    }));
    const firstBody = await first.json() as { attempted: number; converged: number; retryPending: number };
    assert(first.status === 200 && firstBody.attempted === 1 && firstBody.converged === 1, `eligible schedule must converge one record: ${JSON.stringify(firstBody)}`);

    const second = await GET(new Request("http://127.0.0.1:3000/api/internal/payments/reconcile", {
      method: "GET",
      headers: { authorization: `Bearer ${env.PAYMENT_RECONCILIATION_SECRET}` },
    }));
    const secondBody = await second.json() as { attempted: number; converged: number };
    assert(second.status === 200 && secondBody.attempted === 0 && secondBody.converged === 0, "converged schedule must be a no-op");

    const { data: finalOrders } = await supabase.from("orders").select("id").eq("id", order.id).eq("status", "paid");
    const { data: finalPurchases } = await supabase.from("purchases").select("id").eq("order_id", order.id);
    const { data: finalEntitlements } = await supabase.from("entitlements").select("id").eq("user_id", userData.user.id).eq("profile_id", profile.id).eq("resource_id", "money-leak-risk").eq("is_active", true);
    assert(finalOrders?.length === 1, "scheduler must leave one paid order");
    assert(finalPurchases?.length === 1, "scheduler must leave one purchase");
    assert(finalEntitlements?.length === 1, "scheduler must leave one effective entitlement");
    globalThis.fetch = originalFetch;
    console.log("local scheduler simulation regression passed");
  } finally {
    await supabase.from("entitlements").delete().eq("user_id", userData.user.id);
    await supabase.from("purchases").delete().eq("user_id", userData.user.id);
    await supabase.from("orders").delete().eq("user_id", userData.user.id);
    await supabase.from("profiles").delete().eq("user_id", userData.user.id);
    await supabase.auth.admin.deleteUser(userData.user.id).catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});