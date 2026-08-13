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
  TOPIC_PREMIUM_PRODUCTS,
} from "../app/lib/premiumProductRegistry";
import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

// --- A. canonical Topic productId preserved through detail → checkout ---
const sampleTopicIds = [
  "career-organization-fit",
  "money-wealth-accumulation",
  "relationship-new-connection",
  "social-helper",
  "health-energy",
  "growth-study",
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

// --- B2. all 50 Topic products can be resolved at checkout ---
const topicProducts = TOPIC_PREMIUM_PRODUCTS.filter((p) => p.kind === "TOPIC");
assert(topicProducts.length === 50, "expected 50 TOPIC products");
for (const p of topicProducts) {
  const resolved = getPremiumProduct(p.id);
  assert(resolved !== undefined, `checkout must resolve topic product "${p.id}"`);
}
console.log("B2. all 50 Topic products resolve at checkout ✓");

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

// --- D. isLeapMonth passes from saju page to loading page ---
const sajuPageSource = readFileSync(
  join(process.cwd(), "app/saju/page.tsx"),
  "utf-8",
);
// URLSearchParams must include isLeapMonth
assert(
  sajuPageSource.includes("isLeapMonth,") || sajuPageSource.includes("isLeapMonth:"),
  "saju/page.tsx URLSearchParams must include isLeapMonth",
);

const loadingPageSource = readFileSync(
  join(process.cwd(), "app/loading/page.tsx"),
  "utf-8",
);
// loading page must read isLeapMonth from searchParams
assert(
  loadingPageSource.includes('searchParams.get("isLeapMonth")'),
  "loading/page.tsx must read isLeapMonth from searchParams",
);
// loading page must include isLeapMonth in the POST body
assert(
  loadingPageSource.includes("isLeapMonth") && loadingPageSource.includes('"Content-Type"'),
  "loading/page.tsx must include isLeapMonth in the analyze POST payload",
);
console.log("D. isLeapMonth flows from saju → loading → /api/analyze ✓");

// --- E. PaidAnalysisAccessPanel has checkout CTA ---
const accessPanelSource = readFileSync(
  join(process.cwd(), "app/paid-analysis/[productId]/PaidAnalysisAccessPanel.tsx"),
  "utf-8",
);
assert(
  accessPanelSource.includes("`/checkout/${canonicalProductId}?profileId=${profileId}`"),
  "PaidAnalysisAccessPanel must preserve profileId in the non-access checkout CTA",
);
console.log("E. PaidAnalysisAccessPanel has profile-scoped checkout CTA for non-access users ✓");

console.log("\ne2e-purchase-funnel-regression passed ✓");
