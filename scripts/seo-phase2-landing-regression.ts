import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { getPaidProductSeoGuide } from "../app/lib/paidProductSeo";

const ids = getLaunchProductIds();
assert.equal(ids.length, 57, "SEO phase 2 must cover all 57 launch products");

const titles = new Set<string>();
let topicCount = 0;
let periodCount = 0;

for (const id of ids) {
  const product = getPremiumProduct(id);
  assert(product, `Missing launch product: ${id}`);
  const guide = getPaidProductSeoGuide(product);
  assert(guide.searchTitle.trim().length > 1, `Missing SEO title: ${id}`);
  assert(guide.headline.trim().length > 1, `Missing public H1: ${id}`);
  assert(guide.description === product.description, `SEO guide must keep product meaning: ${id}`);
  assert(guide.question.trim().length > 8, `Missing product-specific search question: ${id}`);
  assert(guide.focus.length >= 2, `Insufficient product-specific focus: ${id}`);
  assert(guide.focus.every((item) => item.trim().length > 3), `Empty focus: ${id}`);
  assert(guide.distinction.trim().length > 10, `Missing scope distinction: ${id}`);
  assert(!/undefined|null/.test(JSON.stringify(guide)), `Incomplete guide: ${id}`);
  assert(!titles.has(guide.searchTitle), `Duplicate SEO title: ${guide.searchTitle}`);
  titles.add(guide.searchTitle);
  if (product.kind === "TOPIC") topicCount++;
  else periodCount++;
}

assert.equal(topicCount, 50);
assert.equal(periodCount, 7);

const route = readFileSync("app/paid-analysis/[productId]/page.tsx", "utf8");
assert(route.includes("getPaidProductSeoGuide(product)"), "Metadata must use product search intent");
assert(route.includes("title: seoGuide.searchTitle"), "SEO title must reflect search intent");
assert(route.includes('path: `/paid-analysis/${product.id}`'), "Canonical must stay query-free");
assert(route.includes("!profileId ? <PaidProductSeoIntro product={product} /> : null"),
  "Public guide must not alter the profile-scoped purchase view");
assert(route.includes("<PaidAnalysisAccessPanel productId={product.id} profileId={profileId} />"),
  "Paid access panel must remain unchanged");
assert(route.includes("isProductSaved(user.id, product.id)"), "Saved product behavior must remain");

const intro = readFileSync("app/components/PaidProductSeoIntro.tsx", "utf8");
assert(intro.includes("<h1"), "Public product guide needs an H1");
assert(intro.includes("guide.question") && intro.includes("guide.focus") && intro.includes("guide.distinction"),
  "Public page must provide useful, product-specific content");
assert(intro.includes('href="#selected-product-title"'), "Keep the original product action as CTA");
assert(intro.includes("미래의 결과나 성과를 보장하지 않습니다"), "No outcome guarantees");

console.log(`seo-phase2-landing-regression: PASS (${topicCount} topic + ${periodCount} period, ${titles.size} unique titles)`);
