import { createAdminClient } from "../app/lib/supabase/admin";
import { getRefundWorkflowForOrder } from "../app/lib/refunds/server";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
type Fixture = { label: string; orderId: string; workflowId: string; expectedProviderStatus: "DONE" | "CANCELED" };
const db = createAdminClient();
const fixtures: Fixture[] = [];
let userId = "";
let profileId = "";

async function createFixture(label: string, expectedProviderStatus: "DONE" | "CANCELED", due: boolean): Promise<void> {
  const order = (await db.from("orders").insert({ user_id: userId, profile_id: profileId, product_id: "money-leak-risk", amount: 16900, status: "paid", payment_provider: "toss", transaction_id: `r4-${label}`, paid_at: new Date().toISOString() }).select("id").single()).data as { id: string };
  assert(Boolean(order), `${label}: order created`);
  const payment = (await db.from("toss_payment_records").insert({ order_id: order.id, payment_key: `pay_${label}`, provider_order_id: order.id, expected_amount: 16900, confirmed_amount: 16900, currency: "KRW", provider_status: "DONE", reconciliation_status: "externally_confirmed" }).select("id").single()).data as { id: string };
  assert(Boolean(payment), `${label}: payment created`);
  const workflow = (await db.from("refund_workflows").insert({ order_id: order.id, payment_record_id: payment.id, user_id: userId, profile_id: profileId, product_id: "money-leak-risk", requested_amount: 16900, currency: "KRW", reason_category: "CHANGE_OF_MIND", status: "REFUND_PROCESSING", next_retry_at: due ? new Date(Date.now() - 1000).toISOString() : new Date(Date.now() + 3600000).toISOString() }).select("id").single()).data as { id: string };
  assert(Boolean(workflow), `${label}: workflow created`);
  fixtures.push({ label, orderId: order.id, workflowId: workflow.id, expectedProviderStatus });
}

async function trace(label: string): Promise<void> {
  const fixture = fixtures.find((item) => item.label === label)!;
  const row = (await db.from("refund_workflows").select("id,order_id,status").eq("id", fixture.workflowId).single()).data as { id: string; order_id: string; status: string };
  assert(row.id === fixture.workflowId && row.order_id === fixture.orderId, `${label}: identity remains stable`);
  assert(row.status === "REFUND_PROCESSING", `${label}: workflow status remains internal`);
  const mapped = await getRefundWorkflowForOrder(fixture.orderId);
  assert(mapped?.id === fixture.workflowId && mapped.status === "REFUND_PROCESSING", `${label}: repository status remains internal`);
  console.log(JSON.stringify({ label, workflowId: fixture.workflowId, orderId: fixture.orderId, refundWorkflowStatus: mapped?.status, providerPaymentStatus: fixture.expectedProviderStatus }));
}

async function main(): Promise<void> {
  const user = (await db.auth.admin.createUser({ email: `step-57d-45d-r4-${Date.now()}@local.test`, password: "local-test-password-r4", email_confirm: true })).data.user;
  if (!user) throw new Error("user fixture failed");
  userId = user.id;
  try {
    const profile = (await db.from("profiles").insert({ user_id: userId, label: "STEP 57D 45D R4 fixture", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false }).select("id").single()).data as { id: string };
    profileId = profile.id;
    await createFixture("CASE_1_PERSISTENCE_FAILURE", "CANCELED", true);
    await createFixture("CASE_7_MISMATCH", "DONE", false);
    for (const fixture of fixtures) await trace(fixture.label);
    const claim = await db.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 });
    assert(!claim.error && (claim.data ?? []).length === 1, "sequential claim must claim only the one due fixture");
    for (const fixture of fixtures) await trace(fixture.label);
    console.log("refund R4 legacy fixture trace passed");
  } finally {
    const orders = (await db.from("orders").select("id").eq("user_id", userId)).data ?? [];
    const ids = orders.map((row: any) => row.id);
    await db.from("refund_workflows").delete().eq("user_id", userId);
    if (ids.length) await db.from("toss_payment_records").delete().in("order_id", ids);
    await db.from("orders").delete().eq("user_id", userId);
    await db.from("profiles").delete().eq("user_id", userId);
    await db.auth.admin.deleteUser(userId);
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
