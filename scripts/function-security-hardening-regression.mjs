import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile("supabase/migrations/038_function_security_hardening.sql", "utf8");
const closureMigration = await readFile("supabase/migrations/026_account_closure_db_cleanup_rpc.sql", "utf8");
const personalDataMigration = await readFile("supabase/migrations/036_account_closure_personal_data_cleanup.sql", "utf8");

const mutableSearchPathFunctions = [
  "set_operator_roles_updated_at",
  "set_profiles_updated_at",
  "set_paid_reports_updated_at",
  "set_active_profiles_updated_at",
  "set_free_analysis_results_updated_at",
  "set_guest_free_analyses_updated_at",
  "prevent_account_lifecycle_generation_change",
  "set_account_lifecycles_updated_at",
];

for (const functionName of mutableSearchPathFunctions) {
  assert.match(
    migration,
    new RegExp(`alter function public\\.${functionName}\\(\\)\\s+set search_path = public, pg_catalog;`, "i"),
    `${functionName} search_path is hardened`,
  );
}

assert.match(migration, /alter function public\.prevent_free_analysis_personal_nulls\(\)\s+set search_path = public;/i);
assert.match(migration, /alter function public\.protect_account_closure_financial_writes\(\)\s+set search_path = public, pg_catalog;/i);
assert.match(migration, /revoke all on function public\.prevent_free_analysis_personal_nulls\(\) from public;/i);
assert.match(migration, /revoke all on function public\.protect_account_closure_financial_writes\(\) from public;/i);
assert.match(migration, /revoke all on function public\.(prevent_free_analysis_personal_nulls|protect_account_closure_financial_writes)\(\) from anon, authenticated;/i);
assert.doesNotMatch(migration, /grant execute on function public\.(prevent_free_analysis_personal_nulls|protect_account_closure_financial_writes)/i);
assert.doesNotMatch(migration, /from public, anon, authenticated/i);
assert.match(closureMigration, /security definer\s+set search_path = public, auth, pg_temp/i);
assert.match(personalDataMigration, /security definer\s+set search_path = public/i);
assert.match(closureMigration, /create trigger trg_protect_refund_workflows_account_closure[\s\S]*?execute function public\.protect_account_closure_financial_writes\(\)/i);
assert.match(closureMigration, /create trigger trg_protect_toss_payment_records_account_closure[\s\S]*?execute function public\.protect_account_closure_financial_writes\(\)/i);
assert.match(personalDataMigration, /create trigger free_analysis_results_personal_fields_guard[\s\S]*?execute function public\.prevent_free_analysis_personal_nulls\(\)/i);

const forbidden = /\b(create|drop|truncate|insert|update|delete)\b/i;
assert.doesNotMatch(migration, forbidden, "hardening uses no object/data creation or destructive DML");

console.log("function security hardening migration regression: PASS");
