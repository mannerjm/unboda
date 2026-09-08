import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/039_ai_consulting_schema_foundation.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const requiredTables = [
  "ai_consulting_grants",
  "ai_consulting_threads",
  "ai_consulting_messages",
  "ai_consulting_memories",
] as const;

for (const table of requiredTables) {
  assert(sql.includes(`create table if not exists public.${table}`), `missing table: ${table}`);
  assert(sql.includes(`alter table public.${table} enable row level security`), `RLS must be enabled: ${table}`);
  assert(sql.includes(`grant select on public.${table} to authenticated`), `authenticated read grant missing: ${table}`);
  assert(sql.includes(`revoke insert, update, delete on public.${table} from authenticated`), `authenticated writes must be revoked: ${table}`);
  assert(sql.includes(`grant select, insert, update, delete on public.${table} to service_role`), `service_role grant missing: ${table}`);
}

assert(!/\btruncate\b/i.test(sql), "migration must never truncate existing data");
assert(!/\bdrop\s+table\b/i.test(sql), "migration must never drop tables");
assert(!/\bdelete\s+from\s+public\.(orders|purchases|entitlements|paid_reports|profiles)\b/i.test(sql), "migration must not delete existing commercial/profile rows");

assert(sql.includes("ai_consulting_grants_source_purchase_boundary_fkey"), "grant must be pinned to source purchase boundary");
assert(sql.includes("ai_consulting_grants_base_entitlement_boundary_fkey"), "grant must be pinned to base entitlement boundary");
assert(sql.includes("ai_consulting_threads_grant_boundary_fkey"), "thread must be pinned to grant boundary");
assert(sql.includes("ai_consulting_messages_thread_boundary_fkey"), "message must be pinned to thread boundary");
assert(sql.includes("ai_consulting_messages_user_question_cap") && sql.includes("length(content) <= 300"), "user question cap must stay 300 chars");
assert(sql.includes("ai_consulting_messages_charge_only_allowed_user") && sql.includes("scope_decision = 'ALLOW'"), "charged messages must be ALLOWed user questions");

for (const provenance of ["USER_STATED", "ANALYSIS_DERIVED", "SYSTEM_SUMMARY"]) {
  assert(sql.includes(provenance), `memory provenance missing: ${provenance}`);
}

assert(
  sql.includes("delete from public.ai_consulting_memories") &&
    sql.includes("delete from public.ai_consulting_threads") &&
    sql.includes("update public.ai_consulting_grants") &&
    sql.includes("revocation_reason = 'ACCOUNT_CLOSED'"),
  "account closure must delete consulting personal data and revoke grants",
);
assert(sql.includes("set search_path = public, auth, pg_temp"), "account closure function must keep explicit search_path");
assert(
  sql.includes("revoke all on function public.execute_account_closure_db_cleanup(uuid) from public, anon, authenticated") &&
    sql.includes("grant execute on function public.execute_account_closure_db_cleanup(uuid) to service_role"),
  "account closure RPC must remain service-role only",
);

console.log("AI consulting schema preflight regression: PASS");
