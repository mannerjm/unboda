import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getLaunchProductIds, getPaidAnalysisTopicConfig } from "../app/lib/paidAnalysisTopicConfig";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { READABLE_PAID_QUESTIONS } from "../app/lib/premiumQuestionDisplay";
import { PREMIUM_PRODUCT_PHOTOS } from "../app/lib/premiumProductPhotos";
import { getProductPricing } from "../app/lib/productPricing";
import { buildPaidAnalysisV4PreviewModel } from "../app/lib/paidAnalysisV4PreviewModel";

const launchedIds = getLaunchProductIds();
const uniqueIds = new Set(launchedIds);
assert.equal(launchedIds.length, 57, "exactly 57 launched deep-analysis products expected");
assert.equal(uniqueIds.size, 57, "duplicate launch product ID would mix records/payments");

const topicIds = launchedIds.filter((id) => !!getPaidAnalysisTopicConfig(id));
const periodIds = launchedIds.filter((id) => !getPaidAnalysisTopicConfig(id));
assert.equal(topicIds.length, 50, "50 distinct topic analyses expected");
assert.equal(periodIds.length, 7, "7 distinct period analyses expected");
assert(topicIds.includes("money-shared-finance"), "established pilot must remain in launch set");
assert.equal(launchedIds.filter((id) => id !== "money-shared-finance").length, 56);

const questions = new Set<string>();
const photoSources = new Set<string>();
const storyScopes = new Set<string>();
for (const id of launchedIds) {
  const product = getPremiumProduct(id);
  assert(product, "product definition missing: " + id);
  assert.equal(product.id, id, "canonical ID must not change: " + id);
  assert(product.title.trim().length > 1 && product.description.trim().length > 8,
    "product title or unique introduction missing: " + id);
  const question = READABLE_PAID_QUESTIONS[id];
  assert(question && question.trim().length > 10,
    "customer-friendly question missing: " + id);
  assert(!questions.has(question), "duplicate customer-facing question: " + id);
  questions.add(question);

  const photo = PREMIUM_PRODUCT_PHOTOS[id];
  assert(photo?.src && photo.alt && photo.sourcePage, "product-specific image missing: " + id);
  assert(!photoSources.has(photo.src), "two launched products reuse the same photo: " + id);
  photoSources.add(photo.src);
  if (getPaidAnalysisTopicConfig(id)) {
    const match = photo.sourcePage.match(/-(\d+)\/?$/);
    assert(photo.sourcePage.startsWith("https://www.pexels.com/photo/") && match?.[1],
      "topic photo must have its own traceable high-res Pexels original: " + id);
  } else {
    assert(photo.sourcePage.startsWith("UNBODA original")
      && photo.src.endsWith(".webp"), "period-specific original artwork must remain local: " + id);
  }

  const price = getProductPricing(id);
  assert(Number.isFinite(price.amount) && price.amount > 0, "authoritative price missing: " + id);
  const preview = buildPaidAnalysisV4PreviewModel(product);
  assert(preview && preview.cards.length === 6, "six-step preview must match paid report contract: " + id);

  const config = getPaidAnalysisTopicConfig(id);
  const focus = config?.purchaseDecision.whatItAnalyzes ?? product.purchaseDecision?.analysisScope;
  const moments = config?.purchaseDecision.recommendedFor ?? product.purchaseDecision?.recommendedFor;
  const outcomes = config?.purchaseDecision.expectedUnderstanding ?? product.purchaseDecision?.expectedUnderstanding;
  assert((focus?.length ?? 0) >= 3 && (moments?.length ?? 0) >= 3 && (outcomes?.length ?? 0) >= 3,
    "unique buyer situations/real analysis scope missing for product: " + id);
  const scope = (focus ?? []).slice(0, 3).join("|");
  assert(!storyScopes.has(scope), "duplicate first three analysis themes across products: " + id);
  storyScopes.add(scope);
}

const detail = readFileSync("app/components/CustomerFirstPremiumDetail.tsx", "utf8");
const pilot = readFileSync("app/components/MoneySharedFinancePilotDetail.tsx", "utf8");
const shared = readFileSync("app/components/PremiumProductDetail.tsx", "utf8");
const catalog = readFileSync("app/components/PremiumCatalogMarketplace.tsx", "utf8");
const checkout = readFileSync("app/checkout/[productId]/page.tsx", "utf8");
const styles = readFileSync("app/globals.css", "utf8");

assert(shared.includes('if (product.id === "money-shared-finance")')
  && shared.includes("getLaunchProductIds().includes(product.id)")
  && shared.includes("<CustomerFirstPremiumDetail")
  && shared.includes("<MoneySharedFinancePilotDetail"),
  "pilot preserved, exactly 56 remaining launch products routed to shared customer-first detail");
assert(detail.includes("config?.purchaseDecision")
  && detail.includes("period?.analysisScope")
  && detail.includes("period?.recommendedFor")
  && detail.includes("config?.actionFocus")
  && detail.includes("getCustomerStory(product)"),
  "56 details must get distinct evidence-linked copy from their own topic/period contract");
