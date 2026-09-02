import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "../app/lib/supabase/admin";
import { executeAccountClosureDbCleanup } from "../app/lib/accounts/server";

function loadLocalEnv(): void {
  const envPath = join(process.cwd(), ".env.local");
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch {}
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

loadLocalEnv();
const migrationPath = resolve("supabase/migrations/036_account_closure_personal_data_cleanup.sql");
const migration = readFileSync(migrationPath, "utf8");
assert(migration.includes("alter column profile_snapshot drop not null") && migration.includes("alter column profile_fingerprint drop not null"), "free-result personal fields are nullable only for guarded tombstones");
assert(migration.includes("prevent_free_analysis_personal_nulls") && migration.includes("FREE_ANALYSIS_PERSONAL_FIELDS_REQUIRED_FOR_ACTIVE_ACCOUNT"), "active-account free-result null writes remain guarded");
assert(migration.includes("lifecycle.status = 'CLOSED'") && migration.includes("delete from public.guest_free_analyses"), "legacy CLOSED backfill and Guest deletion are present");
assert(migration.includes("jsonb_build_object('anchorDate'"), "reference snapshots use an anchorDate-only allowlist");
console.log("1. static cleanup, active-write guard, and CLOSED backfill contracts present ✓");

const supabase = createAdminClient();
const userId = randomUUID();
const unrelatedUserId = randomUUID();
const legacyUserId = randomUUID();
const profileIds = [randomUUID(), randomUUID(), randomUUID()];
const legacyProfileId = randomUUID();
const orderId = randomUUID();
const purchaseId = randomUUID();
const entitlementId = randomUUID();
const reportId = randomUUID();
const paymentId = randomUUID();
const guestId = randomUUID();
const unrelatedGuestId = randomUUID();
const legacyGuestId = randomUUID();
const interestId = randomUUID();
const legacyInterestId = randomUUID();

async function createUser(id: string): Promise<void> {
  const { error } = await supabase.auth.admin.createUser({
    id,
    email: `${id}@disposable.local`,
    password: "DisposableOnly123!",
    email_confirm: true,
  });
  if (error) throw error;
}

async function cleanup(): Promise<void> {
  await supabase.from("guest_free_analyses").delete().in("id", [guestId, unrelatedGuestId, legacyGuestId]);
  await supabase.from("interested_analyses").delete().in("id", [interestId, legacyInterestId]);
  await supabase.from("free_analysis_results").delete().in("user_id", [userId, legacyUserId]);
  await supabase.from("paid_reports").delete().in("id", [reportId]);
  await supabase.from("entitlements").delete().in("id", [entitlementId]);
  await supabase.from("toss_payment_records").delete().in("id", [paymentId]);
  await supabase.from("purchases").delete().in("id", [purchaseId]);
  await supabase.from("orders").delete().in("id", [orderId]);
  await supabase.from("active_profiles").delete().in("user_id", [userId, legacyUserId]);
  await supabase.from("profiles").delete().in("id", [...profileIds, legacyProfileId]);
  await supabase.from("account_lifecycles").delete().in("user_id", [userId, legacyUserId]);
  await supabase.auth.admin.deleteUser(userId);
  await supabase.auth.admin.deleteUser(unrelatedUserId);
  await supabase.auth.admin.deleteUser(legacyUserId);
}

async function insertFreeResult(id: string, profileId: string, userId: string, status: "generating" | "completed" | "failed"): Promise<void> {
  const { error } = await supabase.from("free_analysis_results").insert({
    id,
    user_id: userId,
    profile_id: profileId,
    profile_fingerprint: `fixture-fingerprint-${id}`,
    profile_snapshot: { id: profileId, birthDate: "1990-01-01", birthTime: "12:00", gender: "남성", calendarType: "양력", isLeapMonth: false },
    status,
    content: status === "completed" ? { fixture: true } : null,
    error_code: status === "failed" ? "FIXTURE_FAILURE" : null,
  });
  if (error) throw error;
}

async function runFinalizedClosureProof(): Promise<void> {
  await createUser(userId);
  await createUser(unrelatedUserId);
  const { error: lifecycleError } = await supabase.from("account_lifecycles").insert({ user_id: userId, status: "DELETION_REQUESTED", finalization_started_at: new Date().toISOString() });
  if (lifecycleError) throw lifecycleError;
  const { error: unrelatedLifecycleError } = await supabase.from("account_lifecycles").insert({ user_id: unrelatedUserId });
  if (unrelatedLifecycleError) throw unrelatedLifecycleError;

  const { error: profileError } = await supabase.from("profiles").insert(profileIds.map((id) => ({ id, user_id: userId, label: "Fixture Profile", relationship_type: "other", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false })));
  if (profileError) throw profileError;
  await insertFreeResult(randomUUID(), profileIds[0], userId, "generating");
  await insertFreeResult(randomUUID(), profileIds[1], userId, "completed");
  await insertFreeResult(randomUUID(), profileIds[2], userId, "failed");
  const { error: activeError } = await supabase.from("active_profiles").insert({ user_id: userId, profile_id: profileIds[0] });
  if (activeError) throw activeError;

  const referenceSnapshot = { anchorDate: "2026-01-01", fortune: { daeunOrder: 3, daeunGanji: "fixture", seunGanji: "fixture" }, unexpected: "remove" };
  const inputSnapshot = { version: 1, birthData: { birthDate: "1990-01-01", birthTime: "12:00", calendarType: "양력", isLeapMonth: false, gender: "남성" } };
  const { error: orderError } = await supabase.from("orders").insert({ id: orderId, user_id: userId, profile_id: profileIds[0], product_id: "fixture-product", amount: 1000, status: "paid", paid_at: new Date().toISOString(), analysis_edition_key: "fixture-edition", analysis_reference_snapshot: referenceSnapshot, analysis_input_snapshot: inputSnapshot });
  if (orderError) throw orderError;
  const { error: purchaseError } = await supabase.from("purchases").insert({ id: purchaseId, user_id: userId, profile_id: profileIds[0], product_id: "fixture-product", order_id: orderId, analysis_edition_key: "fixture-edition", analysis_reference_snapshot: referenceSnapshot, analysis_input_snapshot: inputSnapshot });
  if (purchaseError) throw purchaseError;
  const { error: entitlementError } = await supabase.from("entitlements").insert({ id: entitlementId, user_id: userId, profile_id: profileIds[0], resource_id: "fixture-product", resource_type: "paid_analysis", purchase_id: purchaseId, source: "purchase", is_active: true, analysis_edition_key: "fixture-edition" });
  if (entitlementError) throw entitlementError;
  const { error: paymentError } = await supabase.from("toss_payment_records").insert({ id: paymentId, order_id: orderId, payment_key: "fixture-payment-key", provider_order_id: "fixture-provider-order", expected_amount: 1000, confirmed_amount: 1000, currency: "KRW", provider_status: "paid", reconciliation_status: "paid" });
  if (paymentError) throw paymentError;
  const { error: reportError } = await supabase.from("paid_reports").insert({ id: reportId, user_id: userId, profile_id: profileIds[0], product_id: "fixture-product", purchase_id: purchaseId, status: "completed", content: { fixture: "personalized-content" } });
  if (reportError) throw reportError;
  const { error: interestError } = await supabase.from("interested_analyses").insert({ id: interestId, user_id: userId, profile_id: profileIds[0], product_id: "fixture-product" });
  if (interestError) throw interestError;

  const guestRow = { id: guestId, secret_hash: "fixture-guest-hash", status: "completed", selected_product_id: "fixture-product", expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), consumed_at: new Date().toISOString(), transferred_user_id: userId, resolved_profile_id: profileIds[0], profile_input: null, profile_fingerprint: null, content: null, transferred_minimized_at: new Date().toISOString() };
  const unrelatedGuestRow = { ...guestRow, id: unrelatedGuestId, secret_hash: "fixture-unrelated-hash", transferred_user_id: unrelatedUserId };
  const { error: guestError } = await supabase.from("guest_free_analyses").insert([guestRow, unrelatedGuestRow]);
  if (guestError) throw guestError;

  const scrubbed = await executeAccountClosureDbCleanup(userId);
  assert(Boolean(scrubbed.dataScrubbedAt), "eligible closure sets data_scrubbed_at");
  assert(scrubbed.status === "DELETION_REQUESTED", "DB cleanup remains before Auth/CLOSED phase");

  const { data: freeRows, error: freeReadError } = await supabase.from("free_analysis_results").select("content,profile_snapshot,profile_fingerprint,status").eq("user_id", userId);
  if (freeReadError) throw freeReadError;
  assert(freeRows?.length === 3 && freeRows.every((row) => row.content === null && row.profile_snapshot === null && row.profile_fingerprint === null), "all free-analysis states are scrubbed to null");
  const { data: profile, error: profileReadError } = await supabase.from("profiles").select("label,relationship_type,birth_date,birth_time,gender,calendar_type,is_leap_month").eq("id", profileIds[0]).single();
  if (profileReadError) throw profileReadError;
  assert(profile?.label === "ANONYMIZED" && profile.relationship_type === "other" && profile.birth_date === "1900-01-01" && profile.birth_time === "00:00:00" && profile.gender === "male" && profile.calendar_type === "solar" && profile.is_leap_month === false, "profile personal fields remain tombstoned");
  const { data: order, error: orderReadError } = await supabase.from("orders").select("id,user_id,amount,status,analysis_edition_key,analysis_reference_snapshot,analysis_input_snapshot").eq("id", orderId).single();
  if (orderReadError) throw orderReadError;
  assert(order?.id === orderId && order.user_id === userId && order.amount === 1000 && order.status === "paid" && order.analysis_edition_key === "fixture-edition" && JSON.stringify(order.analysis_reference_snapshot) === JSON.stringify({ anchorDate: "2026-01-01" }) && order.analysis_input_snapshot === null, "order financial identity remains intact and reference/input snapshots are minimized");
  const { data: purchase, error: purchaseReadError } = await supabase.from("purchases").select("id,order_id,analysis_edition_key,analysis_reference_snapshot,analysis_input_snapshot").eq("id", purchaseId).single();
  if (purchaseReadError) throw purchaseReadError;
  assert(purchase?.id === purchaseId && purchase.order_id === orderId && purchase.analysis_edition_key === "fixture-edition" && JSON.stringify(purchase.analysis_reference_snapshot) === JSON.stringify({ anchorDate: "2026-01-01" }) && purchase.analysis_input_snapshot === null, "purchase linkage remains intact and snapshots are minimized");
  const { data: entitlement } = await supabase.from("entitlements").select("id,is_active,revocation_reason,purchase_id,analysis_edition_key").eq("id", entitlementId).single();
  assert(entitlement?.id === entitlementId && entitlement.is_active === false && entitlement.revocation_reason === "ACCOUNT_CLOSED" && entitlement.purchase_id === purchaseId && entitlement.analysis_edition_key === "fixture-edition", "entitlement is revoked without losing linkage");
  const { data: report } = await supabase.from("paid_reports").select("id,content,purchase_id").eq("id", reportId).single();
  assert(report?.id === reportId && JSON.stringify(report.content) === JSON.stringify({ scrubbed: true }) && report.purchase_id === purchaseId, "paid report remains scrubbed with linkage");
  const { data: interests } = await supabase.from("interested_analyses").select("id").eq("user_id", userId);
  assert((interests ?? []).length === 0, "closing user's interests are deleted");
  const { data: deletedGuest } = await supabase.from("guest_free_analyses").select("id").eq("id", guestId).maybeSingle();
  const { data: retainedGuest } = await supabase.from("guest_free_analyses").select("id").eq("id", unrelatedGuestId).maybeSingle();
  assert(!deletedGuest && retainedGuest?.id === unrelatedGuestId, "only closing user's consumed Guest tombstone is deleted");

  const { error: secondCleanupError } = await supabase.rpc("execute_account_closure_db_cleanup", { p_user_id: userId });
  assert(!secondCleanupError, "repeated cleanup remains idempotent");
  console.log("2. finalized closure scrub, financial preservation, Guest isolation, and idempotency proof ✓");
}

