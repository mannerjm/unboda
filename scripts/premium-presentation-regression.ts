import {
  groupTopicCatalogProductsByCategory,
  listTopicCatalogProducts,
} from "../app/lib/premiumCatalog";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "../app/lib/premiumPresentation";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const expectedTitles: Record<string, string> = {
  "career-workplace-relationships": "직장 협업 관계 분석",
  "relationship-current": "현재 연애 관계의 지속성과 조정",
  "relationship-conflict": "연애 갈등 패턴과 회복 방식",
  "relationship-boundary": "연애 관계의 거리 조절과 경계",
  "relationship-intimacy": "연애 관계의 친밀감 형성 속도",
};

for (const [productId, title] of Object.entries(expectedTitles)) {
  const internal = getPremiumProduct(productId);
  assert(Boolean(internal), `${productId} must remain registered`);
  assert(
    getPremiumProductDisplayTitle(productId, internal!.title) === title,
    `${productId} must use the clarified customer-facing title`,
  );
}

assert(
  getPremiumProduct("relationship-conflict")?.title === "갈등 패턴과 회복 방식",
  "presentation cleanup must not rewrite the internal registry title or prompt ownership",
);

const groups = groupTopicCatalogProductsByCategory();
assert(groups.find((group) => group.category === "growth")?.label === "학업·성장운", "growth must render as 학업·성장운");
assert(groups.find((group) => group.category === "relationship")?.label === "연애운", "relationship must render as 연애운");
assert(groups.find((group) => group.category === "social")?.label === "대인관계운", "social must remain 대인관계운");

const catalogProducts = listTopicCatalogProducts();
for (const [productId, title] of Object.entries(expectedTitles)) {
  assert(catalogProducts.find((product) => product.id === productId)?.title === title, `${productId} catalog title must be clarified`);
}

const launchIds = getLaunchProductIds();
assert(launchIds.length === 57, `launch product count must be 57, got ${launchIds.length}`);
assert(catalogProducts.length === 50, `topic catalog count must be 50, got ${catalogProducts.length}`);

console.log("premium-presentation-regression passed ✓");
