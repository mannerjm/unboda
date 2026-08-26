import { createAdminClient } from "../app/lib/supabase/admin";
import { getRefundWorkflowForOrder, reconcileRefundWorkflow, listRefundWorkflowsForReconciliation } from "../app/lib/refunds/server";
import type { RefundWorkflowRecord } from "../app/lib/purchases/types";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }

const PRODUCT_ID = "money-leak-risk";
const AMOUNT = 16900;
const supabase = createAdminClient();
let userId = "";
let profileId = "";
const orderIds: string[] = [];

async function createFixture(status: string, nextRetryAt: string, withEntitlement = false): Promise<string> {
  const { data: order, error: orderError } = await supabase.from("orders").insert({
    user_id: userId, profile_id: profileId, product_id: PRODUCT_ID, amount: AMOUNT,
    status: "paid", payment_provider: "toss", transaction_id: `fixture-${Date.now()}-${orderIds.length}`,
    paid_at: new Date().toISOString(),
  }).select("id").single<{ id: string }>();
  if (orderError || !order) throw orderError ?? new Error("fixture order missing");
  orderIds.push(order.id);
  const { data: payment, error: paymentError } = await supabase.from("toss_payment_records").insert({
    order_id: order.id, payment_key: `pay_fixture_${order.id}`, provider_order_id: order.id,
    expected_amount: AMOUNT, confirmed_amount: AMOUNT, currency: "KRW", provider_status: "DONE",
    reconciliation_status: "externally_confirmed",
  }).select("id").single<{ id: string }>();
  if (paymentError || !payment) throw paymentError ?? new Error("fixture payment missing");
  await supabase.from("purchases").insert({ user_id: userId, profile_id: profileId, product_id: PRODUCT_ID, order_id: order.id });
  if (withEntitlement) await supabase.from("entitlements").insert({ user_id: userId, profile_id: profileId, resource_id: PRODUCT_ID, resource_type: "paid_analysis", is_active: true, source: "purchase", purchase_id: null });
  const { error: refundError } = await supabase.from("refund_workflows").insert({
    order_id: order.id, payment_record_id: payment.id, user_id: userId, profile_id: profileId,
    product_id: PRODUCT_ID, requested_amount: AMOUNT, currency: "KRW", reason_category: "CHANGE_OF_MIND",
    status, next_retry_at: nextRetryAt,
  });
  if (refundError) throw refundError;
  return order.id;
}

async function main(): Promise<void> {
  const email = `step-57d-45d-${Date.now()}@local.test`;
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({ email, password: "local-test-password-57d45d", email_confirm: true });
  if (userError || !userData.user) throw userError ?? new Error("fixture user missing");
  userId = userData.user.id;
  try {
    const { data: profile, error: profileError } = await supabase.from("profiles").insert({ user_id: userId, label: "STEP 57D 45D fixture", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false }).select("id").single<{ id: string }>();
    if (profileError || !profile) throw profileError ?? new Error("fixture profile missing");
    profileId = profile.id;

    const eligibleOrder = await createFixture("REFUND_PROCESSING", new Date(Date.now() - 1000).toISOString(), true);
    const { data: insertedWorkflow } = await supabase.from("refund_workflows").select("status").eq("order_id", eligibleOrder).single<{ status: string }>();
    assert(insertedWorkflow?.status === "REFUND_PROCESSING", `fixture insert must preserve internal status: ${insertedWorkflow?.status}`);
    await createFixture("REFUND_PROCESSING", new Date(Date.now() + 3600000).toISOString());
    await createFixture("REFUND_FAILED_RETRYING", new Date(Date.now() + 3600000).toISOString());
    await createFixture("OWNER_REVIEW_REQUIRED", new Date(Date.now() - 1000).toISOString());
    await createFixture("REFUND_COMPLETED", new Date(Date.now() - 1000).toISOString());
    const beforeAll = await supabase.from("refund_workflows").select("order_id,status").in("order_id", orderIds);
    assert((beforeAll.data ?? []).every((row: any) => ["REFUND_PROCESSING", "REFUND_FAILED_RETRYING", "OWNER_REVIEW_REQUIRED", "REFUND_COMPLETED"].includes(row.status)), `fixture statuses before claim invalid: ${JSON.stringify(beforeAll.data)}`);

    const [claimA, claimB] = await Promise.all([
      supabase.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 }),
      supabase.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 }),
    ]);
    const claimedRows = [...(claimA.data ?? []), ...(claimB.data ?? [])] as Array<{ id: string }>;
    assert(claimedRows.length === 1, `concurrent workers must claim exactly one row: ${JSON.stringify(claimedRows)}`);
    assert(claimA.error === null && claimB.error === null, "claim RPC must succeed concurrently");
    assert(claimedRows[0].id.length > 0, "claim must return workflow identity");
    const afterAll = await supabase.from("refund_workflows").select("order_id,status").in("order_id", orderIds);
    assert((afterAll.data ?? []).every((row: any) => ["REFUND_PROCESSING", "REFUND_FAILED_RETRYING", "OWNER_REVIEW_REQUIRED", "REFUND_COMPLETED"].includes(row.status)), `fixture statuses after claim invalid: ${JSON.stringify(afterAll.data)}`);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ paymentKey: "pay_fixture", orderId: eligibleOrder, totalAmount: AMOUNT, status: "CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_fixture", cancelAmount: AMOUNT, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 0 }] });
    const { data: rawWorkflow, error: rawWorkflowError } = await supabase.from("refund_workflows").select("id,order_id,status,reconciliation_claim_token").eq("order_id", eligibleOrder).single<any>();
    if (rawWorkflowError || !rawWorkflow) throw rawWorkflowError ?? new Error("raw workflow missing");
    assert(rawWorkflow.status === "REFUND_PROCESSING", `fixture refund status must remain internal: ${rawWorkflow.status}`);
    const claimedWorkflow = await getRefundWorkflowForOrder(eligibleOrder);
    if (!claimedWorkflow) throw new Error("claimed workflow missing");
    assert(["REFUND_REQUESTED", "REFUND_PROCESSING", "REFUND_FAILED_RETRYING"].includes(claimedWorkflow.status), `mapped refund workflow status must remain internal: ${claimedWorkflow.status}`);
    const converged = await reconcileRefundWorkflow(claimedWorkflow);
    assert(converged.status === "REFUND_COMPLETED", `provider CANCELED fixture must converge: ${JSON.stringify({ claimedStatus: claimedWorkflow.status, returnedStatus: converged.status, providerStatus: converged.providerStatus, lastError: converged.lastProviderErrorCode })}`);
    const { data: active } = await supabase.from("entitlements").select("id").eq("user_id", userId).eq("profile_id", profileId).eq("is_active", true);
    assert((active ?? []).length === 0, "convergence must revoke entitlement");
    globalThis.fetch = originalFetch;

    const due = await listRefundWorkflowsForReconciliation();
    assert(due.every((workflow) => workflow.status === "REFUND_PROCESSING" || workflow.status === "REFUND_FAILED_RETRYING"), "claim list must exclude terminal workflows");
    console.log("refund reconciliation DB integration regression passed");
  } finally {
    await supabase.from("refund_workflows").delete().eq("user_id", userId);
    await supabase.from("toss_payment_records").delete().in("order_id", orderIds);
    await supabase.from("purchases").delete().eq("user_id", userId);
    await supabase.from("entitlements").delete().eq("user_id", userId);
    await supabase.from("orders").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", profileId);
    await supabase.auth.admin.deleteUser(userId);
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });