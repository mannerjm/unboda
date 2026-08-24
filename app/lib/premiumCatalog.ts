import {
  PERIOD_PREMIUM_PRODUCTS,
  PREMIUM_PRODUCT_REGISTRY,
  TOPIC_PREMIUM_PRODUCTS,
  getPremiumCategoryLabel,
  type PremiumProductCategory,
  type PremiumProductDefinition,
} from "./premiumProductRegistry";
import { getLaunchProductIds } from "./paidAnalysisTopicConfig";

export type PremiumCatalogCategoryGroup = {
  category: PremiumProductCategory;
  label: string;
  products: readonly PremiumProductDefinition[];
};

/**
 * Sales-facing catalog exposure is intentionally a subset of the full product
 * registry: only productIds returned by getLaunchProductIds() are for sale.
 * Adding rows to ANALYSIS_TOPICS/PERIOD_ANALYSIS_PRODUCTS must never widen the
 * catalog on its own; getLaunchProductIds() is the only switch for that.
 */
function getLaunchProductIdSet(): ReadonlySet<string> {
  return new Set(getLaunchProductIds());
}

/** Topic products in registry order, restricted to the Launch catalog. */
export function listTopicCatalogProducts(): readonly PremiumProductDefinition[] {
  const launchIds = getLaunchProductIdSet();

  const taxonomyTopics = TOPIC_PREMIUM_PRODUCTS.filter(
    (product) => product.kind === "TOPIC" && launchIds.has(product.id),
  );

  // The 3 legacy V1 general topics (career/wealth/relationship) are Launch
  // products but live outside ANALYSIS_TOPICS, in the legacy registry.
  const legacyTopics = Object.values(PREMIUM_PRODUCT_REGISTRY).filter(
    (product) => product.kind === "TOPIC" && launchIds.has(product.id),
  );

  return [...taxonomyTopics, ...legacyTopics];
}

/** Period products in registry order, restricted to the Launch catalog. */
export function listPeriodCatalogProducts(): readonly PremiumProductDefinition[] {
  const launchIds = getLaunchProductIdSet();

  return PERIOD_PREMIUM_PRODUCTS.filter(
    (product) => product.kind === "PERIOD" && launchIds.has(product.id),
  );
}

/** Topic products grouped by category, preserving first-appearance category order. */
export function groupTopicCatalogProductsByCategory(): readonly PremiumCatalogCategoryGroup[] {
  const groups: PremiumCatalogCategoryGroup[] = [];

  for (const product of listTopicCatalogProducts()) {
    const group = groups.find((entry) => entry.category === product.category);

    if (group) {
      (group.products as PremiumProductDefinition[]).push(product);
      continue;
    }

    groups.push({
      category: product.category,
      label: getPremiumCategoryLabel(product.category),
      products: [product],
    });
  }

  return groups;
}
