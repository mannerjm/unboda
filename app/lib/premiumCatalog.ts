import {
  PERIOD_PREMIUM_PRODUCTS,
  TOPIC_PREMIUM_PRODUCTS,
  getPremiumCategoryLabel,
  type PremiumProductCategory,
  type PremiumProductDefinition,
} from "./premiumProductRegistry";

export type PremiumCatalogCategoryGroup = {
  category: PremiumProductCategory;
  label: string;
  products: readonly PremiumProductDefinition[];
};

/** Topic products in registry order. */
export function listTopicCatalogProducts(): readonly PremiumProductDefinition[] {
  return TOPIC_PREMIUM_PRODUCTS.filter((product) => product.kind === "TOPIC");
}

/** Period products in registry order; kept separate from topics on purpose. */
export function listPeriodCatalogProducts(): readonly PremiumProductDefinition[] {
  return PERIOD_PREMIUM_PRODUCTS.filter((product) => product.kind === "PERIOD");
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
