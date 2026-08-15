import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = read("supabase/migrations/010_guest_free_analyses.sql");
const grantMigration = read("supabase/migrations/011_guest_free_analyses_service_role_grant.sql");
const rpcUpgradeMigration = read("supabase/migrations/012_guest_transfer_rpc_fingerprint_signature.sql");
const profilesMigration = read("supabase/migrations/002_profiles.sql");
const activeProfilesMigration = read("supabase/migrations/006_active_profiles.sql");
const freeResultsMigration = read("supabase/migrations/008_free_analysis_results.sql");
const activeProfilesGrant = read("supabase/migrations/007_active_profiles_service_role_grant.sql");
const freeResultsGrant = read("supabase/migrations/009_free_analysis_results_service_role_grant.sql");
const analyzeTypes = read("app/lib/analyzeApiTypes.ts");
const freeResultsServer = read("app/lib/freeAnalysisResults/server.ts");

assert(migration.includes("create table if not exists public.guest_free_analyses"), "guest analysis migration must create the table");
for (const field of [
  "secret_hash text not null unique",
  "profile_input jsonb not null",
  "profile_fingerprint text not null",
  "content jsonb",
  "selected_product_id text",
  "expires_at timestamptz not null",
  "consumed_at timestamptz",
  "transferred_user_id uuid references auth.users (id)",
  "resolved_profile_id uuid references public.profiles (id)",
]) {
  assert(migration.includes(field), `guest analysis table must include ${field}`);
}
assert(migration.includes("status in ('generating', 'completed', 'failed')"), "guest analysis status must be constrained");
assert(migration.includes("status <> 'completed' or content is not null"), "completed guest analyses must require content");
assert(migration.includes("guest_free_analyses_expires_at_unconsumed_idx") && migration.includes("where consumed_at is null"), "unconsumed expiry index must exist");
assert(migration.includes("guest_free_analyses_transfer_idx"), "transfer lookup index must exist");
assert(migration.includes("alter table public.guest_free_analyses enable row level security"), "guest analysis RLS must be enabled");
assert(migration.includes("revoke select, insert, update, delete") && migration.includes("from anon, authenticated"), "browser roles must have no direct guest table access");
console.log("1. guest table, status, expiry, and server-only RLS contracts present ✓");

for (const column of [
  "id uuid primary key",
  "user_id uuid not null",
  "label text not null",
  "relationship_type text not null",
  "birth_date date not null",
  "birth_time time not null",
  "gender text not null",
  "calendar_type text not null",
  "is_leap_month boolean not null",
  "created_at timestamptz not null",
]) {
  assert(profilesMigration.includes(column), `profiles schema must contain ${column}`);
}
assert(profilesMigration.includes("profiles_one_self_per_user_idx") && profilesMigration.includes("where relationship_type = 'self'"), "self Profile must be enforced by the existing partial unique index");
assert(activeProfilesMigration.includes("user_id uuid primary key") && activeProfilesMigration.includes("profile_id uuid not null") && activeProfilesMigration.includes("updated_at timestamptz not null"), "active_profiles upsert target must match the existing schema");
for (const column of ["user_id uuid not null", "profile_id uuid not null", "profile_fingerprint text not null", "profile_snapshot jsonb not null", "status text not null", "content jsonb", "error_code text", "created_at timestamptz not null", "updated_at timestamptz not null", "completed_at timestamptz"]) {
  assert(freeResultsMigration.includes(column), `free_analysis_results schema must contain ${column}`);
}
console.log("2. existing profiles, self constraint, active Profile, and free-result schema mappings present ✓");

assert(rpcUpgradeMigration.includes("drop function if exists public.complete_guest_analysis_transfer(uuid, text, uuid)") && rpcUpgradeMigration.includes("p_profile_fingerprint text"), "production RPC upgrade must replace the original three-argument signature");
assert(migration.includes("security definer") && migration.includes("set search_path = public"), "transfer RPC must be security definer with public search path");
assert(migration.includes("revoke all on function public.complete_guest_analysis_transfer") && migration.includes("from public, anon, authenticated"), "transfer RPC must be revoked from browser roles");
assert(grantMigration.includes("grant execute on function public.complete_guest_analysis_transfer") && grantMigration.includes("to service_role"), "transfer RPC execute must be granted only to service_role");
assert(rpcUpgradeMigration.includes("public.complete_guest_analysis_transfer(uuid, text, uuid, text)") && rpcUpgradeMigration.includes("to service_role"), "production RPC privileges must target the exact overloaded-function signature");
assert(!grantMigration.includes("to authenticated") && !grantMigration.includes("to anon"), "grant migration must not expose guest transfer to browser roles");
console.log("3. transfer RPC service-role-only security contract present ✓");

