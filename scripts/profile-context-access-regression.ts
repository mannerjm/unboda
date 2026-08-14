import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const checkoutPage = read("app/checkout/[productId]/page.tsx");
const checkoutPanel = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
const resultPage = read("app/result/page.tsx");
const paidPage = read("app/paid-analysis/[productId]/page.tsx");
const accessPanel = read("app/paid-analysis/[productId]/PaidAnalysisAccessPanel.tsx");
const reportPage = read("app/paid-analysis/[productId]/report/page.tsx");
const reportGate = read("app/paid-analysis/[productId]/report/ReportAccessGate.tsx");
const detailClient = read("app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx");
const detailRoute = read("app/api/paid-analysis-detail-v2/route.ts");
const ordersRoute = read("app/api/orders/route.ts");
const purchaseServer = read("app/lib/purchases/server.ts");
const selector = read("app/components/ProfileSelector.tsx");

assert(selector.includes('fetch("/api/profiles")'), "selector must load profiles through the Profile API");
assert(!selector.includes("localStorage") && !selector.includes("sessionStorage"), "selector must not persist profile ownership in browser storage");
assert(!selector.includes("profiles[0]") && !selector.includes("relationshipType === \"self\""), "selector must not auto-select self or first profile");
assert(selector.includes("?profileId=${profile.id}"), "selector must navigate using profileId query context");
assert(selector.includes("max-h-80") && selector.includes("overflow-y-auto"), "selector must scroll when the profile list is long");
console.log("1. selector requires explicit URL-backed profile selection ✓");

assert(resultPage.includes("setProfileSelectionProductId(productId)"), "result paid-analysis entry must open Profile selection instead of navigating directly");
assert(resultPage.includes("<ProfileSelector") && resultPage.includes("productId={profileSelectionProductId}"), "result must reuse ProfileSelector for the selected recommendation product");
assert(resultPage.includes("currentProfileId={currentProfileId}"), "result must preserve existing profileId query context when present");
assert(!resultPage.includes("router.push(`/paid-analysis/${productId}`)"), "result must not navigate to paid analysis without profileId");
assert(!resultPage.includes("profiles[0]") && !resultPage.includes("relationshipType === \"self\""), "result must not auto-select self or first profile");
console.log("2. result requires explicit Profile selection before paid-analysis navigation ✓");

for (const [name, source] of [["paid page", paidPage], ["checkout page", checkoutPage]] as const) {
  assert(source.includes("getUserProfile(profileId, user.id)"), `${name} must server-verify selected profile ownership`);
  assert(source.includes("분석 대상") || source.includes("결제 대상"), `${name} must show the verified active target`);
  assert(!source.includes("<ProfileSelector") && !source.includes("ProfileTargetControl"), `${name} must not expose an intermediate profile selector or change control`);
}
assert(checkoutPage.includes("searchParams") && checkoutPage.includes("profileId"), "checkout page must read and preserve profileId query context");
assert(checkoutPanel.includes("profileId?: string") && checkoutPanel.includes("disabled={isPaying || !profileId}"), "checkout must require selected profileId before payment");
assert(checkoutPanel.includes("JSON.stringify({ productId: canonicalProductId, profileId })"), "checkout must send selected profileId to orders API");
assert(checkoutPanel.includes("?profileId=${profileId}"), "checkout success navigation must preserve profileId");
assert(ordersRoute.includes("getUserProfile(rawProfileId, user.id)"), "orders API must ownership-verify profileId");
console.log("3. checkout requires and preserves selected profileId ✓");

for (const [name, source] of [["paid page", paidPage], ["report page", reportPage]] as const) {
  assert(source.includes("searchParams"), `${name} must read profileId query context`);
}
for (const [name, source] of [["access panel", accessPanel], ["report gate", reportGate]] as const) {
  assert(source.includes("isProfileId(profileId)"), `${name} must reject missing/invalid profileId`);
  assert(source.includes("getUserProfile(profileId, user.id)"), `${name} must verify profile ownership`);
  assert(source.includes("hasActiveEntitlementForProfile"), `${name} must use strict profile entitlement lookup`);
  assert(source.includes("notFound()"), `${name} must return 404 for invalid/foreign profile`);
}
assert(reportGate.includes("?profileId=${profileId}"), "report gate return link must preserve profileId");
console.log("4. paid access and report gate are profile-scoped ✓");

assert(reportPage.includes("<PaidAnalysisDetailV2Client productId={productId} profileId={profileId}"), "report page must pass profileId to the detail client");
assert(detailClient.includes("profileId?: string") && detailClient.includes("JSON.stringify({ productId, profileId })"), "detail client must send only productId and profileId");
assert(!detailClient.includes("sessionStorage"), "detail client must not use free-analysis sessionStorage as report input");
assert(detailRoute.includes("isProfileId(input.profileId)"), "detail API must reject missing/invalid profileId");
assert(detailRoute.includes("getUserProfile(input.profileId, user.id)"), "detail API must verify profile ownership");
assert(detailRoute.includes("getActiveEntitlementForProfile"), "detail API must use strict profile entitlement lookup");
const entitlementIndex = detailRoute.indexOf("getActiveEntitlementForProfile");
const generateIndex = detailRoute.indexOf("generatePaidAnalysisDetailV2(");
assert(entitlementIndex !== -1 && generateIndex !== -1 && entitlementIndex < generateIndex, "detail entitlement check must precede OpenAI generation");
assert(detailRoute.includes("status: 400") && detailRoute.includes("status: 404") && detailRoute.includes("status: 403"), "detail API must distinguish invalid, foreign, and no-entitlement requests");
console.log("5. detail API verifies profile entitlement before OpenAI ✓");

assert(!purchaseServer.includes("export async function hasActiveEntitlement("), "account-wide entitlement accessor must be removed");
assert(!purchaseServer.includes("export async function getActiveEntitlement("), "account-wide entitlement lookup must be removed");
assert(!accessPanel.includes("hasActiveEntitlement(user.id") && !reportGate.includes("hasActiveEntitlement(user.id") && !detailRoute.includes("hasActiveEntitlement(user.id"), "paid-analysis boundaries must not retain account-wide access calls");
console.log("6. account-wide paid-analysis entitlement fallback removed ✓");

console.log("\nprofile-context-access-regression passed ✓");
