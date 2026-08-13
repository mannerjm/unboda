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
assert(mockConfirmRoute.includes("confirmMockPayment(orderId, user.id)") && !mockConfirmRoute.includes("profileId"), "mock-confirm must not accept client profileId");
console.log("4. mock-confirm inherits profile scope only from the order ✓");

assert(purchaseServer.includes("getActiveEntitlementForProfile"), "strict profile entitlement lookup must exist");
assert(purchaseServer.includes('.eq("profile_id", profileId)'), "strict entitlement lookup must filter profile_id");
assert(purchaseServer.includes('onConflict: "user_id,profile_id,resource_id,resource_type"'), "entitlement upsert must use the profile-scoped unique key");
assert(!grantEntitlementSource.includes("ignoreDuplicates: true"), "repeat purchases must refresh the entitlement purchase source instead of ignoring the new purchase");
assert(!purchaseServer.includes("profile_id: undefined") && !purchaseServer.includes("profileId ??"), "profile persistence must not have a legacy fallback");
console.log("5. profile-scoped entitlement lookup and latest-purchase upsert contract present ✓");

assert(checkoutPanel.includes("profileId?: string") && checkoutPanel.includes("disabled={isPaying || !profileId}"), "checkout must require an explicit profileId");
assert(!checkoutPanel.includes("profiles[0]") && !checkoutPanel.includes("relationshipType === \"self\""), "checkout must not invent a self or first-profile fallback");
console.log("6. checkout requires explicit profile context without a fallback ✓");

console.log("\nprofile-scoped-purchase-server-regression passed ✓");
