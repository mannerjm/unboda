import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const accounts = readFileSync("app/lib/accounts/server.ts", "utf8");
const purchases = readFileSync("app/lib/purchases/server.ts", "utf8");
const ordersRoute = readFileSync("app/api/orders/route.ts", "utf8");
const checkout = readFileSync("app/checkout/[productId]/CheckoutAccessPanel.tsx", "utf8");
const freeAccessStart = accounts.indexOf("export async function evaluateAccountServiceAccess");
const freeAccess = accounts.slice(freeAccessStart);
const createPendingOrder = purchases.slice(
  purchases.indexOf("export async function createPendingOrder"),
  purchases.indexOf("export async function getOrderForUser"),
);

assert(accounts.includes("export async function assertPaidPurchaseEligibility"), "paid eligibility must have one authoritative service guard");
assert(accounts.includes("const decision = await evaluatePaidPurchaseEligibility()"), "the guard must reuse the canonical account policy decision");
assert(accounts.includes("decision.user.id !== expectedUserId"), "caller-supplied userId must be bound to the authenticated Supabase user");
assert(!accounts.includes("PAID_ELIGIBILITY_ENFORCEMENT_ENABLED"), "no missing or malformed feature flag may bypass paid eligibility enforcement");
assert(accounts.includes('reason: "EMAIL_NOT_VERIFIED"') && accounts.includes('reason: "PAID_ELIGIBILITY_UNVERIFIED"') && accounts.includes('reason: "PAID_ELIGIBILITY_REVOKED"'), "email, unverified adult status, and revoked status must fail closed distinctly");
assert(createPendingOrder.includes("await assertPaidPurchaseEligibility(input.userId)") && createPendingOrder.indexOf("assertPaidPurchaseEligibility") < createPendingOrder.indexOf('.from("orders")'), "direct createPendingOrder calls must enforce eligibility before inserting an order");
assert(ordersRoute.includes("error instanceof PaidPurchaseEligibilityError") && ordersRoute.includes("EMAIL_NOT_VERIFIED") && ordersRoute.includes("PAID_ELIGIBILITY_UNVERIFIED"), "the order API must map safe structured eligibility failures");
assert(checkout.includes("body?.error"), "checkout must surface the server-provided safe eligibility guidance without a provider-specific bypass");
assert(!freeAccess.includes("VERIFIED_ADULT") && !freeAccess.includes("getEmailVerificationState"), "free/general service must remain outside paid eligibility enforcement");
assert(!accounts.includes("birthDate") && !accounts.includes("birthTime") && !accounts.includes("getSaju("), "paid eligibility must not infer account age from profile or saju data");
assert(!accounts.includes("update({ paid_eligibility_status"), "49B must not introduce a verification-state write path");

console.log("paid-purchase-eligibility-boundary-regression passed ✓");