async function runLegacyBackfillProof(): Promise<void> {
  await createUser(legacyUserId);
  const { error: lifecycleError } = await supabase.from("account_lifecycles").insert({ user_id: legacyUserId, status: "CLOSED", finalized_at: new Date().toISOString(), data_scrubbed_at: new Date().toISOString() });
  if (lifecycleError) throw lifecycleError;
  const { error: profileError } = await supabase.from("profiles").insert({ id: legacyProfileId, user_id: legacyUserId, label: "Legacy Fixture", relationship_type: "other", birth_date: "1991-01-01", birth_time: "01:00:00", gender: "female", calendar_type: "solar", is_leap_month: false });
  if (profileError) throw profileError;
  await insertFreeResult(randomUUID(), legacyProfileId, legacyUserId, "completed");
  const legacySnapshot = { anchorDate: "2026-02-01", fortune: { daeunOrder: 4, daeunGanji: "fixture", seunGanji: "fixture" } };
  const { error: legacyOrderError } = await supabase.from("orders").insert({ user_id: legacyUserId, profile_id: legacyProfileId, product_id: "legacy-product", amount: 1000, status: "paid", paid_at: new Date().toISOString(), analysis_reference_snapshot: legacySnapshot });
  if (legacyOrderError) throw legacyOrderError;
  const { error: legacyInterestError } = await supabase.from("interested_analyses").insert({ id: legacyInterestId, user_id: legacyUserId, profile_id: legacyProfileId, product_id: "legacy-product" });
  if (legacyInterestError) throw legacyInterestError;
  const { error: legacyGuestError } = await supabase.from("guest_free_analyses").insert({ id: legacyGuestId, secret_hash: "fixture-legacy-hash", status: "completed", expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), consumed_at: new Date().toISOString(), transferred_user_id: legacyUserId, resolved_profile_id: legacyProfileId, profile_input: null, profile_fingerprint: null, content: null, transferred_minimized_at: new Date().toISOString() });
  if (legacyGuestError) throw legacyGuestError;

  execFileSync("docker", ["cp", migrationPath, "supabase_db_unboda:/tmp/036_account_closure_personal_data_cleanup.sql"], { stdio: "ignore" });
  execFileSync("docker", ["exec", "supabase_db_unboda", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-f", "/tmp/036_account_closure_personal_data_cleanup.sql"], { stdio: "ignore" });

  const { data: free } = await supabase.from("free_analysis_results").select("content,profile_snapshot,profile_fingerprint").eq("user_id", legacyUserId);
  assert(free?.length === 1 && free[0].content === null && free[0].profile_snapshot === null && free[0].profile_fingerprint === null, "legacy CLOSED free-analysis row is backfilled");
  const { data: legacyInterest } = await supabase.from("interested_analyses").select("id").eq("id", legacyInterestId).maybeSingle();
  assert(!legacyInterest, "legacy CLOSED interests are backfilled away");
  const { data: legacyGuest } = await supabase.from("guest_free_analyses").select("id").eq("id", legacyGuestId).maybeSingle();
  assert(!legacyGuest, "legacy CLOSED transferred Guest tombstone is backfilled away");
  console.log("3. deterministic legacy CLOSED backfill proof ✓");
}

(async () => {
  try {
    await cleanup();
    await runFinalizedClosureProof();
    await runLegacyBackfillProof();
    console.log("account-closure-personal-data-cleanup-regression passed ✓");
  } finally {
    await cleanup();
  }
})().catch((error: unknown) => {
  if (error instanceof Error) console.error(error.message);
  else console.error("Account closure cleanup regression failed");
  process.exitCode = 1;
});
