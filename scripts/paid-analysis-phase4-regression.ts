import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const detailPage = read("app/paid-analysis/[productId]/page.tsx");
const detail = read("app/components/PremiumProductDetail.tsx");
const preview = read("app/components/PremiumReportValuePreview.tsx");
const accessPanel = read("app/paid-analysis/[productId]/PaidAnalysisAccessPanel.tsx");
const checkoutPage = read("app/checkout/[productId]/page.tsx");
const checkoutPanel = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
const catalog = read("app/components/PremiumCatalogSection.tsx");

for (const [name, source] of [
  ["premium detail", detail],
  ["report preview", preview],
  ["standalone detail page", detailPage],
  ["checkout page", checkoutPage],
  ["checkout panel", checkoutPanel],
] as const) {
  for (const warmToken of [
    "#cdbb98",
    "#fffdf8",
    "#dfd2bc",
    "#eee4d5",
    "#f7f0e4",
    "#faf6ee",
    "#f7f2e8",
  ]) {
    assert(!source.includes(warmToken), `${name} must not restore legacy warm token ${warmToken}`);
  }
}

assert(detailPage.includes('bg-[#f5f7fc]'), "standalone premium detail must use the cool canvas");
assert(detail.includes("PREMIUM ANALYSIS"), "premium detail must expose the renewed product hierarchy");
assert(detail.includes("1. 분석 대상 확인"), "premium detail must explain subject confirmation");
assert(detail.includes("2. 개인화 리포트 생성"), "premium detail must explain personalized generation");
assert(detail.includes("3. 구매한 분석에 보관"), "premium detail must explain report storage");
assert(detail.includes("구매 전 확인"), "premium detail must surface a pre-checkout confirmation block");
assert(detail.includes("결제가 승인되면 개인화 분석 생성이 바로 시작됩니다."), "premium detail must explain immediate generation before checkout");
assert(detail.includes("PremiumReportValuePreview"), "premium detail must keep the report-structure preview");
assert(preview.includes("리포트 구성 미리보기"), "report preview must retain its customer-facing purpose");
assert(preview.includes('bg-[#171a3d]') && preview.includes('bg-[#6f5ce7]'), "report preview must use the Modern Mystic navy/violet system");

for (const state of ["not_purchased", "none", "generating", "completed", "failed"]) {
  assert(detail.includes(state), `premium detail must preserve state ${state}`);
}
assert(detail.includes("getPremiumAnalysisHref(product.id, state, profileId)"), "premium detail must preserve state-aware profile-scoped navigation");
assert(detail.includes("saveAnalysisAction(product.id)"), "premium detail must preserve interested-analysis save behavior");
assert(detail.includes("getProductPricing(productId)"), "premium detail must preserve configured pricing lookup");
assert(accessPanel.includes("getCurrentEditionEntitlementForProfile"), "detail access must remain edition/profile scoped");
assert(accessPanel.includes("getPaidReport"), "detail access must keep authoritative report-state lookup");
assert(accessPanel.includes('<PremiumProductDetail product={product} state={state} profileId={profileId} isSaved={isSaved} />'), "detail access must keep the existing shared-detail contract");

assert(catalog.includes("PremiumProductDetail"), "deep-analysis discovery must keep using the shared premium detail");
assert(catalog.includes('bg-[#f7f8fc]'), "selected catalog detail must sit on the cool Phase 4 surface");

assert(checkoutPage.includes('bg-[#f5f7fc]'), "checkout must keep the cool canvas");
assert(checkoutPage.includes("CHECKOUT"), "checkout must expose the renewed purchase hierarchy");
assert(checkoutPage.includes("01 · 계정 확인") && checkoutPage.includes("02 · 분석 대상 확인") && checkoutPage.includes("03 · 결제 후 생성"), "checkout must explain the three purchase checkpoints");
assert(checkoutPage.includes("resolveLaunchPurchasableProduct"), "checkout must preserve launch-only sale authorization");
assert(checkoutPage.includes("resolveAnalysisEditionForOrder"), "checkout must preserve edition resolution");
assert(checkoutPage.includes('destination="checkout"'), "profile-less checkout must preserve profile selection routing");
assert(checkoutPage.includes("https://js.tosspayments.com/v2/standard"), "Toss standard SDK integration must remain intact");

assert(checkoutPanel.includes('fetch("/api/account/status"'), "checkout must preserve account verification lookup");
assert(checkoutPanel.includes('fetch("/api/orders"'), "checkout must preserve order creation endpoint");
assert(checkoutPanel.includes("immediateGenerationAcknowledged: true"), "checkout order must preserve immediate-generation acknowledgement");
assert(checkoutPanel.includes("window.TossPayments"), "checkout must preserve Toss client usage");
assert(checkoutPanel.includes("requestPayment"), "checkout must preserve Toss payment invocation");
assert(checkoutPanel.includes("/checkout/success?productId="), "checkout must preserve success routing");
assert(checkoutPanel.includes("/checkout/fail?productId="), "checkout must preserve failure routing");
assert(checkoutPanel.includes("결제 준비 상태"), "checkout must expose readable readiness state");
assert(checkoutPanel.includes("계정 인증 확인") && checkoutPanel.includes("분석 대상") && checkoutPanel.includes("결제 후 즉시 생성"), "checkout readiness must cover account, subject, and generation");

console.log("Paid-analysis Phase 4 purchase UX regression passed ✓");
