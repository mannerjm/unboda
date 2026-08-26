import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

type Fixture = {
  label: string;
  userId: string;
  profileId: string;
  orderId: string;
  workflowId: string;
  entitlement: boolean;
};

function loadEnvFile(path: string): void {
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

function loadDisposableRuntime(): void {
  const values: Record<string, string> = {};
  const runtimePath = "supabase-r6-disposable/supabase/.temp/start-secrets/supabase_edge_runtime_unboda-r6-disposable/env/docker.env";
  const output = readFileSync(runtimePath, "utf8");
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  assert(values.SUPABASE_INTERNAL_HOST_PORT === "55321", "R6B disposable identity must use host port 55321");
  assert(values.SUPABASE_DB_URL.includes("supabase_db_unboda-r6-disposable"), "R6B must use the disposable database container");
  assert(Boolean(values.SUPABASE_SERVICE_ROLE_KEY), "disposable service role key must exist");
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = values.SUPABASE_INTERNAL_PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = values.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = values.SUPABASE_ANON_KEY;
  loadEnvFile(".env.local");
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = values.SUPABASE_INTERNAL_PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = values.SUPABASE_SERVICE_ROLE_KEY;
  process.env.PAYMENT_RECONCILIATION_SECRET = process.env.PAYMENT_RECONCILIATION_SECRET || "r6b-local-scheduler-secret";
  assert(process.env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:55321", "environment must remain disposable after env load");
}

async function main(): Promise<void> {
  loadDisposableRuntime();
  const { createAdminClient } = await import("../app/lib/supabase/admin");
  const { getRefundWorkflowForOrder, listRefundWorkflowsForReconciliation, reconcileRefundWorkflow } = await import("../app/lib/refunds/server");
  const { getRefundCustomerMessage } = await import("../app/lib/refunds/status");
  const db = createAdminClient();
  const initial = (await db.from("orders").select("id")).data ?? [];
  const initialPurchases = (await db.from("purchases").select("id")).data ?? [];
  const initialEntitlements = (await db.from("entitlements").select("id")).data ?? [];
  const initialPayments = (await db.from("toss_payment_records").select("id")).data ?? [];
  const initialRefunds = (await db.from("refund_workflows").select("id")).data ?? [];
  assert(initial.length === 0 && initialPurchases.length === 0 && initialEntitlements.length === 0 && initialPayments.length === 0 && initialRefunds.length === 0, "disposable financial state must be empty before fixtures");

  const fixtures: Fixture[] = [];
  async function createFixture(label: string, workflowStatus: string, due: boolean, withEntitlement: boolean): Promise<Fixture> {
    const user = (await db.auth.admin.createUser({ email: `step-57d-r6b-${Date.now()}-${fixtures.length}@local.test`, password: "local-test-password-r6b", email_confirm: true })).data.user;
    if (!user) throw new Error(`${label}: user fixture failed`);
    const profile = (await db.from("profiles").insert({ user_id: user.id, label: `R6B ${label}`, relationship_type: "other", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false }).select("id").single()).data as { id: string };
    if (!profile) throw new Error(`${label}: profile fixture failed`);
    const order = (await db.from("orders").insert({ user_id: user.id, profile_id: profile.id, product_id: "money-leak-risk", amount: 16900, status: "paid", payment_provider: "toss", transaction_id: `r6b-${label}`, paid_at: new Date().toISOString() }).select("id").single()).data as { id: string };
    if (!order) throw new Error(`${label}: order fixture failed`);
    const payment = (await db.from("toss_payment_records").insert({ order_id: order.id, payment_key: `pay_r6b_${Date.now()}_${fixtures.length}`, provider_order_id: order.id, expected_amount: 16900, confirmed_amount: 16900, currency: "KRW", provider_status: "DONE", reconciliation_status: "externally_confirmed" }).select("id").single()).data as { id: string };
    if (!payment) throw new Error(`${label}: payment fixture failed`);
    const purchase = (await db.from("purchases").insert({ user_id: user.id, profile_id: profile.id, product_id: "money-leak-risk", order_id: order.id }).select("id").single()).data as { id: string };
    if (!purchase) throw new Error(`${label}: purchase fixture failed`);
    if (withEntitlement) {
      const entitlement = await db.from("entitlements").insert({ user_id: user.id, profile_id: profile.id, resource_id: "money-leak-risk", resource_type: "paid_analysis", is_active: true, source: "purchase", purchase_id: purchase.id });
      if (entitlement.error) throw entitlement.error;
    }
    const workflow = (await db.from("refund_workflows").insert({ order_id: order.id, payment_record_id: payment.id, user_id: user.id, profile_id: profile.id, product_id: "money-leak-risk", requested_amount: 16900, currency: "KRW", reason_category: "CHANGE_OF_MIND", status: workflowStatus, next_retry_at: due ? new Date(Date.now() - 1000).toISOString() : new Date(Date.now() + 3600000).toISOString() }).select("id").single()).data as { id: string };
    if (!workflow) throw new Error(`${label}: workflow fixture failed`);
    const result = { label, userId: user.id, profileId: profile.id, orderId: order.id, workflowId: workflow.id, entitlement: withEntitlement };
    fixtures.push(result);
    return result;
  }

  async function cleanup(): Promise<void> {
    const users = (await db.auth.admin.listUsers()).data.users.filter((user) => user.email?.startsWith("step-57d-r6b-"));
    for (const user of users) {
      const orders = (await db.from("orders").select("id").eq("user_id", user.id)).data ?? [];
      const orderIds = orders.map((row: { id: string }) => row.id);
      await db.from("refund_workflows").delete().eq("user_id", user.id);
      if (orderIds.length) await db.from("toss_payment_records").delete().in("order_id", orderIds);
      await db.from("purchases").delete().eq("user_id", user.id);
      await db.from("entitlements").delete().eq("user_id", user.id);
      await db.from("orders").delete().eq("user_id", user.id);
      await db.from("profiles").delete().eq("user_id", user.id);
      await db.auth.admin.deleteUser(user.id);
    }
  }

  try {
    const success = await createFixture("R6B_PERSISTENCE_FAILURE", "REFUND_PROCESSING", true, true);
    const originalFetch = globalThis.fetch;
    let providerLookupCalls = 0;
    let providerCancellationCalls = 0;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (!url.includes("api.tosspayments.com")) return originalFetch(input, init);
      providerLookupCalls += 1;
      if (url.includes("/cancel")) providerCancellationCalls += 1;
      return Response.json({ paymentKey: "pay_r6b_provider", orderId: success.orderId, totalAmount: 16900, status: "CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_r6b_provider", cancelAmount: 16900, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 0 }] });
    };
    const [claimA, claimB] = await Promise.all([
      db.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 }),
      db.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 }),
    ]);
    const rowsA = Array.isArray(claimA.data) ? claimA.data : [];
    const rowsB = Array.isArray(claimB.data) ? claimB.data : [];
    assert(!claimA.error && !claimB.error && rowsA.length + rowsB.length === 1, "concurrent claim must produce exactly one winner");
    const workflow = await getRefundWorkflowForOrder(success.orderId);
    if (!workflow) throw new Error("claimed workflow not found");
    const completed = await reconcileRefundWorkflow(workflow);
    assert(completed.status === "REFUND_COMPLETED", "provider cancellation lookup must converge");
    assert(providerCancellationCalls === 0 && providerLookupCalls === 1, "reconciliation must use one lookup and zero cancel calls");
    const activeAfter = (await db.from("entitlements").select("id").eq("user_id", success.userId).eq("profile_id", success.profileId).eq("is_active", true)).data ?? [];
    assert(activeAfter.length === 0, "provider-confirmed recovery must revoke access");

    const mismatch = await createFixture("R6B_MISMATCH", "REFUND_PROCESSING", true, true);
    globalThis.fetch = async (input, init) => String(input).includes("api.tosspayments.com") ? Response.json({ paymentKey: "pay_r6b_mismatch", orderId: mismatch.orderId, totalAmount: 16900, status: "DONE", currency: "KRW", cancels: [] }) : originalFetch(input, init);
    const mismatchResult = await reconcileRefundWorkflow((await getRefundWorkflowForOrder(mismatch.orderId))!);
    assert(mismatchResult.status === "OWNER_REVIEW_REQUIRED", "provider DONE mismatch must escalate");
    const mismatchActive = (await db.from("entitlements").select("id").eq("user_id", mismatch.userId).eq("profile_id", mismatch.profileId).eq("is_active", true)).data ?? [];
    assert(mismatchActive.length === 1, "mismatch must not revoke entitlement");

    const retry = await createFixture("R6B_RETRY", "REFUND_FAILED_RETRYING", true, true);
    globalThis.fetch = async (input, init) => String(input).includes("api.tosspayments.com") ? new Response(JSON.stringify({ code: "TEMPORARY_ERROR", message: "temporary" }), { status: 503 }) : originalFetch(input, init);
    const retryResult = await reconcileRefundWorkflow((await getRefundWorkflowForOrder(retry.orderId))!);
    assert(retryResult.status === "REFUND_FAILED_RETRYING" && retryResult.retryCount === 1, "temporary lookup must schedule bounded retry");

    const completedFixture = await createFixture("R6B_COMPLETED", "REFUND_COMPLETED", true, false);
    const ownerFixture = await createFixture("R6B_OWNER_REVIEW", "OWNER_REVIEW_REQUIRED", true, false);
    assert((await getRefundWorkflowForOrder(completedFixture.orderId))?.status === "REFUND_COMPLETED", "completed fixture must remain terminal");
    assert((await getRefundWorkflowForOrder(ownerFixture.orderId))?.status === "OWNER_REVIEW_REQUIRED", "owner review fixture must remain terminal");
    globalThis.fetch = originalFetch;
    for (const status of ["REFUND_REQUESTED", "REFUND_PROCESSING", "REFUND_COMPLETED", "REFUND_FAILED_RETRYING", "OWNER_REVIEW_REQUIRED"] as const) assert(getRefundCustomerMessage(status).length > 0, `CS status message missing: ${status}`);
    const claimedRemaining = await listRefundWorkflowsForReconciliation();
    assert(claimedRemaining.every((item) => item.status !== "REFUND_COMPLETED" && item.status !== "OWNER_REVIEW_REQUIRED"), "terminal workflows must be excluded");
    console.log(JSON.stringify({ matrix: "partial", providerLookupCalls, providerCancellationCalls, concurrentClaims: rowsA.length + rowsB.length, completed: completed.status, mismatch: mismatchResult.status, retry: retryResult.status, persistenceFailureRecovery: "not_injected", entitlementFailureRecovery: "not_injected", processInterruption: "not_injected", leaseReclaim: "not_injected", schedulerHttp: "not_run" }));
    console.log("R6B disposable refund recovery matrix completed with remaining proof blockers");
  } finally {
    await cleanup();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
