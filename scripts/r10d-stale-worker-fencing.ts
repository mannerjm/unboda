import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function loadEnvFile(path: string): void {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

function loadDisposableRuntime(): void {
  const values: Record<string, string> = {};
  const artifact = "supabase-r6-disposable/supabase/.temp/start-secrets/supabase_edge_runtime_unboda-r6-disposable/env/docker.env";
  for (const line of readFileSync(artifact, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  assert(values.SUPABASE_INTERNAL_HOST_PORT === "55321", "R10D must target disposable API");
  assert(values.SUPABASE_DB_URL.includes("supabase_db_unboda-r6-disposable"), "R10D must target disposable DB");
  assert(Boolean(values.SUPABASE_SERVICE_ROLE_KEY), "R10D disposable service key required");
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
  const {
    getRefundWorkflowForOrder,
    getRefundWorkflowForOrder: readWorkflow,
    reconcileRefundWorkflow,
    recordRefundProviderEvidenceForClaim,
    updateRefundRetryForClaim,
    escalateRefundForClaim,
    finalizeRefundForClaim,
  } = await import("../app/lib/refunds/server");
  const { revokeEntitlementForRefund } = await import("../app/lib/purchases/server");
  const db = createAdminClient();
  const baseline = await Promise.all(["orders", "purchases", "entitlements", "toss_payment_records", "refund_workflows"].map(async (table) => ((await db.from(table).select("id")).data ?? []).length));
  assert(baseline.every((count) => count === 0), "disposable financial baseline must be empty");
  let userId = "";
  let orderId = "";
  let profileId = "";
  let providerCancellationCalls = 0;
  let providerLookupCalls = 0;
  const originalFetch = globalThis.fetch;
  try {
    const user = (await db.auth.admin.createUser({ email: `step-57d-45d-r10d-${Date.now()}@local.test`, password: "local-test-password-r10d", email_confirm: true })).data.user;
    if (!user) throw new Error("R10D user fixture failed");
    userId = user.id;
    const profile = (await db.from("profiles").insert({ user_id: userId, label: "R10D stale worker", relationship_type: "other", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false }).select("id").single()).data as { id: string };
    profileId = profile.id;
    const order = (await db.from("orders").insert({ user_id: userId, profile_id: profileId, product_id: "money-leak-risk", amount: 16900, status: "paid", payment_provider: "toss", transaction_id: "r10d-fixture", paid_at: new Date().toISOString() }).select("id").single()).data as { id: string };
    orderId = order.id;
    const payment = (await db.from("toss_payment_records").insert({ order_id: orderId, payment_key: "pay_r10d_fixture", provider_order_id: orderId, expected_amount: 16900, confirmed_amount: 16900, currency: "KRW", provider_status: "DONE", reconciliation_status: "externally_confirmed" }).select("id").single()).data as { id: string };
    const purchase = (await db.from("purchases").insert({ user_id: userId, profile_id: profileId, product_id: "money-leak-risk", order_id: orderId }).select("id").single()).data as { id: string };
    const entitlement = await db.from("entitlements").insert({ user_id: userId, profile_id: profileId, resource_id: "money-leak-risk", resource_type: "paid_analysis", is_active: true, source: "purchase", purchase_id: purchase.id });
    if (entitlement.error) throw entitlement.error;
    const workflow = (await db.from("refund_workflows").insert({ order_id: orderId, payment_record_id: payment.id, user_id: userId, profile_id: profileId, product_id: "money-leak-risk", requested_amount: 16900, currency: "KRW", reason_category: "CHANGE_OF_MIND", status: "REFUND_PROCESSING", next_retry_at: new Date(Date.now() - 1000).toISOString() }).select("id").single()).data as { id: string };

    const claimAResult = await db.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 });
    const claimA = (claimAResult.data ?? [])[0] as { reconciliation_claim_token: string } | undefined;
    assert(Boolean(claimA?.reconciliation_claim_token), "Worker A must claim");
    const tokenA = claimA!.reconciliation_claim_token;
    await db.from("refund_workflows").update({ reconciliation_claim_expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", workflow.id).eq("reconciliation_claim_token", tokenA);
    const claimBResult = await db.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 });
    const claimB = (claimBResult.data ?? [])[0] as { reconciliation_claim_token: string } | undefined;
    assert(Boolean(claimB?.reconciliation_claim_token) && claimB!.reconciliation_claim_token !== tokenA, "Worker B must reclaim with a new token");
    const tokenB = claimB!.reconciliation_claim_token;
    const staleEvidence = await recordRefundProviderEvidenceForClaim({ orderId, claimToken: tokenA, providerCancellationReference: "tx_stale" });
    const staleRetry = await updateRefundRetryForClaim({ orderId, claimToken: tokenA, retryCount: 99, nextRetryAt: new Date(0).toISOString() });
    const staleEscalation = await escalateRefundForClaim({ orderId, claimToken: tokenA });
    const staleFinal = await finalizeRefundForClaim({ orderId, claimToken: tokenA });
    const staleRevoke = await revokeEntitlementForRefund({ userId, profileId, productId: "money-leak-risk", orderId, claimToken: tokenA });
    assert(!staleEvidence && !staleRetry && !staleEscalation && !staleFinal && !staleRevoke, "all stale Worker A mutations must be rejected/no-op");
    const afterStale = await readWorkflow(orderId);
    if (!afterStale) throw new Error("R10D workflow disappeared");
    assert(afterStale.reconciliationClaimToken === tokenB && afterStale.status === "REFUND_PROCESSING", "Worker B ownership/state must remain intact");
    const activeBefore = (await db.from("entitlements").select("id").eq("user_id", userId).eq("profile_id", profileId).eq("is_active", true)).data ?? [];
    assert(activeBefore.length === 1, "stale revoke must leave entitlement active");
    globalThis.fetch = async (input, init) => { const url = String(input); if (!url.includes("api.tosspayments.com")) return originalFetch(input, init); providerLookupCalls++; if (url.includes("/cancel")) providerCancellationCalls++; return Response.json({ paymentKey: "pay_r10d_provider", orderId, totalAmount: 16900, status: "CANCELED", currency: "KRW", cancels: [{ transactionKey: "tx_r10d_provider", cancelAmount: 16900, cancelStatus: "DONE", canceledAt: new Date().toISOString(), refundableAmount: 0 }] }); };
    const recovered = await reconcileRefundWorkflow({ ...afterStale, reconciliationClaimToken: tokenB });
    const activeAfter = (await db.from("entitlements").select("id").eq("user_id", userId).eq("profile_id", profileId).eq("is_active", true)).data ?? [];
    const purchases = (await db.from("purchases").select("id").eq("order_id", orderId)).data ?? [];
    assert(recovered.status === "REFUND_COMPLETED" && activeAfter.length === 0 && purchases.length === 1, "valid Worker B must complete safely");
    assert(providerCancellationCalls === 0, "provider cancellation calls must remain zero");
    const postCompletionStale = await updateRefundRetryForClaim({ orderId, claimToken: tokenA, retryCount: 100, nextRetryAt: new Date(0).toISOString() });
    assert(!postCompletionStale, "post-completion stale mutation must be rejected");
    console.log(JSON.stringify({ staleWorkerFencing: "verified", claimTokenChanged: true, staleMutationsRejected: 6, providerLookupCalls, providerCancellationCalls, finalStatus: recovered.status, purchaseCount: purchases.length, effectiveEntitlementCount: activeAfter.length }));
  } finally {
    globalThis.fetch = originalFetch;
    const users = (await db.auth.admin.listUsers()).data.users.filter((user) => user.email?.startsWith("step-57d-45d-r10d-"));
    for (const user of users) { const orders = (await db.from("orders").select("id").eq("user_id", user.id)).data ?? []; const ids = orders.map((row: { id: string }) => row.id); await db.from("refund_workflows").delete().eq("user_id", user.id); if (ids.length) await db.from("toss_payment_records").delete().in("order_id", ids); await db.from("purchases").delete().eq("user_id", user.id); await db.from("entitlements").delete().eq("user_id", user.id); await db.from("orders").delete().eq("user_id", user.id); await db.from("profiles").delete().eq("user_id", user.id); await db.auth.admin.deleteUser(user.id); }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });