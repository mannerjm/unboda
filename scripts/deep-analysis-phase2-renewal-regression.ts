import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { groupTopicCatalogProductsByCategory, listPeriodCatalogProducts } from "../app/lib/premiumCatalog";
import { getPaidAnalysisTopicConfig } from "../app/lib/paidAnalysisTopicConfig";

const page = readFileSync("app/deep-analysis/page.tsx", "utf8");
const catalog = readFileSync("app/components/PremiumCatalogSection.tsx", "utf8");
const storefront = readFileSync("app/components/PremiumCatalogMarketplace.tsx", "utf8");
const shell = readFileSync("app/components/AppShell.tsx", "utf8");

for (const preserved of [
  "getCurrentUser",
  "getActiveProfile",
  "AppShell",
  "PremiumCatalogSection",
]) {
  assert(page.includes(preserved), `phase 2 must preserve deep-analysis boundary: ${preserved}`);
}

for (const queryContract of ["searchParams", "initialMode", "initialCategory"]) {
  assert(page.includes(queryContract), `phase 2 must support discovery entry state: ${queryContract}`);
}

for (const customerCopy of [
  "원하는 분석 바로 찾기",
  "어떤 운이 궁금하세요?",
  "질문으로 찾는 심층 분석",
  "무엇이 궁금한지부터 선택하세요.",
  "어떤 영역이 마음에 걸리나요?",
  "지금 어떤 질문에 가장 가까우세요?",
  "어느 시간의 흐름이 궁금하세요?",
]) {
  assert(page.includes(customerCopy) || catalog.includes(customerCopy), `phase 2 customer discovery copy missing: ${customerCopy}`);
}

for (const category of ["relationship", "career", "money", "growth", "social", "business", "health"]) {
  assert(catalog.includes(`${category}: {`), `phase 2 must keep customer discovery metadata for ${category}`);
}

assert(catalog.includes('fetch("/api/premium-catalog/status")'), "phase 2 must preserve purchased-report status loading");
assert(catalog.includes("summary.profileId === profileId"), "phase 2 must preserve profile-scoped paid status");
assert(catalog.includes("currentOwnedProductIds.has(summary.productId)"), "phase 2 must preserve current-edition ownership gating");
assert(catalog.includes("PremiumProductDetail"), "phase 2 must preserve the existing purchase/detail surface");
assert(catalog.includes("decision.decisionQuestion"), "topic discovery must lead with the existing purchase-decision question");
assert(catalog.includes("decision.primaryQuestion"), "period discovery must lead with the existing period purchase question");
assert(catalog.includes("formatPrice(product.id)"), "question cards must keep exact configured product pricing visible");
assert(catalog.includes("주제로 찾기") && catalog.includes("시기로 찾기"), "phase 2 must expose topic and period discovery modes");

const topicGroups = groupTopicCatalogProductsByCategory();
assert(topicGroups.length >= 7, "launch topic catalog must keep all existing topic groups");
for (const group of topicGroups) {
  assert(group.products.length > 0, `topic group ${group.category} must remain populated`);
  for (const product of group.products) {
    const decision = getPaidAnalysisTopicConfig(product.id)?.purchaseDecision;
    assert(decision?.decisionQuestion, `topic ${product.id} must have a question-first purchase decision`);
  }
}

const periodProducts = listPeriodCatalogProducts();
assert(periodProducts.length >= 7, "launch period catalog must preserve the existing period range");
for (const product of periodProducts) {
  assert(product.purchaseDecision?.primaryQuestion, `period ${product.id} must have a question-first purchase decision`);
}

for (const forbidden of ["requestPayment", "markOrderPaid", "grantEntitlement", "generatePaidReport"]) {
  assert(!page.includes(forbidden) && !catalog.includes(forbidden), `phase 2 discovery must not embed commercial runtime logic: ${forbidden}`);
}


assert(catalog.includes("PremiumCatalogMarketplace") && catalog.includes('NEXT_PUBLIC_PREMIUM_STOREFRONT === "legacy"'),
  "the new storefront must render by default while preserving a reversible legacy layout");
assert(storefront.includes("topicGroups.map") && storefront.includes("periodProducts.map"),
  "storefront must present all seven topic categories and seven period navigation items");
assert(storefront.includes("currentGroup.products.map") && storefront.includes("onSelectProduct(product.id)"),
  "topic category must open its own thumbnail product list before detail");
assert(storefront.includes("choosePeriod(product.id)") && storefront.includes("<PremiumProductDetail"),
  "period navigation must open an existing product detail without a second product grid");
assert(storefront.includes("getProductPricing(productId)") && storefront.includes("getPaidAnalysisTopicConfig"),
  "storefront must retain product-specific prices and original purchase questions");
assert(storefront.includes("/api/reviews?productId=") && storefront.includes("summary.count<=0"),
  "ratings must come only from published purchase-verified reviews and remain absent without reviews");
assert(storefront.includes("stateByProductId.get(selected.id)") && storefront.includes("savedProductIds.has(selected.id)"),
  "storefront details must preserve edition ownership, report state, and saved state");
assert(!storefront.includes("requestPayment") && !storefront.includes("grantEntitlement"),
  "storefront cannot implement its own financial or permission logic");


// Customer request: global sidebar is the only desktop category list.
// Topic selection goes directly to the selected topic's product cards;
// period selection goes directly to the existing product detail.
for (const category of ["growth", "business", "health", "money", "career", "social", "relationship"]) {
  assert(shell.includes(`category: "${category}"`), `global sidebar must retain topic category ${category}`);
}
for (const product of listPeriodCatalogProducts()) {
  assert(shell.includes(`productId: "${product.id}"`), `global sidebar must link directly to period product ${product.id}`);
}
assert(shell.includes('item.activeHref === "/deep-analysis" && isDeepCatalog')
  && shell.includes('href={deepCatalogHref("topic", category)}')
  && shell.includes('href={deepCatalogHref("period", productId)}'),
  "global deep-analysis sidebar must expose direct topic and period navigation under the existing item");
assert(shell.includes('profileId ? `&profileId=${encodeURIComponent(profileId)}`'),
  "category and period navigation must preserve the analysis profile context");
assert(!storefront.includes("<aside") && !storefront.includes('md:grid-cols-[166px_minmax(0,1fr)]'),
  "the deep-analysis body must not render a second desktop category menu");
assert(storefront.includes('grid-cols-[116px_minmax(0,1fr)]') && storefront.includes('currentGroup.products.map'),
  "topic selection should reveal compact illustrated product cards immediately");
assert(storefront.includes("lg:hidden") && storefront.includes("choosePeriod(product.id)"),
  "mobile users must still reach topic and period choices without a desktop sidebar");
assert(page.includes('initialProductId={initialProductId}') && page.includes('initialMode === "period"')
  && page.includes('key={`${initialMode}:${initialCategory ?? ""}:${initialProductId ?? ""}`}'),
  "deep-link changes must remount the correct topic or period detail instead of retaining stale catalog state");
assert(catalog.includes('periodProducts.some((product) => product.id === initialProductId)'),
  "only existing period products can open directly from URL");

console.log("Deep-analysis phase 2 discovery regression passed ✓");
