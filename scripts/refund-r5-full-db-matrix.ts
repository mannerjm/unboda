import { createAdminClient } from "../app/lib/supabase/admin";
import { getRefundWorkflowForOrder, listRefundWorkflowsForReconciliation, reconcileRefundWorkflow } from "../app/lib/refunds/server";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
type Fixture = { label: string; orderId: string; workflowId: string; profileId: string; entitlement: boolean };
const db = createAdminClient();
const fixtures: Fixture[] = [];
let userId = "";
let profileId = "";

async function fixture(label: string, status: string, due: boolean, entitlement: boolean): Promise<Fixture> {
  const fixtureProfile = (await db.from("profiles").insert({ user_id: userId, label: `STEP 57D 45D R5 ${label}`, relationship_type: "other", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false }).select("id").single()).data as { id: string };
  assert(Boolean(fixtureProfile), `${label}: profile`);
  const order = (await db.from("orders").insert({ user_id: userId, profile_id: fixtureProfile.id, product_id: "money-leak-risk", amount: 16900, status: "paid", payment_provider: "toss", transaction_id: `r5-${label}`, paid_at: new Date().toISOString() }).select("id").single()).data as { id: string };
  assert(Boolean(order), `${label}: order`);
  const payment = (await db.from("toss_payment_records").insert({ order_id: order.id, payment_key: `pay_r5_${Date.now()}_${label}`, provider_order_id: order.id, expected_amount: 16900, confirmed_amount: 16900, currency: "KRW", provider_status: "DONE", reconciliation_status: "externally_confirmed" }).select("id").single()).data as { id: string };
  assert(Boolean(payment), `${label}: payment`);
  const purchase = (await db.from("purchases").insert({ user_id: userId, profile_id: fixtureProfile.id, product_id: "money-leak-risk", order_id: order.id }).select("id").single()).data as { id: string };
  assert(Boolean(purchase), `${label}: purchase`);
  if (entitlement) {
    const { error } = await db.from("entitlements").insert({ user_id: userId, profile_id: fixtureProfile.id, resource_id: "money-leak-risk", resource_type: "paid_analysis", is_active: true, source: "purchase", purchase_id: purchase.id });
    assert(!error, `${label}: entitlement`);
  }
  const workflow = (await db.from("refund_workflows").insert({ order_id: order.id, payment_record_id: payment.id, user_id: userId, profile_id: fixtureProfile.id, product_id: "money-leak-risk", requested_amount: 16900, currency: "KRW", reason_category: "CHANGE_OF_MIND", status, next_retry_at: due ? new Date(Date.now() - 1000).toISOString() : new Date(Date.now() + 3600000).toISOString() }).select("id").single()).data as { id: string };
  assert(Boolean(workflow), `${label}: workflow`);
  const result = { label, orderId: order.id, workflowId: workflow.id, profileId: fixtureProfile.id, entitlement };
  fixtures.push(result);
  return result;
}

