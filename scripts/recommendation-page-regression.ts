import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { listTopicCatalogProducts } from "../app/lib/premiumCatalog";
import { getProductPricing } from "../app/lib/productPricing";
import { resolveCanonicalRecommendationProduct, toCanonicalRecommendations } from "../app/lib/analysisProductRecommendations";
import { PREMIUM_PRODUCT_PHOTOS } from "../app/lib/premiumProductPhotos";

const page = readFileSync("app/recommendations/page.tsx", "utf8");
const cards = readFileSync("app/components/RecommendationTop3.tsx", "utf8");
const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const deep = readFileSync("app/deep-analysis/page.tsx", "utf8");

for (const required of [
  "getFreeAnalysisResult", "productRecommendations", "RecommendationTop3",
  "AppShell", "buildCurrentFreeRecommendations", "getProfileFreeAnalysisFoundationStatus",
  "getGuestFreeAnalysis", "GUEST_ANALYSIS_COOKIE_NAME",
]) {
  assert.ok(page.includes(required), "Recommendation page contract missing: " + required);
}
assert.ok(shell.includes('href: "/recommendations"'), "Sidebar recommendation route missing");
assert.ok(!deep.includes("RecommendationTop3"), "Deep analysis stays manual marketplace discovery");
for (const required of [
  "지금 나에게 필요한", "분석 3가지",
]) {
  assert.ok(page.includes(required), "New lavender next-question hero missing: " + required);
}
assert.ok(page.includes("bg-[linear-gradient(180deg,#faf6ff_0%,#f3edfb_100%)]"),
  "Recommendation page must share the brand lavender visual system");

for (const required of [
  "resolveCanonicalRecommendationProduct", "toCanonicalRecommendations", "validRecommendations",
  "PREMIUM_PRODUCT_PHOTOS", "RecommendationPhoto", 'from "next/image"',
  "getPremiumProductDisplayTitle", "getProductPricing", "내 결과에서 이어지는 질문 3가지",
  "무료 분석과 같은 계산 근거로 선정", "/paid-analysis/", "encodeURIComponent(profileId)", "href={href}",
  "getPaidAnalysisTopicConfig", "product.description", "상품 자세히 보기",
]) assert.ok(cards.includes(required), "Recommendation list contract missing: " + required);
assert.ok(!page.includes("이번 결과를 보고,") && !cards.includes("RecommendationDetail") && !cards.includes("무료 결과에서 추천한 기준 더 보기") && !cards.includes("PremiumReportValuePreview"), "Remove selected guidance and duplicate detail");
assert.ok(cards.includes('className="object-cover"'), "Product photographs must keep existing square crop");
assert.ok(!cards.includes("decision.distinction") && !cards.includes("비슷한 분석과의 차이"),
  "Do not repeat sibling comparison or jargon in the main conversion view");
assert.ok(!cards.includes("{recommendation.reasons[0]"),
  "Do not directly leak opaque raw recommendation signals");

assert.ok(!page.includes("분석 대상 · {profileLabel}") && !page.includes("원하는 주제로 직접 찾기 →"), "Selected hero profile label and arrow must be absent");
assert.ok(page.includes("원하는 주제로 직접 찾기"), "Manual discovery link remains available");
assert.ok(!cards.includes("추천은 매월 실제 계산 근거로") && cards.includes("auto-rows-fr grid-cols-1"), "Selected explanation absent and all three cards equal");

const launchTopicIds = new Set(listTopicCatalogProducts().map((product) => product.id));
for (const id of ["career", "wealth", "relationship", "job-change", "marriage"]) {
  const product = resolveCanonicalRecommendationProduct(id);
  assert.ok(product && launchTopicIds.has(product.id), "Approved Launch Topic missing: " + id);
}
assert.equal(resolveCanonicalRecommendationProduct("social")?.id, "social-helper", "Existing canonical alias must be preserved");
for (const id of ["health", "business", "study", "yearly", "daeun", "health_stress:elementRelations"]) {
  assert.equal(resolveCanonicalRecommendationProduct(id), null, "Non-launch candidate sold: " + id);
}
for (const id of ["relationship-conflict", "money-leak-risk", "social-conflict"]) {
  assert.ok(PREMIUM_PRODUCT_PHOTOS[id]?.src.startsWith("/images/premium/"),
    "Recommended product must reuse original storefront photography: " + id);
}
assert.equal(getProductPricing("money-leak-risk").amount, 16900, "Canonical price changed");

const candidates = (ids: string[]) => ids.map((productId, index) => ({
  productId, score: ids.length - index, reasons: [], evidence: [],
}));
const skipped = toCanonicalRecommendations(candidates(["career", "wealth", "health", "relationship"]));
assert.deepEqual(skipped.map((item) => item.productId), ["career","wealth","relationship"],
  "Invalid candidate must be skipped while filling Top 3");
const deduped = toCanonicalRecommendations(candidates(["career-job-change", "job-change", "wealth", "relationship"]));
assert.deepEqual(deduped.map((item) => item.productId), ["career-job-change","wealth","relationship"],
  "Alias duplicate must be removed from Top 3");

console.log("recommendation-page-regression: OK");
