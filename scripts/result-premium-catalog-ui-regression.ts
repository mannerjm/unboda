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
import { calculateSeun } from "../app/lib/seun";

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
const navigationHelper = read("app/lib/premiumAnalysisNavigation.ts");

// 1. The free result keeps only a concise conversion funnel; full recommendation
// and catalog experiences live on their dedicated routes.
assert(
  resultPage.includes("나에게 추천된 심층 분석 보기")
    && resultPage.includes("원하는 심층 분석 직접 찾기")
    && resultPage.includes("/recommendations?profileId=${currentProfileId}")
    && resultPage.includes("/deep-analysis?profileId=${currentProfileId}"),
  "result page must keep concise recommendation and discovery CTAs",
);
assert(
  !resultPage.includes("buildAnalysisProductRecommendations")
    && !resultPage.includes("buildTopicAwareRecommendations"),
  "result page must never recompute recommendations",
);
assert(!resultPage.includes("<PremiumCatalogSection\n"), "result page must not render the full catalog");
assert(!resultPage.includes('id="recommendations"'), "result page must not render the full recommendation section");
assert(!resultPage.includes("<RecommendationTop3"), "result page must not render the full recommendation component");
assert(!resultPage.includes("마이페이지에서 관리하기"), "result page must not duplicate the global mypage CTA");
assert(resultPage.includes('onClick={() => window.print()}') && resultPage.includes('border border-stone-300 bg-white px-5 py-4 font-semibold text-stone-900 transition hover:bg-stone-50'), "print utility must use neutral utility styling");
assert(
  resultPage.includes("오행 분석 결과")
    && resultPage.includes("오행 해석")
    && resultPage.includes("lg:grid-cols-[0.9fr_1.1fr]"),
  "result must merge Five Element distribution and interpretation in a desktop split region",
);
assert(!resultPage.includes("FIVE ELEMENT INTERPRETATION"), "result must not render the old separate Five Element interpretation section");
assert(
  resultPage.includes("customerStrengthSummary")
    && resultPage.includes("현재\\s+v\\d+\\s+기준으로")
    && resultPage.includes("{customerStrengthSummary}"),
  "result must remove internal version wording from the customer-facing strength summary",
);
assert(
  resultPage.includes("bg-emerald-600")
    && resultPage.includes("bg-red-500")
    && resultPage.includes("bg-amber-500")
    && resultPage.includes("bg-slate-500")
    && resultPage.includes("bg-blue-600"),
  "Five Element distribution must use explicit semantic bar colors",
);
assert(
  resultPage.includes("backgroundColor: elementBarColors[item.key]"),
  "Five Element bar fill must receive the mapped browser-visible background color",
);
assert(
  ["목: \"wood\"", "화: \"fire\"", "토: \"earth\"", "금: \"metal\"", "수: \"water\""].every((entry) => resultPage.includes(entry))
    && resultPage.includes('className="h-full rounded-full transition-all duration-500"'),
  "distribution fill must use the real Korean keys and must not include a neutral background class",
);
assert(
  resultPage.includes("elementInterpretation.items.map")
    && resultPage.includes("tintClass"),
  "all real Five Element interpretations must render in the unified region",
);
assert(!resultPage.includes("보완 우선도") && !resultPage.includes("원점수") && !resultPage.includes("균형 보정") && !resultPage.includes("조후 보정"), "result must hide raw Yongshin calibration scores");
assert(resultPage.includes("[...daeunAnalysis.daeuns]") && resultPage.includes(".reverse()"), "Daeun display order must remain unchanged");
assert(
  resultPage.includes("[...displayedSeun.items].reverse().map")
    && resultPage.includes("getFiveElementStyle(hanja[0])"),
  "Seun must reverse a display copy while preserving element-aware character styling",
);
const seunFixture = calculateSeun(2000, 2027, "갑", 10);
assert(seunFixture.items[0].year < seunFixture.items.at(-1)!.year, "Seun canonical data must remain chronological ascending");
assert(
  resultPage.includes("[...displayedSeun.items].reverse()"),
  "Seun display must place the latest generated year on the left and earliest on the right",
);
assert(
  resultPage.includes("lg:grid-cols-2")
    && resultPage.includes("신강·신약 분석")
    && resultPage.includes("용신 분석"),
  "strength and Yongshin analyses must remain in a desktop two-column row",
);
assert(
  resultPage.includes("lg:grid-cols-4")
    && resultPage.includes("오행 상생·상극 분석")
    && resultPage.indexOf("오행 상생·상극 분석") < resultPage.indexOf("신강·신약 분석"),
  "relations must be nested in the Five Element parent before the strength analysis",
);
assert(
  (resultPage.match(/elementRelations\.highlights\.map/g) ?? []).length === 1
    && resultPage.includes("relation.source")
    && resultPage.includes("relation.target"),
  "all relation data must render once in the unified Five Element region",
);
assert(resultPage.includes("sm:grid-cols-2 lg:grid-cols-3") && resultPage.includes("운보다 AI 종합 해석"), "AI interpretation must remain substantial and use a compact grid");

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
    && catalogSection.includes('type CatalogMode = "topic" | "period"')
    && catalogSection.includes('useState<CatalogMode>("topic")')
    && catalogSection.includes('item === "topic" ? "주제별 분석" : "기간별 분석"')
    && catalogSection.includes("periodProducts")
    && catalogSection.includes("PeriodDiscovery"),
  "the catalog must expose a default topic mode and a separate period mode",
);
assert(
  /mode\s*===\s*["']topic["']\s*\?[\s\S]*?PeriodDiscovery/.test(catalogSection)
    && catalogSection.includes("setMode(item)")
    && catalogSection.includes("topicGroups.map"),
  "the catalog must render Topic and Period products through separate modes",
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
  getProductPricing("annual-3years").family === "LONG_RANGE"
    && getProductPricing("annual-3years").amount === 29900,
  "annual-3years must use Launch V1 LONG_RANGE pricing",
);

// 10 ~ 14. state → action contract
assert(
  catalogSection.includes('not_purchased: "분석 내용 보기"')
    && catalogSection.includes('completed: "리포트 보기"')
    && catalogSection.includes('none: "심층 분석 생성하기"')
    && catalogSection.includes('generating: "생성 중"')
    && catalogSection.includes('failed: "다시 생성하기"'),
  "the catalog must map every purchase state to its action label",
);
assert(
  navigationHelper.includes("/checkout/${productId}")
    && navigationHelper.includes("/paid-analysis/${productId}/report")
    && catalogSection.includes("getPremiumAnalysisHref"),
  "not-purchased must route to checkout and purchased states to the report entry",
);
assert(
  catalogSection.includes('state === "generating"')
    && catalogSection.includes("ACTION_LABELS[state]")
    && catalogSection.includes("생성 중")
    && catalogSection.includes("<Link")
    && catalogSection.includes("</Link>"),
  "generating must render a disabled action branch without a report link",
);
assert(
  catalogSection.includes("toPremiumAnalysisProductState(summary.reportStatus)"),
  "purchase state must be derived from the server summary, not recomputed client-side",
);

// 15. profileId propagation
assert(
  navigationHelper.includes("encodeURIComponent(profileId)")
    && navigationHelper.includes("profileId"),
  "every catalog link must carry the current profileId",
);
assert(
  catalogSection.includes("summary.profileId === profileId"),
  "catalog state must be scoped to the current profile",
);

// 16. recommended products stay in the catalog with a badge only
assert(
  catalogSection.includes("recommendedIdSet")
    && catalogSection.includes("추천됨")
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
