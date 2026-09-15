import { readFileSync } from "node:fs";
import { getLaunchProductIds, getPaidAnalysisTopicConfig } from "../app/lib/paidAnalysisTopicConfig";
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
  "product.description",
  "getPaidAnalysisTopicConfig",
  "getTopicRelevanceItems",
  "withSubjectParticle",
  "지금 내 상황에서 어떻게 나타나는지 궁금할 때",
  "무엇을 유지하고 무엇을 조정해야 할지 판단 기준이 필요할 때",
  "recommendedFor.slice(0, 2)",
  "product.details.slice(0, 3)",
  "analysisScope.slice(0, 3)",
  "expectedUnderstanding.slice(0, 2)",
  "이런 고민이 있다면",
  "이런 때 살펴보세요",
  "이 분석에서 보는 것",
  "분석 후 알 수 있는 것",
  "getPremiumAnalysisHref(product.id, state, profileId)",
]) {
  assert(sharedDetail.includes(required), `shared product detail missing ${required}`);
}

for (const removedCustomerCopy of [
  "비슷한 분석과의 차이",
  "다른 기간 분석과의 차이",
  "그래서 이 분석으로",
  "decision.distinction",
  "관련 내용을 구체적으로 살펴보고 싶을 때",
]) {
  assert(!sharedDetail.includes(removedCustomerCopy), `shared product detail must not render dense/internal purchase copy: ${removedCustomerCopy}`);
}

for (const state of ["not_purchased", "none", "generating", "completed", "failed"]) {
  assert(sharedDetail.includes(state), `shared product detail must support ${state}`);
}

for (const productId of getLaunchProductIds()) {
  const product = getPremiumProduct(productId);
  assert(Boolean(product), `${productId} must resolve from the premium registry`);
  if (!product) continue;

  assert(product.description.trim().length > 0, `${productId} must have a concise customer description`);

  if (product.kind === "PERIOD") {
    const recommendedFor = product.purchaseDecision?.recommendedFor.slice(0, 2) ?? [];
    assert(recommendedFor.length > 0 && recommendedFor.length <= 2, `${productId} must support a maximum-two-item period relevance section`);
  } else {
    assert(product.title.trim().length > 0, `${productId} must support title-based plain-language relevance copy`);
  }

  const quickOverviewItems = product.details?.slice(0, 3)
    ?? product.purchaseDecision?.analysisScope.slice(0, 3)
    ?? [];
  assert(quickOverviewItems.length > 0 && quickOverviewItems.length <= 3, `${productId} must support a maximum-three-item quick overview`);

  const expectedUnderstanding = product.kind === "PERIOD"
    ? product.purchaseDecision?.expectedUnderstanding.slice(0, 2) ?? []
    : getPaidAnalysisTopicConfig(productId)?.purchaseDecision?.expectedUnderstanding.slice(0, 2) ?? [];
  assert(expectedUnderstanding.length > 0 && expectedUnderstanding.length <= 2, `${productId} must support a maximum-two-item outcome section`);
}

assert(catalog.includes('import PremiumProductDetail from "@/app/components/PremiumProductDetail"'), "deep-analysis catalog must use the shared detail");
assert(catalog.includes("<PremiumProductDetail"), "deep-analysis selected detail must render the shared component");
assert(accessPanel.includes('import PremiumProductDetail from "@/app/components/PremiumProductDetail"'), "standalone access panel must use the shared detail");
assert(accessPanel.includes("getPaidReport"), "standalone access panel must resolve report status");
assert(accessPanel.includes('<PremiumProductDetail product={product} state={state} profileId={profileId} isSaved={isSaved} />'), "standalone must pass profile-aware state and authoritative save state into the shared detail");
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
