import { listTopicCatalogProducts, listPeriodCatalogProducts } from "../app/lib/premiumCatalog";
import { getLaunchProductIds, getPaidAnalysisTopicConfig } from "../app/lib/paidAnalysisTopicConfig";
import { getProductPricing } from "../app/lib/productPricing";
import { readFileSync } from "node:fs";

const topicProducts = listTopicCatalogProducts();
const topicIds = new Set(topicProducts.map((product) => product.id));
const launchTopicIds = getLaunchProductIds().filter((productId) => topicIds.has(productId));
const configs = launchTopicIds.map((productId) => getPaidAnalysisTopicConfig(productId));

if (topicProducts.length !== 47 || launchTopicIds.length !== 47) {
  throw new Error(`Expected 47 Launch Topic products, got ${topicProducts.length}/${launchTopicIds.length}`);
}
if (new Set(topicProducts.map((product) => product.category)).size !== 7) {
  throw new Error("Expected seven Topic categories");
}
if (configs.some((config) => !config?.purchaseDecision)) {
  throw new Error("Every Launch Topic config needs purchase-decision metadata");
}
for (const config of configs) {
  const decision = config!.purchaseDecision;
  if (!decision || decision.recommendedFor.length < 2 || decision.whatItAnalyzes.length < 3 || decision.expectedUnderstanding.length < 3 || !decision.distinction || !decision.decisionQuestion) {
    throw new Error(`Incomplete Topic purchase-decision metadata: ${config?.productId}`);
  }
}

const periodIds = listPeriodCatalogProducts().map((product) => product.id);
if (periodIds.includes("monthly-12months") || periodIds.length !== 7) {
  throw new Error("Period Launch contract changed");
}
if (getProductPricing("money-leak-risk").amount !== 16900 || getProductPricing("career").amount !== 9900) {
  throw new Error("Topic pricing contract changed");
}

const topicUi = readFileSync("app/components/PremiumCatalogSection.tsx", "utf8");
const sharedDetail = readFileSync("app/components/PremiumProductDetail.tsx", "utf8");
for (const required of ["TopicDiscovery", "이 분석 시작하기"]) {
  if (!topicUi.includes(required) && !sharedDetail.includes(required)) throw new Error(`Topic decision-first UI contract missing: ${required}`);
}
for (const required of ["recommendedFor", "whatItAnalyzes", "expectedUnderstanding", "distinction", "decisionQuestion"]) {
  if (!sharedDetail.includes(required)) throw new Error(`Shared Topic decision-first UI contract missing: ${required}`);
}
if (!topicUi.includes("selectedProductId") || !topicUi.includes("분석 내용 보기")) {
  throw new Error("Topic selection must be separate from purchase action");
}
if (!topicUi.includes("const selected = selectedCategory === group.category") || !topicUi.includes("aria-pressed={selected}")) {
  throw new Error("Topic category selection must drive one semantic selected state");
}
if (!topicUi.includes('selected ? "border-[#cdbb98] bg-[#fff8eb]')) {
  throw new Error("Selected Topic category must use the warm active treatment");
}
for (const required of ["topicDecision?.decisionQuestion", "recommendedFor.slice(0, 3)", "whatItAnalyzes.slice(0, 4)", "expectedUnderstanding.slice(0, 3)", "분석을 받고 나면", "그래서 이 분석으로"]) {
  if (!sharedDetail.includes(required)) throw new Error(`Topic density contract missing: ${required}`);
}
if (!topicUi.includes('role="tablist"') || !topicUi.includes('aria-selected={mode === item}') || !topicUi.includes('mode === item ? "border-[#cdbb98] bg-[#f3e6cf]') || !topicUi.includes("CATEGORY_ICONS") || !topicUi.includes("<CatalogIcon")) {
  throw new Error("Topic/Period tabs must expose and visibly represent one active mode");
}
if (!topicUi.includes('mode === "topic" ? (') || !topicUi.includes("PeriodDiscovery") || !topicUi.includes("setMode(item)")) {
  throw new Error("Topic/Period active state must match the rendered content branch");
}

console.log("topic-purchase-decision-regression: OK");