assert(!detail.includes("공동 재정") && !detail.includes("money-shared-finance"),
  "other products must never inherit pilot financial narrative");
assert(detail.includes("getReadablePaidQuestion(product.id, product.title)")
  && detail.includes("getProductPricing(product.id).amount")
  && detail.includes("getPremiumAnalysisHref(product.id, state, profileId)"),
  "one canonical question, authoritative price and state-aware route per product");
assert(detail.includes("PREMIUM_PRODUCT_PHOTOS[product.id]")
  && detail.includes("images.pexels.com/photos/")
  && detail.includes("photo.sourcePage.match")
  && detail.includes('className="object-contain"')
  && detail.includes("aspect-[4/3]")
  && detail.includes("onError={() => setPhotoFallback(true)}"),
  "every launched photo must be natural aspect, high resolution and backed by local fallback");
assert(!detail.includes("object-cover") && !detail.includes("fixed inset-x"),
  "detail images or buttons must not crop faces or obstruct customer text");
assert.equal((detail.match(/href=\{href\}/g) ?? []).length, 1,
  "one state-aware bottom purchase link per generic detail");
assert(detail.indexOf('id="customer-purchase-action"') > detail.indexOf("<ProductReviewSummary"),
  "one checkout/report entry should be at the very bottom after real reviews");
assert(!detail.includes('aria-hidden="true">→</span>'),
  "bottom purchase button must be arrow-free");
assert(!detail.includes("운보다 이용 원칙 자세히 보기")
  && !detail.includes("TrustPrinciplesCard")
  && !pilot.includes("운보다 이용 원칙 자세히 보기"),
  "hide the redundant trust accordion on all 57 premium detail pages");
assert(detail.includes("ProductReviewSummary productId={product.id} compactWhenEmpty")
  && detail.includes("saveAnalysisAction(product.id)"),
  "verified reviews and authoritative interest-saving action must remain");
for (const [source, ctaId] of [
  [detail, "customer-purchase-action"],
  [pilot, "finance-purchase-action"],
] as const) {
  const ctaIndex = source.indexOf('id="' + ctaId + '"');
  assert(ctaIndex > source.indexOf("<ProductReviewSummary"), "bottom purchase must stay after reviews: " + ctaId);
  assert.equal((source.match(/onClick=\{handleSave\}/g) ?? []).length, 1, "one save action: " + ctaId);
  assert(!source.slice(0, ctaIndex).includes("onClick={handleSave}"),
    "save interest must not appear above the final purchase section: " + ctaId);
  const bottom = source.slice(ctaIndex);
  assert(bottom.indexOf("{ACTION_LABELS[state]}") >= 0
    && bottom.indexOf("{ACTION_LABELS[state]}") < bottom.indexOf("onClick={handleSave}"),
    "outlined save must appear immediately below purchase/report button: " + ctaId);
  assert(bottom.includes("disabled={savedState || isSaving}")
    && bottom.includes("관심 분석에 저장됨")
    && bottom.includes("flex w-full min-w-0 flex-col gap-2"),
    "save control remains responsive and state-aware: " + ctaId);
}
assert(!detail.includes("requestPayment(") && !detail.includes("grantEntitlement("),
  "details must never implement financial or entitlement authority");
assert.equal((pilot.match(/href=\{href\}/g) ?? []).length, 1,
  "established pilot's sole bottom purchase entry preserved");

assert(catalog.includes("LAUNCHED_CUSTOMER_FIRST_IDS.has(selected.id)")
  && catalog.includes("!LAUNCHED_CUSTOMER_FIRST_IDS.has(selected.id)")
  && catalog.includes('LAUNCHED_CUSTOMER_FIRST_IDS.has(product.id) ? ('),
  "all 57 launch details should have no duplicate cover and 3-line list question");
assert(catalog.includes("getReadablePaidQuestion(product.id,question??product.title)"),
  "catalog title comes from same question source as detail/checkout");
assert(checkout.includes("getLaunchProductIds().includes(premiumProduct.id)")
  && checkout.includes("getReadablePaidQuestion(premiumProduct.id, premiumProduct.title)")
  && checkout.includes("{checkoutQuestion}")
  && checkout.includes(">{displayTitle}</p>"),
  "every launch checkout keeps smaller official title and larger canonical question");
assert(checkout.includes("resolveLaunchPurchasableProduct(productId)")
  && checkout.includes("productTitle: displayTitle")
  && checkout.includes("resolved.amount.toLocaleString"),
  "checkout product identity, price and purchase panel remain unchanged");
assert(styles.includes("main[data-deep-analysis-page]:has([data-premium-detail-active])")
  && styles.includes("[data-deep-analysis-discovery-banner]"),
  "selected details hide redundant discovery while catalog does not");
assert(styles.includes("@media (max-width: 1023px), (hover: none) and (pointer: coarse)")
  && styles.includes("section[data-paid-product-directory]"),
  "57-product directory remains hidden on mobile anywhere");

console.log("customer-first-57-rollout-regression: PASS (50 topic + 7 period; 57 IDs, images, prices, question labels, scopes; one checkout per detail)");
