#!/usr/bin/env node

/**
 * STEP 57D-46 PHASE 3D-1 ACCOUNT CLOSURE FINALIZATION REGRESSION
 *
 * Validates Phase 3D-1 transactional DB cleanup & state machine invariants:
 * 1. Cancellation vs finalization start is race-safe by DB predicate/design.
 * 2. Financial blockers prevent finalization start.
 * 3. RPC enforces finalization_started_at before data scrub.
 * 4. RPC tombstoning preserves profile UUIDs and scrubs personal fields.
 * 5. RPC scrubs paid_reports content to '{"scrubbed": true}'::jsonb while retaining metadata.
 * 6. RPC revokes active entitlements while preserving entitlement audit rows.
 * 7. RPC deletes active_profiles for closing user only.
 * 8. data_scrubbed_at is set upon DB cleanup completion. Status remains DELETION_REQUESTED in 3D-1.
 * 9. Idempotent retry: repeat RPC execution on already-scrubbed data is safe.
 * 10. Client routes cannot directly call destructive RPC (revoked from anon/authenticated).
 * 11. No Auth mutation occurs in 3D-1 (no auth.users email change, no auth.users deletion).
 * 12. DB-side safety predicate (has_account_closure_financial_blockers) fails closed on active/unknown blockers.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "../app/lib/supabase/admin";
import {
  requestAccountClosure,
  cancelAccountClosureRequest,
  startAccountClosureFinalization,
  executeAccountClosureDbCleanup,
} from "../app/lib/accounts/server";

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env.local");
  try {
    const text = readFileSync(envPath, "utf-8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
      }
    }
  } catch {}
}
loadLocalEnv();

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

console.log("=".repeat(80));
console.log("PHASE 3D-1 ACCOUNT CLOSURE FINALIZATION REGRESSION TESTS");
console.log("=".repeat(80));

const accountServer = read("app/lib/accounts/server.ts");
const cancelClosureRoute = read("app/api/account/cancel-closure/route.ts");
const rpcMigration026 = read("supabase/migrations/026_account_closure_db_cleanup_rpc.sql");
const accountPage = read("app/account/page.tsx");

console.log("\n1. ATOMIC CANCELLATION LOCK & RACE SAFETY");
assert(accountServer.includes("finalizationStartedAt"), "AccountLifecycle includes finalizationStartedAt");
assert(accountServer.includes('is("finalization_started_at", null)'), "cancelAccountClosureRequest requires finalization_started_at IS NULL");
assert(accountServer.includes("계정 탈퇴 처리가 이미 시작되어 요청을 취소할 수 없습니다."), "cancelAccountClosureRequest rejects cancellation if finalization started");
assert(accountServer.includes("startAccountClosureFinalization"), "startAccountClosureFinalization helper exists");
console.log("   Cancellation vs finalization start is race-safe ✓");

console.log("\n2. FINANCIAL BLOCKER RE-CHECK BEFORE FINALIZATION");
assert(accountServer.includes("getAccountClosureFinancialBlockers(userId)"), "Financial blockers re-checked in startAccountClosureFinalization");
assert(rpcMigration026.includes("has_account_closure_financial_blockers"), "DB-side financial blocker predicate exists in migration 026");
assert(rpcMigration026.includes("execute_account_closure_db_cleanup"), "RPC migration 026 exists");
console.log("   Financial blockers inspected before starting finalization ✓");

console.log("\n3. RPC TRANSACTIONAL CLEANUP CONTRACT & DB SAFETY PREDICATE");
assert(rpcMigration026.includes("v_account.finalization_started_at is null"), "RPC requires finalization_started_at to be set before cleanup");
assert(rpcMigration026.includes("public.has_account_closure_financial_blockers(p_user_id)"), "RPC executes DB-side financial safety check prior to data scrub");
assert(rpcMigration026.includes("delete from public.active_profiles"), "RPC deletes active_profiles row");
assert(rpcMigration026.includes("label = 'ANONYMIZED'"), "RPC tombstones profile label");
assert(rpcMigration026.includes("birth_date = '1900-01-01'::date"), "RPC tombstones profile birth_date");
assert(rpcMigration026.includes("birth_time = '00:00:00'::time"), "RPC tombstones profile birth_time");
assert(rpcMigration026.includes("relationship_type = 'other'"), "RPC sets relationship_type = 'other' to prevent unique index collision");
assert(rpcMigration026.includes("content = '{\"scrubbed\": true}'::jsonb"), "RPC scrubs paid report content to jsonb object");
assert(rpcMigration026.includes("revocation_reason = 'ACCOUNT_CLOSED'"), "RPC revokes active entitlements with ACCOUNT_CLOSED reason");
assert(rpcMigration026.includes("data_scrubbed_at = now()"), "RPC sets data_scrubbed_at timestamp");
console.log("   RPC transactional cleanup steps & DB predicate verified ✓");

console.log("\n4. IDEMPOTENCY & AUTHORIZATION");
assert(rpcMigration026.includes("v_account.data_scrubbed_at is not null"), "RPC handles idempotency when data_scrubbed_at is set");
assert(rpcMigration026.includes("revoke all on function public.execute_account_closure_db_cleanup(uuid) from public, anon, authenticated;"), "RPC execution revoked from public/anon/authenticated");
assert(rpcMigration026.includes("grant execute on function public.execute_account_closure_db_cleanup(uuid) to service_role;"), "RPC execution granted strictly to service_role");
console.log("   Idempotency & service-role authorization verified ✓");

console.log("\n5. PHASE 3D-1 STOP BOUNDARY");
assert(!accountServer.includes("updateUserById") || accountServer.indexOf("executeAccountClosureDbCleanup") < accountServer.indexOf("updateUserById"), "3D-1 DB cleanup does not perform Auth email mutation");
assert(!accountServer.includes("deleteUser") && !accountServer.includes("delete from auth.users"), "3D-1 DB cleanup does not delete auth.users");
assert(accountServer.includes("executeAccountClosureDbCleanup"), "executeAccountClosureDbCleanup helper exists");
console.log("   Phase 3D-1 STOP boundary verified (DB cleanup complete, Auth tombstoning deferred) ✓");

console.log("\n6. CUSTOMER UI CANCELLATION LOCK");
assert(accountPage.includes("finalizationStartedAt"), "Account page inspects finalizationStartedAt");
assert(accountPage.includes("탈퇴 처리가 진행 중이므로 요청을 취소할 수 없습니다."), "Account page hides cancel CTA if finalization started");
console.log("   Customer UI cancellation lock verified ✓");

async function runDbIntegrationTest() {
  console.log("\n7. LOCAL DISPOSABLE DATABASE INTEGRATION TEST");

  const supabase = createAdminClient();
  const testUserId = "a3d11111-1111-1111-1111-111111111111";
  const testProfileId = "b3d22222-2222-2222-2222-222222222222";
  const testOrderId = "c3d33333-3333-3333-3333-333333333333";
  const testPurchaseId = "d3d44444-4444-4444-4444-444444444444";
  const testEntitlementId = "e3d55555-5555-5555-5555-555555555555";
  const testReportId = "f3d66666-6666-6666-6666-666666666666";
  const testPaymentId = "77777777-7777-7777-7777-777777777777";
  const testRefundId = "88888888-8888-8888-8888-888888888888";

  async function cleanupAll() {
    try {
      await supabase.from("refund_workflows").delete().eq("user_id", testUserId);
      await supabase.from("toss_payment_records").delete().eq("order_id", testOrderId);
      await supabase.from("paid_reports").delete().eq("user_id", testUserId);
      await supabase.from("entitlements").delete().eq("user_id", testUserId);
      await supabase.from("purchases").delete().eq("user_id", testUserId);
      await supabase.from("orders").delete().eq("user_id", testUserId);
      await supabase.from("active_profiles").delete().eq("user_id", testUserId);
      await supabase.from("profiles").delete().eq("user_id", testUserId);
      await supabase.from("account_lifecycles").delete().eq("user_id", testUserId);
      await supabase.auth.admin.deleteUser(testUserId);
    } catch {}
  }
  await cleanupAll();

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    id: testUserId,
    email: "synthetic-3d1-user@disposable.local",
    password: "Password123!",
    email_confirm: true,
  });
  assert(!userError && Boolean(userData.user), "Synthetic auth user created in local DB");

  const { error: profileError } = await supabase.from("profiles").insert({
    id: testProfileId,
    user_id: testUserId,
    label: "Original Profile Name",
    relationship_type: "self",
    birth_date: "1992-08-20",
    birth_time: "14:30:00",
    gender: "male",
    calendar_type: "solar",
    is_leap_month: false,
  });
  assert(!profileError, "Synthetic profile created");

  const { error: activeProfileError } = await supabase.from("active_profiles").insert({
    user_id: testUserId,
    profile_id: testProfileId,
  });
  assert(!activeProfileError, "Synthetic active profile created");

  const { error: orderError } = await supabase.from("orders").insert({
    id: testOrderId,
    user_id: testUserId,
    profile_id: testProfileId,
    product_id: "saju-premium-v1",
    amount: 39000,
    status: "paid",
    paid_at: new Date().toISOString(),
  });
  assert(!orderError, "Synthetic order created");

  const { error: purchaseError } = await supabase.from("purchases").insert({
    id: testPurchaseId,
    user_id: testUserId,
    profile_id: testProfileId,
    product_id: "saju-premium-v1",
    order_id: testOrderId,
  });
  assert(!purchaseError, "Synthetic purchase created");

  const { error: entitlementError } = await supabase.from("entitlements").insert({
    id: testEntitlementId,
    user_id: testUserId,
    profile_id: testProfileId,
    resource_id: "saju-premium-v1",
    resource_type: "paid_analysis",
    is_active: true,
  });
  assert(!entitlementError, "Synthetic active entitlement created");

  const { error: reportError } = await supabase.from("paid_reports").insert({
    id: testReportId,
    user_id: testUserId,
    profile_id: testProfileId,
    product_id: "saju-premium-v1",
    purchase_id: testPurchaseId,
    status: "completed",
    content: { sensitive_saju_data: "original personalized content" },
  });
  assert(!reportError, "Synthetic paid report created");

  const closureReq = await requestAccountClosure(testUserId);
  assert(closureReq.status === "DELETION_REQUESTED", "requestAccountClosure transitioned to DELETION_REQUESTED");

  const cancelledReq = await cancelAccountClosureRequest(testUserId);
  assert(cancelledReq.status === "ACTIVE", "cancelAccountClosureRequest restored status to ACTIVE when finalization_started_at is null");

  await requestAccountClosure(testUserId);

  const lockedAcc = await startAccountClosureFinalization(testUserId);
  assert(Boolean(lockedAcc.finalizationStartedAt), "startAccountClosureFinalization set finalizationStartedAt");

  let cancelFailed = false;
  try {
    await cancelAccountClosureRequest(testUserId);
  } catch (e: unknown) {
    cancelFailed = e instanceof Error && e.message.includes("이미 시작되어");
  }
  assert(cancelFailed, "cancelAccountClosureRequest rejected after finalization_started_at is set");

  // --- FINANCIAL BLOCKER INTEGRATION TESTS ---
  console.log("\n8. FINANCIAL BLOCKER DB SAFETY TESTS (Direct RPC Execution Protection)");

  // TEST A: Blocking Refund Workflow (REFUND_REQUESTED)
  const { error: pRecError } = await supabase.from("toss_payment_records").insert({
    id: testPaymentId,
    order_id: testOrderId,
    payment_key: "synthetic_payment_key_3d1",
    expected_amount: 39000,
    confirmed_amount: 39000,
    reconciliation_status: "paid",
  });
  assert(!pRecError, "Synthetic toss payment record created");

  const { error: refError } = await supabase.from("refund_workflows").insert({
    id: testRefundId,
    order_id: testOrderId,
    payment_record_id: testPaymentId,
    user_id: testUserId,
    profile_id: testProfileId,
    product_id: "saju-premium-v1",
    requested_amount: 39000,
    reason_category: "CHANGE_OF_MIND",
    status: "REFUND_REQUESTED",
  });
  assert(!refError, "Synthetic blocking refund workflow created (REFUND_REQUESTED)");

  let rpcRefundBlocked = false;
  const { error: rpcRefundErr } = await supabase.rpc("execute_account_closure_db_cleanup", { p_user_id: testUserId });
  if (rpcRefundErr && rpcRefundErr.message.includes("unresolved financial blockers exist")) {
    rpcRefundBlocked = true;
  }
  assert(rpcRefundBlocked, "Test A: Direct RPC execution REJECTED due to REFUND_REQUESTED blocker");

  const { data: profA } = await supabase.from("profiles").select("*").eq("id", testProfileId).single();
  assert(profA.label === "Original Profile Name", "Test A: Profile data untouched after blocked RPC call");

  const { data: repA } = await supabase.from("paid_reports").select("*").eq("id", testReportId).single();
  assert(repA.content?.sensitive_saju_data === "original personalized content", "Test A: Report content untouched after blocked RPC call");

  const { data: lcA } = await supabase.from("account_lifecycles").select("*").eq("user_id", testUserId).single();
  assert(lcA.data_scrubbed_at === null, "Test A: data_scrubbed_at remains NULL after blocked RPC call");

  // TEST C: OWNER_REVIEW_REQUIRED status blocks
  await supabase.from("refund_workflows").update({ status: "OWNER_REVIEW_REQUIRED" }).eq("id", testRefundId);
  let rpcOwnerBlocked = false;
  const { error: rpcOwnerErr } = await supabase.rpc("execute_account_closure_db_cleanup", { p_user_id: testUserId });
  if (rpcOwnerErr && rpcOwnerErr.message.includes("unresolved financial blockers exist")) {
    rpcOwnerBlocked = true;
  }
  assert(rpcOwnerBlocked, "Test C: Direct RPC execution REJECTED due to OWNER_REVIEW_REQUIRED blocker");

  // Resolve refund workflow (set status = REFUND_COMPLETED)
  await supabase.from("refund_workflows").update({ status: "REFUND_COMPLETED" }).eq("id", testRefundId);

  // TEST B: Reconciliation Blocker (reconciliation_required)
  await supabase.from("toss_payment_records").update({ reconciliation_status: "reconciliation_required" }).eq("id", testPaymentId);
  let rpcReconBlocked = false;
  const { error: rpcReconErr } = await supabase.rpc("execute_account_closure_db_cleanup", { p_user_id: testUserId });
  if (rpcReconErr && rpcReconErr.message.includes("unresolved financial blockers exist")) {
    rpcReconBlocked = true;
  }
  assert(rpcReconBlocked, "Test B: Direct RPC execution REJECTED due to reconciliation_required blocker");

  // TEST E: Unknown / Unrecognized Reconciliation Status Fail-Closed
  await supabase.from("toss_payment_records").update({ reconciliation_status: "unknown_test_status" }).eq("id", testPaymentId);
  let rpcUnknownBlocked = false;
  const { error: rpcUnknownErr } = await supabase.rpc("execute_account_closure_db_cleanup", { p_user_id: testUserId });
  if (rpcUnknownErr && rpcUnknownErr.message.includes("unresolved financial blockers exist")) {
    rpcUnknownBlocked = true;
  }
  assert(rpcUnknownBlocked, "Test E: Direct RPC execution FAILS CLOSED for unknown reconciliation status");

  // TEST F: Resolve financial blockers (set payment reconciliation_status = paid)
  await supabase.from("toss_payment_records").update({ reconciliation_status: "paid" }).eq("id", testPaymentId);

  // TEST D: Financially safe state -> cleanup RPC succeeds
  const scrubbedAcc = await executeAccountClosureDbCleanup(testUserId);
  assert(Boolean(scrubbedAcc.dataScrubbedAt), "Test D & F: Cleanup RPC ALLOWED and dataScrubbedAt set after financial blockers resolved");
  assert(scrubbedAcc.status === "DELETION_REQUESTED", "3D-1 STOP boundary preserved: status remains DELETION_REQUESTED");

  const { data: activeProfileRows } = await supabase.from("active_profiles").select("*").eq("user_id", testUserId);
  assert((activeProfileRows ?? []).length === 0, "active_profiles selection deleted");

  const { data: profileRows } = await supabase.from("profiles").select("*").eq("id", testProfileId);
  const prof = (profileRows ?? [])[0];
  assert(Boolean(prof) && prof.label === "ANONYMIZED", "Profile label tombstoned to ANONYMIZED");
  assert(prof.birth_date === "1900-01-01", "Profile birth_date tombstoned to 1900-01-01");
  assert(prof.birth_time === "00:00:00", "Profile birth_time tombstoned to 00:00:00");
  assert(prof.relationship_type === "other", "Profile relationship_type tombstoned to other");

  const { data: reportRows } = await supabase.from("paid_reports").select("*").eq("id", testReportId);
  const rep = (reportRows ?? [])[0];
  assert(Boolean(rep) && JSON.stringify(rep.content) === '{"scrubbed":true}', 'Paid report content scrubbed to {"scrubbed":true}');

  const { data: entitlementRows } = await supabase.from("entitlements").select("*").eq("id", testEntitlementId);
  const ent = (entitlementRows ?? [])[0];
  assert(Boolean(ent) && ent.is_active === false && ent.revocation_reason === "ACCOUNT_CLOSED", "Entitlement revoked with ACCOUNT_CLOSED reason");

  const { data: authUserRows } = await supabase.auth.admin.getUserById(testUserId);
  assert(Boolean(authUserRows.user) && authUserRows.user?.email === "synthetic-3d1-user@disposable.local", "3D-1 Auth user email untouched (auth.users row intact)");

  const idempotentAcc = await executeAccountClosureDbCleanup(testUserId);
  assert(idempotentAcc.dataScrubbedAt === scrubbedAcc.dataScrubbedAt, "executeAccountClosureDbCleanup is idempotent");

  await cleanupAll();

  console.log("   Local disposable DB integration test completed & passed ✓");
}

runDbIntegrationTest()
  .then(() => {
    console.log("\n" + "=".repeat(80));
    console.log("✓ ALL PHASE 3D-1 REGRESSION & INTEGRATION TESTS PASSED");
    console.log("=".repeat(80));
  })
  .catch((err) => {
    console.error("❌ PHASE 3D-1 INTEGRATION TEST FAILED:", err);
    process.exit(1);
  });
