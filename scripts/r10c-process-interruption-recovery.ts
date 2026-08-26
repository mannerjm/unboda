import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
function loadEnvFile(path: string): void { for (const line of readFileSync(path, "utf8").split(/\r?\n/)) { const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (match) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2"); } }
function loadDisposableRuntime(): void {
  const values: Record<string, string> = {};
  for (const line of readFileSync("supabase-r6-disposable/supabase/.temp/start-secrets/supabase_edge_runtime_unboda-r6-disposable/env/docker.env", "utf8").split(/\r?\n/)) { const match = line.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2"); }
  assert(values.SUPABASE_INTERNAL_HOST_PORT === "55321" && values.SUPABASE_DB_URL.includes("supabase_db_unboda-r6-disposable"), "R10C must use disposable Supabase");
  assert(Boolean(values.SUPABASE_SERVICE_ROLE_KEY), "R10C disposable service key required");
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
  const baseline = await Promise.all(["orders", "purchases", "entitlements", "toss_payment_records", "refund_workflows"].map(async (table) => ((await db.from(table).select("id")).data ?? []).length));
  assert(baseline.every((count) => count === 0), "R10C disposable baseline must be empty");
  let userId = "";
  let orderId = "";
  let profileId = "";
  let providerLookupCalls = 0;
  let providerCancellationCalls = 0;
  const originalFetch = globalThis.fetch;
  try {
    const user = (await db.auth.admin.createUser({ email: `step-57d-45d-r10c-${Date.now()}@local.test`, password: "local-test-password-r10c", email_confirm: true })).data.user;
    if (!user) throw new Error("R10C user missing");
    userId = user.id;
    const profile = (await db.from("profiles").insert({ user_id: userId, label: "R10C process interruption", relationship_type: "other", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false }).select("id").single()).data as { id: string };
    profileId = profile.id;
    const order = (await db.from("orders").insert({ user_id: userId, profile_id: profileId, product_id: "money-leak-risk", amount: 16900, status: "paid", payment_provider: "toss", transaction_id: "r10c-fixture", paid_at: new Date().toISOString() }).select("id").single()).data as { id: string };
    orderId = order.id;
    const payment = (await db.from("toss_payment_records").insert({ order_id: orderId, payment_key: "pay_r10c_fixture", provider_order_id: orderId, expected_amount: 16900, confirmed_amount: 16900, currency: "KRW", provider_status: "DONE", reconciliation_status: "externally_confirmed" }).select("id").single()).data as { id: string };
    const purchase = (await db.from("purchases").insert({ user_id: userId, profile_id: profileId, product_id: "money-leak-risk", order_id: orderId }).select("id").single()).data as { id: string };
    await db.from("entitlements").insert({ user_id: userId, profile_id: profileId, resource_id: "money-leak-risk", resource_type: "paid_analysis", is_active: true, source: "purchase", purchase_id: purchase.id });
    await db.from("refund_workflows").insert({ order_id: orderId, payment_record_id: payment.id, user_id: userId, profile_id: profileId, product_id: "money-leak-risk", requested_amount: 16900, currency: "KRW", reason_category: "CHANGE_OF_MIND", status: "REFUND_PROCESSING", next_retry_at: new Date(Date.now() - 1000).toISOString() });

    const workerA = (await listRefundWorkflowsForReconciliation())[0];
    assert(Boolean(workerA?.reconciliationClaimToken), "Worker A must own a claim lease");
    const tokenA = workerA.reconciliationClaimToken;
    await db.from("refund_workflows").update({ provider_status: "CANCELED", provider_cancellation_reference: "tx_r10c_provider", provider_confirmed_at: new Date().toISOString(), status: "REFUND_FAILED_RETRYING", next_retry_at: new Date(Date.now() + 3600000).toISOString(), last_retryability: "RETRYABLE", last_provider_http_status: 200, last_provider_error_code: null, last_provider_error_message: null }).eq("order_id", orderId).eq("reconciliation_claim_token", tokenA);
    const intermediate = await getRefundWorkflowForOrder(orderId);
    if (!intermediate) throw new Error("R10C intermediate state missing");
    assert(intermediate.status === "REFUND_FAILED_RETRYING" && intermediate.providerStatus === "CANCELED", "Worker A must persist recoverable financial evidence");
    const beforeExpiry = await listRefundWorkflowsForReconciliation();
    assert(!beforeExpiry.some((item) => item.orderId === orderId), "Worker B must not claim active Worker A lease");

    await db.from("refund_workflows").update({ next_retry_at: new Date(Date.now() - 1000).toISOString(), reconciliation_claim_expires_at: new Date(Date.now() - 1000).toISOString() }).eq("order_id", orderId).eq("reconciliation_claim_token", tokenA);
    const workerB = (await listRefundWorkflowsForReconciliation())[0];
    assert(Boolean(workerB?.reconciliationClaimToken) && workerB.reconciliationClaimToken !== tokenA, "Worker B must reclaim with a new token");
    globalThis.fetch = async (input, init) => { const url = String(input); if (!url.includes("api.tosspayments.com")) return originalFetch(input, init); providerLookupCalls++; if (url.includes("/cancel")) providerCancellationCalls++; return Response.json({ paymentKey: "pay_r10c_provider", orderId, totalAmount: 16900, status: "CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_r10c_provider", cancelAmount: 16900, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 0 }] }); };
    const recovered = await reconcileRefundWorkflow(workerB);
    const active = (await db.from("entitlements").select("id").eq("user_id", userId).eq("profile_id", profileId).eq("is_active", true)).data ?? [];
    const purchases = (await db.from("purchases").select("id").eq("order_id", orderId)).data ?? [];
    assert(recovered.status === "REFUND_COMPLETED" && active.length === 0 && purchases.length === 1, "fresh Worker B must converge from DB state");
    assert(providerLookupCalls === 1 && providerCancellationCalls === 0, "recovery must use lookup and zero cancellation calls");
    const again = await reconcileRefundWorkflow(recovered);
    assert(again.status === "REFUND_COMPLETED", "completed workflow must no-op");
    console.log(JSON.stringify({ processInterruption: "verified", workerAClaimPresent: true, workerBClaimPresent: true, claimTokenChanged: true, beforeExpiryClaimed: false, providerLookupCalls, providerCancellationCalls, finalStatus: recovered.status, purchaseCount: purchases.length, effectiveEntitlementCount: active.length }));
  } finally {
    globalThis.fetch = originalFetch;
    const users = (await db.auth.admin.listUsers()).data.users.filter((user) => user.email?.startsWith("step-57d-45d-r10c-"));
    for (const user of users) { const orders = (await db.from("orders").select("id").eq("user_id", user.id)).data ?? []; const ids = orders.map((row: { id: string }) => row.id); await db.from("refund_workflows").delete().eq("user_id", user.id); if (ids.length) await db.from("toss_payment_records").delete().in("order_id", ids); await db.from("purchases").delete().eq("user_id", user.id); await db.from("entitlements").delete().eq("user_id", user.id); await db.from("orders").delete().eq("user_id", user.id); await db.from("profiles").delete().eq("user_id", user.id); await db.auth.admin.deleteUser(user.id); }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
