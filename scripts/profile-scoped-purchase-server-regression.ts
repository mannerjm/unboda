import { readFileSync } from "fs";
import { join } from "path";
import { getProductPricing } from "../app/lib/productPricing";
import { resolvePurchasableProduct } from "../app/lib/purchases/products";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const topicProductId = "relationship-conflict";
const resolved = resolvePurchasableProduct(topicProductId);
assert(resolved.ok && resolved.productId === topicProductId, "canonical productId must be preserved");
assert(resolved.ok && resolved.amount === getProductPricing(topicProductId).amount, "price must remain server-side");
console.log("1. canonical product and server-side price preserved ✓");

const ordersRoute = read("app/api/orders/route.ts");
const purchaseServer = read("app/lib/purchases/server.ts");
const purchaseTypes = read("app/lib/purchases/types.ts");
const mockConfirmRoute = read("app/api/orders/[orderId]/mock-confirm/route.ts");
const checkoutPanel = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
const grantEntitlementSource = purchaseServer.slice(
  purchaseServer.indexOf("export async function grantEntitlement"),
  purchaseServer.indexOf("export async function getActiveEntitlementForProfile"),
);

assert(ordersRoute.includes("profileId?: unknown"), "POST /api/orders must read profileId from the request body");
assert(ordersRoute.includes("isProfileId(rawProfileId)"), "POST /api/orders must validate profileId UUID format");
assert(ordersRoute.includes("getUserProfile(rawProfileId, user.id)"), "POST /api/orders must verify profile ownership against the session user");
assert(ordersRoute.includes("status: 404"), "foreign or nonexistent profile must produce 404");
assert(ordersRoute.includes("profileId: profile.id"), "only the ownership-verified profileId may reach order persistence");
assert(!ordersRoute.includes("body.userId"), "POST /api/orders must not trust userId from the body");
console.log("2. order API requires a session-owned profileId ✓");

for (const type of ["OrderRecord", "PurchaseRecord", "EntitlementRecord"]) {
  const typeStart = purchaseTypes.indexOf(`export type ${type}`);
  const typeEnd = purchaseTypes.indexOf("};", typeStart);
  assert(purchaseTypes.slice(typeStart, typeEnd).includes("profileId: string"), `${type} must contain profileId`);
}
assert(purchaseTypes.includes("purchaseId: string | null"), "EntitlementRecord must contain purchaseId");
assert(purchaseTypes.includes('source: "purchase" | "subscription" | "credit" | "grant"'), "EntitlementRecord must contain source");
console.log("3. persisted purchase record DTOs are profile-scoped ✓");

assert(purchaseServer.includes("profile_id: input.profileId"), "pending order insert must persist profile_id");
assert(purchaseServer.includes("profile_id: order.profileId"), "purchase insert must inherit profile_id from the order");
assert(purchaseServer.includes("profileId: paidOrder.profileId"), "mock-confirm entitlement must inherit profileId from the paid order");
assert(purchaseServer.includes("purchaseId: purchase.id"), "mock-confirm entitlement must receive its purchase id");
assert(purchaseServer.includes('source: "purchase"'), "mock-confirm entitlement source must be purchase");
assert(mockConfirmRoute.includes("confirmMockPayment(orderId, user.id)") && !mockConfirmRoute.includes("profileId?: unknown"), "mock-confirm must not accept a client-supplied profileId");
console.log("4. mock-confirm inherits profile scope only from the order ✓");

assert(purchaseServer.includes("getActiveEntitlementForProfile"), "strict profile entitlement lookup must exist");
assert(purchaseServer.includes('.eq("profile_id", profileId)'), "strict entitlement lookup must filter profile_id");
assert(purchaseServer.includes('onConflict: "user_id,profile_id,resource_id,resource_type,analysis_edition_key"'), "entitlement upsert must use the edition-scoped unique key (57D-48F-D)");
assert(!grantEntitlementSource.includes("ignoreDuplicates: true"), "repeat purchases must refresh the entitlement purchase source instead of ignoring the new purchase");
assert(!purchaseServer.includes("profile_id: undefined") && !purchaseServer.includes("profileId ??"), "profile persistence must not have a legacy fallback");
console.log("5. profile-scoped entitlement lookup and latest-purchase upsert contract present ✓");

assert(
  checkoutPanel.includes("profileId?: string") &&
    checkoutPanel.includes("{profileId ? (") &&
    checkoutPanel.includes("if (!immediateGenerationAcknowledged)") &&
    checkoutPanel.includes("disabled={isPaying || !immediateGenerationAcknowledged}"),
  "checkout must require an explicit profileId and acknowledgement before payment",
);
assert(!checkoutPanel.includes("profiles[0]") && !checkoutPanel.includes("relationshipType === \"self\""), "checkout must not invent a self or first-profile fallback");
console.log("6. checkout requires explicit profile context and acknowledgement without a fallback ✓");

// Account A may own multiple profiles. RLS alone is owner-scoped, so privileged
// app reads must independently enforce the active profile and edition.
const reportGate = read("app/paid-analysis/[productId]/report/ReportAccessGate.tsx");
const reportStatus = read("app/api/paid-analysis-detail-v2/status/route.ts");
const reportStorage = read("app/lib/paidReports/server.ts");
const memoriesApi = read("app/api/ai-consulting/memories/route.ts");
const portfolioApi = read("app/api/ai-consulting/portfolio/route.ts");
const portfolioStorage = read("app/lib/aiConsulting/portfolio.ts");
const memoryStorage = read("app/lib/aiConsulting/memory.ts");
for (const [name, source] of [
  ["report access gate", reportGate],
  ["report status", reportStatus],
  ["AI memory route", memoriesApi],
  ["AI portfolio route", portfolioApi],
] as const) {
  assert(source.includes("getCurrentUser()") && source.includes("getUserProfile(")
    && source.includes("getActiveProfile(") && source.includes("activeProfile"),
    name + " must check owner and explicitly active profile");
}
assert(reportGate.includes("hasActiveEntitlementForProfileEdition(user.id, profile.id, canonicalProductId, edition)"),
  "specific report edition must require a matching profile entitlement");
assert(reportStatus.includes("getPaidReport(user.id, profile.id, resolved.productId, entitlement.analysisEditionKey)"),
  "report status must not cross profiles or editions");
for (const [name, source] of [
  ["paid report storage", reportStorage],
  ["AI memory storage", memoryStorage],
  ["AI portfolio storage", portfolioStorage],
] as const) {
  assert(source.includes('.eq("user_id",') && source.includes('.eq("profile_id",'),
    name + " must enforce BOTH owner and profile filters even with admin DB access");
}
assert(purchaseServer.includes('.eq("profile_id", profileId)')
  && purchaseServer.includes('.eq("analysis_edition_key", analysisEditionKey)'),
  "exact-edition entitlement lookup must enforce profile and edition");
const multiProfileSql = read("scripts/staging-same-user-multiprofile-rollback-20261019.sql");
assert(multiProfileSql.includes("SAME_OWNER_PROFILE_SCOPING_FAILED")
  && multiProfileSql.includes("OTHER_ACCOUNT_RLS_FAILED")
  && multiProfileSql.includes("ANON_RLS_FAILED")
  && multiProfileSql.trimEnd().endsWith("ROLLBACK;"),
  "staging multi-profile regression must fail closed and roll back all synthetic rows");
console.log("7. same-user family-profile report/entitlement/memory ownership guards ✓");

console.log("\nprofile-scoped-purchase-server-regression passed ✓");
