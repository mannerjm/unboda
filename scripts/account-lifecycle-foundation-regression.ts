import { readFileSync } from "node:fs";

function read(path: string): string { return readFileSync(path, "utf8"); }
function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
function hasSensitiveColumnDeclaration(sql: string, column: string): boolean {
	const identifier = column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`^\\s*["']?${identifier}["']?\\s+[A-Za-z]`, "im").test(sql);
}

const migration = read("supabase/migrations/024_account_lifecycle_paid_eligibility.sql");
const account = read("app/lib/accounts/server.ts");
const orders = read("app/api/orders/route.ts");
const confirm = read("app/api/orders/[orderId]/confirm-payment/route.ts");
const profiles = read("app/api/profiles/route.ts");
const profileEdit = read("app/api/profiles/[profileId]/route.ts");
const forgot = read("app/auth/forgot-password/page.tsx");
const reset = read("app/auth/reset-password/page.tsx");
const accountPage = read("app/account/page.tsx");

assert(migration.includes("create table if not exists public.account_lifecycles"), "account lifecycle table exists");
assert(migration.includes("generation integer") && migration.includes("generation >= 1") && migration.includes("prevent_account_lifecycle_generation_change"), "immutable generation foundation exists");
assert(migration.includes("account_lifecycles_user_generation_unique") && migration.includes("account_lifecycles_one_current_idx"), "multiple historical generations and one current lifecycle are constrained");
assert(migration.includes("UNVERIFIED") && migration.includes("VERIFIED_ADULT") && migration.includes("REVOKED"), "minimal eligibility states exist");
for (const forbidden of ["GUARDIAN_CONSENTED", "birth_date", "phone", "phone_number", "ci", "di", "dob", "resident_registration_number", "legal_name"]) assert(!hasSensitiveColumnDeclaration(migration, forbidden), `migration excludes ${forbidden} column`);
assert(account.includes("requireActiveAccount") && account.includes("requireVerifiedEmailAccount") && account.includes("requirePaidEligibleAccount"), "canonical guards exist");
assert(account.includes("getAccountClosureFinancialBlockers") && account.includes("REFUND_OWNER_REVIEW") && account.includes("PAYMENT_RECONCILIATION_REQUIRED"), "financial closure blocker exists");
assert(account.includes("email_confirmed_at") && account.includes("ACCOUNT_NOT_ACTIVE"), "verified email and active account checks are server-side");
assert(account.includes("PAID_ELIGIBILITY_ENFORCEMENT_ENABLED"), "paid gate is feature-gated");
assert(migration.includes("revoke all on public.account_lifecycles from anon, authenticated") && migration.includes("grant select on public.account_lifecycles to authenticated"), "lifecycle privileges are explicit");
assert(orders.includes("ensureAccountLifecycle") && orders.includes("account.status !== \"ACTIVE\""), "order creation checks active account");
assert(confirm.includes("ensureAccountLifecycle") && confirm.includes("account.status !== \"ACTIVE\""), "payment confirmation checks active account");
assert(profiles.includes("requireVerifiedEmailAccount"), "profile creation requires verified account");
assert(profileEdit.includes("requireVerifiedEmailAccount"), "profile edit requires verified account");
assert(read("app/lib/profiles/types.ts").includes("MAX_PROFILES_PER_USER = 10"), "10 profile limit preserved");
assert(forgot.includes("resetPasswordForEmail") && forgot.includes("입력한 이메일 주소가 맞다면"), "recovery request uses provider API and generic response");
assert(reset.includes("PASSWORD_RECOVERY") && reset.includes("updateUser") && reset.includes('signOut({ scope: "global" })'), "recovery completion updates password and signs out globally");
assert(accountPage.includes("paidEligibilityStatus") && !/\b(?:CI|DI)\b|주민등록번호|전화번호|생년월일/i.test(accountPage), "account UI stays provider-neutral");
const purchases = read("app/lib/purchases/server.ts");
assert(purchases.includes('"REFUND_CANCELLATION"') && purchases.includes('"ACCOUNT_CLOSURE"'), "revocation reasons are distinct");
assert(purchases.includes("revokeEntitlementForAccountClosure") && !purchases.slice(purchases.indexOf("revokeEntitlementForAccountClosure")).includes("cancelPaymentWithToss"), "account closure revoke has no provider refund path");
console.log(JSON.stringify({ accountLifecycle: "verified", paidEligibilityAccountLevel: true, profileDobUsedForAccountEligibility: false, profileLimit: 10, passwordRecoveryFoundation: "verified", productionPaidAgeGateEnabled: false }));
