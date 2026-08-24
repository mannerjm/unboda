import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  groupTopicCatalogProductsByCategory,
  listPeriodCatalogProducts,
  listTopicCatalogProducts,
} from "../app/lib/premiumCatalog";
import { getPremiumCategoryLabel, getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import { getProductPricing } from "../app/lib/productPricing";
import { buildAnalysisProductRecommendations } from "../app/lib/analysisProductRecommendations";
import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";
import { getSaju } from "../app/lib/manse";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const resultPage = read("app/result/page.tsx");
const catalogSection = read("app/components/PremiumCatalogSection.tsx");
const statusRoute = read("app/api/premium-catalog/status/route.ts");

// 1. existing AI recommendation block stays untouched
assert(
  resultPage.includes("RECOMMENDED ANALYSIS")
    && resultPage.includes("추천되는 심층 분석")
    && resultPage.includes('"1순위 추천"')
    && resultPage.includes("displayedPaidAnalysisProducts.map"),
  "result page must keep the existing AI TOP3 recommendation block",
);
assert(
  !resultPage.includes("buildAnalysisProductRecommendations")
    && !resultPage.includes("buildTopicAwareRecommendations"),
  "result page must never recompute recommendations",
);
assert(
  resultPage.includes("<PremiumCatalogSection")
    && resultPage.includes("profileId={currentProfileId}")
    && resultPage.includes("recommendedProductIds={displayedPaidAnalysisProducts.map((product) => product.id)}"),
  "result page must mount the catalog section below the recommendation block",
);
assert(
  resultPage.indexOf("RECOMMENDED ANALYSIS") < resultPage.indexOf("<PremiumCatalogSection"),
  "the catalog section must render after the recommendation block",
);

// 2 & 3. recommendations stay exactly three and TOPIC-only
const periodProducts = listPeriodCatalogProducts();
const periodIds = periodProducts.map((product) => product.id);
const periodIdSet = new Set(periodIds);

for (const birthDate of ["1995-05-20", "1990-01-01", "1988-10-10", "1986-03-15"]) {
  const premiumAnalysis = buildPremiumAnalysis(
    getSaju(birthDate, "09:00", "양력", "평달", "남성"),
  );
  const result = buildAnalysisProductRecommendations({
    strengthAnalysis: premiumAnalysis.strengthAnalysis,
    fortuneBrain: premiumAnalysis.fortuneBrain,
    elementRelations: premiumAnalysis.elementRelations,
    fortuneFlow: premiumAnalysis.fortuneFlowAnalysis,
    elementAnalysis: premiumAnalysis.elementAnalysis,
  });

  assert(result.recommendations.length === 3, `${birthDate}: TOP3 must stay exactly 3`);
  assert(
    result.recommendations.every((item) => !periodIdSet.has(item.productId)),
    `${birthDate}: PERIOD products must never appear in TOP3`,
  );
}

// 4 & 5. topic catalog exposure must equal the Launch set exactly (sales scope,
// not the full ANALYSIS_TOPICS/legacy taxonomy which stays available for later use).
const launchIds = getLaunchProductIds();
const launchIdSet = new Set(launchIds);
assert(launchIdSet.size === launchIds.length, "getLaunchProductIds() must not contain duplicates");

const topicProducts = listTopicCatalogProducts();
const catalogIds = [...topicProducts, ...periodProducts].map((product) => product.id);

assert(
  new Set(catalogIds).size === catalogIds.length,
  `catalog productIds must be unique, got ${catalogIds.length} entries / ${new Set(catalogIds).size} unique`,
);

const catalogIdSet = new Set(catalogIds);
const catalogMinusLaunch = catalogIds.filter((id) => !launchIdSet.has(id));
const launchMinusCatalog = launchIds.filter((id) => !catalogIdSet.has(id));
assert(
  catalogMinusLaunch.length === 0,
  `catalog exposes productIds outside the Launch set: ${catalogMinusLaunch.join(", ")}`,
);
assert(
  launchMinusCatalog.length === 0,
  `Launch productIds are missing from the catalog: ${launchMinusCatalog.join(", ")}`,
);

const topicGroups = groupTopicCatalogProductsByCategory();
assert(
  new Set(topicGroups.map((group) => group.category)).size === topicGroups.length,
  "topic grouping must not repeat a category",
);
assert(
  topicGroups.every((group) => group.label === getPremiumCategoryLabel(group.category)),
  "every group label must come from getPremiumCategoryLabel, not a hardcoded string",
);
assert(
  topicGroups.reduce((total, group) => total + group.products.length, 0) === topicProducts.length,
  "TOPIC category grouping must cover every exposed TOPIC product exactly once",
);
assert(
  catalogSection.includes("groupTopicCatalogProductsByCategory")
    && catalogSection.includes("setSelectedCategory")
    && catalogSection.includes("activeGroup"),
  "the catalog must render topics per selected category instead of a flat list",
);
assert(
  !catalogSection.includes("listTopicCatalogProducts()"),
  "the catalog must not flatten all topics into a single list",
);

// 6 & 7. period exposure: Launch-only, monthly-12months (dormant/non-launch) excluded
assert(
  !periodIds.includes("monthly-12months"),
  "monthly-12months is not a Launch product and must stay out of the sales catalog",
);
assert(
  periodIds.every((id) => launchIdSet.has(id)),
  `every exposed PERIOD product must be part of the Launch set, got ${periodIds.join(",")}`,
);
assert(
  catalogSection.includes("listPeriodCatalogProducts")
    && catalogSection.includes("기간별 심층 분석")
    && catalogSection.includes("periodProducts.map"),
  "the catalog must render the period products in their own grid",
);

// 7b. career/wealth/relationship (Launch legacy generals) must be exposed;
// health (legacy, non-Launch) must stay absent.
for (const legacyLaunchId of ["career", "wealth", "relationship"]) {
  assert(
    catalogIdSet.has(legacyLaunchId),
    `Launch legacy general "${legacyLaunchId}" must be exposed in the sales catalog`,
  );
}
assert(
  !catalogIdSet.has("health"),
  "legacy general \"health\" is not part of the Launch set and must stay out of the sales catalog",
);

// 8. every catalog productId is canonical
for (const product of [...topicProducts, ...periodProducts]) {
  const resolved = getPremiumProduct(product.id);
  assert(resolved !== undefined, `catalog product "${product.id}" must exist in the registry`);
  assert(resolved!.id === product.id, `catalog product "${product.id}" must be canonical`);
}

// 9. pricing comes from the pricing module, never hardcoded
assert(
  catalogSection.includes("getProductPricing(productId)"),
  "the catalog must read prices from getProductPricing",
);
assert(
  !/9[,.]?900/.test(catalogSection),
  "the catalog must not hardcode a price value",
);
assert(
  getProductPricing("annual-3years").amount === 9900,
  "pricing contract must stay 9900",
);

// 10 ~ 14. state → action contract
assert(
  catalogSection.includes('not_purchased: "구매하기"')
    && catalogSection.includes('completed: "리포트 보기"')
    && catalogSection.includes('none: "심층 분석 생성하기"')
    && catalogSection.includes('generating: "생성 중"')
    && catalogSection.includes('failed: "다시 생성하기"'),
  "the catalog must map every purchase state to its action label",
);
assert(
  catalogSection.includes('state === "not_purchased"')
    && catalogSection.includes("`/checkout/${productId}`")
    && catalogSection.includes("`/paid-analysis/${productId}/report`"),
  "not-purchased must route to checkout and purchased states to the report entry",
);
assert(
  catalogSection.includes('state === "generating"')
    && catalogSection.includes("disabled"),
  "generating must render a disabled action",
);
assert(
  catalogSection.includes('map.set(summary.productId, summary.reportStatus as CatalogProductState)'),
  "purchase state must be derived from the server summary, not recomputed client-side",
);

// 15. profileId propagation
assert(
  catalogSection.includes("`${path}?profileId=${profileId}`")
    && catalogSection.includes("withProfile(`/checkout/${productId}`, profileId)")
    && catalogSection.includes("withProfile(`/paid-analysis/${productId}/report`, profileId)"),
  "every catalog link must carry the current profileId",
);
assert(
  catalogSection.includes("summary.profileId !== profileId"),
  "catalog state must be scoped to the current profile",
);

// 16. recommended products stay in the catalog with a badge only
assert(
  catalogSection.includes("recommendedIdSet")
    && catalogSection.includes("AI 추천")
    && !catalogSection.includes("filter((product) => !recommended"),
  "recommended products must stay in the catalog and only receive a badge",
);
assert(
  !catalogSection.includes("recommendedProductIds.indexOf")
    && !catalogSection.includes("sort("),
  "recommendation ranking must not drive catalog ordering",
);

// 17. one batched request, no per-product query
const fetchCalls = catalogSection.match(/fetch\(/g) ?? [];
assert(
  fetchCalls.length === 1 && catalogSection.includes('fetch("/api/premium-catalog/status")'),
  `the catalog must issue exactly one status request, found ${fetchCalls.length}`,
);
assert(
  statusRoute.includes("listUserPaidAnalysisSummaries(user.id)"),
  "the status route must reuse the existing batched server source of truth",
);
assert(
  !statusRoute.includes("hasActiveEntitlementForProfile")
    && !statusRoute.includes("getPaidReport(")
    && !catalogSection.includes("hasActiveEntitlementForProfile"),
  "per-product entitlement/report lookups are forbidden",
);
const reportsServer = read("app/lib/paidReports/server.ts");
assert(
  reportsServer.includes("listUserEntitlements(userId)")
    && reportsServer.includes("listUserPaidReports(userId)"),
  "listUserPaidAnalysisSummaries must stay a two-query batch",
);

// 18. existing free-analysis restore path untouched
assert(
  resultPage.includes("fetch(`/api/free-analysis/${currentProfileId}`)")
    && resultPage.includes("setProductRecommendations(saved.productRecommendations)"),
  "the free-analysis restore contract must stay unchanged",
);

console.log(`topics=${topicProducts.length} categories=${topicGroups.length} periods=${periodIds.length}`);
console.log(`categories: ${topicGroups.map((group) => `${group.label}(${group.products.length})`).join(" ")}`);
console.log("\nresult premium catalog UI regression passed ✓");
