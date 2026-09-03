import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`✓ ${message}`);
}

const migration = readFileSync("supabase/migrations/037_signup_policy_acceptance_events.sql", "utf8");
const config = readFileSync("app/lib/signupPolicy/config.ts", "utf8");
const repository = readFileSync("app/lib/signupPolicy/server.ts", "utf8");
const signupPage = readFileSync("app/auth/signup/page.tsx", "utf8");
const guestAge = readFileSync("app/lib/guestFreeAnalyses/input.ts", "utf8");

assert(migration.includes("policy_acceptance_events") && migration.includes("policy_type in ('TERMS', 'AGE_14_PLUS')"), "migration defines only the two V1 policy event types");
assert(migration.includes("policy_acceptance_events_unique_version") && migration.includes("on conflict (user_id, policy_type, policy_version) do nothing"), "same policy-version acceptance is idempotent");
assert(migration.includes("enable row level security") && migration.includes("revoke all on public.policy_acceptance_events from anon, authenticated") && migration.includes("grant execute on function public.record_signup_policy_acceptance(uuid, text, text) to service_role"), "evidence writes remain service-role-only");
assert(config.includes('version: "TERMS_V1"') && config.includes('version: "AGE_14_PLUS_V1"') && config.includes("enforceable: true"), "canonical policy versions are centralized and active");
assert(repository.includes("record_signup_policy_acceptance") && repository.includes("isSignupPolicyAcceptanceValid") && !repository.includes("p_user_id: input.userId"), "server repository validates policy claims and owns the RPC boundary");
assert(signupPage.includes("/api/auth/signup") && signupPage.includes("termsAccepted") && signupPage.includes("age14OrOlderConfirmed"), "production signup UX requires both policy choices");
assert(guestAge.includes("GUEST_AGE_SELF_ATTESTATION_REQUIRED"), "Guest 14+ remains a separate request-scoped contract");
console.log("1. policy config, immutable table, RLS, and inactive UX contracts present ✓");

const env = loadLocalEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !serviceRoleKey || !publishableKey) throw new Error("Local Supabase configuration is required");
const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const userId = randomUUID();
const otherUserId = randomUUID();

async function cleanup(): Promise<void> {
  await admin.from("policy_acceptance_events").delete().in("user_id", [userId, otherUserId]);
  await admin.from("account_lifecycles").delete().in("user_id", [userId, otherUserId]);
  await admin.auth.admin.deleteUser(userId);
  await admin.auth.admin.deleteUser(otherUserId);
}

async function createFixtureUser(id: string, confirmed: boolean): Promise<void> {
  const { error } = await admin.auth.admin.createUser({ id, email: `${id}@disposable.local`, password: "DisposableOnly123!", email_confirm: confirmed });
  if (error) throw error;
}

async function main(): Promise<void> {
  try {
    await cleanup();
    await createFixtureUser(userId, false);
    await createFixtureUser(otherUserId, true);

    const { error: invalidTypeError } = await admin.from("policy_acceptance_events").insert({ user_id: userId, policy_type: "MARKETING", policy_version: "MARKETING_V1", source: "SIGNUP" });
    assert(Boolean(invalidTypeError), "unsupported policy type is rejected by the database");
    const { error: emptyVersionError } = await admin.from("policy_acceptance_events").insert({ user_id: userId, policy_type: "TERMS", policy_version: "", source: "SIGNUP" });
    assert(Boolean(emptyVersionError), "empty policy version is rejected by the database");
    const { error: crossUserError } = await anon.rpc("record_signup_policy_acceptance", { p_user_id: otherUserId, p_terms_version: "TERMS_V1", p_age_policy_version: "AGE_14_PLUS_V1" });
    assert(Boolean(crossUserError), "normal anonymous client cannot invoke the evidence RPC");
    const { data: authUserBefore } = await admin.auth.admin.getUserById(userId);
    const confirmationStateBefore = Boolean(authUserBefore.user?.email_confirmed_at);

    const { data: accepted, error: acceptanceError } = await admin.rpc("record_signup_policy_acceptance", { p_user_id: userId, p_terms_version: "TERMS_V1", p_age_policy_version: "AGE_14_PLUS_V1" });
    if (acceptanceError || !accepted?.[0]?.terms_accepted || !accepted?.[0]?.age_14_accepted) throw acceptanceError ?? new Error("Acceptance pair was incomplete");
    const { data: events, error: eventError } = await admin.from("policy_acceptance_events").select("user_id,policy_type,policy_version,source,accepted_at").eq("user_id", userId);
    if (eventError) throw eventError;
    assert(events?.length === 2 && events.every((event) => event.user_id === userId && event.source === "SIGNUP"), "TERMS and AGE_14_PLUS events are recorded as one required pair");
    const eventTypes = new Set((events ?? []).map((event) => event.policy_type));
    assert(eventTypes.has("TERMS") && eventTypes.has("AGE_14_PLUS"), "both required V1 event types are present");

    const { data: retry, error: retryError } = await admin.rpc("record_signup_policy_acceptance", { p_user_id: userId, p_terms_version: "TERMS_V1", p_age_policy_version: "AGE_14_PLUS_V1" });
    assert(!retryError && retry?.[0]?.terms_accepted && retry?.[0]?.age_14_accepted, "same-version acceptance retry is idempotent");
    const { count: eventCount } = await admin.from("policy_acceptance_events").select("id", { count: "exact", head: true }).eq("user_id", userId);
    assert(eventCount === 2, "idempotent retry does not duplicate evidence");

  const { data: authUserAfter } = await admin.auth.admin.getUserById(userId);
    assert(Boolean(authUserAfter.user?.email_confirmed_at) === confirmationStateBefore, "policy acceptance does not mark email verified");
    const { data: lifecycle } = await admin.from("account_lifecycles").select("paid_eligibility_status").eq("user_id", userId).maybeSingle();
    assert(lifecycle === null, "policy evidence does not create or mark paid adult eligibility");
    const { data: otherEvents } = await admin.from("policy_acceptance_events").select("id").eq("user_id", otherUserId);
    assert((otherEvents ?? []).length === 0, "one user's acceptance does not create another user's evidence");
    console.log("2. atomic pair, RLS denial, idempotency, and verification separation proof ✓");
  } finally {
    await cleanup();
  }
}

main().then(() => console.log("signup-policy-acceptance-regression passed ✓")).catch((error: unknown) => {
  if (error instanceof Error) console.error(error.message);
  else console.error("Signup policy acceptance regression failed");
  process.exitCode = 1;
});
