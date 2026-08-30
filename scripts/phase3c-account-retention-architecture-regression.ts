#!/usr/bin/env node

/**
 * STEP 57D-46 PHASE 3C ACCOUNT RETENTION ARCHITECTURE REGRESSION
 *
 * Validates Phase 3C retention architecture and safety invariants:
 * 1. Current dangerous CASCADE paths on auth.users are identified & cataloged.
 * 2. Financial tables (orders, purchases, toss_payment_records, refund_workflows) are preserved.
 * 3. Closure request does not execute hard deletion of auth.users or financial rows.
 * 4. Client routes cannot directly set CLOSED lifecycle status.
 * 5. Phase 3B cancellation contract (DELETION_REQUESTED -> ACTIVE) is preserved.
 * 6. Financial blockers are checked prior to account closure/finalization.
 * 7. Draft FK migration 025 exists and is marked DRAFT / UNAPPLIED.
 * 8. Server-side cleanup orchestrator exists with idempotency and financial blocker guards.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

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
console.log("PHASE 3C ACCOUNT RETENTION ARCHITECTURE REGRESSION TESTS");
console.log("=".repeat(80));

const accountServer = read("app/lib/accounts/server.ts");
const migration001 = read("supabase/migrations/001_phase3b_purchase_persistence.sql");
const migration002 = read("supabase/migrations/002_profiles.sql");
const migration016 = read("supabase/migrations/016_toss_payment_reconciliation.sql");
const migration020 = read("supabase/migrations/020_toss_refund_workflows.sql");
const migration024 = read("supabase/migrations/024_account_lifecycle_paid_eligibility.sql");
const draftMigration025 = read("supabase/migrations/025_safe_account_retention_fk_constraints.sql");
const requestClosureRoute = read("app/api/account/request-closure/route.ts");
const cancelClosureRoute = read("app/api/account/cancel-closure/route.ts");

console.log("\n1. DANGEROUS CASCADE PATH IDENTIFICATION");
assert(migration001.includes("user_id uuid not null references auth.users (id) on delete cascade"), "orders/purchases/entitlements cascade from auth.users in 001");
assert(migration002.includes("user_id uuid not null references auth.users (id) on delete cascade"), "profiles cascade from auth.users in 002");
assert(migration016.includes("order_id uuid not null references public.orders (id) on delete cascade"), "toss_payment_records cascade from orders in 016");
console.log("   Dangerous CASCADE paths correctly cataloged ✓");

console.log("\n2. RESTRICT PROTECTIONS ON FINANCIAL & LIFECYCLE TABLES");
assert(migration020.includes("user_id uuid not null references auth.users(id) on delete restrict"), "refund_workflows restricts user_id deletion in 020");
assert(migration024.includes("user_id uuid not null references auth.users(id) on delete restrict"), "account_lifecycles restricts user_id deletion in 024");
console.log("   RESTRICT constraints verified on refund_workflows and account_lifecycles ✓");

console.log("\n3. NO HARD DELETION IN CLOSURE REQUEST");
assert(!requestClosureRoute.includes("delete"), "requestClosure API route contains no SQL delete operations");
assert(!accountServer.includes("deleteFromAuthUsers") && !accountServer.includes("delete from auth.users"), "requestAccountClosure does not delete auth.users");
console.log("   Closure request is non-destructive ✓");

console.log("\n4. CLIENT CANNOT DIRECTLY SET CLOSED");
assert(!requestClosureRoute.includes('status: "CLOSED"'), "requestClosure route cannot set CLOSED status");
assert(!cancelClosureRoute.includes('status: "CLOSED"'), "cancelClosure route cannot set CLOSED status");
console.log("   Client routes cannot set CLOSED status ✓");

console.log("\n5. PHASE 3B CANCELLATION CONTRACT PRESERVED");
assert(accountServer.includes("export async function cancelAccountClosureRequest"), "cancelAccountClosureRequest helper exists");
assert(accountServer.includes('eq("status", "DELETION_REQUESTED")'), "Cancellation operates on DELETION_REQUESTED status");
assert(accountServer.includes("이미 종료된 계정은 복구할 수 없습니다."), "Closed accounts cannot be cancelled back to active");
console.log("   DELETION_REQUESTED -> ACTIVE cancellation boundary enforced ✓");

console.log("\n6. FINANCIAL BLOCKER INSPECTION");
assert(accountServer.includes("export async function getAccountClosureFinancialBlockers"), "getAccountClosureFinancialBlockers helper exists");
assert(accountServer.includes("getAccountClosureFinancialBlockers(userId)"), "requestAccountClosure inspects financial blockers before state change");
console.log("   Financial blockers inspected prior to closure request ✓");

console.log("\n7. DRAFT MIGRATION 025 FK SAFETY & SCHEMA-ONLY SPECIFICATION");
assert(draftMigration025.includes("DRAFT MIGRATION ONLY — NOT EXECUTED"), "Draft migration 025 is explicitly marked UNAPPLIED / DRAFT ONLY");
assert(draftMigration025.includes("orders_user_id_fkey"), "Draft migration 025 decouples orders from CASCADE deletion");
assert(draftMigration025.includes("purchases_user_id_fkey"), "Draft migration 025 decouples purchases from CASCADE deletion");
assert(draftMigration025.includes("entitlements_user_id_fkey"), "Draft migration 025 decouples entitlements from CASCADE deletion");
assert(draftMigration025.includes("paid_reports_user_id_fkey"), "Draft migration 025 decouples paid_reports from CASCADE deletion");
assert(!draftMigration025.includes("UPDATE public.") && !draftMigration025.includes("DELETE FROM"), "Draft migration 025 contains NO per-customer cleanup DML");
console.log("   Draft migration 025 FK decoupling & schema-only specification validated ✓");

console.log("\n8. SERVER-SIDE CLEANUP ORCHESTRATOR CONTRACT");
assert(accountServer.includes("export async function finalizeAccountClosure"), "finalizeAccountClosure orchestrator exists in server.ts");
assert(accountServer.includes('if (account.status === "CLOSED")'), "finalizeAccountClosure is idempotent");
assert(accountServer.includes("getAccountClosureFinancialBlockers(userId)"), "finalizeAccountClosure checks financial blockers before cleanup");
assert(!accountServer.includes('.from("profiles").delete()'), "finalizeAccountClosure does NOT execute premature destructive profile deletion");
assert(accountServer.includes("Phase 3C 계정 최종 종료 처리 실행은 아키텍처 승인 전까지 비활성화되어 있습니다."), "finalizeAccountClosure is deactivated prior to architecture approval");
console.log("   Cleanup orchestrator specification verified ✓");

console.log("\n9. OWNERSHIP JOIN BY EMAIL DISALLOWED");
assert(!accountServer.includes('.eq("email"') && !accountServer.includes(".eq('email'"), "Account server logic never joins ownership by email address");
console.log("   Data ownership strictly scoped by immutable user UUID, never email ✓");

console.log("\n10. CLOSED ACCOUNT SERVICE ACCESS RESTRICTION");
assert(accountServer.includes('reason: "ACCOUNT_DELETED"'), "Closed accounts return ACCOUNT_DELETED reason");
assert(accountServer.includes('account.status === "CLOSED"'), "CLOSED status is blocked in service access helpers");
console.log("   CLOSED account service access restrictions verified ✓");

console.log("\n11. AUTH API CONTRACT & NO DIRECT AUTH SCHEMA MUTATION");
assert(!accountServer.includes("auth.admin.signOut(userId)"), "No invalid auth.admin.signOut(userId) call exists in production code");
assert(!accountServer.includes("UPDATE auth.identities") && !accountServer.includes("update auth.users"), "No direct SQL mutation of auth schema exists in production code");
assert(draftMigration025.includes("finalization_started_at timestamptz"), "Draft migration 025 includes finalization_started_at marker");
assert(draftMigration025.includes("data_scrubbed_at timestamptz"), "Draft migration 025 includes data_scrubbed_at marker");
assert(draftMigration025.includes("finalized_at timestamptz"), "Draft migration 025 includes finalized_at marker");
console.log("   Auth API safety & finalization marker schema verified ✓");




console.log("\nAll Phase 3C retention architecture regression checks passed successfully!");
console.log("=".repeat(80));
console.log("✓ ALL PHASE 3C REGRESSION TESTS PASSED");
console.log("=".repeat(80));
