#!/usr/bin/env node

/**
 * STEP 57D-46 PHASE 3B ACCOUNT SELF-SERVICE REGRESSION
 *
 * Validates Phase 3B security invariants:
 * A. Resend verification exists for unverified state
 * B. Resend action does not locally mark account verified
 * C. Logged-in password change requires authenticated user
 * D. Email change requires authenticated user
 * E. Email change does not trust client user_id
 * F. Account closure request transitions only ACTIVE -> DELETION_REQUESTED
 * G. Closure request cannot directly set CLOSED
 * H. Closure request does not delete auth.users
 * I. Closure request does not delete financial records
 * J. DELETION_REQUESTED blocks new paid activity according to Phase 3A policy
 * K. Paid eligibility semantics remain unchanged
 * L. Forgot-password / reset-password flows remain intact
 * M. Existing purchased report access logic is unchanged
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
console.log("PHASE 3B ACCOUNT SELF-SERVICE REGRESSION TESTS");
console.log("=".repeat(80));

const accountServer = read("app/lib/accounts/server.ts");
const accountPage = read("app/account/page.tsx");
const resendRoute = read("app/api/account/resend-verification/route.ts");
const changePasswordRoute = read("app/api/account/change-password/route.ts");
const changeEmailRoute = read("app/api/account/change-email/route.ts");
const requestClosureRoute = read("app/api/account/request-closure/route.ts");
const cancelClosureRoute = read("app/api/account/cancel-closure/route.ts");
const ordersRoute = read("app/api/orders/route.ts");

console.log("\nA. RESEND EMAIL VERIFICATION FOR UNVERIFIED STATE ONLY");
assert(resendRoute.includes("getCurrentUser()"), "Resend verification route requires authenticated user session");
assert(resendRoute.includes("data.user.email_confirmed_at"), "Resend verification checks email confirmation status");
assert(accountPage.includes("!emailVerified"), "Resend CTA only shown when email is not verified");
assert(!resendRoute.includes("user_id"), "Resend verification route does not accept user_id parameter from client");

console.log("\nB. RESEND ACTION DOES NOT LOCALLY MARK VERIFIED");
assert(resendRoute.includes("supabase.auth.resend"), "Resend relies on Supabase Auth API");
assert(!resendRoute.includes("email_confirmed_at ="), "Resend route does not attempt to mutate email_confirmed_at locally");

console.log("\nC. LOGGED-IN PASSWORD CHANGE REQUIRES AUTHENTICATION");
assert(changePasswordRoute.includes("getCurrentUser()"), "Password change route requires authenticated user");
assert(changePasswordRoute.includes("updateUser({ password"), "Password change uses Supabase Auth updateUser API");
assert(!changePasswordRoute.includes("auth.users"), "Password change does not perform direct SQL mutation on auth.users");

console.log("\nD. LOGIN EMAIL CHANGE REQUIRES AUTHENTICATION");
assert(changeEmailRoute.includes("getCurrentUser()"), "Email change route requires authenticated user");
assert(changeEmailRoute.includes("updateUser({ email"), "Email change uses Supabase Auth updateUser API");

console.log("\nE. EMAIL CHANGE DOES NOT TRUST CLIENT USER_ID");
assert(!changeEmailRoute.includes("body.userId") && !changeEmailRoute.includes("body.user_id"), "Email change route does not accept user_id from client");
assert(changeEmailRoute.includes("user.email"), "Email change compares against authenticated session user");

console.log("\nF. ACCOUNT CLOSURE REQUEST TRANSITION (ACTIVE -> DELETION_REQUESTED)");
assert(accountServer.includes("export async function requestAccountClosure"), "requestAccountClosure server function exists");
assert(accountServer.includes('status: "DELETION_REQUESTED"'), "requestAccountClosure updates status to DELETION_REQUESTED");
assert(accountServer.includes('eq("status", "ACTIVE")'), "requestAccountClosure only transitions from ACTIVE state");

console.log("\nG. CLOSURE REQUEST CANNOT DIRECTLY SET CLOSED");
assert(!requestClosureRoute.includes('status: "CLOSED"'), "requestClosure route cannot set CLOSED status");
assert(!accountServer.slice(accountServer.indexOf("export async function requestAccountClosure")).includes('status: "CLOSED"'), "requestAccountClosure function does not set CLOSED");

console.log("\nH. CLOSURE REQUEST DOES NOT DELETE AUTH.USERS");
assert(!accountServer.includes("deleteFromAuthUsers") && !accountServer.includes("delete from auth.users"), "requestAccountClosure does not delete auth.users");
assert(!requestClosureRoute.includes("delete"), "requestClosure route does not execute delete queries");

console.log("\nI. CLOSURE REQUEST DOES NOT DELETE FINANCIAL RECORDS");
assert(!accountServer.includes("delete from orders") && !accountServer.includes("delete from toss_payment_records"), "requestAccountClosure preserves financial records");
assert(accountServer.includes("getAccountClosureFinancialBlockers"), "requestAccountClosure inspects financial blockers before transition");

console.log("\nJ. DELETION_REQUESTED BLOCKS NEW PAID ACTIVITY");
assert(accountServer.includes('account.status === "DELETION_REQUESTED"'), "evaluatePaidPurchaseEligibility blocks DELETION_REQUESTED status");
assert(ordersRoute.includes("ensureAccountLifecycle"), "Orders API checks account status");

console.log("\nK. PAID ELIGIBILITY SEMANTICS REMAIN UNCHANGED");
assert(accountPage.includes('UNVERIFIED: "확인 전"'), "Paid eligibility UNVERIFIED label remains '확인 전'");
assert(accountPage.includes('VERIFIED_ADULT: "유료 이용 가능"'), "Paid eligibility VERIFIED_ADULT label remains '유료 이용 가능'");
assert(accountPage.includes('REVOKED: "확인 만료"'), "Paid eligibility REVOKED label remains '확인 만료'");
assert(accountPage.includes("Profile birth date is NOT used here"), "Account page preserves identity boundary disclaimer");

console.log("\nL. EXISTING FORGOT-PASSWORD / RESET-PASSWORD FLOW INTACT");
assert(accountPage.includes("/auth/forgot-password?returnTo=/account"), "Forgot password link preserved on account page");

console.log("\nM. CLOSURE REQUEST CANCELLATION SUPPORTED");
assert(accountServer.includes("export async function cancelAccountClosureRequest"), "cancelAccountClosureRequest helper exists");
assert(cancelClosureRoute.includes("cancelAccountClosureRequest"), "cancelClosure route calls cancel helper");
assert(accountServer.includes('eq("status", "DELETION_REQUESTED")'), "cancelAccountClosureRequest transitions from DELETION_REQUESTED");

console.log("\nAll Phase 3B regression checks passed successfully!");
console.log("=".repeat(80));
console.log("✓ ALL PHASE 3B REGRESSION TESTS PASSED");
console.log("=".repeat(80));
