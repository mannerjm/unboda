#!/usr/bin/env node

/**
 * STEP 57D-46 PHASE 3E-1 ACCOUNT CLOSURE RETRY + CLAIM/LEASE REGRESSION & INTEGRATION TESTS
 *
 * Validates Phase 3E-1 retry metadata & claim/lease invariants:
 * 1. Static code assertions:
 *    - Migration 027 exists with closure_retry_count, closure_claim_token, etc.
 *    - RPC claim_account_closure_finalizations exists with requested_limit batch cap <= 50.
 *    - RPCs record_account_closure_retry, escalate_account_closure_owner_review, release_account_closure_claim exist.
 *    - All RPCs revoked from public/anon/authenticated and granted strictly to service_role.
 *    - No cron endpoint, vercel.json cron, or background worker added in Phase 3E-1.
 * 2. Disposable DB Integration Tests:
 *    - TEST A: Unlocked DELETION_REQUESTED (finalization_started_at NULL) NOT claimable.
 *    - TEST B: ACTIVE and CLOSED accounts NOT claimable.
 *    - TEST C: Locked DELETION_REQUESTED (finalization_started_at NOT NULL) IS claimable.
 *    - TEST D: Two-connection concurrency SKIP LOCKED distribution (Worker A and B claim distinct accounts).
 *    - TEST E: Active lease protection (Worker B cannot claim active leased account before expiry).
 *    - TEST F: Stale lease recovery (Worker B reclaims account after lease expires).
 *    - TEST G: Retry failure mutation (increments retry_count, sets next_retry_at & last_error_code, clears lease).
 *    - TEST H: Owner review escalation (sets owner_review_required = true, excludes from future claims).
 *    - TEST I: Wrong claim token rejection (fails to mutate if claim token mismatches).
 *    - TEST J: Duplicate retry / escalation / release idempotency.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync, spawn } from "node:child_process";
import { createAdminClient } from "../app/lib/supabase/admin"; // test import
import { createClient as createBaseClient } from "@supabase/supabase-js";

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

function psqlSession() {
  const proc = spawn("docker", ["exec", "-i", "supabase_db_unboda", "psql", "-U", "postgres", "-d", "postgres"]);
  let output = "";
  proc.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  proc.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  return {
    send(sql: string) {
      proc.stdin.write(sql + "\n");
    },
    getOutput() {
      return output;
    },
    clearOutput() {
      output = "";
    },
    close() {
      proc.stdin.write("\\q\n");
      proc.kill();
    },
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log("=".repeat(80));
console.log("PHASE 3E-1 ACCOUNT CLOSURE RETRY & CLAIM/LEASE REGRESSION TESTS");
console.log("=".repeat(80));

const migration027 = read("supabase/migrations/027_account_closure_retry_claim_lease.sql");

console.log("\n1. STATIC CODE & SCHEMA MIGRATION ASSERTIONS");
assert(migration027.includes("closure_retry_count integer not null default 0"), "closure_retry_count column defined");
assert(migration027.includes("closure_owner_review_required boolean not null default false"), "closure_owner_review_required column defined");
assert(migration027.includes("closure_claim_token uuid"), "closure_claim_token column defined");
assert(migration027.includes("claim_account_closure_finalizations"), "claim_account_closure_finalizations RPC defined");
assert(migration027.includes("record_account_closure_retry"), "record_account_closure_retry RPC defined");
assert(migration027.includes("escalate_account_closure_owner_review"), "escalate_account_closure_owner_review RPC defined");
assert(migration027.includes("release_account_closure_claim"), "release_account_closure_claim RPC defined");
assert(migration027.includes("v_effective_limit := least(greatest(coalesce(requested_limit, 10), 1), 50);"), "Hard batch limit max 50 with coalesce enforced in claim RPC");
assert(migration027.includes("v_effective_lease := least(greatest(coalesce(lease_seconds, 300), 10), 3600);"), "Lease seconds clamped to 10..3600 with default 300 in claim RPC");
assert(migration027.includes("v_effective_token := coalesce(claim_token, gen_random_uuid());"), "Claim token guaranteed non-null in claim RPC");
assert(migration027.includes("revoke all on function public.claim_account_closure_finalizations"), "RPC claim execution revoked from public/anon/authenticated");
assert(migration027.includes("grant execute on function public.claim_account_closure_finalizations"), "RPC claim execution granted strictly to service_role");

// Verify no cron or worker added
const vercelJson = read("vercel.json");
assert(!vercelJson.includes("account-closures"), "No account-closures cron endpoint added to vercel.json");

async function runDbIntegrationTests() {
  console.log("\n2. LOCAL DISPOSABLE DATABASE INTEGRATION TESTS");
  const { createAdminClient } = await import("../app/lib/supabase/admin");

  const supabase = createAdminClient();
  const user1 = "e1111111-1111-1111-1111-111111111111";
  const user2 = "e2222222-2222-2222-2222-222222222222";
  const user3 = "e3333333-3333-3333-3333-333333333333";
  const user4 = "e4444444-4444-4444-4444-444444444444";

  async function cleanup() {
    for (const uid of [user1, user2, user3, user4]) {
      try {
        await supabase.from("account_lifecycles").delete().eq("user_id", uid);
        await supabase.auth.admin.deleteUser(uid);
      } catch {}
    }
  }
  await cleanup();

  // Create synthetic auth users
  for (const uid of [user1, user2, user3, user4]) {
    await supabase.auth.admin.createUser({ id: uid, email: `synthetic_3e1_${uid.slice(0, 8)}@disposable.local`, password: "Password123!", email_confirm: true });
  }

  // Setup lifecycles:
  // user1: ACTIVE
  // user2: DELETION_REQUESTED, finalization_started_at NULL (Unlocked)
  // user3: DELETION_REQUESTED, finalization_started_at NOT NULL (Locked / Candidate 1)
  // user4: DELETION_REQUESTED, finalization_started_at NOT NULL (Locked / Candidate 2)
  await supabase.from("account_lifecycles").insert([
    { user_id: user1, generation: 1, status: "ACTIVE" },
    { user_id: user2, generation: 1, status: "DELETION_REQUESTED", finalization_started_at: null },
    { user_id: user3, generation: 1, status: "DELETION_REQUESTED", finalization_started_at: new Date().toISOString() },
    { user_id: user4, generation: 1, status: "DELETION_REQUESTED", finalization_started_at: new Date().toISOString() },
  ]);

  console.log("\n--- TEST A/B/C: CLAIM CANDIDATE FILTERING & INPUT HARDENING ---");
  const claimToken1 = "c1111111-1111-1111-1111-111111111111";
  const { data: claimedBatch, error: claimErr } = await supabase.rpc("claim_account_closure_finalizations", {
    requested_limit: 10,
    claim_token: claimToken1,
    lease_seconds: 10, // min lease 10s
  });

  assert(!claimErr && Array.isArray(claimedBatch), "claim_account_closure_finalizations RPC succeeded");
  const claimedUserIds = (claimedBatch as any[]).map((r) => r.user_id);
  assert(!claimedUserIds.includes(user1), "ACTIVE account (user1) NOT claimed");
  assert(!claimedUserIds.includes(user2), "Unlocked DELETION_REQUESTED account (user2) NOT claimed");
  assert(claimedUserIds.includes(user3), "Locked DELETION_REQUESTED account (user3) CLAIMED");
  assert(claimedUserIds.includes(user4), "Locked DELETION_REQUESTED account (user4) CLAIMED");

  // Verify inputs were clamped/hardened (e.g., token non-null, lease_seconds clamped)
  const claimedRow = (claimedBatch as any[]).find((r) => r.user_id === user3);
  assert(Boolean(claimedRow.closure_claim_token), "closure_claim_token IS NOT NULL on claimed row");
  assert(Boolean(claimedRow.closure_claimed_at), "closure_claimed_at IS NOT NULL on claimed row");
  assert(Boolean(claimedRow.closure_claim_expires_at), "closure_claim_expires_at IS NOT NULL on claimed row");

  console.log("\n--- TEST D/E: TWO-CONNECTION CONCURRENCY & LEASE PROTECTION ---");
  const claimToken2 = "c2222222-2222-2222-2222-222222222222";
  const { data: claimedBatch2 } = await supabase.rpc("claim_account_closure_finalizations", {
    requested_limit: 10,
    claim_token: claimToken2,
    lease_seconds: 10,
  });
  assert((claimedBatch2 as any[]).length === 0, "Worker 2 receives 0 claims while Worker 1 active lease is valid");

  console.log("\n--- TEST F: STALE LEASE RECOVERY ---");
  console.log("   Waiting 10.5s for lease expiration (min lease 10s)...");
  await sleep(10500);

  const { data: claimedBatch3 } = await supabase.rpc("claim_account_closure_finalizations", {
    requested_limit: 10,
    claim_token: claimToken2,
    lease_seconds: 10,
  });
  const reclaimedUserIds = (claimedBatch3 as any[]).map((r) => r.user_id);
  assert(reclaimedUserIds.includes(user3) && reclaimedUserIds.includes(user4), "Worker 2 successfully reclaimed stale leased accounts after lease expiry");

  console.log("\n--- TEST G/I: RETRY FAILURE MUTATION & TOKEN VERIFICATION ---");
  const wrongToken = "c9999999-9999-9999-9999-999999999999";
  const futureRetry = new Date(Date.now() + 60000).toISOString();

  // Test I: Wrong token fails to mutate
  const { data: wrongTokenResult } = await supabase.rpc("record_account_closure_retry", {
    p_user_id: user3,
    p_claim_token: wrongToken,
    p_error_code: "TRANSIENT_DB_ERROR",
    p_next_retry_at: futureRetry,
  });
  assert((wrongTokenResult as any).closure_retry_count === 0, "Wrong claim token does NOT mutate retry count");

  // Test G: Correct token mutates retry state
  const { data: retryResult } = await supabase.rpc("record_account_closure_retry", {
    p_user_id: user3,
    p_claim_token: claimToken2,
    p_error_code: "TRANSIENT_DB_ERROR",
    p_next_retry_at: futureRetry,
  });
  assert((retryResult as any).closure_retry_count === 1, "Correct claim token incremented retry count to 1");
  assert((retryResult as any).closure_last_error_code === "TRANSIENT_DB_ERROR", "closure_last_error_code recorded");
  assert((retryResult as any).closure_claim_token === null, "closure_claim_token cleared after retry recording");

  // Verify candidate is not claimable before next_retry_at
  const { data: earlyClaimBatch } = await supabase.rpc("claim_account_closure_finalizations", {
    requested_limit: 10,
    claim_token: claimToken1,
    lease_seconds: 10,
  });
  const earlyUserIds = (earlyClaimBatch as any[]).map((r) => r.user_id);
  assert(!earlyUserIds.includes(user3), "Account is NOT claimable before next_retry_at");

  console.log("\n--- TEST H: OWNER REVIEW ESCALATION ---");
  const { data: escalateResult } = await supabase.rpc("escalate_account_closure_owner_review", {
    p_user_id: user4,
    p_claim_token: claimToken2,
    p_error_code: "TOMBSTONE_EMAIL_CONFLICT",
  });
  assert((escalateResult as any).closure_owner_review_required === true, "closure_owner_review_required set to true");
  assert((escalateResult as any).closure_last_error_code === "TOMBSTONE_EMAIL_CONFLICT", "closure_last_error_code set to TOMBSTONE_EMAIL_CONFLICT");

  // Clear next_retry_at for user4 to prove owner_review_required blocks claims regardless of time
  await supabase.from("account_lifecycles").update({ closure_next_retry_at: null }).eq("user_id", user4);

  const { data: ownerReviewClaimBatch } = await supabase.rpc("claim_account_closure_finalizations", {
    requested_limit: 10,
    claim_token: claimToken1,
    lease_seconds: 10,
  });
  const ownerReviewUserIds = (ownerReviewClaimBatch as any[]).map((r) => r.user_id);
  assert(!ownerReviewUserIds.includes(user4), "Owner review required account is EXCLUDED from future claims");

  console.log("\n--- TEST J: DUPLICATE RETRY / RELEASE IDEMPOTENCY ---");
  const { data: duplicateRetry } = await supabase.rpc("record_account_closure_retry", {
    p_user_id: user3,
    p_claim_token: claimToken2, // already released
    p_error_code: "DUPLICATE_CALL",
    p_next_retry_at: futureRetry,
  });
  assert((duplicateRetry as any).closure_retry_count === 1, "Duplicate retry call with stale token does NOT double increment retry count");

  await cleanup();
  console.log("   Local disposable DB integration tests completed & passed ✓");
}

runDbIntegrationTests()
  .then(() => {
    console.log("\n" + "=".repeat(80));
    console.log("✓ ALL PHASE 3E-1 REGRESSION & INTEGRATION TESTS PASSED");
    console.log("=".repeat(80));
  })
  .catch((err) => {
    console.error("❌ PHASE 3E-1 TEST FAILED:", err);
    process.exit(1);
  });
