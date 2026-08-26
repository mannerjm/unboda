import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }

function loadEnvFile(path: string): void {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

function loadDisposableRuntime(): void {
  const artifact = "supabase-r6-disposable/supabase/.temp/start-secrets/supabase_edge_runtime_unboda-r6-disposable/env/docker.env";
  const values: Record<string, string> = {};
  for (const line of readFileSync(artifact, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  assert(values.SUPABASE_INTERNAL_HOST_PORT === "55321", "R10A must target disposable API");
  assert(values.SUPABASE_DB_URL.includes("supabase_db_unboda-r6-disposable"), "R10A must target disposable DB");
  assert(Boolean(values.SUPABASE_SERVICE_ROLE_KEY), "R10A disposable service key required");
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = values.SUPABASE_INTERNAL_PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = values.SUPABASE_SERVICE_ROLE_KEY;
  loadEnvFile(".env.local");
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = values.SUPABASE_INTERNAL_PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = values.SUPABASE_SERVICE_ROLE_KEY;
}

async function main(): Promise<void> {
  loadDisposableRuntime();
  const { createAdminClient } = await import("../app/lib/supabase/admin");
  const { getRefundWorkflowForOrder, listRefundWorkflowsForReconciliation, reconcileRefundWorkflow } = await import("../app/lib/refunds/server");
  const db = createAdminClient();
  const baseline = {
    orders: ((await db.from("orders").select("id")).data ?? []).length,
    purchases: ((await db.from("purchases").select("id")).data ?? []).length,
    entitlements: ((await db.from("entitlements").select("id")).data ?? []).length,
    payments: ((await db.from("toss_payment_records").select("id")).data ?? []).length,
    refunds: ((await db.from("refund_workflows").select("id")).data ?? []).length,
  };
  assert(Object.values(baseline).every((value) => value === 0), "disposable financial baseline must be empty");
  let userId = "";
  let orderId = "";
  let providerLookupCalls = 0;
  let providerCancellationCalls = 0;
  const originalFetch = globalThis.fetch;
  try {
    const user = (await db.auth.admin.createUser({ email: `step-57d-45d-r10a-${Date.now()}@local.test`, password: "local-test-password-r10a", email_confirm: true })).data.user;
    if (!user) throw new Error("fixture user missing");
    userId = user.id;
    const profile = (await db.from("profiles").insert({ user_id: userId, label: "R10A persistence failure", relationship_type: "other", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false }).select("id").single()).data as { id: string };
    const order = (await db.from("orders").insert({ user_id: userId, profile_id: profile.id, product_id: "money-leak-risk", amount: 16900, status: "paid", payment_provider: "toss", transaction_id: "r10a-fixture", paid_at: new Date().toISOString() }).select("id").single()).data as { id: string };
    orderId = order.id;
    const payment = (await db.from("toss_payment_records").insert({ order_id: orderId, payment_key: "pay_r10a_fixture", provider_order_id: orderId, expected_amount: 16900, confirmed_amount: 16900, currency: "KRW", provider_status: "DONE", reconciliation_status: "externally_confirmed" }).select("id").single()).data as { id: string };
    const purchase = (await db.from("purchases").insert({ user_id: userId, profile_id: profile.id, product_id: "money-leak-risk", order_id: orderId }).select("id").single()).data as { id: string };
    await db.from("entitlements").insert({ user_id: userId, profile_id: profile.id, resource_id: "money-leak-risk", resource_type: "paid_analysis", is_active: true, source: "purchase", purchase_id: purchase.id });
    await db.from("refund_workflows").insert({ order_id: orderId, payment_record_id: payment.id, user_id: userId, profile_id: profile.id, product_id: "money-leak-risk", requested_amount: 16900, currency: "KRW", reason_category: "CHANGE_OF_MIND", status: "REFUND_PROCESSING", next_retry_at: new Date(Date.now() - 1000).toISOString() });
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (!url.includes("api.tosspayments.com")) return originalFetch(input, init);
      providerLookupCalls += 1;
      if (url.includes("/cancel")) providerCancellationCalls += 1;
      return Response.json({ paymentKey: "pay_r10a_provider", orderId, totalAmount: 16900, status: "CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_r10a_provider", cancelAmount: 16900, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 0 }] });
    };
    const claimed = (await listRefundWorkflowsForReconciliation())[0];
    assert(Boolean(claimed), "first worker must atomically claim fixture");
    let injected = false;
    const first = await reconcileRefundWorkflow(claimed, { afterProviderCancellationVerified: async () => { injected = true; throw new Error("R10A injected persistence failure"); } });
    assert(injected, "injection must occur after provider evidence verification");
    assert(first.status === "REFUND_FAILED_RETRYING", "first worker must leave retryable incomplete state");
    const intermediate = await getRefundWorkflowForOrder(orderId);
    if (!intermediate) throw new Error("FAIL: expected durable intermediate refund workflow state");
    assert(intermediate.status === "REFUND_FAILED_RETRYING" && intermediate.providerStatus === "CANCELED", "durable provider evidence and incomplete workflow must persist");
    assert(providerCancellationCalls === 0, "reconciliation must never call cancellation");
    assert(new Date(intermediate.nextRetryAt).getTime() > Date.now(), "retry must not be due immediately after failure");
    const beforeDueClaim = await listRefundWorkflowsForReconciliation();
    assert(!beforeDueClaim.some((workflow) => workflow.orderId === orderId), "future retry must not be automatically claimed");
    await db.from("refund_workflows").update({ next_retry_at: new Date(Date.now() - 1000).toISOString(), reconciliation_claim_expires_at: new Date(Date.now() - 1000).toISOString() }).eq("order_id", orderId);
    const freshClaim = (await listRefundWorkflowsForReconciliation())[0];
    assert(Boolean(freshClaim), "fresh worker must rediscover workflow from DB");
    const recovered = await reconcileRefundWorkflow(freshClaim);
    assert(recovered.status === "REFUND_COMPLETED", "fresh worker must converge completion");
    assert(providerLookupCalls === 2 && providerCancellationCalls === 0, "fresh recovery uses lookup and zero cancel calls");
    const active = (await db.from("entitlements").select("id").eq("user_id", userId).eq("profile_id", profile.id).eq("is_active", true)).data ?? [];
    const purchases = (await db.from("purchases").select("id").eq("order_id", orderId)).data ?? [];
    assert(active.length === 0 && purchases.length === 1, "access revoked and purchase preserved");
    const idempotent = await reconcileRefundWorkflow(recovered);
    assert(idempotent.status === "REFUND_COMPLETED" && providerCancellationCalls === 0, "completed recovery must be idempotent");
    console.log(JSON.stringify({ persistenceFailureRecovery: "verified", intermediateStatus: intermediate.status, finalStatus: recovered.status, providerLookupCalls, providerCancellationCalls, purchaseCount: purchases.length, effectiveEntitlementCount: active.length }));
  } finally {
    globalThis.fetch = originalFetch;
    const users = (await db.auth.admin.listUsers()).data.users.filter((user) => user.email?.startsWith("step-57d-45d-r10a-"));
    for (const user of users) {
      const orders = (await db.from("orders").select("id").eq("user_id", user.id)).data ?? [];
      const ids = orders.map((row: { id: string }) => row.id);
      await db.from("refund_workflows").delete().eq("user_id", user.id);
      if (ids.length) await db.from("toss_payment_records").delete().in("order_id", ids);
      await db.from("purchases").delete().eq("user_id", user.id);
      await db.from("entitlements").delete().eq("user_id", user.id);
      await db.from("orders").delete().eq("user_id", user.id);
      await db.from("profiles").delete().eq("user_id", user.id);
      await db.auth.admin.deleteUser(user.id);
    }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });