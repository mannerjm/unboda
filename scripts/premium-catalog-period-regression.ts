import {
  ALL_PREMIUM_PRODUCTS,
  PERIOD_PREMIUM_PRODUCTS,
  PREMIUM_PRODUCT_REGISTRY,
  TOPIC_PREMIUM_PRODUCTS,
  getPremiumProduct,
} from "../app/lib/premiumProductRegistry";
import {
  PERIOD_ANALYSIS_PRODUCTS,
  type PeriodAnalysisProductType,
} from "../app/lib/analysisPeriodProducts";
import { ANALYSIS_TOPICS } from "../app/lib/analysisTopics";
import {
  groupTopicCatalogProductsByCategory,
  listPeriodCatalogProducts,
  listTopicCatalogProducts,
} from "../app/lib/premiumCatalog";
import { resolvePurchasableProduct } from "../app/lib/purchases/products";
import { getProductPricing } from "../app/lib/productPricing";
import { buildAnalysisProductRecommendations } from "../app/lib/analysisProductRecommendations";
import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";
import { getSaju } from "../app/lib/manse";
import type { StrengthAnalysis } from "../app/lib/strength";
import type { FortuneBrainResult } from "../app/lib/fortuneBrain";
import type { ElementRelationsAnalysis } from "../app/lib/elementRelations";
import type { ElementAnalysis } from "../app/lib/elements";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// --- catalog counts ---
const legacyCount = Object.keys(PREMIUM_PRODUCT_REGISTRY).length;
assert(legacyCount === 4, `legacy V1 product count must stay 4, got ${legacyCount}`);
assert(TOPIC_PREMIUM_PRODUCTS.length === 50, `TOPIC must stay 50, got ${TOPIC_PREMIUM_PRODUCTS.length}`);
assert(PERIOD_PREMIUM_PRODUCTS.length === 8, `PERIOD must be 8, got ${PERIOD_PREMIUM_PRODUCTS.length}`);
assert(
  ALL_PREMIUM_PRODUCTS.length === legacyCount + 50 + 8,
  `ALL_PREMIUM_PRODUCTS must be ${legacyCount + 58}, got ${ALL_PREMIUM_PRODUCTS.length}`,
);
assert(
  new Set(ALL_PREMIUM_PRODUCTS.map((product) => product.id)).size === ALL_PREMIUM_PRODUCTS.length,
  "ALL_PREMIUM_PRODUCTS must not contain duplicate productIds",
);
console.log(`counts: legacy=${legacyCount} topic=50 period=8 all=${ALL_PREMIUM_PRODUCTS.length}`);

// --- TOPIC 50 must stay byte-identical to the topic taxonomy, in order ---
assert(
  TOPIC_PREMIUM_PRODUCTS.length === ANALYSIS_TOPICS.length
    && TOPIC_PREMIUM_PRODUCTS.every((product, index) => product.id === ANALYSIS_TOPICS[index].id),
  "TOPIC product ids and order must mirror ANALYSIS_TOPICS exactly",
);
assert(
  TOPIC_PREMIUM_PRODUCTS.every((product) => product.kind === "TOPIC" && product.periodType === undefined),
  "TOPIC products must stay kind=TOPIC without a periodType",
);

// --- PERIOD 8 canonical contract ---
const EXPECTED_PERIOD_PRODUCTS: ReadonlyArray<{
  id: string;
  title: string;
  type: PeriodAnalysisProductType;
}> = [
  { id: "monthly-current", title: "이번달 운", type: "monthly" },
  { id: "monthly-next", title: "다음달 운", type: "monthly" },
  { id: "annual-current", title: "올해 운", type: "yearly" },
  { id: "annual-next", title: "내년 운", type: "yearly" },
  { id: "annual-3years", title: "향후 3년 운", type: "yearly-series" },
  { id: "monthly-12months", title: "앞으로 12개월", type: "monthly-series" },
  { id: "daeun-current", title: "대운 · 10년 흐름", type: "daeun" },
  { id: "lifetime-overview", title: "평생운", type: "lifetime" },
];

assert(
  PERIOD_ANALYSIS_PRODUCTS.length === EXPECTED_PERIOD_PRODUCTS.length,
  "PERIOD definition count drifted from the confirmed catalog",
);

// Pre-existing ids are part of the purchase/entitlement/report contract.
const FROZEN_PERIOD_PRODUCT_IDS = [
  "monthly-current",
  "monthly-next",
  "annual-current",
  "annual-next",
  "monthly-12months",
] as const;

const NEW_PERIOD_PRODUCT_IDS = [
  "annual-3years",
  "daeun-current",
  "lifetime-overview",
] as const;

for (const frozenId of FROZEN_PERIOD_PRODUCT_IDS) {
  assert(
    PERIOD_PREMIUM_PRODUCTS.some((product) => product.id === frozenId),
    `existing PERIOD productId "${frozenId}" must never be renamed or removed`,
  );
}

for (const newId of NEW_PERIOD_PRODUCT_IDS) {
  assert(
    getPremiumProduct(newId) !== undefined,
    `new PERIOD productId "${newId}" must exist as a canonical product`,
  );
}

// The legacy fallback themes must not be recycled as PERIOD product ids.
for (const legacyThemeId of ["yearly", "daeun"]) {
  assert(
    !PERIOD_PREMIUM_PRODUCTS.some((product) => product.id === legacyThemeId),
    `legacy fallback theme "${legacyThemeId}" must not be used as a PERIOD productId`,
  );
  assert(
    getPremiumProduct(legacyThemeId) === undefined,
    `legacy fallback theme "${legacyThemeId}" must stay absent from the registry`,
  );
}

