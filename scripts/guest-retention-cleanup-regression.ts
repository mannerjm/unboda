import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertDisposableSupabaseUrl } from "./lib/disposable-supabase-target";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function loadLocalEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

const migration = readFileSync("supabase/migrations/035_bounded_guest_retention_cleanup.sql", "utf8");
const repository = readFileSync("app/lib/guestFreeAnalyses/server.ts", "utf8");
const scheduler = readFileSync("app/api/internal/reconcile/route.ts", "utf8");

assert(migration.includes("transferred_minimized_at") && migration.includes("created_at <= now() - interval '7 days'"), "migration must retain an absolute seven-day retention anchor");
assert(migration.includes("profile_input = null") && migration.includes("profile_fingerprint = null") && migration.includes("content = null"), "successful transfer must atomically minimize guest personal data");
assert(migration.includes("for update skip locked") && migration.includes("cleanup_claim_expires_at") && migration.includes("limit least(greatest(requested_limit, 1), 25)"), "cleanup claim must be bounded and concurrency-safe");
assert(repository.includes("cleanupExpiredGuestFreeAnalyses") && repository.includes("cleanup_claim_token") && scheduler.includes("cleanupExpiredGuestFreeAnalyses"), "server-only guest cleanup must run through the shared scheduler");
console.log("1. static retention, minimization, and scheduler contracts present ✓");

