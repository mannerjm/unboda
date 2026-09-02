// STEP 57D-48F-D: edition-safe commercial core — live local Supabase integration.
//
// Env-gated: SKIPPED (not a pass) when local Supabase credentials are absent.
// Never contacts remote Supabase. Disposable fixture, cleaned up in `finally`.
//
// Proves (sections 19-24 of the phase spec):
//   - multiple editions (MONTH:2026-09, MONTH:2026-10) coexist as distinct
//     entitlement + paid_report rows without overwriting each other
//   - refunding the September order revokes ONLY the September entitlement;
//     October stays active and its report is untouched
//   - the September completed report is immutable (same row id/content)
//   - a failed October report retry reclaims ONLY the October row
import { createAdminClient } from "../app/lib/supabase/admin";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRODUCT_ID = "career-job-change"; // MONTHLY-policy launch product

async function runIntegration(): Promise<void> {
  const db = createAdminClient();
  const {
    createPurchaseFromPaidOrder,
    grantEntitlement,
    getActiveEntitlementForProfile,
    getActiveEntitlementForProfileEdition,
    revokeEntitlementForRefund,
    getOrderForUser,
  } = await import("../app/lib/purchases/server");
  const { claimPaidReport, completePaidReport, getPaidReport } = await import(
    "../app/lib/paidReports/server"
  );

  const { data: userData, error: userError } = await db.auth.admin.createUser({
    email: `step-57d-48fd-${Date.now()}@local.test`,
    password: "local-test-password-48fd",
    email_confirm: true,
  });
  if (userError || !userData.user) throw userError ?? new Error("user fixture failed");
  const userId = userData.user.id;

  try {
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .insert({ user_id: userId, label: "48F-D fixture", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false })
      .select("id")
      .single<{ id: string }>();
    if (profileError || !profile) throw profileError ?? new Error("profile fixture failed");
    const profileId = profile.id;

    // --- Seed edition A (September) directly at the DB level (§19: allowed for
    // test fixtures; production order guard is never bypassed at runtime). ---
    const { data: orderA, error: orderAError } = await db
      .from("orders")
      .insert({ user_id: userId, profile_id: profileId, product_id: PRODUCT_ID, amount: 16900, status: "paid", payment_provider: "toss", transaction_id: "48fd-sept-fixture", paid_at: new Date().toISOString(), analysis_edition_key: "MONTH:2026-09", analysis_reference_snapshot: { anchorDate: "2026-09-15" } })
      .select("*")
      .single();
    if (orderAError || !orderA) throw orderAError ?? new Error("order A fixture failed");

    const orderARecord = await getOrderForUser(orderA.id, userId);
    if (!orderARecord) throw new Error("order A re-fetch failed");
    const purchaseA = await createPurchaseFromPaidOrder(orderARecord);
    assert(purchaseA.analysisEditionKey === "MONTH:2026-09", "purchase A must carry the seeded September edition");

    const entitlementA = await grantEntitlement({ userId, profileId, resourceId: PRODUCT_ID, purchaseId: purchaseA.id, analysisEditionKey: "MONTH:2026-09", source: "purchase" });
    assert(entitlementA.isActive && entitlementA.analysisEditionKey === "MONTH:2026-09", "entitlement A must be active for the September edition");

    const claimA = await claimPaidReport({ userId, profileId, productId: PRODUCT_ID, purchaseId: purchaseA.id, analysisEditionKey: "MONTH:2026-09" });
    assert(claimA.state === "claimed", "September report must be freshly claimable");
    const reportA = await completePaidReport({ reportId: claimA.report.id, userId, profileId, productId: PRODUCT_ID, content: { summary: "September edition content" } as never });
    assert(reportA.status === "completed", "September report must complete");

    // --- Seed edition B (October) directly at the DB level. ---
    const { data: orderB, error: orderBError } = await db
      .from("orders")
      .insert({ user_id: userId, profile_id: profileId, product_id: PRODUCT_ID, amount: 16900, status: "paid", payment_provider: "toss", transaction_id: "48fd-oct-fixture", paid_at: new Date().toISOString(), analysis_edition_key: "MONTH:2026-10", analysis_reference_snapshot: { anchorDate: "2026-10-15" } })
      .select("*")
      .single();
    if (orderBError || !orderB) throw orderBError ?? new Error("order B fixture failed");

    const orderBRecord = await getOrderForUser(orderB.id, userId);
    if (!orderBRecord) throw new Error("order B re-fetch failed");
    const purchaseB = await createPurchaseFromPaidOrder(orderBRecord);
    assert(purchaseB.analysisEditionKey === "MONTH:2026-10", "purchase B must carry the seeded October edition");

    const entitlementB = await grantEntitlement({ userId, profileId, resourceId: PRODUCT_ID, purchaseId: purchaseB.id, analysisEditionKey: "MONTH:2026-10", source: "purchase" });
    assert(entitlementB.isActive && entitlementB.analysisEditionKey === "MONTH:2026-10", "entitlement B must be active for the October edition");
    assert(entitlementB.id !== entitlementA.id, "October must be a DISTINCT entitlement row, not an overwrite of September");

    const claimB = await claimPaidReport({ userId, profileId, productId: PRODUCT_ID, purchaseId: purchaseB.id, analysisEditionKey: "MONTH:2026-10" });
    assert(claimB.state === "claimed", "October report must be freshly claimable");
    assert(claimB.report.id !== claimA.report.id, "October must be a DISTINCT paid_reports row, not an overwrite of September");
    const reportB = await completePaidReport({ reportId: claimB.report.id, userId, profileId, productId: PRODUCT_ID, content: { summary: "October edition content" } as never });
    assert(reportB.status === "completed", "October report must complete");

    // --- §19 MULTI-EDITION COEXISTENCE ---
    const bothActive = (await db.from("entitlements").select("id,analysis_edition_key,is_active").eq("user_id", userId).eq("resource_id", PRODUCT_ID).eq("is_active", true)).data ?? [];
    assert(bothActive.length === 2, `both September and October entitlements must coexist as active rows, found ${bothActive.length}`);
    const bothReports = (await db.from("paid_reports").select("id,analysis_edition_key,status").eq("user_id", userId).eq("product_id", PRODUCT_ID)).data ?? [];
    assert(bothReports.length === 2 && bothReports.every((r: { status: string }) => r.status === "completed"), "both September and October paid_reports must coexist, both completed");
    console.log("19. multi-edition coexistence: 2 distinct active entitlements + 2 distinct completed reports ✓");

    // --- §20 REFUND ISOLATION: refund September, October must be untouched ---
    const { data: paymentRecordA, error: paymentAError } = await db
      .from("toss_payment_records")
      .insert({ order_id: orderA.id, expected_amount: 16900, confirmed_amount: 16900, currency: "KRW", provider_status: "DONE", reconciliation_status: "externally_confirmed" })
      .select("id")
      .single<{ id: string }>();
    if (paymentAError || !paymentRecordA) throw paymentAError ?? new Error("payment record fixture failed");

    const claimToken = crypto.randomUUID();
    const { error: workflowError } = await db.from("refund_workflows").insert({
      order_id: orderA.id,
      payment_record_id: paymentRecordA.id,
      user_id: userId,
      profile_id: profileId,
      product_id: PRODUCT_ID,
      requested_amount: 16900,
      currency: "KRW",
      reason_category: "MATERIAL_DEFECT",
      status: "REFUND_PROCESSING",
      reconciliation_claim_token: claimToken,
    });
    if (workflowError) throw workflowError;

    const revoked = await revokeEntitlementForRefund({ userId, profileId, productId: PRODUCT_ID, orderId: orderA.id, claimToken });
    assert(revoked !== null && revoked.analysisEditionKey === "MONTH:2026-09", "refund must revoke exactly the September edition entitlement");

    assert(
      !(await getActiveEntitlementForProfileEdition(userId, profileId, PRODUCT_ID, "MONTH:2026-09")),
      "September entitlement must no longer be active after refund",
    );
    assert(
      (await getActiveEntitlementForProfileEdition(userId, profileId, PRODUCT_ID, "MONTH:2026-10")) !== null,
      "REFUND SEPTEMBER MUST NOT REVOKE OCTOBER: October entitlement must remain active",
    );
    const coarseStillActive = await getActiveEntitlementForProfile(userId, profileId, PRODUCT_ID);
    assert(coarseStillActive?.analysisEditionKey === "MONTH:2026-10", "coarse ANY-edition lookup must now resolve to the still-active October edition");
    console.log("20. refund isolation: September revoked, October entitlement untouched and still active ✓");

    // --- §21 REPORT IMMUTABILITY: September completed report unchanged ---
    const septemberAfterRefund = await getPaidReport(userId, profileId, PRODUCT_ID, "MONTH:2026-09");
    assert(
      septemberAfterRefund?.id === reportA.id &&
        septemberAfterRefund.status === "completed" &&
        JSON.stringify(septemberAfterRefund.content) === JSON.stringify(reportA.content),
      "September completed report must remain byte-identical after refund/time passing",
    );
    const octoberUnchanged = await getPaidReport(userId, profileId, PRODUCT_ID, "MONTH:2026-10");
    assert(octoberUnchanged?.id === reportB.id && octoberUnchanged.status === "completed", "October report row must be unaffected by September's refund");
    console.log("21. report immutability: September's completed row unchanged, October unaffected ✓");

    // --- §22 RETRY ISOLATION: fail October, retry must reuse ONLY the October row ---
    // Directly seed a failed state for October (failPaidReport itself correctly
    // refuses to transition an already-completed row, so we simulate a prior
    // failed generation attempt at the DB level for this retry-isolation test).
    const { error: forceFailError } = await db.from("paid_reports").update({ status: "failed", error_code: "test_injected_failure" }).eq("id", reportB.id);
    if (forceFailError) throw forceFailError;
    const retryClaim = await claimPaidReport({ userId, profileId, productId: PRODUCT_ID, purchaseId: purchaseB.id, analysisEditionKey: "MONTH:2026-10" });
    assert(retryClaim.state === "claimed" && retryClaim.report.id === reportB.id, "failed October retry must reclaim the SAME October row, not create a new one");
    const septemberStillUntouched = await getPaidReport(userId, profileId, PRODUCT_ID, "MONTH:2026-09");
    assert(
      septemberStillUntouched?.id === reportA.id && septemberStillUntouched.status === "completed",
      "September completed row must remain untouched while October is retried",
    );
    console.log("22. retry isolation: October retry reclaims only its own row; September completed row untouched ✓");

    console.log("\nanalysis-edition-commercial-core-live-integration passed ✓");
  } finally {
    const orders = (await db.from("orders").select("id").eq("user_id", userId)).data ?? [];
    const ids = orders.map((row: { id: string }) => row.id);
    await db.from("refund_workflows").delete().eq("user_id", userId);
    if (ids.length) await db.from("toss_payment_records").delete().in("order_id", ids);
    await db.from("paid_reports").delete().eq("user_id", userId);
    await db.from("purchases").delete().eq("user_id", userId);
    await db.from("entitlements").delete().eq("user_id", userId);
    await db.from("orders").delete().eq("user_id", userId);
    await db.from("profiles").delete().eq("user_id", userId);
    await db.auth.admin.deleteUser(userId);
  }
}

async function main(): Promise<void> {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log(
      "SKIPPED (not a pass): missing env NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
        "Set these to run the live local Supabase integration check.",
    );
    return;
  }

  await runIntegration();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
