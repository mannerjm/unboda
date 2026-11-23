import {
  PERIOD_PREMIUM_PRODUCTS,
  PREMIUM_PRODUCT_REGISTRY,
  TOPIC_PREMIUM_PRODUCTS,
  getPremiumCategoryLabel,
  type PremiumProductCategory,
  type PremiumProductDefinition,
} from "./premiumProductRegistry";
import { getLaunchProductIds } from "./paidAnalysisTopicConfig";
import {
  getPremiumCategoryDisplayLabel,
  presentPremiumProduct,
} from "./premiumPresentation";

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

  return [...taxonomyTopics, ...legacyTopics].map(presentPremiumProduct);
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
      label: getPremiumCategoryDisplayLabel(
        product.category,
        getPremiumCategoryLabel(product.category),
      ),
      products: [product],
    });
  }

  return groups;
}

/**
 * Resolve an incoming product deep link against the actual launch catalog.
 * An explicit productId wins over an unrelated/stale category query param.
 * This must be shared by the client catalog and navigation regression tests:
 * a valid study product must NEVER quietly land in the money category.
 */
export function resolvePremiumCatalogEntry(
  mode: "topic" | "period",
  category: string | undefined,
  productId: string | undefined,
  topicGroups: readonly PremiumCatalogCategoryGroup[] = groupTopicCatalogProductsByCategory(),
  periodProducts: readonly PremiumProductDefinition[] = listPeriodCatalogProducts(),
): { category: string | null; productId: string | null } {
  if (mode === "period") {
    return { category: null, productId: productId && periodProducts.some(p => p.id === productId) ? productId : null };
  }

  const matchedGroup = productId
    ? topicGroups.find(group => group.products.some(product => product.id === productId))
    : undefined;
  const resolvedCategory = matchedGroup?.category
    ?? (category && topicGroups.some(group => group.category === category) ? category : undefined)
    ?? topicGroups.find(group => group.category === "money")?.category
    ?? topicGroups[0]?.category
    ?? null;
  return {
    category: resolvedCategory,
    productId: matchedGroup && productId ? productId : null,
  };
}
