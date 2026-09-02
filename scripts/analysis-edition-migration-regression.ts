// STEP 57D-48F-B: additive migration 029 static contract regression.
//
// Proves migration 029 only adds nullable analysis_edition_key columns to the
// four commercial tables and does NOT touch any pre-existing unique
// constraint, NOT NULL flip, or live identity semantics.
import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const migration = readFileSync(
  "supabase/migrations/029_analysis_edition_key_foundation.sql",
  "utf8",
);
const migrationSql = migration
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

for (const table of ["orders", "purchases", "entitlements", "paid_reports"]) {
  assert(
    new RegExp(`alter table public\\.${table}\\s+add column if not exists analysis_edition_key text;`).test(migrationSql),
    `migration must add a nullable analysis_edition_key column to ${table}`,
  );
}

// "is not null" is a NULL-check predicate (used throughout the backfill),
// not a NOT NULL constraint — strip those before checking for the latter.
const sqlWithoutNullChecks = migrationSql.replace(/is not null/gi, "");
assert(!/not null/i.test(sqlWithoutNullChecks), "migration must not introduce any NOT NULL constraint in this phase");
assert(!/drop constraint/i.test(migrationSql), "migration must not drop any existing constraint in this phase");
assert(!/entitlements_user_profile_resource_unique/.test(migrationSql), "migration must not touch the existing entitlement uniqueness constraint");
assert(!/paid_reports_user_profile_product_unique/.test(migrationSql), "migration must not touch the existing paid_reports uniqueness constraint");
assert(!/purchases_order_id_unique/.test(migrationSql), "migration must not touch the existing purchases uniqueness constraint");

assert(migrationSql.includes("'LIFETIME'"), "migration must backfill known LIFETIME-policy products");
assert(migrationSql.includes("'LEGACY'"), "migration must backfill all other pre-existing rows to LEGACY, never guessed");
assert(
  !/analysis_edition_key = .*created_at/.test(migrationSql) && !/analysis_edition_key = .*purchased_at/.test(migrationSql),
  "migration must never derive an edition key from created_at/purchased_at timestamps",
);

console.log("migration 029: additive-only, nullable, no constraint changes, conservative backfill ✓");
