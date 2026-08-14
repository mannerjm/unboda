import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const migration = read("supabase/migrations/004_paid_reports.sql");
const serviceRoleGrant = read("supabase/migrations/005_paid_reports_service_role_grant.sql");
const reportsServer = read("app/lib/paidReports/server.ts");
const detailRoute = read("app/api/paid-analysis-detail-v2/route.ts");
const detailClient = read("app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx");
const profileInput = read("app/lib/paidAnalysisProfileInput.ts");

assert(migration.includes("create table if not exists public.paid_reports"), "paid_reports migration must create the report table");
for (const field of ["user_id uuid not null", "profile_id uuid not null", "product_id text not null", "purchase_id uuid", "content jsonb", "error_code text", "completed_at timestamptz"]) {
  assert(migration.includes(field), `paid_reports must contain ${field}`);
}
assert(migration.includes("status in ('generating', 'completed', 'failed')"), "report status check must include generating/completed/failed");
assert(/paid_reports_user_profile_product_unique unique \([\s\S]*?user_id,[\s\S]*?profile_id,[\s\S]*?product_id[\s\S]*?\)/.test(migration), "report logical identity must be unique by user/profile/product");
assert(migration.includes('"paid_reports_select_own"') && migration.includes("revoke insert, update, delete on public.paid_reports"), "reports must keep read-only client RLS");
assert(serviceRoleGrant.includes("on table public.paid_reports") && serviceRoleGrant.includes("to service_role"), "paid_reports writes must be granted only to service_role");
assert(!serviceRoleGrant.includes("to authenticated") && !serviceRoleGrant.includes("to anon"), "paid_reports service grant must not enable browser writes");
console.log("1. paid_reports schema and profile-scoped identity present ✓");

assert(profileInput.includes("getSaju("), "paid report input must reuse deterministic getSaju");
assert(profileInput.includes("profile.birthDate") && profileInput.includes("profile.birthTime"), "paid report input must use verified profile birth fields");
assert(profileInput.includes("profile.calendarType") && profileInput.includes("profile.gender"), "paid report input must use verified profile calendar and gender");
assert(profileInput.includes("profile.isLeapMonth ? \"윤달\" : \"평달\""), "paid report input must map verified profile leap month");
assert(!profileInput.includes("sessionStorage"), "profile input builder must not use sessionStorage");
console.log("2. report input is built from verified Profile deterministic data ✓");

assert(!detailClient.includes("sessionStorage") && !detailClient.includes("restoreStoredResult"), "paid detail client must not source report data from free sessionStorage");
assert(detailClient.includes("JSON.stringify({ productId, profileId })"), "paid detail client must send only report identifiers");
assert(detailClient.includes("response.status === 202") && detailClient.includes("결과 다시 확인하기"), "client must understand generating status without polling");
console.log("3. client sends identifiers only and handles generating state ✓");

const entitlementIndex = detailRoute.indexOf("getActiveEntitlementForProfile");
const claimIndex = detailRoute.indexOf("claimPaidReport");
const generateIndex = detailRoute.indexOf("generatePaidAnalysisDetailV2(");
assert(entitlementIndex !== -1 && claimIndex !== -1 && generateIndex !== -1, "route must contain entitlement, claim, and generation stages");
assert(entitlementIndex < claimIndex && claimIndex < generateIndex, "entitlement must precede report claim and OpenAI generation");
assert(detailRoute.includes("claim.state === \"completed\"") && detailRoute.includes("return NextResponse.json(claim.report.content)"), "completed reports must return DB content without generation");
assert(detailRoute.includes("claim.state === \"generating\"") && detailRoute.includes("status: 202"), "concurrent generation must return generating status");
assert(detailRoute.includes("buildPaidAnalysisInputFromProfile(profile, resolved.productId)"), "route must build input from verified profile");
assert(detailRoute.includes("completePaidReport") && detailRoute.includes("failPaidReport"), "route must persist completed and failed report states");
console.log("4. authorization, cache, claim, and completion order present ✓");

assert(reportsServer.includes("ignoreDuplicates: true") && reportsServer.includes("onConflict: \"user_id,profile_id,product_id\""), "claim must use DB unique identity as concurrency defense");
assert(reportsServer.includes("STALE_GENERATING_MS"), "stale generating reports must be retryable");
assert(reportsServer.includes('existing.status === "failed"') && reportsServer.includes("retryableStatus"), "failed reports must be reclaimable without duplicate rows");
assert(reportsServer.includes("purchase_id: input.purchaseId"), "report claim must retain latest purchase source");
console.log("5. duplicate claim, stale generating, and failed retry contracts present ✓");

console.log("\npaid-report-persistence-regression passed ✓");
