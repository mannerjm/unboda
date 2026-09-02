#!/usr/bin/env node

/**
 * STEP 57D-46 PHASE 3E-3 SHARED INTERNAL CRON DISPATCHER REGRESSION & INTEGRATION TESTS
 *
 * Validates:
 * 1. Static assertions:
 *    - Exactly one hourly cron entry in vercel.json, pointing at the generic dispatcher.
 *    - Old payment route file still exists but is no longer scheduled.
 *    - Dispatcher invokes both workers as direct server-side calls (no internal fetch()).
 *    - Dispatcher does not accept a client-selected job name.
 * 2. Scheduler auth unit tests (missing secret / no header / malformed / wrong / ordinary
 *    Supabase-shaped bearer / valid) directly against isAuthorizedSchedulerRequest.
 * 3. Live HTTP integration against local disposable Supabase + a spawned Next dev server:
 *    - happy account closure finalization through the dispatcher
 *    - financial-wait retry scheduling through the dispatcher
 *    - owner-review escalation through the dispatcher
 *    - duplicate dispatcher invocation safety
 *    - concurrent dispatcher invocation safety
 *    - response safety (no UUID/PII/raw errors/secret)
 *    - existing payment HTTP route continues to function independently
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

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
console.log("PHASE 3E-3 SHARED INTERNAL CRON DISPATCHER REGRESSION TESTS");
console.log("=".repeat(80));

console.log("\n1. STATIC CODE & CONFIGURATION ASSERTIONS");

const vercelJson = JSON.parse(read("vercel.json")) as { crons: Array<{ path: string; schedule: string }> };
assert(vercelJson.crons.length === 1, "vercel.json has exactly one cron entry");
assert(vercelJson.crons[0].path === "/api/internal/reconcile", "sole cron entry targets the generic dispatcher");
assert(vercelJson.crons[0].schedule === "0 * * * *", "dispatcher cron schedule is hourly");

const oldPaymentRoute = read("app/api/internal/payments/reconcile/route.ts");
assert(oldPaymentRoute.includes("export async function GET"), "old payment route file still exists and exports GET");
assert(oldPaymentRoute.includes("reconcilePaymentsBatch"), "old payment route delegates to the extracted reusable worker function");

const dispatcherRoute = read("app/api/internal/reconcile/route.ts");
assert(dispatcherRoute.includes("reconcilePaymentsBatch"), "dispatcher directly imports the payment worker function");
assert(dispatcherRoute.includes("reconcileRefundsBatch"), "dispatcher directly imports the refund worker function");
assert(dispatcherRoute.includes("reconcileAccountClosureFinalizations"), "dispatcher directly imports the account closure worker function");
assert(!dispatcherRoute.includes("fetch("), "dispatcher performs no internal HTTP fetch (direct function calls only)");
assert(!/req(uest)?\.(json|url|nextUrl)[^\n]*job/i.test(dispatcherRoute), "dispatcher does not read a client-selected job name");
assert(dispatcherRoute.includes("batchLimit: 10") && dispatcherRoute.includes("leaseSeconds: 300"), "dispatcher hardcodes batchLimit=10 and leaseSeconds=300 (no HTTP override)");
assert(dispatcherRoute.includes('"Cache-Control": "no-store"'), "dispatcher sets Cache-Control: no-store");
assert(dispatcherRoute.includes('dynamic = "force-dynamic"'), "dispatcher declares force-dynamic");

const workerTryCatchCount = (dispatcherRoute.match(/try\s*{/g) ?? []).length;
assert(workerTryCatchCount === 3, "dispatcher isolates payment, refund, and closure workers in independent try/catch blocks");
assert(!dispatcherRoute.includes("BEGIN") && !dispatcherRoute.includes(".transaction("), "no shared DB transaction wraps both workers");

const schedulerAuth = read("app/lib/internal/schedulerAuth.ts");
assert(schedulerAuth.includes("timingSafeEqual"), "scheduler auth uses timing-safe comparison");
assert(schedulerAuth.includes("PAYMENT_RECONCILIATION_SECRET"), "scheduler auth documents PAYMENT_RECONCILIATION_SECRET as the current compatibility source");

async function runAuthUnitTests() {
  console.log("\n2. SCHEDULER AUTH UNIT TESTS");
  const SECRET = "phase3e3-unit-test-secret";

  async function withEnv(
    secret: string | undefined,
    fn: (mod: typeof import("../app/lib/internal/schedulerAuth")) => Promise<void> | void,
  ) {
    const prev = process.env.PAYMENT_RECONCILIATION_SECRET;
    if (secret === undefined) delete process.env.PAYMENT_RECONCILIATION_SECRET;
    else process.env.PAYMENT_RECONCILIATION_SECRET = secret;
    // Fresh module instance per case so the env var is read at call time, not import time.
    const mod = await import(`../app/lib/internal/schedulerAuth?case=${Math.random()}`);
    try {
      await fn(mod);
    } finally {
      if (prev === undefined) delete process.env.PAYMENT_RECONCILIATION_SECRET;
      else process.env.PAYMENT_RECONCILIATION_SECRET = prev;
    }
  }

  await withEnv(undefined, async (mod) => {
    const req = new Request("http://local.test/api/internal/reconcile", { headers: { authorization: `Bearer ${SECRET}` } });
    assert(mod.isAuthorizedSchedulerRequest(req) === false, "missing server secret fails closed even with a matching-looking header");
  });

  await withEnv(SECRET, async (mod) => {
    const req = new Request("http://local.test/api/internal/reconcile");
    assert(mod.isAuthorizedSchedulerRequest(req) === false, "missing Authorization header is unauthorized");
  });

  await withEnv(SECRET, async (mod) => {
    const req = new Request("http://local.test/api/internal/reconcile", { headers: { authorization: "Basic not-bearer" } });
    assert(mod.isAuthorizedSchedulerRequest(req) === false, "malformed (non-Bearer) Authorization header is unauthorized");
  });

  await withEnv(SECRET, async (mod) => {
    const req = new Request("http://local.test/api/internal/reconcile", { headers: { authorization: "Bearer wrong-secret" } });
    assert(mod.isAuthorizedSchedulerRequest(req) === false, "wrong credential is unauthorized");
  });

  await withEnv(SECRET, async (mod) => {
    // Shape of an ordinary Supabase user access token, not the scheduler secret.
    const fakeJwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvcmRpbmFyeS11c2VyIn0.fakefakefakefakefakefake";
    const req = new Request("http://local.test/api/internal/reconcile", { headers: { authorization: `Bearer ${fakeJwt}` } });
    assert(mod.isAuthorizedSchedulerRequest(req) === false, "ordinary authenticated Supabase user token is insufficient / unauthorized");
  });

  await withEnv(SECRET, async (mod) => {
    const req = new Request("http://local.test/api/internal/reconcile", { headers: { authorization: `Bearer ${SECRET}` } });
    assert(mod.isAuthorizedSchedulerRequest(req) === true, "valid scheduler credential is authorized");
  });
}

async function runHttpIntegrationTests() {
  console.log("\n3. LIVE HTTP DISPATCHER INTEGRATION TESTS");

  const { createAdminClient } = await import("../app/lib/supabase/admin");
  const supabase = createAdminClient();

  const userA = "3e300000-0000-0000-0000-000000000001"; // happy closure
  const userC = "3e300000-0000-0000-0000-000000000003"; // financial wait
  const userD = "3e300000-0000-0000-0000-000000000004"; // owner review (tombstone conflict)
  const profileA = "3e310000-0000-0000-0000-000000000001";
  const profileC = "3e310000-0000-0000-0000-000000000003";
  const profileD = "3e310000-0000-0000-0000-000000000004";
  const orderC = "3e320000-0000-0000-0000-000000000003";
  const paymentC = "3e330000-0000-0000-0000-000000000003";
  const refundC = "3e340000-0000-0000-0000-000000000003";

  let confUserId: string | undefined;

  async function cleanupAll() {
    for (const uid of [userA, userC, userD]) {
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
    if (confUserId) {
      try {
        await supabase.auth.admin.deleteUser(confUserId);
      } catch {}
      confUserId = undefined;
    }
  }
  await cleanupAll();

  await supabase.auth.admin.createUser({ id: userA, email: `synthetic_3e3_a_${Date.now()}@disposable.local`, password: "Password123!", email_confirm: true });
  await supabase.from("profiles").insert({ id: profileA, user_id: userA, label: "Prof A", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar" });
  await supabase.from("account_lifecycles").insert({ user_id: userA, generation: 1, status: "DELETION_REQUESTED", finalization_started_at: new Date().toISOString() });

  await supabase.auth.admin.createUser({ id: userC, email: `synthetic_3e3_c_${Date.now()}@disposable.local`, password: "Password123!", email_confirm: true });
  await supabase.from("profiles").insert({ id: profileC, user_id: userC, label: "Prof C", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar" });
  await supabase.from("orders").insert({ id: orderC, user_id: userC, profile_id: profileC, product_id: "saju-v1", amount: 39000, status: "paid", paid_at: new Date().toISOString() });
  await supabase.from("toss_payment_records").insert({ id: paymentC, order_id: orderC, payment_key: "pk_c", expected_amount: 39000, confirmed_amount: 39000, reconciliation_status: "paid" });
  await supabase.from("refund_workflows").insert({ id: refundC, order_id: orderC, payment_record_id: paymentC, user_id: userC, profile_id: profileC, product_id: "saju-v1", requested_amount: 39000, reason_category: "CHANGE_OF_MIND", status: "REFUND_REQUESTED" });
  await supabase.from("account_lifecycles").insert({ user_id: userC, generation: 1, status: "DELETION_REQUESTED", finalization_started_at: new Date().toISOString() });

  await supabase.auth.admin.createUser({ id: userD, email: `synthetic_3e3_d_${Date.now()}@disposable.local`, password: "Password123!", email_confirm: true });
  await supabase.from("profiles").insert({ id: profileD, user_id: userD, label: "Prof D", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar" });
  await supabase.from("account_lifecycles").insert({ user_id: userD, generation: 1, status: "DELETION_REQUESTED", finalization_started_at: new Date().toISOString() });
  const tombstoneD = `tombstone_${userD}@deleted.unboda.internal`;
  const { data: confUserData } = await supabase.auth.admin.createUser({ email: tombstoneD, password: "Password123!", email_confirm: true });
  confUserId = confUserData.user?.id;

  const SECRET = "phase3e3-http-disposable-secret";
  const PORT = "3811";
  const BASE = `http://127.0.0.1:${PORT}`;
  let next: ChildProcess | undefined;

  const forbiddenSubstrings = [
    userA, userC, userD, profileA, profileC, profileD, orderC, paymentC, refundC,
    "SUPABASE_SERVICE_ROLE_KEY", SECRET, "Authorization", "claimToken", "stack",
    "@disposable.local", "@deleted.unboda.internal", "password",
  ];

  try {
    const runtime = {
      ...process.env,
      PAYMENT_RECONCILIATION_SECRET: SECRET,
      PORT,
    };
    next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", PORT], { env: runtime, stdio: "ignore", cwd: process.cwd() });

    for (let i = 0; i < 60; i++) {
      try {
        const response = await fetch(`${BASE}/api/internal/reconcile`);
        if (response.status === 401) break;
      } catch {
        /* wait for disposable Next dev server */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    async function call(auth?: string) {
      const response = await fetch(`${BASE}/api/internal/reconcile`, {
        headers: auth ? { Authorization: `Bearer ${auth}` } : {},
      });
      const text = await response.text();
      for (const forbidden of forbiddenSubstrings) {
        assert(!text.includes(forbidden), `dispatcher response does not leak forbidden value (${forbidden.slice(0, 12)}...)`);
      }
      return { response, body: JSON.parse(text) as Record<string, unknown> };
    }

    console.log("\n--- AUTH: no Authorization ---");
    const noAuth = await call();
    assert(noAuth.response.status === 401, "dispatcher: no Authorization -> 401");

    console.log("\n--- AUTH: wrong secret ---");
    const wrongAuth = await call("not-the-secret");
    assert(wrongAuth.response.status === 401, "dispatcher: wrong secret -> 401");

    console.log("\n--- HAPPY / FINANCIAL WAIT / OWNER REVIEW via dispatcher ---");
    const first = await call(SECRET);
    assert(first.response.ok, "dispatcher: valid scheduler credential authorized");
    assert(first.response.headers.get("cache-control") === "no-store", "dispatcher response is Cache-Control: no-store");
    const firstBody = first.body as { ok: boolean; payments: Record<string, unknown>; accountClosures: Record<string, unknown> };
    assert(firstBody.payments.ok === true, "payments worker reported ok:true (no eligible records)");
    const closures1 = firstBody.accountClosures as { ok: boolean; finalized: number; waitingFinancial: number; ownerReview: number; claimed: number };
    assert(closures1.ok === true, "account closure worker reported ok:true");
    assert(closures1.claimed >= 3, "dispatcher claimed all three synthetic closure candidates");
    assert(closures1.finalized >= 1, "user A finalized via dispatcher");
    assert(closures1.waitingFinancial >= 1, "user C scheduled for retry (financial wait) via dispatcher");
    assert(closures1.ownerReview >= 1, "user D escalated to owner review via dispatcher");

    const { data: userALifecycle } = await supabase.from("account_lifecycles").select("*").eq("user_id", userA).single();
    assert(userALifecycle?.status === "CLOSED", "user A lifecycle finalized to CLOSED");
    const { data: userCLifecycle } = await supabase.from("account_lifecycles").select("*").eq("user_id", userC).single();
    assert(userCLifecycle?.closure_last_error_code === "WAITING_FINANCIAL", "user C closure_last_error_code is WAITING_FINANCIAL");
    const { data: userDLifecycle } = await supabase.from("account_lifecycles").select("*").eq("user_id", userD).single();
    assert(userDLifecycle?.closure_owner_review_required === true, "user D closure_owner_review_required is TRUE");

    console.log("\n--- DUPLICATE DISPATCHER INVOCATION ---");
    const second = await call(SECRET);
    assert(second.response.ok, "second dispatcher call succeeds");
    const closures2 = second.body as { accountClosures: { finalized: number; ownerReview: number; claimed: number } };
    assert(closures2.accountClosures.claimed === 0, "second call claims 0 (user A already CLOSED, C not yet due, D already escalated)");

    const { data: userALifecycle2 } = await supabase.from("account_lifecycles").select("*").eq("user_id", userA).single();
    assert(userALifecycle2?.status === "CLOSED", "user A remains CLOSED (no duplicate mutation)");

    console.log("\n--- CONCURRENT DISPATCHER INVOCATION ---");
    await supabase.from("account_lifecycles").update({ closure_owner_review_required: false, closure_last_error_code: null, closure_retry_count: 0, closure_next_retry_at: null }).eq("user_id", userC);
    await supabase.from("refund_workflows").update({ status: "REFUND_COMPLETED", provider_status: "CANCELED", provider_cancellation_reference: "tx-3e3-complete" }).eq("id", refundC);
    const [concA, concB] = await Promise.all([call(SECRET), call(SECRET)]);
    assert(concA.response.ok && concB.response.ok, "both concurrent dispatcher calls succeed");
    const concClaimedTotal = (concA.body as { accountClosures: { claimed: number } }).accountClosures.claimed + (concB.body as { accountClosures: { claimed: number } }).accountClosures.claimed;
    assert(concClaimedTotal <= 1, "claim/lease prevents duplicate concurrent processing of the same account (combined claims <= 1)");

    console.log("\n--- PAYMENT ROUTE REGRESSION (still functional independently) ---");
    const oldRouteNoAuth = await fetch(`${BASE}/api/internal/payments/reconcile`);
    assert(oldRouteNoAuth.status === 401, "old payment route still requires auth");
    const oldRouteAuthed = await fetch(`${BASE}/api/internal/payments/reconcile`, { headers: { Authorization: `Bearer ${SECRET}` } });
    assert(oldRouteAuthed.ok, "old payment route still functions when called directly with the shared secret");

    console.log("\n--- RESPONSE SAFETY: OWNER AUTHENTICATED SUPABASE USER INSUFFICIENT ---");
    const supabaseUserJwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvcmRpbmFyeS11c2VyIn0.notthesecret";
    const ordinaryUser = await call(supabaseUserJwt);
    assert(ordinaryUser.response.status === 401, "ordinary authenticated Supabase user cannot invoke dispatcher");
  } finally {
    if (next) {
      next.kill();
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 3000);
        next!.once("close", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    await cleanupAll();
  }
}

async function main() {
  await runAuthUnitTests();
  await runHttpIntegrationTests();
  console.log("\n" + "=".repeat(80));
  console.log("PHASE 3E-3 SHARED INTERNAL CRON DISPATCHER: ALL TESTS PASSED");
  console.log("=".repeat(80));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
