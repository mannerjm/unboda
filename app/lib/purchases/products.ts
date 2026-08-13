import {
  getCanonicalPremiumProductId,
  getPremiumProduct,
} from "../premiumProductRegistry";
import { getProductPricing } from "../productPricing";

export type PurchasableProductResolution =
  | {
      ok: true;
      productId: string;
      amount: number;
    }
  | {
      ok: false;
      reason: "missing" | "unknown_product";
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
    productId: canonicalProductId,
    amount: getProductPricing(canonicalProductId).amount,
  };
}

/** Returns the canonical productId, or null when it is not a real product. */
export function normalizePurchasableProductId(
  rawProductId: unknown,
): string | null {
  const resolved = resolvePurchasableProduct(rawProductId);

  return resolved.ok ? resolved.productId : null;
}
