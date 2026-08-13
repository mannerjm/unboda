import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const phase3bMigration = read("supabase/migrations/001_phase3b_purchase_persistence.sql");
const profilesMigration = read("supabase/migrations/002_profiles.sql");
const migration = read("supabase/migrations/003_profile_scoped_purchase.sql");

assert(
  migration.includes("truncate table public.entitlements, public.purchases, public.orders"),
  "003 must clear only existing purchase-related development rows before NOT NULL profile_id",
);
assert(
  !migration.includes("truncate table public.profiles") &&
    !migration.includes("delete from public.profiles"),
  "003 must not delete profile rows",
);
console.log("1. development purchase rows cleared; profiles retained ✓");

for (const table of ["orders", "purchases", "entitlements"]) {
  const pattern = new RegExp(
    `alter table public\\.${table}[\\s\\S]*?add column profile_id uuid not null[\\s\\S]*?references public\\.profiles \\(id\\)[\\s\\S]*?on delete restrict`,
  );
  assert(pattern.test(migration), `${table}.profile_id must be NOT NULL with profiles(id) ON DELETE RESTRICT`);
}
console.log("2. profile_id exists on all purchase tables with RESTRICT FKs ✓");

assert(
  migration.includes("purchases_order_id_unique remains unchanged"),
  "003 must explicitly preserve the existing purchases.order_id unique constraint",
);
assert(
  phase3bMigration.includes("purchases_order_id_unique unique (order_id)"),
  "001 must define purchases.order_id unique",
);
console.log("3. purchases.order_id unique remains intact ✓");

assert(
  migration.includes("add column purchase_id uuid") &&
    migration.includes("references public.purchases (id)") &&
    migration.includes("on delete set null"),
  "entitlements.purchase_id must be nullable and reference purchases(id) ON DELETE SET NULL",
);
assert(
  migration.includes("add column source text not null default 'purchase'"),
  "entitlements.source must default to purchase",
);
assert(
  /source in \('purchase', 'subscription', 'credit', 'grant'\)/.test(migration),
  "entitlements.source check must include purchase/subscription/credit/grant",
);
console.log("4. nullable purchase source and subscription extension points present ✓");

assert(
  phase3bMigration.includes("entitlements_user_resource_unique unique (user_id, resource_id, resource_type)"),
  "001 existing entitlement unique constraint name confirmed",
);
assert(
  migration.includes("drop constraint entitlements_user_resource_unique"),
  "003 must drop the exact Phase 3B entitlement unique constraint",
);
assert(
  /entitlements_user_profile_resource_unique unique \([\s\S]*?user_id,[\s\S]*?profile_id,[\s\S]*?resource_id,[\s\S]*?resource_type[\s\S]*?\)/.test(migration),
  "003 must add the user/profile/resource/type entitlement unique key",
);
console.log("5. entitlement unique key is profile-scoped ✓");

assert(
  migration.includes("drop index if exists public.entitlements_lookup_idx") &&
    /entitlements_lookup_idx[\s\S]*?user_id,[\s\S]*?profile_id,[\s\S]*?resource_id,[\s\S]*?resource_type,[\s\S]*?is_active/.test(migration),
  "entitlement lookup index must be rebuilt with profile_id",
);
assert(
  migration.includes("orders_profile_id_idx") &&
    migration.includes("purchases_profile_id_idx") &&
    migration.includes("entitlements_profile_id_idx"),
  "profile lookup indexes must exist for orders, purchases, and entitlements",
);
console.log("6. profile-scoped lookup indexes present ✓");

assert(
  !/alter table public\.(orders|purchases|entitlements)\s+disable row level security/i.test(migration),
  "003 must not weaken existing RLS",
);
assert(
  !/(^|\n)\s*(create|drop)\s+policy\b|(^|\n)\s*(revoke|grant)\b/im.test(migration),
  "003 must leave existing RLS policies and grants/revokes unchanged",
);
assert(profilesMigration.includes("create table if not exists public.profiles"), "002 profiles table must remain the FK target");
console.log("7. existing RLS model and profiles migration remain unchanged ✓");

console.log("\nprofile-scoped-purchase-migration-regression passed ✓");
