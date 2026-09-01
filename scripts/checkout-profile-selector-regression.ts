import { readFileSync } from "node:fs";
import { resolveLaunchPurchasableProduct } from "../app/lib/purchases/products";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const checkout = readFileSync("app/checkout/[productId]/page.tsx", "utf8");
const checkoutPanel = readFileSync("app/checkout/[productId]/CheckoutAccessPanel.tsx", "utf8");
const selector = readFileSync("app/components/ProfileSelector.tsx", "utf8");
const orders = readFileSync("app/api/orders/route.ts", "utf8");

assert(checkout.includes('import ProfileSelector from "@/app/components/ProfileSelector"'), "checkout must reuse ProfileSelector");
assert(checkout.includes('user && !profileId'), "profile-less checkout selector must be limited to authenticated customers");
assert(checkout.includes('<ProfileSelector productId={product.id} destination="checkout" />'), "profile-less checkout must select the current product destination");
assert(!checkout.includes('getActiveProfile('), "checkout must not silently select the active profile");
assert(checkoutPanel.includes("{profileId ? ("), "payment CTA must be conditional on a selected profile");
assert(!checkoutPanel.includes("분석 대상을 선택해 주세요"), "profile-less checkout must not render a redundant disabled payment CTA");
assert(checkoutPanel.includes('"결제 계속하기"'), "profile-bound checkout must preserve the payment CTA");
assert(!checkoutPanel.includes("disabled={isPaying || !profileId}"), "profile-less checkout must not expose a disabled payment control");
assert(selector.includes('router.push(`/${destination}/${productId}?profileId=${profile.id}`)'), "profile choice must bind the selected profile to checkout");
assert(selector.includes("relationshipLabels[profile.relationshipType]"), "profile selection must use customer-facing relationship labels");
assert(selector.includes('href="/mypage"') && selector.includes("분석 대상 등록하기"), "zero-profile selection must have a profile setup recovery action");
assert(orders.includes("getUserProfile(rawProfileId, user.id)"), "order API must validate selected profile ownership on the server");

for (const productId of ["monthly-current", "study-learning-strategy"]) {
  assert(resolveLaunchPurchasableProduct(productId).ok, `${productId} must be available for profile selection recovery`);
}
for (const productId of ["health", "unknown-product"]) {
  assert(!resolveLaunchPurchasableProduct(productId).ok, `${productId} must remain unavailable before profile selection`);
}

console.log("checkout-profile-selector-regression: OK");