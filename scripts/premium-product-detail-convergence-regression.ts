import { readFileSync } from "node:fs";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { resolveLaunchPurchasableProduct } from "../app/lib/purchases/products";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const sharedDetail = readFileSync("app/components/PremiumProductDetail.tsx", "utf8");
const catalog = readFileSync("app/components/PremiumCatalogSection.tsx", "utf8");
const standalonePage = readFileSync("app/paid-analysis/[productId]/page.tsx", "utf8");
const accessPanel = readFileSync("app/paid-analysis/[productId]/PaidAnalysisAccessPanel.tsx", "utf8");

for (const required of [
  "getPaidAnalysisTopicConfig",
  "product.purchaseDecision",
  "이런 고민이 있다면",
  "이런 때 살펴보세요",
  "이 분석이 확인하는 것",
  "분석을 받고 나면",
  "분석 후 이해할 수 있는 것",
  "비슷한 분석과의 차이",
  "다른 기간 분석과의 차이",
  "getPremiumAnalysisHref(product.id, state, profileId)",
]) {
  assert(sharedDetail.includes(required), `shared product detail missing ${required}`);
}

for (const state of ["not_purchased", "none", "generating", "completed", "failed"]) {
  assert(sharedDetail.includes(state), `shared product detail must support ${state}`);
}

assert(catalog.includes('import PremiumProductDetail from "@/app/components/PremiumProductDetail"'), "deep-analysis catalog must use the shared detail");
assert(catalog.includes("<PremiumProductDetail"), "deep-analysis selected detail must render the shared component");
assert(accessPanel.includes('import PremiumProductDetail from "@/app/components/PremiumProductDetail"'), "standalone access panel must use the shared detail");
assert(accessPanel.includes("getPaidReport"), "standalone access panel must resolve report status");
assert(accessPanel.includes('<PremiumProductDetail product={product} state={state} profileId={profileId} />'), "standalone must pass profile-aware state into the shared detail");
assert(standalonePage.includes("resolveLaunchPurchasableProduct"), "standalone route must keep the launch-only availability boundary");
assert(standalonePage.includes('`/deep-analysis?profileId=${encodeURIComponent(profileId)}`'), "standalone return navigation must preserve profile context in deep analysis");
assert(standalonePage.includes(' : "/deep-analysis"'), "profile-less standalone return navigation must stay customer-safe");
assert(standalonePage.includes("심층 분석으로 돌아가기"), "standalone return copy must match the deep-analysis destination");
assert(!standalonePage.includes('href="/result"'), "standalone return navigation must not drop profile context through the result route");

for (const productId of ["study-learning-strategy", "monthly-current", "career"]) {
  assert(resolveLaunchPurchasableProduct(productId).ok, `${productId} must remain an available standalone product`);
}
for (const productId of ["health", "money-investment-style", "monthly-12months", "unknown-product"]) {
  assert(!resolveLaunchPurchasableProduct(productId).ok, `${productId} must remain unavailable for a new standalone purchase`);
}
assert(Boolean(getPremiumProduct("health")), "canonical historical product must remain resolvable");

console.log("premium-product-detail-convergence-regression: OK");