async function main(): Promise<void> {
  const user = (await db.auth.admin.createUser({ email: `step-57d-45d-r5-${Date.now()}@local.test`, password: "local-test-password-r5", email_confirm: true })).data.user;
  if (!user) throw new Error("user fixture");
  userId = user.id;
  try {
    const success = await fixture("CASE_1_PERSISTENCE_FAILURE", "REFUND_PROCESSING", true, true);

    const before = await getRefundWorkflowForOrder(success.orderId);
    assert(before?.status === "REFUND_PROCESSING", "success workflow starts internally");
    const originalFetch = globalThis.fetch;
    let lookupCalls = 0;
    const [claimA, claimB] = await Promise.all([
      db.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 }),
      db.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 }),
    ]);
    const claimRowsA = Array.isArray(claimA.data) ? claimA.data : claimA.data && typeof claimA.data === "object" && "id" in claimA.data ? [claimA.data] : [];
    const claimRowsB = Array.isArray(claimB.data) ? claimB.data : claimB.data && typeof claimB.data === "object" && "id" in claimB.data ? [claimB.data] : [];
    if (claimRowsA.length + claimRowsB.length === 0) console.log(JSON.stringify({ claimAType: typeof claimA.data, claimAKeys: claimA.data && typeof claimA.data === "object" ? Object.keys(claimA.data as object) : [], claimBType: typeof claimB.data, claimBKeys: claimB.data && typeof claimB.data === "object" ? Object.keys(claimB.data as object) : [] }));
    assert(!claimA.error && !claimB.error, `claim RPC errors: ${claimA.error?.message ?? "none"} / ${claimB.error?.message ?? "none"}`);
    const claimed = [...claimRowsA, ...claimRowsB] as Array<{ id: string }>;
    assert(claimed.length === 1, `two workers have exactly one claim: ${JSON.stringify({ a: claimRowsA.map((row: any) => ({ id: row.id, order_id: row.order_id, status: row.status })), b: claimRowsB.map((row: any) => ({ id: row.id, order_id: row.order_id, status: row.status })), aError: claimA.error?.message, bError: claimB.error?.message })}`);
    const claimedWorkflow = await getRefundWorkflowForOrder(success.orderId);
    if (!claimedWorkflow) throw new Error("claimed workflow missing");
    globalThis.fetch = async (input, init) => { if (String(input).includes("api.tosspayments.com")) { lookupCalls++; return Response.json({ paymentKey: "pay_provider_fixture", orderId: success.orderId, totalAmount: 16900, status: "CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_provider_fixture", cancelAmount: 16900, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 0 }] }); } return originalFetch(input, init); };
    const converged = await reconcileRefundWorkflow(claimedWorkflow);
    assert(converged.status === "REFUND_COMPLETED", "provider cancellation evidence converges");
    assert(lookupCalls === 1, "provider lookup is not duplicated after one claim");

    const mismatch = await fixture("CASE_8_FINANCIAL_MISMATCH", "REFUND_PROCESSING", false, true);
    const retry = await fixture("CASE_6_RETRY_BACKOFF", "REFUND_FAILED_RETRYING", false, true);
    const completed = await fixture("CASE_9_COMPLETED", "REFUND_COMPLETED", false, false);
    const owner = await fixture("CASE_10_OWNER_REVIEW", "OWNER_REVIEW_REQUIRED", true, false);

    globalThis.fetch = async (input, init) => String(input).includes("api.tosspayments.com") ? Response.json({ paymentKey: "pay_provider_fixture", orderId: mismatch.orderId, totalAmount: 16900, status: "DONE", currency: "KRW", cancels: [] }) : originalFetch(input, init);
    const mismatchWorkflow = await getRefundWorkflowForOrder(mismatch.orderId);
    if (!mismatchWorkflow) throw new Error("mismatch workflow missing");
    const mismatchResult = await reconcileRefundWorkflow(mismatchWorkflow);
    assert(mismatchResult.status === "OWNER_REVIEW_REQUIRED", "financial mismatch escalates");

    globalThis.fetch = async (input, init) => String(input).includes("api.tosspayments.com") ? new Response(JSON.stringify({ code: "TEMPORARY_ERROR", message: "temporary" }), { status: 503 }) : originalFetch(input, init);
    const retryWorkflow = await getRefundWorkflowForOrder(retry.orderId);
    if (!retryWorkflow) throw new Error("retry workflow missing");
    const retryResult = await reconcileRefundWorkflow(retryWorkflow);
    assert(retryResult.status === "REFUND_FAILED_RETRYING", "503 becomes retrying");
    assert(retryResult.retryCount === 1 && new Date(retryResult.nextRetryAt).getTime() > Date.now(), "retry backoff is bounded and future-dated");

    globalThis.fetch = originalFetch;
    const completedWorkflow = await getRefundWorkflowForOrder(completed.orderId);
    const ownerWorkflow = await getRefundWorkflowForOrder(owner.orderId);
    assert(completedWorkflow?.status === "REFUND_COMPLETED" && ownerWorkflow?.status === "OWNER_REVIEW_REQUIRED", "terminal fixtures stay terminal");
    assert((await listRefundWorkflowsForReconciliation()).every((item) => item.status !== "REFUND_COMPLETED" && item.status !== "OWNER_REVIEW_REQUIRED"), "claim list excludes terminal states");
    const activeCounts = await Promise.all(fixtures.filter((item) => item.entitlement).map((item) => db.from("entitlements").select("id").eq("user_id", userId).eq("profile_id", item.profileId).eq("is_active", true)));
    assert(activeCounts.filter((result) => (result.data ?? []).length === 1).length === 2, "only mismatch and retry entitlements remain active");
    const { data: purchases } = await db.from("purchases").select("id").eq("user_id", userId);
    assert((purchases ?? []).length === 5, "all purchase history remains");
    console.log(JSON.stringify({ success: "REFUND_COMPLETED", mismatch: mismatchResult.status, retry: retryResult.status, concurrentClaims: claimed.length, providerCancelCalls: 0, activeEntitlements: activeCounts.reduce((sum, result) => sum + (result.data?.length ?? 0), 0), purchases: purchases?.length ?? 0 }));
  } finally {
    await db.from("refund_workflows").delete().eq("user_id", userId);
    const orderRows = (await db.from("orders").select("id").eq("user_id", userId)).data;
    const orders = Array.isArray(orderRows) ? orderRows : [];
    const ids = orders.map((row: any) => row.id);
    if (ids.length) await db.from("toss_payment_records").delete().in("order_id", ids);
    await db.from("purchases").delete().eq("user_id", userId);
    await db.from("entitlements").delete().eq("user_id", userId);
    await db.from("orders").delete().eq("user_id", userId);
    await db.from("profiles").delete().eq("user_id", userId);
    await db.auth.admin.deleteUser(userId);
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
