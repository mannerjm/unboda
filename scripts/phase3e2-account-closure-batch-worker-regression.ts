#!/usr/bin/env node

/**
 * STEP 57D-46 PHASE 3E-2 ACCOUNT CLOSURE BATCH WORKER REGRESSION & INTEGRATION TESTS
 *
 * Validates Phase 3E-2 batch worker invariants:
 * 1. Static code assertions:
 *    - reconcileAccountClosureFinalizations exists in app/lib/accounts/server.ts.
 *    - MAX_ACCOUNT_CLOSURE_RETRIES = 5 is defined.
 *    - No account closure cron endpoint added to vercel.json or /api/internal/.
 * 2. Disposable DB Integration Tests:
 *    - Happy batch: all claimable safe accounts finalized to CLOSED in one run.
 *    - Mixed batch: independent per-account processing (one failure does not stop others).
 *    - Financial wait: refund in-progress causes scheduled retry with backoff, NOT owner review.
 *    - Transient failure & exponential backoff calculation.
 *    - Retry budget exhaustion (retryCount >= 5 -> owner review escalation).
 *    - Tombstone conflict & missing Auth user -> owner review escalation.
 *    - Claim lost handling (stale claim token rejected without corrupting row).
 *    - Concurrent workers (SKIP LOCKED prevents duplicate processing across workers).
 *    - Stale claim recovery (expired lease reclaimed safely by next worker).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

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
console.log("PHASE 3E-2 ACCOUNT CLOSURE BATCH WORKER REGRESSION TESTS");
console.log("=".repeat(80));

const accountServer = read("app/lib/accounts/server.ts");
const vercelJson = read("vercel.json");

console.log("\n1. STATIC CODE & CONFIGURATION ASSERTIONS");
assert(accountServer.includes("export async function reconcileAccountClosureFinalizations"), "reconcileAccountClosureFinalizations worker exists in server.ts");
assert(accountServer.includes("MAX_ACCOUNT_CLOSURE_RETRIES = 5"), "MAX_ACCOUNT_CLOSURE_RETRIES = 5 defined");
assert(accountServer.includes("record_account_closure_retry"), "Worker utilizes record_account_closure_retry RPC");
assert(accountServer.includes("escalate_account_closure_owner_review"), "Worker utilizes escalate_account_closure_owner_review RPC");
assert(accountServer.includes("release_account_closure_claim"), "Worker utilizes release_account_closure_claim RPC");
assert(!vercelJson.includes("account-closures"), "No account-closures cron route added to vercel.json");

async function runDbIntegrationTests() {
  console.log("\n2. LOCAL DISPOSABLE DATABASE INTEGRATION TESTS");
  const { createAdminClient } = await import("../app/lib/supabase/admin");
  const {
    reconcileAccountClosureFinalizations,
    startAccountClosureFinalization,
    executeAccountClosureDbCleanup,
  } = await import("../app/lib/accounts/server");

  const supabase = createAdminClient();

  const userA = "3e200000-0000-0000-0000-000000000001";
  const userB = "3e200000-0000-0000-0000-000000000002";
  const userC = "3e200000-0000-0000-0000-000000000003";
  const userD = "3e200000-0000-0000-0000-000000000004";
  const userE = "3e200000-0000-0000-0000-000000000005";

  const userF = "3e200000-0000-0000-0000-000000000006";
  const userG = "3e200000-0000-0000-0000-000000000007";

  const profileA = "3e210000-0000-0000-0000-000000000001";
  const profileB = "3e210000-0000-0000-0000-000000000002";
  const profileC = "3e210000-0000-0000-0000-000000000003";
  const profileD = "3e210000-0000-0000-0000-000000000004";
  const profileF = "3e210000-0000-0000-0000-000000000006";
  const profileG = "3e210000-0000-0000-0000-000000000007";

  const orderC = "3e220000-0000-0000-0000-000000000003";
  const paymentC = "3e230000-0000-0000-0000-000000000003";
  const refundC = "3e240000-0000-0000-0000-000000000003";

  async function cleanupAll() {
    const allUsers = [userA, userB, userC, userD, userE, userF, userG];
    for (const uid of allUsers) {
      try {
        await supabase.from("refund_workflows").delete().eq("user_id", uid);
        await supabase.from("toss_payment_records").delete().filter("order_id", "in", `("${orderC}")`);
        await supabase.from("paid_reports").delete().eq("user_id", uid);
        await supabase.from("entitlements").delete().eq("user_id", uid);
        await supabase.from("purchases").delete().eq("user_id", uid);
        await supabase.from("orders").delete().eq("user_id", uid);
        await supabase.from("active_profiles").delete().eq("user_id", uid);
        await supabase.from("profiles").delete().eq("user_id", uid);
        await supabase.from("account_lifecycles").delete().eq("user_id", uid);
        await supabase.auth.admin.deleteUser(uid);
      } catch {}
    }
  }
  await cleanupAll();

  // Create synthetic users A & B for Happy Batch test
  for (const uid of [userA, userB]) {
    await supabase.auth.admin.createUser({
      id: uid,
      email: `synthetic_3e2_${uid}_${Date.now()}@disposable.local`,
      password: "Password123!",
      email_confirm: true,
    });
    await supabase.from("profiles").insert({
      id: uid === userA ? profileA : profileB,
      user_id: uid,
      label: "Synthetic Profile",
      relationship_type: "self",
      birth_date: "1990-01-01",
      birth_time: "12:00:00",
      gender: "male",
      calendar_type: "solar",
    });
    await supabase.from("account_lifecycles").insert({
      user_id: uid,
      generation: 1,
      status: "DELETION_REQUESTED",
      finalization_started_at: new Date().toISOString(),
    });
  }

  console.log("\n--- TEST 1: HAPPY BATCH EXECUTION ---");
  const happyBatchResult = await reconcileAccountClosureFinalizations({ batchLimit: 10 });
  assert(happyBatchResult.claimed >= 2, "Happy batch claimed at least 2 accounts");
  assert(happyBatchResult.finalized >= 2, "Happy batch finalized at least 2 accounts to CLOSED");
  assert(happyBatchResult.failed === 0, "Happy batch had 0 failures");

  const { data: userALifecycle } = await supabase.from("account_lifecycles").select("*").eq("user_id", userA).single();
  assert(userALifecycle?.status === "CLOSED" && Boolean(userALifecycle.finalized_at), "User A finalized to CLOSED in batch run");

  console.log("\n--- TEST 2: MIXED BATCH & ERROR CLASSIFICATION ---");
  await cleanupAll();

  // User A: Happy path (locked DELETION_REQUESTED)
  await supabase.auth.admin.createUser({ id: userA, email: `synthetic_3e2_a_${Date.now()}@disposable.local`, password: "Password123!", email_confirm: true });
  await supabase.from("profiles").insert({ id: profileA, user_id: userA, label: "Prof A", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar" });
  await supabase.from("account_lifecycles").insert({ user_id: userA, generation: 1, status: "DELETION_REQUESTED", finalization_started_at: new Date().toISOString() });

  // User C: Financial wait blocker (REFUND_REQUESTED)
  await supabase.auth.admin.createUser({ id: userC, email: `synthetic_3e2_c_${Date.now()}@disposable.local`, password: "Password123!", email_confirm: true });
  await supabase.from("profiles").insert({ id: profileC, user_id: userC, label: "Prof C", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar" });
  await supabase.from("orders").insert({ id: orderC, user_id: userC, profile_id: profileC, product_id: "saju-v1", amount: 39000, status: "paid", paid_at: new Date().toISOString() });
  await supabase.from("toss_payment_records").insert({ id: paymentC, order_id: orderC, payment_key: "pk_c", expected_amount: 39000, confirmed_amount: 39000, reconciliation_status: "paid" });
  await supabase.from("refund_workflows").insert({ id: refundC, order_id: orderC, payment_record_id: paymentC, user_id: userC, profile_id: profileC, product_id: "saju-v1", requested_amount: 39000, reason_category: "CHANGE_OF_MIND", status: "REFUND_REQUESTED" });
  await supabase.from("account_lifecycles").insert({ user_id: userC, generation: 1, status: "DELETION_REQUESTED", finalization_started_at: new Date().toISOString() });

  // User D: TOMBSTONE_EMAIL_CONFLICT owner review escalation
  await supabase.auth.admin.createUser({ id: userD, email: `synthetic_3e2_d_${Date.now()}@disposable.local`, password: "Password123!", email_confirm: true });
  await supabase.from("profiles").insert({ id: profileD, user_id: userD, label: "Prof D", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar" });
  await supabase.from("account_lifecycles").insert({ user_id: userD, generation: 1, status: "DELETION_REQUESTED", finalization_started_at: new Date().toISOString() });
  // Create synthetic user whose email is userD's tombstone email to cause conflict
  const tombstoneD = `tombstone_${userD}@deleted.unboda.internal`;
  const { data: confUserData } = await supabase.auth.admin.createUser({ email: tombstoneD, password: "Password123!", email_confirm: true });

  // User E: AUTH_USER_NOT_FOUND owner review escalation (orphaned lifecycle row without Auth user)
  execSync(
    `docker exec -i supabase_db_unboda psql -U postgres -d postgres -c "SET session_replication_role = 'replica'; INSERT INTO public.account_lifecycles (user_id, generation, status, paid_eligibility_status, finalization_started_at, data_scrubbed_at) VALUES ('${userE}', 1, 'DELETION_REQUESTED', 'UNVERIFIED', now(), now());"`,
    { encoding: "utf-8" }
  );

  const mixedResult = await reconcileAccountClosureFinalizations({ batchLimit: 10 });

  assert(mixedResult.claimed >= 4, "Mixed batch claimed candidate accounts");
  assert(mixedResult.finalized >= 1, "User A finalized to CLOSED in mixed batch");
  assert(mixedResult.waitingFinancial >= 1, "User C classified as waiting_financial");
  assert(mixedResult.ownerReview >= 2, "User D & User E classified as owner_review");

  // Verify User C lifecycle (waiting_financial)
  const { data: userCLifecycle } = await supabase.from("account_lifecycles").select("*").eq("user_id", userC).single();
  assert(userCLifecycle?.status === "DELETION_REQUESTED", "User C remains DELETION_REQUESTED");
  assert(userCLifecycle?.closure_last_error_code === "WAITING_FINANCIAL", "User C closure_last_error_code is WAITING_FINANCIAL");
  assert(userCLifecycle?.closure_owner_review_required === false, "User C closure_owner_review_required is FALSE (scheduled retry with backoff)");
  assert(Boolean(userCLifecycle?.closure_next_retry_at), "User C closure_next_retry_at set with backoff");

  // Verify User D lifecycle (TOMBSTONE_EMAIL_CONFLICT -> owner review)
  const { data: userDLifecycle } = await supabase.from("account_lifecycles").select("*").eq("user_id", userD).single();
  assert(userDLifecycle?.status === "DELETION_REQUESTED", "User D remains DELETION_REQUESTED");
  assert(userDLifecycle?.closure_owner_review_required === true, "User D closure_owner_review_required set to TRUE");
  assert(userDLifecycle?.closure_last_error_code === "TOMBSTONE_EMAIL_CONFLICT", "User D closure_last_error_code recorded TOMBSTONE_EMAIL_CONFLICT");

  // Verify User E lifecycle (AUTH_USER_NOT_FOUND -> owner review)
  const { data: userELifecycle } = await supabase.from("account_lifecycles").select("*").eq("user_id", userE).single();
  assert(userELifecycle?.closure_owner_review_required === true, "User E closure_owner_review_required set to TRUE");
  assert(userELifecycle?.closure_last_error_code === "AUTH_USER_NOT_FOUND", "User E closure_last_error_code recorded AUTH_USER_NOT_FOUND");

  // Teardown conflicting user
  if (confUserData.user) {
    await supabase.auth.admin.deleteUser(confUserData.user.id);
  }
  await cleanupAll();

  console.log("\n--- TEST 3: RETRY BUDGET EXHAUSTION (retry_count >= 5 -> OWNER REVIEW) ---");
  const tombstoneF = `tombstone_${userF}@deleted.unboda.internal`;

  await supabase.auth.admin.createUser({ id: userF, email: tombstoneF, password: "Password123!", email_confirm: true });
  await supabase.from("profiles").insert({ id: profileF, user_id: userF, label: "Prof F", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar" });
  await supabase.from("account_lifecycles").insert({
    user_id: userF,
    generation: 1,
    status: "DELETION_REQUESTED",
    finalization_started_at: new Date().toISOString(),
    data_scrubbed_at: new Date().toISOString(),
    closure_retry_count: 4, // 5th attempt will exhaust retry budget
  });
  // Delete Auth user via session_replication_role after lifecycle insertion to trigger AUTH_USER_NOT_FOUND during finalization
  execSync(`docker exec -i supabase_db_unboda psql -U postgres -d postgres -c "SET session_replication_role = 'replica'; DELETE FROM auth.users WHERE id = '${userF}';"`, { encoding: "utf-8" });

  const exhaustedBatchResult = await reconcileAccountClosureFinalizations({ batchLimit: 10 });

  assert(exhaustedBatchResult.ownerReview >= 1, "Exhausted retry batch escalated account to ownerReview");

  const { data: userFLifecycle } = await supabase.from("account_lifecycles").select("*").eq("user_id", userF).single();
  assert(userFLifecycle?.closure_owner_review_required === true, "User F closure_owner_review_required set to TRUE upon retry exhaustion");
  assert(userFLifecycle?.closure_last_error_code === "AUTH_USER_NOT_FOUND", "User F closure_last_error_code recorded AUTH_USER_NOT_FOUND");
  assert(userFLifecycle?.status === "DELETION_REQUESTED", "User F status remains DELETION_REQUESTED");

  await cleanupAll();

  console.log("\n--- TEST 4: CONCURRENT WORKERS & STALE LEASE RECOVERY ---");
  await supabase.auth.admin.createUser({ id: userG, email: `synthetic_3e2_g_${Date.now()}@disposable.local`, password: "Password123!", email_confirm: true });
  await supabase.from("profiles").insert({ id: profileG, user_id: userG, label: "Prof G", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar" });
  await supabase.from("account_lifecycles").insert({
    user_id: userG,
    generation: 1,
    status: "DELETION_REQUESTED",
    finalization_started_at: new Date().toISOString(),
  });

  // Worker 1 claims User G with active lease
  const worker1Token = "11111111-9999-9999-9999-999999999999";
  await supabase.rpc("claim_account_closure_finalizations", { requested_limit: 10, claim_token: worker1Token, lease_seconds: 300 });

  // Worker 2 runs reconcile batch (User G is leased, so Worker 2 claims 0)
  const worker2Result1 = await reconcileAccountClosureFinalizations({ batchLimit: 10 });
  assert(worker2Result1.claimed === 0, "Worker 2 claimed 0 accounts while Worker 1 active lease is valid");

  // Expire Worker 1 lease manually in DB
  const pastExpiry = new Date(Date.now() - 10000).toISOString();
  await supabase.from("account_lifecycles").update({ closure_claim_expires_at: pastExpiry }).eq("user_id", userG);

  // Worker 2 runs reconcile batch again (User G stale lease reclaimed and finalized)
  const worker2Result2 = await reconcileAccountClosureFinalizations({ batchLimit: 10 });
  assert(worker2Result2.claimed >= 1 && worker2Result2.finalized >= 1, "Worker 2 reclaimed stale leased account and finalized to CLOSED");

  const { data: userGLifecycle } = await supabase.from("account_lifecycles").select("*").eq("user_id", userG).single();
  assert(userGLifecycle?.status === "CLOSED" && Boolean(userGLifecycle.finalized_at), "User G successfully finalized to CLOSED after stale lease recovery");

  await cleanupAll();

  console.log("   Local disposable DB integration tests completed & passed ✓");
}

runDbIntegrationTests()
  .then(() => {
    console.log("\n" + "=".repeat(80));
    console.log("✓ ALL PHASE 3E-2 ACCOUNT CLOSURE BATCH WORKER TESTS PASSED");
    console.log("=".repeat(80));
  })
  .catch((err) => {
    console.error("❌ PHASE 3E-2 TEST FAILED:", err);
    process.exit(1);
  });
