import { readFileSync } from "node:fs";
import { listTopicCatalogProducts } from "../app/lib/premiumCatalog";
import { getProductPricing } from "../app/lib/productPricing";
import { resolveCanonicalRecommendationProduct } from "../app/lib/analysisProductRecommendations";
import { toCanonicalRecommendations } from "../app/lib/analysisProductRecommendations";

const page = readFileSync("app/recommendations/page.tsx", "utf8");
const cards = readFileSync("app/components/RecommendationTop3.tsx", "utf8");
const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const deep = readFileSync("app/deep-analysis/page.tsx", "utf8");

for (const required of ["/recommendations", "getFreeAnalysisResult", "productRecommendations", "RecommendationTop3", "AppShell"]) {
  if (!page.includes(required)) throw new Error(`Recommendation page contract missing: ${required}`);
}
for (const required of ["getPremiumAnalysisHref", "toPremiumAnalysisProductState", "validRecommendations"]) {
  if (!cards.includes(required)) throw new Error(`Top 3 routing contract missing: ${required}`);
}
if (!shell.includes('href: "/recommendations"')) throw new Error("Shell recommendation route missing");
if (deep.includes("RecommendationTop3") || deep.includes("productRecommendations")) {
  throw new Error("Deep analysis should remain manual discovery, not duplicate the full recommendation view");
}

if (!page.includes("무료 분석에서 이어서 확인할 분석") || !page.includes("무료 분석에서 가장 크게 드러난 문제")) {
  throw new Error("Recommendation page must explicitly continue the free-analysis problem diagnosis");
}
if (!page.includes("buildCurrentRecommendations") || !page.includes("mergeRecommendationStoryline") || !page.includes("selectedCategories")) {
  throw new Error("Recommendation page must refresh deterministic recommendations and avoid repeated recommendation categories");
}
if (!page.includes("storedRecommendations[0]") || !page.includes("tryAdd(storedPrimary, false)")) {
  throw new Error("Recommendation refresh must preserve the stored primary problem that the free analysis already diagnosed");
}
if (!cards.includes("무료 분석에서 이어지는 추천 TOP 3") || !cards.includes("무료 분석과 같은 계산 근거로 선정")) {
  throw new Error("Top 3 cards must explain that recommendation ranking continues the free-analysis evidence");
}
if (!cards.includes("effectiveSelectedProductId") || !cards.includes("validRecommendations[0]?.product.id ?? null") || !cards.includes("가장 먼저 확인할 분석")) {
  throw new Error("Primary recommendation detail must always be visible before the user selects another card");
}

const launchTopicIds = new Set(listTopicCatalogProducts().map((product) => product.id));
for (const id of ["career", "wealth", "relationship", "job-change", "marriage"]) {
  const product = resolveCanonicalRecommendationProduct(id);
  if (!product || !launchTopicIds.has(product.id)) throw new Error(`Approved recommendation candidate did not resolve to Launch Topic: ${id}`);
}
for (const id of ["health", "business", "social", "study", "yearly", "daeun", "health_stress:elementRelations"]) {
  if (resolveCanonicalRecommendationProduct(id)) throw new Error(`Invalid recommendation candidate became purchasable: ${id}`);
}
if (resolveCanonicalRecommendationProduct("스트레스와 회복 패턴")) {
  throw new Error("Non-canonical stress/recovery title became purchasable");
}
if (!cards.includes("getPaidAnalysisTopicConfig") || !cards.includes("decision.whatItAnalyzes") || !cards.includes("왜 지금 추천하나요?") || !cards.includes("분석을 받고 나면")) {
  throw new Error("Recommendation cards must show canonical purchase-decision context");
}
if (cards.includes("{recommendation.reasons[0]")) {
  throw new Error("Raw recommendation reason must not be rendered directly");
}
if (getProductPricing("money-leak-risk").amount !== 16900) throw new Error("Canonical recommendation pricing changed");

const candidates = (ids: string[]) => ids.map((productId, index) => ({ productId, score: ids.length - index, reasons: [], evidence: [] }));
const skipped = toCanonicalRecommendations(candidates(["career", "wealth", "health", "relationship"]));
if (skipped.map((item) => item.productId).join(",") !== "career,wealth,relationship") {
  throw new Error("Invalid candidate was not skipped while filling Top 3");
}
const deduped = toCanonicalRecommendations(candidates(["career-job-change", "job-change", "wealth", "relationship"]));
if (deduped.map((item) => item.productId).join(",") !== "career-job-change,wealth,relationship") {
  throw new Error("Alias duplicate was not removed while filling Top 3");
}

console.log("recommendation-page-regression: OK");
