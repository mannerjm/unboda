import {
  groupTopicCatalogProductsByCategory,
  listTopicCatalogProducts,
} from "../app/lib/premiumCatalog";
import { getAnalysisEditionPolicy } from "../app/lib/analysisEditionPolicy";
import { getPaidAnalysisEngine } from "../app/lib/paidAnalysisEngine";
import {
  getLaunchProductIds,
  getPaidAnalysisTopicConfig,
} from "../app/lib/paidAnalysisTopicConfig";
import {
  getPaidGenerationCommercialBand,
  getPaidGenerationProductFamily,
} from "../app/lib/paidGenerationTelemetry";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "../app/lib/premiumPresentation";
import { getProductPricing } from "../app/lib/productPricing";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const activatedSocialIds = [
  "social-helper",
  "social-conflict",
  "social-network-expansion",
] as const;

const expectedSocialCatalogIds = new Set([
  "relationship-friendship",
  "relationship-family-role",
  ...activatedSocialIds,
]);

const launchIds = getLaunchProductIds();
assert(launchIds.length === 57, `launch catalog must contain 57 products, got ${launchIds.length}`);
assert(new Set(launchIds).size === 57, "launch product ids must stay unique");

const topicProducts = listTopicCatalogProducts();
assert(topicProducts.length === 50, `topic catalog must contain 50 products, got ${topicProducts.length}`);

const socialGroup = groupTopicCatalogProductsByCategory().find((group) => group.category === "social");
assert(Boolean(socialGroup), "social catalog group must exist");
const socialProducts = socialGroup?.products ?? [];
assert(socialGroup?.label === "대인관계운", "social category must remain 대인관계운");
assert(socialProducts.length === 5, `social catalog must expose 5 products, got ${socialProducts.length}`);
assert(
  socialProducts.every((product) => expectedSocialCatalogIds.has(product.id))
    && socialProducts.every((product) => product.category === "social"),
  "social catalog must expose only the approved five social products",
);
assert(
  expectedSocialCatalogIds.size === new Set(socialProducts.map((product) => product.id)).size,
  "social catalog must expose every approved social product exactly once",
);

const expectedPolicies: Record<(typeof activatedSocialIds)[number], "YEARLY" | "MONTHLY"> = {
  "social-helper": "YEARLY",
  "social-conflict": "MONTHLY",
  "social-network-expansion": "MONTHLY",
};

const expectedBands: Record<(typeof activatedSocialIds)[number], "T2_STANDARD" | "T3_DEEP"> = {
  "social-helper": "T2_STANDARD",
  "social-conflict": "T3_DEEP",
  "social-network-expansion": "T2_STANDARD",
};

for (const productId of activatedSocialIds) {
  assert(launchIds.includes(productId), `${productId} must be launch-enabled`);
  assert(getPaidAnalysisEngine(productId) === "RELATIONSHIP", `${productId} must use the RELATIONSHIP engine`);
  assert(getPaidGenerationProductFamily(productId) === "TOPIC", `${productId} must be classified as a topic`);
  assert(getPaidGenerationCommercialBand(productId) === expectedBands[productId], `${productId} must use ${expectedBands[productId]}`);
  assert(getAnalysisEditionPolicy(productId) === expectedPolicies[productId], `${productId} must use ${expectedPolicies[productId]} edition policy`);

  const pricing = getProductPricing(productId);
  assert(pricing.family === "CORE", `${productId} must remain CORE-priced at launch`);
  assert(pricing.amount === 9900, `${productId} must remain 9,900 KRW at launch`);

  const product = getPremiumProduct(productId);
  if (!product) throw new Error(`FAIL: ${productId} must exist in the premium registry`);
  assert(product.category === "social", `${productId} must remain owned by the social category`);
  assert(Boolean(product.recommendationProfile), `${productId} must retain deterministic recommendation evidence`);

  const config = getPaidAnalysisTopicConfig(productId);
  if (!config) throw new Error(`FAIL: ${productId} must have a paid topic contract`);
  assert(config.engine === "RELATIONSHIP", `${productId} topic contract must use RELATIONSHIP`);
  assert(config.analysisFocus.length === 3, `${productId} must own three focused analysis axes`);
  assert(config.requiredInsights.length === 4, `${productId} must own four required insights`);
  assert(config.evidenceFocus.length === 4, `${productId} must prioritize four evidence axes`);
  assert((config.excludedFocus?.length ?? 0) >= 3, `${productId} must have at least three sibling boundaries`);
  assert(config.actionFocus.length === 3, `${productId} must own three concrete action responsibilities`);
  assert(config.prohibitedClaims.length >= 4, `${productId} must have four or more prohibited claims`);
}

assert(
  getPremiumProductDisplayTitle("social-helper", getPremiumProduct("social-helper")!.title) === "도움 관계와 신뢰 분석",
  "social-helper must avoid exact-person '귀인' prediction wording in customer-facing copy",
);

const socialConflictQuestion = getPaidAnalysisTopicConfig("social-conflict")?.userQuestion ?? "";
const romanticConflictQuestion = getPaidAnalysisTopicConfig("relationship-conflict")?.userQuestion ?? "";
assert(socialConflictQuestion !== romanticConflictQuestion, "general social conflict must remain distinct from romantic conflict");
assert(socialConflictQuestion.includes("연애가 아닌"), "social conflict scope must explicitly exclude romantic conflict");

const networkQuestion = getPaidAnalysisTopicConfig("social-network-expansion")?.userQuestion ?? "";
const romanticConnectionQuestion = getPaidAnalysisTopicConfig("relationship-new-connection")?.userQuestion ?? "";
assert(networkQuestion !== romanticConnectionQuestion, "general network expansion must remain distinct from romantic new connection");
assert(networkQuestion.includes("인맥"), "network expansion must own general social-network scope");

const helperMetadata = [
  getPremiumProduct("social-helper")?.title,
  getPremiumProduct("social-helper")?.description,
  ...(getPremiumProduct("social-helper")?.details ?? []),
].join("\n");
for (const forbidden of ["귀인", "어떤 사람에게", "유리한 시기"]) {
  assert(!helperMetadata.includes(forbidden), `social-helper metadata must not promise ${forbidden}`);
}

const conflictMetadata = [
  getPremiumProduct("social-conflict")?.description,
  ...(getPremiumProduct("social-conflict")?.details ?? []),
].join("\n");
assert(conflictMetadata.includes("일반 대인관계"), "social-conflict metadata must own general non-romantic scope");

const networkMetadata = [
  getPremiumProduct("social-network-expansion")?.description,
  ...(getPremiumProduct("social-network-expansion")?.details ?? []),
].join("\n");
for (const forbidden of ["인연", "시기와 환경"]) {
  assert(!networkMetadata.includes(forbidden), `social-network-expansion metadata must not promise ${forbidden}`);
}

console.log("social-launch-expansion-regression passed ✓");
