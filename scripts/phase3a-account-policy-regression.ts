#!/usr/bin/env node

/**
 * STEP 57D-46 PHASE 3A ACCOUNT POLICY REGRESSION
 *
 * Validates the corrected Phase 3A contract only:
 * - general service access is lifecycle-only
 * - target paid purchase policy is canonical, but live rollout remains compatibility-safe
 * - premature email enforcement is not added to /api/orders during this phase
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
assert(paidPurchaseFn.includes("PAID_ELIGIBILITY_ENFORCEMENT_ENABLED"), "Target policy must remain feature-flag gated");
assert(paidPurchaseFn.includes("willBeEligibleWhenFullyEnforced"), "Feature flag OFF compatibility must be explicit");

assert(accountServer.includes("willBeEligibleWhenFullyEnforced: account.paidEligibilityStatus === \"VERIFIED_ADULT\""), "Flag OFF must preserve rollout compatibility");
assert(accountServer.includes("if (PAID_ELIGIBILITY_ENFORCEMENT_ENABLED)"), "Flag ON enforcement branch must exist");
assert(accountServer.includes("account.status === \"DELETION_REQUESTED\""), "DELETION_REQUESTED must be recognized");
assert(accountServer.includes("account.status === \"CLOSED\""), "CLOSED must be recognized");
assert(accountServer.includes("account.status !== \"ACTIVE\""), "ACTIVE lifecycle policy must be authoritative");
assert(accountServer.includes("Never derives from: profile DOB, relationship type, Toss payment"), "Account policy must separate identity from Saju profile data");

assert(!ordersRoute.includes("evaluatePaidPurchaseEligibility()"), "Phase 3A must not newly enforce email/eligibility in live order creation");
assert(!ordersRoute.includes("EMAIL_NOT_VERIFIED"), "Order creation must not newly block on unverified email during Phase 3A");
assert(!ordersRoute.includes("PAID_ELIGIBILITY_UNVERIFIED"), "Order creation must not newly block on unverified paid eligibility during Phase 3A");
assert(!ordersRoute.includes("mapPaidPurchaseBlockReasonToUserMessage"), "Order creation must not add premature user-visible enforcement gate");

assert(accountPage.includes("const eligibilityLabels: Record<PaidEligibilityStatus, string>"), "Account page mapping must be centralized");
assert(accountPage.includes("Profile birth date is NOT used here"), "Account page must hold the account-level identity boundary");
assert(migration024.includes("status in ('ACTIVE', 'DELETION_REQUESTED', 'CLOSED')"), "Lifecycle status contract must exist in migration 024");
assert(migration024.includes("paid_eligibility_status in ('UNVERIFIED', 'VERIFIED_ADULT', 'REVOKED')"), "Eligibility state contract must exist in migration 024");

console.log("\nAll corrected Phase 3A invariants validated.");
console.log("=".repeat(80));
console.log("✓ ALL PHASE 3A REGRESSION TESTS PASSED");
console.log("=".repeat(80));
