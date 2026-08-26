import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import {
  getLaunchV1PricingSnapshot,
  getProductPricing,
  type PricingFamily,
} from "../app/lib/productPricing";
import { resolvePurchasableProduct } from "../app/lib/purchases/products";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const launchIds = getLaunchProductIds();
const launchIdSet = new Set(launchIds);
assert(launchIds.length === 54, `Launch V1 must contain 54 products, got ${launchIds.length}`);
assert(launchIdSet.size === launchIds.length, "Launch V1 product IDs must be unique");

const entryIds = [
  "career-job-change",
  "money-saving-discipline",
  "monthly-current",
  "monthly-next",
];
const expectedFamilies: Record<string, PricingFamily> = {
  "relationship-current": "DEEP",
  "business-startup-readiness": "DEEP",
  "business-team-management": "DEEP",
  "health-stress-regulation": "DEEP",
  "money-leak-risk": "DEEP",
  "relationship-boundary": "DEEP",
  "health-burnout-risk": "DEEP",
  "career-leadership-readiness": "DEEP",
  "annual-next": "LONG_RANGE",
  "annual-3years": "LONG_RANGE",
  "yearly-current": "LONG_RANGE",
  "daeun-current": "LONG_RANGE",
  "lifetime-overview": "SIGNATURE",
};

for (const productId of launchIds) {
  const pricing = getProductPricing(productId);
  const resolved = resolvePurchasableProduct(productId);
  assert(resolved.ok, `${productId} must resolve as purchasable`);
  assert(pricing.productId === productId, `${productId} must resolve canonically`);
  assert(pricing.currency === "KRW", `${productId} must use KRW`);
  assert([9900, 16900, 29900, 39900].includes(pricing.amount), `${productId} has invalid Launch price`);
  assert(resolved.ok && resolved.amount === pricing.amount, `${productId} server amount mismatch`);
  if (expectedFamilies[productId]) {
    assert(pricing.family === expectedFamilies[productId], `${productId} family mismatch`);
  }
}

for (const productId of entryIds) {
  const pricing = getProductPricing(productId);
  assert(pricing.family === "CORE" && pricing.amount === 9900, `${productId} Entry candidate must be CORE/9900`);
  assert(pricing.entryExperimentEligible, `${productId} must be Entry experiment eligible`);
}

const firstSnapshot = JSON.stringify(getLaunchV1PricingSnapshot());
const secondSnapshot = JSON.stringify(getLaunchV1PricingSnapshot());
assert(firstSnapshot === secondSnapshot, "Launch V1 pricing snapshot must be deterministic");

console.log(`launch-v1 pricing mapping regression passed: ${launchIds.length} products`);