const periodIds = PERIOD_PREMIUM_PRODUCTS.map((product) => product.id);
assert(
  new Set(periodIds).size === periodIds.length,
  "PERIOD productIds must be unique",
);

for (const [index, expected] of EXPECTED_PERIOD_PRODUCTS.entries()) {
  const definition = PERIOD_ANALYSIS_PRODUCTS[index];
  assert(
    definition.id === expected.id && definition.type === expected.type && definition.title === expected.title,
    `PERIOD definition #${index + 1} drifted: expected ${expected.id}/${expected.type}/${expected.title}`,
  );

  const product = getPremiumProduct(expected.id);
  assert(product !== undefined, `getPremiumProduct("${expected.id}") must resolve`);
  assert(product!.kind === "PERIOD", `${expected.id}: kind must be PERIOD`);
  assert(product!.category === "period", `${expected.id}: category must be period`);
  assert(product!.plugin === "FORTUNE", `${expected.id}: plugin must be FORTUNE`);
  assert(product!.releaseLevel === "V2", `${expected.id}: releaseLevel must be V2`);
  assert(product!.periodType === expected.type, `${expected.id}: periodType must be ${expected.type}`);
  assert(product!.title === expected.title, `${expected.id}: title must be ${expected.title}`);
  assert(
    product!.recommendationProfile === undefined,
    `${expected.id}: PERIOD products must not carry a recommendation profile`,
  );

  const purchasable = resolvePurchasableProduct(expected.id);
  assert(
    purchasable.ok && purchasable.productId === expected.id,
    `${expected.id}: must be resolvable at checkout`,
  );
  assert(
    getProductPricing(expected.id).amount === 9900
      && getProductPricing(expected.id).currency === "KRW",
    `${expected.id}: pricing contract must stay 9900 KRW`,
  );
}
console.log(`period: ${periodIds.join(", ")}`);

// --- catalog helper ---
assert(listTopicCatalogProducts().length === 50, "catalog topic list must expose 50 products");
assert(listPeriodCatalogProducts().length === 8, "catalog period list must expose 8 products");
assert(
  listPeriodCatalogProducts().every((product) => product.kind === "PERIOD"),
  "catalog period list must only contain PERIOD products",
);
assert(
  listTopicCatalogProducts().every((product) => product.kind === "TOPIC"),
  "catalog topic list must only contain TOPIC products",
);

const groups = groupTopicCatalogProductsByCategory();
assert(
  groups.reduce((total, group) => total + group.products.length, 0) === 50,
  "category grouping must cover all 50 topics",
);
assert(
  groups.every((group) => group.category !== "period"),
  "topic grouping must never contain the period category",
);
assert(
  new Set(groups.map((group) => group.category)).size === groups.length,
  "topic grouping must not repeat a category",
);
console.log(`catalog groups: ${groups.map((group) => `${group.label}(${group.products.length})`).join(" ")}`);

// --- recommendation must stay TOPIC-only ---
const periodIdSet = new Set(periodIds);
const recommendationInputs = [
  ...["1995-05-20", "1990-01-01", "1988-10-10", "1986-03-15"].map((birthDate) => {
    const premiumAnalysis = buildPremiumAnalysis(
      getSaju(birthDate, "09:00", "양력", "평달", "남성"),
    );

    return {
      label: `real-saju ${birthDate}`,
      input: {
        strengthAnalysis: premiumAnalysis.strengthAnalysis,
        fortuneBrain: premiumAnalysis.fortuneBrain,
        elementRelations: premiumAnalysis.elementRelations,
        fortuneFlow: premiumAnalysis.fortuneFlowAnalysis,
        elementAnalysis: premiumAnalysis.elementAnalysis,
      },
    };
  }),
  ...["중화", "신강", "매우 신강", "신약", "매우 신약"].map((level) => ({
    label: `synthetic ${level}`,
    input: {
      strengthAnalysis: { level } as StrengthAnalysis,
      fortuneBrain: {
        structure: "회귀 테스트용 사주 구조",
        strengths: [],
        weaknesses: [],
        recommendations: [],
        summary: "회귀 테스트용 종합 요약",
      } as FortuneBrainResult,
      elementRelations: {
        relations: [],
        highlights: [],
        summary: "회귀 테스트용 오행 관계 요약",
      } as ElementRelationsAnalysis,
      fortuneFlow: null,
      elementAnalysis: {
        counts: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
        percentages: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
        total: 0,
        strongest: [],
        weakest: [],
      } as ElementAnalysis,
    },
  })),
];

for (const scenario of recommendationInputs) {
  const result = buildAnalysisProductRecommendations(scenario.input);
  assert(
    result.recommendations.length === 3,
    `${scenario.label}: recommendations must stay exactly 3`,
  );

  for (const recommendation of result.recommendations) {
    assert(
      !periodIdSet.has(recommendation.productId),
      `${scenario.label}: PERIOD product "${recommendation.productId}" must never be recommended`,
    );
    assert(
      getPremiumProduct(recommendation.productId)?.kind === "TOPIC"
        || Object.keys(PREMIUM_PRODUCT_REGISTRY).includes(recommendation.productId),
      `${scenario.label}: "${recommendation.productId}" must be a TOPIC or legacy V1 product`,
    );
  }
}
console.log("recommendation TOP3 stays TOPIC-only ✓");

console.log("\npremium catalog period regression passed ✓");