assert(migration.includes("p.birth_date = v_birth_date") && migration.includes("p.birth_time = v_birth_time") && migration.includes("p.gender = v_gender") && migration.includes("p.calendar_type = v_calendar_type") && migration.includes("p.is_leap_month = v_is_leap_month"), "Profile reuse must match exactly five birth inputs");
assert(!migration.includes("p.label = v_label") && !migration.includes("p.relationship_type = v_relationship_type"), "Profile reuse must not use label or relationship type");
assert(migration.includes("order by (ap.profile_id is not null) desc, p.created_at asc, p.id asc"), "multiple matching Profiles must resolve active first then deterministically");
assert(migration.includes("SELF_PROFILE_CONFLICT"), "second differing self Profile must return a typed conflict");
assert(migration.includes("'already_transferred'"), "same-user repeated transfer must be idempotent");
assert(migration.includes("GUEST_ANALYSIS_ALREADY_CONSUMED"), "other-user repeated transfer must be rejected");
assert(rpcUpgradeMigration.includes("p_profile_fingerprint <> v_guest.profile_fingerprint") && !rpcUpgradeMigration.includes("digest("), "transfer must compare the existing server-generated fingerprint without reimplementing hashing in SQL");
console.log("4. Profile reuse, self conflict, and idempotency contracts present ✓");

assert(migration.includes("v_existing_result.status = 'completed'") && migration.includes("Do not overwrite"), "completed authenticated free results must remain canonical");
assert(migration.includes("v_existing_result.status = 'generating'") && migration.includes("'pending_existing_result'"), "generating authenticated free results must not be overwritten");
assert(migration.includes("v_existing_result.status = 'failed'") || migration.includes("Failed or stale authenticated content"), "failed authenticated free results must be recoverable from guest content");
assert(migration.includes("jsonb_set(v_guest_content, '{profile}', v_content_profile, true)"), "transferred content must rewrite Profile metadata");
assert(migration.includes("insert into public.active_profiles") && migration.includes("on conflict (user_id) do update"), "transfer must set the resolved active Profile");
assert(migration.includes("consumed_at = now()") && migration.includes("transferred_user_id = p_user_id") && migration.includes("resolved_profile_id = v_profile.id"), "transfer must consume and bind the guest row");
assert(analyzeTypes.includes("export type AnalyzeProfileMetadata") && analyzeTypes.includes('id: string;') && analyzeTypes.includes('birthDate: string;') && analyzeTypes.includes('birthTime: string;') && analyzeTypes.includes('gender: "남성" | "여성";') && analyzeTypes.includes('calendarType: "양력" | "음력";') && analyzeTypes.includes("isLeapMonth: boolean;"), "AnalyzeSuccessResponse profile metadata must match the SQL JSON rewrite fields");
assert(!analyzeTypes.includes("label:"), "AnalyzeSuccessResponse profile metadata must not invent a label field");
assert(migration.includes("jsonb_set(v_guest_content, '{profile}', v_content_profile, true)"), "JSONB rewrite must replace only content.profile and preserve other analysis content");
assert(freeResultsServer.includes("createHash(\"sha256\")") && freeResultsServer.includes("birthDate: snapshot.birthDate") && freeResultsServer.includes("isLeapMonth: snapshot.isLeapMonth"), "authenticated free-result fingerprint must use the five canonical fields");
assert(migration.includes("p_profile_fingerprint <> v_guest.profile_fingerprint"), "transfer must compare the canonical server fingerprint supplied by the caller");
assert(activeProfilesGrant.includes("on table public.active_profiles") && activeProfilesGrant.includes("to service_role"), "active_profiles already grants required service-role access");
assert(freeResultsGrant.includes("on table public.free_analysis_results") && freeResultsGrant.includes("to service_role"), "free_analysis_results already grants required service-role access");
console.log("5. response JSON, fingerprint, existing ACL, conflict, active target, and consumption contracts present ✓");

console.log("\nguest-free-analysis-transfer-regression passed ✓");