import {
  getCanonicalPremiumProductId,
  getPremiumProduct,
} from "./premiumProductRegistry";
import { getLaunchProductIds } from "./paidAnalysisTopicConfig";

export type PricingFamily =
  | "CORE"
  | "DEEP"
  | "LONG_RANGE"
  | "SIGNATURE";

export type ProductPricingSource =
  | "launch-v1-explicit"
  | "launch-v1-core-fallback"
  | "registry-core-fallback";

export type ProductPricing = {
  productId: string;
  family: PricingFamily;
  amount: number;
  currency: "KRW";
  source: ProductPricingSource;
  entryExperimentEligible: boolean;
};

export const LAUNCH_V1_FAMILY_PRICES: Readonly<Record<PricingFamily, number>> = {
  CORE: 9900,
  DEEP: 16900,
  LONG_RANGE: 29900,
  SIGNATURE: 39900,
};

const LAUNCH_V1_DEEP_PRODUCTS = new Set([
  "relationship-current",
  "business-startup-readiness",
  "business-team-management",
  "health-stress-regulation",
  "money-leak-risk",
  "relationship-boundary",
  "health-burnout-risk",
  "career-leadership-readiness",
]);

const LAUNCH_V1_LONG_RANGE_PRODUCTS = new Set([
  "yearly-current",
  "annual-next",
  "annual-3years",
  "daeun-current",
]);

const LAUNCH_V1_SIGNATURE_PRODUCTS = new Set(["lifetime-overview"]);

const ENTRY_EXPERIMENT_PRODUCTS = new Set([
  "career-job-change",
  "money-saving-discipline",
  "monthly-current",
  "monthly-next",
]);

function getLaunchProductFamily(productId: string): PricingFamily {
  if (LAUNCH_V1_SIGNATURE_PRODUCTS.has(productId)) {
    return "SIGNATURE";
  }

  if (LAUNCH_V1_LONG_RANGE_PRODUCTS.has(productId)) {
    return "LONG_RANGE";
  }

  if (LAUNCH_V1_DEEP_PRODUCTS.has(productId)) {
    return "DEEP";
  }

  return "CORE";
}

export function getProductPricing(productId: string): ProductPricing {
  const canonicalProductId = getCanonicalPremiumProductId(productId);

  if (!getPremiumProduct(canonicalProductId)) {
    throw new Error(`Unknown premium product: ${productId}`);
  }

  const isLaunchProduct = getLaunchProductIds().includes(canonicalProductId);
  const family = isLaunchProduct
    ? getLaunchProductFamily(canonicalProductId)
    : "CORE";
  const entryExperimentEligible = ENTRY_EXPERIMENT_PRODUCTS.has(
    canonicalProductId,
  );

  return {
    productId: canonicalProductId,
    family,
    amount: LAUNCH_V1_FAMILY_PRICES[family],
    currency: "KRW",
    source: isLaunchProduct
      ? family === "CORE"
        ? "launch-v1-core-fallback"
        : "launch-v1-explicit"
      : "registry-core-fallback",
    entryExperimentEligible,
  };
}

export function getLaunchV1PricingSnapshot(): readonly ProductPricing[] {
  return getLaunchProductIds()
    .map((productId) => getProductPricing(productId))
    .sort((left, right) => left.productId.localeCompare(right.productId));
}