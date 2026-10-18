import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const manifest = read("app/manifest.ts");
const worker = read("public/sw.js");
const creditCheckout = read("app/ai-consulting/credits/CreditCheckoutClient.tsx");
const paidCheckout = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
const creditSuccess = read("app/ai-consulting/credits/success/page.tsx");
const paidSuccess = read("app/checkout/success/page.tsx");
const refundApi = read("app/api/ai-consulting/credits/refunds/route.ts");
const refundService = read("app/lib/aiConsulting/creditRefunds.ts");
const tossConfig = read("app/lib/toss/config.ts");

assert(manifest.includes('display: "standalone"') && manifest.includes('scope: "/"'), "PWA install scope");
assert(worker.includes('event.request.mode !== "navigate"') && worker.includes('event.request.method !== "GET"'), "service worker may not intercept API/payment methods");
assert(worker.includes("fetch(event.request)") && !worker.includes("caches.open(") && !worker.includes("cache.put("), "PWA must not cache private responses");
assert(worker.includes('"Cache-Control": "no-store"'), "offline fallback must not be cached");
for (const checkout of [creditCheckout, paidCheckout]) {
  assert(checkout.includes("successUrl:") && checkout.includes("failUrl:"), "Toss redirect links required");
  assert(checkout.includes("window.location.origin"), "Toss must return to same-origin PWA");
}
assert(creditSuccess.includes("/confirm-payment") && creditSuccess.includes('method: "POST"') && creditSuccess.includes("router.replace(consultationHref)"), "credit purchase confirmation must precede chat return");
assert(paidSuccess.includes("/confirm-payment") && paidSuccess.includes('method: "POST"') && paidSuccess.includes("router.replace("), "report purchase confirmation must precede report return");
assert(refundApi.includes("isAiCreditRefundAllowedForUser(user.id)") && refundApi.includes("getUserProfile(profileId,user.id)"), "refund API user and profile authorization");
assert(refundService.includes("isAiCreditRefundAllowedForUser(refund.user_id)") && refundService.includes("isAiCreditRefundAllowedForUser(input.userId)"), "refund settlement and request must enforce pilot scope");
assert(refundService.includes('getTossConfigForAccount(refund.user_id, "settlement")'), "refunds must use original account payment rail");
assert(tossConfig.includes('TOSS_LIVE_PILOT_ENABLED !== "true"') && tossConfig.includes('TOSS_LIVE_CHECKOUT_ENABLED !== "true"'), "LIVE payments stay fail-closed");
console.log("pwa-payment-refund-readiness-regression: PASS (static only; no real payments)");
