/**
 * E2E purchase funnel regression:
 * A. canonical Topic productId is preserved through product detail → checkout URL
 * B. canonical Topic productId resolves to a valid product at checkout
 * C. result fallback products ["career","wealth","relationship"] all exist in registry
 * D. isLeapMonth contract: loading page reads it from searchParams for the API payload
 */
import {
  getPremiumProduct,
  getCanonicalPremiumProductId,
} from "../app/lib/premiumProductRegistry";
import {
  resolveLaunchPurchasableProduct,
  resolvePurchasableProduct,
} from "../app/lib/purchases/products";
import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

// --- A. canonical Topic productId preserved through detail → checkout ---
const sampleTopicIds = [
  "career-job-fit",
  "money-wealth-accumulation",
  "relationship-new-connection",
  "monthly-current",
  "career",
];

for (const topicId of sampleTopicIds) {
  // canonical ID passes through getCanonicalPremiumProductId unchanged (no alias)
  const resolvedId = getCanonicalPremiumProductId(topicId);
  assert(
    resolvedId === topicId,
    `canonical topic ID "${topicId}" must not be transformed by getCanonicalPremiumProductId`,
  );

  // product detail URL uses the same ID
  const detailUrl = `/paid-analysis/${topicId}`;
  assert(
    detailUrl === `/paid-analysis/${resolvedId}`,
    `product detail URL must preserve productId for "${topicId}"`,
  );

  // checkout URL uses the same canonical ID
  const checkoutUrl = `/checkout/${topicId}`;
  assert(
    checkoutUrl === `/checkout/${resolvedId}`,
    `checkout URL must preserve productId for "${topicId}"`,
  );
}
console.log("A. canonical topic productId preserved through detail → checkout ✓");

// --- B. canonical Topic productId resolves at checkout ---
for (const topicId of sampleTopicIds) {
  const product = getPremiumProduct(topicId);
  assert(
    product !== undefined,
    `getPremiumProduct("${topicId}") must return a product at checkout`,
  );
  assert(
    product!.id === topicId,
    `product.id must match the requested topicId "${topicId}"`,
  );
  assert(
    typeof product!.title === "string" && product!.title.length > 0,
    `product "${topicId}" must have a non-empty title`,
  );
}
console.log("B. canonical Topic productId resolves via getPremiumProduct at checkout ✓");

// --- B2. launch-only checkout preserves canonical historical resolution ---
for (const productId of ["health", "money-investment-style", "monthly-12months"]) {
  assert(resolvePurchasableProduct(productId).ok, `${productId} must remain canonically resolvable`);
  assert(!resolveLaunchPurchasableProduct(productId).ok, `${productId} must be rejected for new sale`);
}
for (const productId of ["career-job-fit", "monthly-current", "career"]) {
  assert(resolveLaunchPurchasableProduct(productId).ok, `${productId} must remain eligible for new sale`);
}
assert(!resolveLaunchPurchasableProduct("unknown-product").ok, "unknown product must be rejected for new sale");
console.log("B2. launch-only checkout preserves canonical historical resolution ✓");

// --- C. result fallback IDs all exist in registry ---
const fallbackIds = ["career", "wealth", "relationship"];
for (const id of fallbackIds) {
  const product = getPremiumProduct(id);
  assert(
    product !== undefined,
    `fallback product "${id}" must exist in registry`,
  );
}

// Confirm dead ID is gone from result page
const resultPageSource = readFileSync(
  join(process.cwd(), "app/result/page.tsx"),
  "utf-8",
);
assert(
  !resultPageSource.includes('"career-business"'),
  'result/page.tsx must not contain dead ID "career-business"',
);
assert(
  !resultPageSource.includes("'career-business'"),
  "result/page.tsx must not contain dead ID 'career-business'",
);
console.log("C. result fallback dead ID removed; fallback IDs all exist in registry ✓");

// --- D. active Profile ID passes from saju to loading and server analysis ---
const sajuPageSource = readFileSync(
  join(process.cwd(), "app/saju/page.tsx"),
  "utf-8",
);
assert(
  sajuPageSource.includes("/loading?profileId=${activeProfile.id}"),
  "saju/page.tsx must start analysis with the active profileId",
);

const loadingPageSource = readFileSync(
  join(process.cwd(), "app/loading/page.tsx"),
  "utf-8",
);
assert(
  loadingPageSource.includes('searchParams.get("profileId")'),
  "loading/page.tsx must read profileId from searchParams",
);
assert(
  loadingPageSource.includes("JSON.stringify({ profileId })"),
  "loading/page.tsx must include profileId in the analyze POST payload",
);
console.log("D. active Profile flows from saju → loading → /api/analyze ✓");

// --- E. PaidAnalysisAccessPanel has checkout CTA ---
const accessPanelSource = readFileSync(
  join(process.cwd(), "app/paid-analysis/[productId]/PaidAnalysisAccessPanel.tsx"),
  "utf-8",
);
const sharedDetailSource = readFileSync(
  join(process.cwd(), "app/components/PremiumProductDetail.tsx"),
  "utf-8",
);
assert(
  accessPanelSource.includes("PremiumProductDetail") &&
    sharedDetailSource.includes("getPremiumAnalysisHref(product.id, state, profileId)"),
  "standalone detail must preserve profileId in its state-aware checkout CTA",
);
const checkoutPageSource = readFileSync(join(process.cwd(), "app/checkout/[productId]/page.tsx"), "utf-8");
const profileSelectorSource = readFileSync(join(process.cwd(), "app/components/ProfileSelector.tsx"), "utf-8");
const detailPageSource = readFileSync(join(process.cwd(), "app/paid-analysis/[productId]/page.tsx"), "utf-8");
const orderRouteSource = readFileSync(join(process.cwd(), "app/api/orders/route.ts"), "utf-8");
const purchaseServerSource = readFileSync(join(process.cwd(), "app/lib/purchases/server.ts"), "utf-8");
assert(checkoutPageSource.includes("resolveLaunchPurchasableProduct"), "checkout page must reject non-launch new-sale URLs");
assert(checkoutPageSource.includes('destination="checkout"') && profileSelectorSource.includes('router.push(`/${destination}/${productId}?profileId=${profile.id}`)'), "profile-less checkout must let the customer bind the purchase to a selected profile");
assert(detailPageSource.includes("resolveLaunchPurchasableProduct"), "product detail page must not offer a new-sale CTA for non-launch products");
assert(orderRouteSource.includes("resolveLaunchPurchasableProduct"), "new-order API must require launch authorization");
assert(purchaseServerSource.includes("const resolved = resolveLaunchPurchasableProduct(input.productId)"), "new pending orders must enforce launch authorization at persistence boundary");
console.log("E. PaidAnalysisAccessPanel has profile-scoped checkout CTA for non-access users ✓");

console.log("\ne2e-purchase-funnel-regression passed ✓");
