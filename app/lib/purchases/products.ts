import {
  getCanonicalPremiumProductId,
  getPremiumProduct,
} from "../premiumProductRegistry";
import {
  getProductPricing,
  type PricingFamily,
  type ProductPricingSource,
} from "../productPricing";
import { getLaunchProductIds } from "../paidAnalysisTopicConfig";

export type PurchasableProductResolution =
  | {
      ok: true;
      productId: string;
      family: PricingFamily;
      amount: number;
      currency: "KRW";
      source: ProductPricingSource;
      entryExperimentEligible: boolean;
    }
  | {
      ok: false;
      reason: "missing" | "unknown_product";
    };

export type LaunchPurchasableProductResolution =
  | PurchasableProductResolution & { ok: true }
  | {
      ok: false;
      reason: "missing" | "unknown_product" | "not_for_sale";
    };

/**
 * Normalizes an untrusted productId to its canonical registry ID and resolves
 * the server-side price. The registry stays the single source of truth; this
 * helper never invents IDs or accepts a client-supplied amount.
 */
export function resolvePurchasableProduct(
  rawProductId: unknown,
): PurchasableProductResolution {
  if (typeof rawProductId !== "string" || rawProductId.trim().length === 0) {
    return { ok: false, reason: "missing" };
  }

  const canonicalProductId = getCanonicalPremiumProductId(rawProductId.trim());

  if (!getPremiumProduct(canonicalProductId)) {
    return { ok: false, reason: "unknown_product" };
  }

  return {
    ok: true,
    ...getProductPricing(canonicalProductId),
  };
}

/**
 * Resolves a product for a new sale. Historical order, entitlement, and report
 * paths must continue using resolvePurchasableProduct instead.
 */
export function resolveLaunchPurchasableProduct(
  rawProductId: unknown,
): LaunchPurchasableProductResolution {
  const resolved = resolvePurchasableProduct(rawProductId);

  if (!resolved.ok) {
    return resolved;
  }

  if (!getLaunchProductIds().includes(resolved.productId)) {
    return { ok: false, reason: "not_for_sale" };
  }

  return resolved;
}

/** Returns the canonical productId, or null when it is not a real product. */
export function normalizePurchasableProductId(
  rawProductId: unknown,
): string | null {
  const resolved = resolvePurchasableProduct(rawProductId);

  return resolved.ok ? resolved.productId : null;
}
