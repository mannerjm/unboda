import { createAdminClient } from "../app/lib/supabase/admin";
import { getRefundWorkflowForOrder } from "../app/lib/refunds/server";
import { getActiveEntitlementForProfile, getTossPaymentRecordForOrder } from "../app/lib/purchases/server";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
const db = createAdminClient();
let userId = "";
let profileId = "";
let orderId = "";

async function snapshot(label: string): Promise<void> {
  const order = (await db.from("orders").select("id,status").eq("id", orderId).single()).data as { id: string; status: string } | null;
  const payment = (await db.from("toss_payment_records").select("order_id,provider_status,reconciliation_status").eq("order_id", orderId).single()).data as { order_id: string; provider_status: string; reconciliation_status: string } | null;
  const refund = (await db.from("refund_workflows").select("id,order_id,status").eq("order_id", orderId).single()).data as { id: string; order_id: string; status: string } | null;
  const purchase = (await db.from("purchases").select("id,order_id,profile_id,product_id").eq("order_id", orderId).single()).data as { id: string; order_id: string; profile_id: string; product_id: string } | null;
  const entitlement = (await db.from("entitlements").select("id,profile_id,resource_id,is_active,purchase_id").eq("user_id", userId).eq("profile_id", profileId).eq("resource_id", "money-leak-risk").single()).data as { id: string; profile_id: string; resource_id: string; is_active: boolean; purchase_id: string | null } | null;
  console.log(JSON.stringify({ label, order, payment, refund, purchase, entitlement }));
  assert(order?.id === orderId && order.status === "paid", `${label}: order identity/status`);
  assert(payment?.order_id === orderId && payment.provider_status === "DONE", `${label}: provider payment status`);
  assert(refund?.order_id === orderId && ["REFUND_PROCESSING", "REFUND_COMPLETED"].includes(refund.status), `${label}: refund workflow status ${refund?.status}`);
  assert(purchase?.order_id === orderId && purchase.profile_id === profileId, `${label}: purchase identity`);
  assert(entitlement?.profile_id === profileId && entitlement.is_active, `${label}: entitlement identity`);
}

async function main(): Promise<void> {
  const { data: userData, error: userError } = await db.auth.admin.createUser({ email: `step-57d-45d-r3-${Date.now()}@local.test`, password: "local-test-password-r3", email_confirm: true });
  if (userError || !userData.user) throw userError ?? new Error("user fixture failed");
  userId = userData.user.id;
  try {
    const { data: profile, error: profileError } = await db.from("profiles").insert({ user_id: userId, label: "STEP 57D 45D R3 fixture", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false }).select("id").single<{ id: string }>();
    if (profileError || !profile) throw profileError ?? new Error("profile fixture failed");
    profileId = profile.id;
    const { data: order, error: orderError } = await db.from("orders").insert({ user_id: userId, profile_id: profileId, product_id: "money-leak-risk", amount: 16900, status: "paid", payment_provider: "toss", transaction_id: "r3-fixture", paid_at: new Date().toISOString() }).select("id").single<{ id: string }>();
    if (orderError || !order) throw orderError ?? new Error("order fixture failed");
    orderId = order.id;
    const { data: payment, error: paymentError } = await db.from("toss_payment_records").insert({ order_id: orderId, payment_key: "pay_r3_fixture", provider_order_id: orderId, expected_amount: 16900, confirmed_amount: 16900, currency: "KRW", provider_status: "DONE", reconciliation_status: "externally_confirmed" }).select("id").single<{ id: string }>();
    if (paymentError || !payment) throw paymentError ?? new Error("payment fixture failed");
    const { error: purchaseError } = await db.from("purchases").insert({ user_id: userId, profile_id: profileId, product_id: "money-leak-risk", order_id: orderId });
    if (purchaseError) throw purchaseError;
    const { error: entitlementError } = await db.from("entitlements").insert({ user_id: userId, profile_id: profileId, resource_id: "money-leak-risk", resource_type: "paid_analysis", is_active: true, source: "purchase", purchase_id: null });
    if (entitlementError) throw entitlementError;
    const { data: workflow, error: workflowError } = await db.from("refund_workflows").insert({ order_id: orderId, payment_record_id: payment.id, user_id: userId, profile_id: profileId, product_id: "money-leak-risk", requested_amount: 16900, currency: "KRW", reason_category: "CHANGE_OF_MIND", status: "REFUND_PROCESSING", next_retry_at: new Date(Date.now() - 1000).toISOString() }).select("id").single<{ id: string }>();
    if (workflowError || !workflow) throw workflowError ?? new Error("workflow fixture failed");
    await snapshot("after-create-before-provider-mock");
    const paymentDomain = await getTossPaymentRecordForOrder(orderId);
    const refundDomain = await getRefundWorkflowForOrder(orderId);
    const entitlementDomain = await getActiveEntitlementForProfile(userId, profileId, "money-leak-risk");
    console.log(JSON.stringify({ label: "repository-reads", paymentProviderStatus: paymentDomain?.providerStatus, refundWorkflowStatus: refundDomain?.status, entitlementActive: Boolean(entitlementDomain) }));
    assert(paymentDomain?.providerStatus === "DONE", "repository provider status must stay DONE");
    assert(refundDomain?.status === "REFUND_PROCESSING", `repository refund status must stay internal: ${refundDomain?.status}`);
    const claim = await db.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 });
    console.log(JSON.stringify({ label: "raw-claim", rows: (claim.data ?? []).map((row: any) => ({ id: row.id, order_id: row.order_id, status: row.status, provider_status: row.provider_status })) }));
    assert(!claim.error, `claim RPC failed: ${claim.error?.message}`);
    await snapshot("after-claim-before-worker");
    const postClaim = await getRefundWorkflowForOrder(orderId);
    assert(postClaim?.status === "REFUND_PROCESSING", `post-claim repository refund status: ${postClaim?.status}`);
    console.log("refund R3 full fixture trace passed");
  } finally {
    const orders = (await db.from("orders").select("id").eq("user_id", userId)).data ?? [];
    const ids = orders.map((row: any) => row.id);
    await db.from("refund_workflows").delete().eq("user_id", userId);
    if (ids.length) await db.from("toss_payment_records").delete().in("order_id", ids);
    await db.from("purchases").delete().eq("user_id", userId);
    await db.from("entitlements").delete().eq("user_id", userId);
    await db.from("orders").delete().eq("user_id", userId);
    await db.from("profiles").delete().eq("user_id", userId);
    await db.auth.admin.deleteUser(userId);
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
