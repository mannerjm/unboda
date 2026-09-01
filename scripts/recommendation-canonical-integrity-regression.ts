import {
  buildAnalysisProductRecommendations,
  buildTopicAwareRecommendations,
  type AnalysisProductRecommendationInput,
} from "../app/lib/analysisProductRecommendations";
import {
  PREMIUM_PRODUCT_LOOKUP,
  getCanonicalPremiumProductId,
  getPremiumProduct,
} from "../app/lib/premiumProductRegistry";
import { resolveLaunchPurchasableProduct } from "../app/lib/purchases/products";
import { getSaju } from "../app/lib/manse";
import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";
import type { ElementAnalysis } from "../app/lib/elements";
import type { ElementRelationsAnalysis } from "../app/lib/elementRelations";
import type { FortuneBrainResult } from "../app/lib/fortuneBrain";
import type { StrengthAnalysis } from "../app/lib/strength";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// IDs the legacy fallback used to score; none of them exist in the registry.
const DEAD_PRODUCT_IDS = [
  "business",
  "social",
  "marriage",
  "study",
  "job-change",
  "yearly",
  "daeun",
] as const;

for (const deadProductId of DEAD_PRODUCT_IDS) {
  assert(
    getPremiumProduct(deadProductId) === undefined,
    `"${deadProductId}" must remain absent from the premium registry`,
  );
}

const fortuneBrain: FortuneBrainResult = {
  structure: "회귀 테스트용 사주 구조",
  strengths: [],
  weaknesses: [],
  recommendations: [],
  summary: "회귀 테스트용 종합 요약",
};

const emptyElementRelations: ElementRelationsAnalysis = {
  relations: [],
  highlights: [],
  summary: "회귀 테스트용 오행 관계 요약",
};

const emptyElementAnalysis: ElementAnalysis = {
  counts: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
  percentages: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
  total: 0,
  strongest: [],
  weakest: [],
};

function createInput(
  overrides: Partial<AnalysisProductRecommendationInput> & {
    strengthLevel: string;
  },
): AnalysisProductRecommendationInput {
  return {
    strengthAnalysis: { level: overrides.strengthLevel } as StrengthAnalysis,
    fortuneBrain,
    elementRelations: overrides.elementRelations ?? emptyElementRelations,
    fortuneFlow: overrides.fortuneFlow ?? null,
    elementAnalysis: overrides.elementAnalysis ?? emptyElementAnalysis,
  };
}

type Scenario = {
  label: string;
  input: AnalysisProductRecommendationInput;
  expectsFallback: boolean;
};

const scenarios: Scenario[] = [
  // No signal at all -> topic-aware yields nothing -> legacy fallback path.
  {
    label: "중화-no-signal (legacy fallback)",
    input: createInput({ strengthLevel: "중화" }),
    expectsFallback: true,
  },
  {
    label: "매우 신강-no-element-signal (legacy fallback rules with business)",
    input: createInput({ strengthLevel: "매우 신강" }),
    expectsFallback: false,
  },
  {
    label: "매우 신약-no-element-signal",
    input: createInput({ strengthLevel: "매우 신약" }),
    expectsFallback: true,
  },
  {
    label: "신강-with-opportunity-flow",
    input: createInput({
      strengthLevel: "신강",
      fortuneFlow: {
        currentFlow: "기회 우세",
        relations: [{ type: "충" }],
      } as unknown as AnalysisProductRecommendationInput["fortuneFlow"],
      elementAnalysis: {
        ...emptyElementAnalysis,
        strongest: ["목"],
        weakest: ["금"],
      },
    }),
    expectsFallback: false,
  },
  {
    label: "신약-with-control-relation",
    input: createInput({
      strengthLevel: "신약",
      elementRelations: {
        ...emptyElementRelations,
        highlights: [{ type: "극함", strength: "강함" }],
      } as ElementRelationsAnalysis,
    }),
    expectsFallback: true,
  },
];

let observedDiverseTopicAwareResult = false;
let observedDuplicateCategoryFallback = false;

