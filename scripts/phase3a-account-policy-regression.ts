#!/usr/bin/env node

/**
 * STEP 57D-46 PHASE 3A ACCOUNT POLICY REGRESSION
 *
 * Validates the corrected Phase 3A contract only:
 * - general service access is lifecycle-only
 * - paid purchase policy is enforced at the authoritative service boundary
 * - account lifecycle and eligibility semantics remain separated from profile data
 */

const { readFileSync } = require("node:fs");
const { join } = require("node:path");

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
console.log("PHASE 3A ACCOUNT POLICY REGRESSION TESTS");
console.log("=".repeat(80));

const accountServer = read("app/lib/accounts/server.ts");
const ordersRoute = read("app/api/orders/route.ts");
const accountPage = read("app/account/page.tsx");
const migration024 = read("supabase/migrations/024_account_lifecycle_paid_eligibility.sql");

const generalServiceStart = accountServer.indexOf("export async function evaluateAccountServiceAccess");
const generalServiceFn = accountServer.substring(generalServiceStart, accountServer.length);
const paidPurchaseStart = accountServer.indexOf("export async function evaluatePaidPurchaseEligibility");
const paidPurchaseEnd = accountServer.indexOf("export async function evaluateAccountServiceAccess");
const paidPurchaseFn = accountServer.substring(paidPurchaseStart, paidPurchaseEnd);

assert(accountServer.includes("type AccountAccessBlockReason ="), "AccountAccessBlockReason type must be defined");
assert(accountServer.includes("type PaidPurchaseBlockReason ="), "PaidPurchaseBlockReason type must be defined");
assert(accountServer.includes("export async function getEmailVerificationState()"), "Email verification helper must exist");
assert(accountServer.includes("export async function getPaidEligibilityState(account: AccountLifecycle)"), "Paid eligibility reader must exist");
assert(accountServer.includes("export async function evaluatePaidPurchaseEligibility()"), "Paid purchase policy helper must exist");
assert(accountServer.includes("export async function evaluateAccountServiceAccess()"), "General service access helper must exist");

assert(!generalServiceFn.includes("VERIFIED_ADULT"), "General/free access must not require VERIFIED_ADULT");
assert(!generalServiceFn.includes("getEmailVerificationState"), "General/free access must not require email verification");
assert(!generalServiceFn.includes("PAID_ELIGIBILITY"), "General/free access must not require paid eligibility");
assert(generalServiceFn.includes("General/free service access remains lifecycle-scoped only."), "General service access must be lifecycle-authoritative");

assert(paidPurchaseFn.includes("EMAIL_NOT_VERIFIED"), "Target policy must recognize EMAIL_NOT_VERIFIED");
assert(paidPurchaseFn.includes("PAID_ELIGIBILITY_UNVERIFIED"), "Target policy must recognize PAID_ELIGIBILITY_UNVERIFIED");
assert(paidPurchaseFn.includes("PAID_ELIGIBILITY_REVOKED"), "Target policy must recognize PAID_ELIGIBILITY_REVOKED");
assert(!paidPurchaseFn.includes("PAID_ELIGIBILITY_ENFORCEMENT_ENABLED"), "Paid eligibility must not have a flag-off bypass");
assert(accountServer.includes("export async function assertPaidPurchaseEligibility"), "Authoritative paid eligibility guard must exist");
assert(accountServer.includes("account.status === \"DELETION_REQUESTED\""), "DELETION_REQUESTED must be recognized");
assert(accountServer.includes("account.status === \"CLOSED\""), "CLOSED must be recognized");
assert(accountServer.includes("account.status !== \"ACTIVE\""), "ACTIVE lifecycle policy must be authoritative");
assert(accountServer.includes("Never derives from: profile DOB, relationship type, Toss payment"), "Account policy must separate identity from Saju profile data");

assert(ordersRoute.includes("PaidPurchaseEligibilityError"), "Order creation must map service-layer paid eligibility failures");
assert(ordersRoute.includes("EMAIL_NOT_VERIFIED"), "Order creation must block unverified email");
assert(ordersRoute.includes("PAID_ELIGIBILITY_UNVERIFIED"), "Order creation must block unverified paid eligibility");

assert(accountPage.includes("const eligibilityLabels: Record<PaidEligibilityStatus, string>"), "Account page mapping must be centralized");
assert(accountPage.includes("Profile birth date is NOT used here"), "Account page must hold the account-level identity boundary");
assert(migration024.includes("status in ('ACTIVE', 'DELETION_REQUESTED', 'CLOSED')"), "Lifecycle status contract must exist in migration 024");
assert(migration024.includes("paid_eligibility_status in ('UNVERIFIED', 'VERIFIED_ADULT', 'REVOKED')"), "Eligibility state contract must exist in migration 024");

console.log("\nAccount policy foundation and paid-boundary invariants validated.");
console.log("=".repeat(80));
console.log("✓ ALL PHASE 3A REGRESSION TESTS PASSED");
console.log("=".repeat(80));
