import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
function loadEnvFile(path: string): void { for (const line of readFileSync(path, "utf8").split(/\r?\n/)) { const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (match) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2"); } }
function loadDisposableRuntime(): void {
  const values: Record<string, string> = {};
  for (const line of readFileSync("supabase-r6-disposable/supabase/.temp/start-secrets/supabase_edge_runtime_unboda-r6-disposable/env/docker.env", "utf8").split(/\r?\n/)) { const match = line.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2"); }
  assert(values.SUPABASE_INTERNAL_HOST_PORT === "55321", "R10E must use disposable API");
  assert(values.SUPABASE_DB_URL.includes("supabase_db_unboda-r6-disposable"), "R10E must use disposable DB");
  assert(Boolean(values.SUPABASE_SERVICE_ROLE_KEY), "R10E disposable service key required");
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = values.SUPABASE_INTERNAL_PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = values.SUPABASE_SERVICE_ROLE_KEY;
  loadEnvFile(".env.local");
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = values.SUPABASE_INTERNAL_PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = values.SUPABASE_SERVICE_ROLE_KEY;
}

type ProviderMode = "amount" | "currency" | "order" | "done" | "cancel-status" | "partial-status" | "under-refund" | "malformed" | "temporary";
type Fixture = { label: string; userId: string; profileId: string; orderId: string; workflowId: string; providerMode?: ProviderMode };

async function main(): Promise<void> {
  loadDisposableRuntime();
  const { createAdminClient } = await import("../app/lib/supabase/admin");
  const { getRefundWorkflowForOrder, listRefundWorkflowsForReconciliation, reconcileRefundWorkflow } = await import("../app/lib/refunds/server");
  const db = createAdminClient();
  async function cleanupSyntheticFixtures(): Promise<void> {
    const users = (await db.auth.admin.listUsers({ perPage: 1000 })).data.users.filter((user) => user.email?.startsWith("step-57d-45d-r10e-") || user.email?.startsWith("step-57d-r10e-"));
    for (const user of users) { const orders = (await db.from("orders").select("id").eq("user_id", user.id)).data ?? []; const ids = orders.map((row: { id: string }) => row.id); await db.from("refund_workflows").delete().eq("user_id", user.id); if (ids.length) await db.from("toss_payment_records").delete().in("order_id", ids); await db.from("purchases").delete().eq("user_id", user.id); await db.from("entitlements").delete().eq("user_id", user.id); await db.from("orders").delete().eq("user_id", user.id); await db.from("profiles").delete().eq("user_id", user.id); await db.auth.admin.deleteUser(user.id); }
  }
  await cleanupSyntheticFixtures();
  const baseline = await Promise.all(["orders", "purchases", "entitlements", "toss_payment_records", "refund_workflows"].map(async (table) => ((await db.from(table).select("id")).data ?? []).length));
  assert(baseline.every((count) => count === 0), "R10E disposable baseline must be empty");
  const fixtures: Fixture[] = [];
  const originalFetch = globalThis.fetch;
  let providerLookupCalls = 0;
  let providerCancellationCalls = 0;

  async function createFixture(label: string, providerMode?: ProviderMode, workflowStatus = "REFUND_PROCESSING", nextRetryAt = new Date(Date.now() - 1000).toISOString()): Promise<Fixture> {
    const user = (await db.auth.admin.createUser({ email: `step-57d-45d-r10e-${Date.now()}-${fixtures.length}@local.test`, password: "local-test-password-r10e", email_confirm: true })).data.user;
    if (!user) throw new Error(`${label}: user`);
    const profile = (await db.from("profiles").insert({ user_id: user.id, label: `R10E ${label}`, relationship_type: "other", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false }).select("id").single()).data as { id: string };
    if (!profile) throw new Error(`${label}: profile`);
    const order = (await db.from("orders").insert({ user_id: user.id, profile_id: profile.id, product_id: "money-leak-risk", amount: 16900, status: "paid", payment_provider: "toss", transaction_id: `r10e-${label}`, paid_at: new Date().toISOString() }).select("id").single()).data as { id: string };
    if (!order) throw new Error(`${label}: order`);
    const payment = (await db.from("toss_payment_records").insert({ order_id: order.id, payment_key: `pay_r10e_${Date.now()}_${fixtures.length}`, provider_order_id: order.id, expected_amount: 16900, confirmed_amount: 16900, currency: "KRW", provider_status: "DONE", reconciliation_status: "externally_confirmed" }).select("id").single()).data as { id: string };
    if (!payment) throw new Error(`${label}: payment`);
    const purchase = (await db.from("purchases").insert({ user_id: user.id, profile_id: profile.id, product_id: "money-leak-risk", order_id: order.id }).select("id").single()).data as { id: string };
    if (!purchase) throw new Error(`${label}: purchase`);
    const entitlement = await db.from("entitlements").insert({ user_id: user.id, profile_id: profile.id, resource_id: "money-leak-risk", resource_type: "paid_analysis", is_active: true, source: "purchase", purchase_id: purchase.id });
    if (entitlement.error) throw entitlement.error;
    const workflow = (await db.from("refund_workflows").insert({ order_id: order.id, payment_record_id: payment.id, user_id: user.id, profile_id: profile.id, product_id: "money-leak-risk", requested_amount: 16900, currency: "KRW", reason_category: "CHANGE_OF_MIND", status: workflowStatus, next_retry_at: nextRetryAt }).select("id").single()).data as { id: string };
    if (!workflow) throw new Error(`${label}: workflow`);
    const fixture = { label, userId: user.id, profileId: profile.id, orderId: order.id, workflowId: workflow.id, providerMode };
    fixtures.push(fixture);
    return fixture;
  }

  function providerResponse(fixture: Fixture): Response {
    const mode = fixture.providerMode;
    if (mode === "temporary") return new Response(JSON.stringify({ code: "TEMPORARY_ERROR", message: "temporary" }), { status: 503 });
    if (mode === "malformed") return Response.json({ status: "CANCELED" });
    if (mode === "done") return Response.json({ paymentKey: "pay_r10e_provider", orderId: fixture.orderId, totalAmount: 16900, status: "DONE", currency: "KRW", cancels: [] });
    if (mode === "currency") return Response.json({ paymentKey: "pay_r10e_provider", orderId: fixture.orderId, totalAmount: 16900, status: "CANCELED", currency: "USD", cancels: [{ transactionKey: "tx_r10e", cancelAmount: 16900, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 0 }] });
    if (mode === "order") return Response.json({ paymentKey: "pay_r10e_provider", orderId: "wrong-order", totalAmount: 16900, status: "CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_r10e", cancelAmount: 16900, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 0 }] });
    if (mode === "amount") return Response.json({ paymentKey: "pay_r10e_provider", orderId: fixture.orderId, totalAmount: 15000, status: "CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_r10e", cancelAmount: 15000, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 0 }] });
    if (mode === "cancel-status") return Response.json({ paymentKey: "pay_r10e_provider", orderId: fixture.orderId, totalAmount: 16900, status: "CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_r10e", cancelAmount: 16900, cancelStatus: "PENDING", canceledAt: new Date().toISOString(), refundableAmount: 16900 }] });
    if (mode === "partial-status") return Response.json({ paymentKey: "pay_r10e_provider", orderId: fixture.orderId, totalAmount: 16900, status: "PARTIAL_CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_r10e", cancelAmount: 1000, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 15900 }] });
    return Response.json({ paymentKey: "pay_r10e_provider", orderId: fixture.orderId, totalAmount: 16900, status: "CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_r10e", cancelAmount: mode === "under-refund" ? 1000 : 16900, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 0 }] });
  }

  async function runFixture(fixture: Fixture): Promise<{ status: string; active: number; purchases: number }> {
    globalThis.fetch = async (input, init) => { const url = String(input); if (!url.includes("api.tosspayments.com")) return originalFetch(input, init); providerLookupCalls++; if (url.includes("/cancel")) providerCancellationCalls++; return providerResponse(fixture); };
    const workflow = await getRefundWorkflowForOrder(fixture.orderId);
    if (!workflow) throw new Error(`${fixture.label}: workflow read`);
    const claimed = await listRefundWorkflowsForReconciliation();
    const claimedWorkflow = claimed.find((item) => item.orderId === fixture.orderId);
    if (!claimedWorkflow) throw new Error(`${fixture.label}: due claim missing`);
    const result = await reconcileRefundWorkflow(claimedWorkflow);
    const active = (await db.from("entitlements").select("id").eq("user_id", fixture.userId).eq("profile_id", fixture.profileId).eq("is_active", true)).data ?? [];
    const purchases = (await db.from("purchases").select("id").eq("order_id", fixture.orderId)).data ?? [];
    return { status: result.status, active: active.length, purchases: purchases.length };
  }

  try {
    const retry = await createFixture("R10E_RETRYABLE_FAILURE", "temporary", "REFUND_FAILED_RETRYING", new Date(Date.now() - 1000).toISOString());
    const retryResult = await runFixture(retry);
    assert(retryResult.status === "REFUND_FAILED_RETRYING", "retryable failure status");
    const retryRow = await getRefundWorkflowForOrder(retry.orderId);
    if (!retryRow) throw new Error("retry workflow missing");
    assert(new Date(retryRow.nextRetryAt).getTime() > Date.now() && retryRow.retryCount === 1, "retry backoff persisted");
    const notDue = await listRefundWorkflowsForReconciliation();
    assert(!notDue.some((item) => item.orderId === retry.orderId), "future retry excluded");
    await db.from("refund_workflows").update({ next_retry_at: new Date(Date.now() - 1000).toISOString(), reconciliation_claim_expires_at: new Date(Date.now() - 1000).toISOString(), max_retry_count: 2 }).eq("order_id", retry.orderId);
    const second = await runFixture(retry);
    assert(second.status === "OWNER_REVIEW_REQUIRED", "retry exhaustion escalates");
    const exhausted = await getRefundWorkflowForOrder(retry.orderId);
    if (!exhausted) throw new Error("exhausted workflow missing");
    assert(exhausted.retryCount === 2 && exhausted.lastAttemptAt !== null && new Date(exhausted.lastAttemptAt).getTime() > 0, "due reclaim records second attempt");
    assert((await listRefundWorkflowsForReconciliation()).every((item) => item.orderId !== retry.orderId), "exhausted workflow excluded");

    const modes: ProviderMode[] = ["amount", "currency", "order", "done", "cancel-status", "partial-status", "under-refund", "malformed"];
    for (const mode of modes) {
      const fixture = await createFixture(`R10E_MISMATCH_${mode}`, mode);
      const result = await runFixture(fixture);
      assert(result.status !== "REFUND_COMPLETED", `${mode}: must fail closed`);
      assert(result.active === 1 && result.purchases === 1, `${mode}: access and purchase must remain`);
    }
    globalThis.fetch = originalFetch;
    console.log(JSON.stringify({ retryExhaustion: "verified", mismatchMatrix: "verified", ownerReviewExclusion: true, notDueExclusion: true, dueReclaim: true, providerLookupCalls, providerCancellationCalls }));
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupSyntheticFixtures();
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