for (const birthDate of ["1995-05-20", "1990-01-01", "1988-10-10", "1986-03-15"]) {
  const premiumAnalysis = buildPremiumAnalysis(
    getSaju(birthDate, "09:00", "양력", "평달", "남성"),
  );

  scenarios.push({
    label: `real-saju ${birthDate}`,
    input: {
      strengthAnalysis: premiumAnalysis.strengthAnalysis,
      fortuneBrain: premiumAnalysis.fortuneBrain,
      elementRelations: premiumAnalysis.elementRelations,
      fortuneFlow: premiumAnalysis.fortuneFlowAnalysis,
      elementAnalysis: premiumAnalysis.elementAnalysis,
    },
    expectsFallback: false,
  });
}

for (const scenario of scenarios) {
  const result = buildAnalysisProductRecommendations(scenario.input);
  const productIds = result.recommendations.map((item) => item.productId);

  // ① exactly three recommendations in every signal/fallback situation
  assert(
    result.recommendations.length === 3,
    `${scenario.label}: expected exactly 3 recommendations, got ${result.recommendations.length}`,
  );

  assert(
    new Set(productIds).size === 3,
    `${scenario.label}: recommendations must not repeat a productId (${productIds.join(",")})`,
  );

  for (const productId of productIds) {
    // ② every recommended id resolves in the canonical registry
    assert(
      getPremiumProduct(productId) !== undefined,
      `${scenario.label}: "${productId}" is not a canonical premium product`,
    );

    // ③ no dead id survives to the engine output
    assert(
      !(DEAD_PRODUCT_IDS as readonly string[]).includes(productId),
      `${scenario.label}: dead product id "${productId}" leaked into recommendations`,
    );

    assert(
      getCanonicalPremiumProductId(productId) === productId,
      `${scenario.label}: "${productId}" must already be the canonical id`,
    );

    // ⑤ fresh recommendations are valid new-sale products.
    const purchasable = resolveLaunchPurchasableProduct(productId);
    assert(
      purchasable.ok && purchasable.productId === productId,
      `${scenario.label}: "${productId}" is not resolvable at checkout`,
    );
  }

  // engineResult must mirror the canonical recommendations 1:1
  assert(Boolean(result.engineResult), `${scenario.label}: engineResult is missing`);
  const themes = [
    result.engineResult!.primary.theme,
    ...result.engineResult!.secondary.map((item) => item.theme),
  ];
  assert(
    themes.length === 3 && themes.every((theme, index) => theme === productIds[index]),
    `${scenario.label}: engineResult themes must match the canonical recommendation order`,
  );

  const topicAware = buildTopicAwareRecommendations(scenario.input);
  const usedFallback = topicAware.recommendations.length < 3;
  assert(
    usedFallback === scenario.expectsFallback,
    `${scenario.label}: expected fallback=${scenario.expectsFallback}, got ${usedFallback}`,
  );

  const repeated = buildAnalysisProductRecommendations(scenario.input);
  assert(
    repeated.recommendations.map((item) => item.productId).join(",") === productIds.join(","),
    `${scenario.label}: fresh recommendation ordering must be deterministic`,
  );

  if (!usedFallback) {
    // ④ the topic-aware path must not be reordered or rewritten
    const topicIds = topicAware.recommendations.map((item) => item.productId);
    assert(
      topicIds.every((topicId, index) => topicId === productIds[index]),
      `${scenario.label}: topic-aware ranking changed (${topicIds.join(",")} vs ${productIds.join(",")})`,
    );

    // ⑥ diversity is preferred, but ranked fallback may repeat a category.
    const categories = productIds.map(
      (productId) => PREMIUM_PRODUCT_LOOKUP[productId]?.category,
    );
    if (new Set(categories).size === categories.length) {
      observedDiverseTopicAwareResult = true;
    } else {
      observedDuplicateCategoryFallback = true;
    }

  }

  console.log(`${scenario.label}: ${productIds.join(", ")}`);
}

assert(observedDiverseTopicAwareResult, "at least one fixture must prove diversity-first selection");
assert(observedDuplicateCategoryFallback, "a ranked fallback fixture must permit a duplicate category");

console.log("\nrecommendation canonical integrity regression passed ✓");