const env = loadLocalEnv();
const localUrl = assertDisposableSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
assert(localUrl.hostname === "127.0.0.1" || localUrl.hostname === "localhost", "integration target must remain local");
assert(Boolean(env.SUPABASE_SERVICE_ROLE_KEY), "local service-role configuration is required for disposable integration");
const supabase = createClient(localUrl.toString(), env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

const fixturePrefix = `guest-retention-${Date.now()}`;
const memberId = randomUUID();
const otherMemberId = randomUUID();
const transferId = randomUUID();
const invalidActiveId = randomUUID();
const validActiveId = randomUUID();
const graceId = randomUUID();
const tombstoneId = randomUUID();
const expiredAId = randomUUID();
const expiredBId = randomUUID();
const secretHash = createHash("sha256").update(`${fixturePrefix}-secret`).digest("hex");
const input = { label: "나", relationshipType: "self", birthDate: "1990-01-15", birthTime: "12:00", gender: "남성", calendarType: "양력", isLeapMonth: false };

async function insertUser(id: string): Promise<void> {
  const { error } = await supabase.auth.admin.createUser({ id, email: `${id}@local.test`, password: "LocalTest123!", email_confirm: true });
  if (error) throw error;
}

async function insertGuest(id: string, values: Record<string, unknown> = {}): Promise<void> {
  const { error } = await supabase.from("guest_free_analyses").insert({
    id,
    secret_hash: createHash("sha256").update(`${id}-secret`).digest("hex"),
    status: "completed",
    profile_input: input,
    profile_fingerprint: `${fixturePrefix}-${id}`,
    content: { result: "fixture" },
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ...values,
  });
  if (error) throw error;
}

async function cleanup(): Promise<void> {
  await supabase.from("guest_free_analyses").delete().in("id", [transferId, invalidActiveId, validActiveId, graceId, tombstoneId, expiredAId, expiredBId]);
  await supabase.from("free_analysis_results").delete().in("user_id", [memberId, otherMemberId]);
  await supabase.from("active_profiles").delete().in("user_id", [memberId, otherMemberId]);
  await supabase.from("profiles").delete().in("user_id", [memberId, otherMemberId]);
  await supabase.auth.admin.deleteUser(memberId);
  await supabase.auth.admin.deleteUser(otherMemberId);
}

async function main(): Promise<void> {
  try {
    await cleanup();
    await insertUser(memberId);
    await insertUser(otherMemberId);

    const { error: invalidActiveError } = await supabase.from("guest_free_analyses").insert({
      id: invalidActiveId,
      secret_hash: `${fixturePrefix}-invalid`,
      status: "generating",
      profile_input: null,
      profile_fingerprint: null,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    assert(Boolean(invalidActiveError), "invalid active guest row must be rejected by the validated database constraint");

    const { error: validActiveError } = await supabase.from("guest_free_analyses").insert({
      id: validActiveId,
      secret_hash: `${fixturePrefix}-valid`,
      status: "generating",
      profile_input: input,
      profile_fingerprint: `${fixturePrefix}-valid`,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    if (validActiveError) throw validActiveError;
    console.log("1. validated active-row invariant rejects invalid data and accepts a legitimate generating row ✓");

    const { error: transferInsertError } = await supabase.from("guest_free_analyses").insert({
      id: transferId,
      secret_hash: secretHash,
      status: "completed",
      profile_input: input,
      profile_fingerprint: `${fixturePrefix}-transfer`,
      content: { result: "fixture" },
      selected_product_id: "monthly-current",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    if (transferInsertError) throw transferInsertError;

    const { data: transfer, error: transferError } = await supabase.rpc("complete_guest_analysis_transfer", {
      p_guest_analysis_id: transferId,
      p_secret_hash: secretHash,
      p_user_id: memberId,
      p_profile_fingerprint: `${fixturePrefix}-transfer`,
    });
    if (transferError || !transfer?.[0]?.resolved_profile_id) throw transferError ?? new Error("missing transfer result");
    assert(transfer[0].transfer_status === "transferred", "valid first transfer must succeed");

    const { data: minimized, error: minimizedError } = await supabase.from("guest_free_analyses").select("profile_input,profile_fingerprint,content,secret_hash,selected_product_id,consumed_at,transferred_user_id,resolved_profile_id,transferred_minimized_at").eq("id", transferId).single();
    if (minimizedError || !minimized) throw minimizedError ?? new Error("missing minimized transfer row");
    assert(minimized.profile_input === null && minimized.profile_fingerprint === null && minimized.content === null, "first transfer must atomically scrub guest personal input, fingerprint, and content");
    assert(minimized.secret_hash === secretHash && minimized.selected_product_id === "monthly-current" && minimized.transferred_user_id === memberId && minimized.resolved_profile_id === transfer[0].resolved_profile_id && minimized.consumed_at && minimized.transferred_minimized_at, "tombstone must retain only retry and transfer metadata");

    const { data: retry, error: retryError } = await supabase.rpc("complete_guest_analysis_transfer", {
      p_guest_analysis_id: transferId,
      p_secret_hash: secretHash,
      p_user_id: memberId,
      p_profile_fingerprint: "",
    });
    assert(!retryError && retry?.[0]?.transfer_status === "already_transferred", "same-member lost-response retry must succeed without scrubbed personal fields");
    const { error: wrongUserError } = await supabase.rpc("complete_guest_analysis_transfer", { p_guest_analysis_id: transferId, p_secret_hash: secretHash, p_user_id: otherMemberId, p_profile_fingerprint: "" });
    assert(Boolean(wrongUserError), "different member must not claim a transferred tombstone");
    const { error: wrongSecretError } = await supabase.rpc("complete_guest_analysis_transfer", { p_guest_analysis_id: transferId, p_secret_hash: "wrong", p_user_id: memberId, p_profile_fingerprint: "" });
    assert(Boolean(wrongSecretError), "wrong guest credential must not retry a transferred tombstone");
    console.log("2. atomic transfer minimization and credential-bound retry proof ✓");

    const { error: ageTransferError } = await supabase.from("guest_free_analyses").update({ created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", transferId);
    if (ageTransferError) throw ageTransferError;
    await insertGuest(graceId, { created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() });
    await insertGuest(tombstoneId, { created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), consumed_at: new Date().toISOString(), transferred_user_id: memberId, resolved_profile_id: transfer[0].resolved_profile_id, profile_input: null, profile_fingerprint: null, content: null, transferred_minimized_at: new Date().toISOString() });
    await insertGuest(expiredAId, { created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() });
    await insertGuest(expiredBId, { created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), status: "failed", content: null });

    const claimTokenA = randomUUID();
    const claimTokenB = randomUUID();
    const [claimA, claimB] = await Promise.all([
      supabase.rpc("claim_guest_free_analysis_cleanup", { requested_limit: 25, claim_token: claimTokenA, lease_seconds: 300 }),
      supabase.rpc("claim_guest_free_analysis_cleanup", { requested_limit: 25, claim_token: claimTokenB, lease_seconds: 300 }),
    ]);
    if (claimA.error || claimB.error) throw claimA.error ?? claimB.error;
    const claims = [
      ...(claimA.data ?? [] as Array<{ id: string }>).map((row: { id: string }) => ({ id: row.id, token: claimTokenA })),
      ...(claimB.data ?? [] as Array<{ id: string }>).map((row: { id: string }) => ({ id: row.id, token: claimTokenB })),
    ];
    assert(claims.length === 3 && new Set(claims.map((claim) => claim.id)).size === 3, "concurrent cleanup claims must select each eligible row once");
    for (const claim of claims) {
      const { error } = await supabase.from("guest_free_analyses").delete().eq("id", claim.id).eq("cleanup_claim_token", claim.token);
      if (error) throw error;
    }
    const { data: remaining, error: remainingError } = await supabase.from("guest_free_analyses").select("id").in("id", [transferId, graceId, tombstoneId, expiredAId, expiredBId]);
    if (remainingError) throw remainingError;
    const ids = new Set((remaining ?? []).map((row) => row.id));
    assert(!ids.has(transferId) && ids.has(graceId) && ids.has(tombstoneId) && !ids.has(expiredAId) && !ids.has(expiredBId), "absolute created_at retention must delete transferred tombstones and old rows regardless of updated_at while preserving newer rows");
    console.log("3. seven-day absolute retention and concurrent cleanup proof ✓");
  } finally {
    await cleanup();
  }
}

main()
  .then(() => console.log("guest-retention-cleanup-regression passed ✓"))
  .catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(error.message);
    } else if (error && typeof error === "object") {
      const databaseError = error as { code?: string; message?: string; details?: string; hint?: string };
      console.error([databaseError.code, databaseError.message, databaseError.details, databaseError.hint].filter(Boolean).join(" | ") || "Local guest retention integration failed");
    } else {
      console.error("Local guest retention integration failed");
    }
    process.exitCode = 1;
  });