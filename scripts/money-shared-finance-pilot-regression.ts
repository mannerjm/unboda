import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shared = readFileSync("app/components/PremiumProductDetail.tsx", "utf8");
const pilot = readFileSync("app/components/MoneySharedFinancePilotDetail.tsx", "utf8");
const registry = readFileSync("app/lib/analysisTopics.ts", "utf8");
const marketplace = readFileSync("app/components/PremiumCatalogMarketplace.tsx", "utf8");
const pricing = readFileSync("app/lib/productPricing.ts", "utf8");
const previewModel = readFileSync("app/lib/paidAnalysisV4PreviewModel.ts", "utf8");
const reviews = readFileSync("app/components/ProductReviewSummary.tsx", "utf8");
const trustCard = readFileSync("app/components/TrustPrinciplesCard.tsx", "utf8");
const page = readFileSync("app/deep-analysis/page.tsx", "utf8");
const styles = readFileSync("app/globals.css", "utf8");
const directory = readFileSync("app/components/PaidProductDiscoveryLinks.tsx", "utf8");
const questionLabels = readFileSync("app/lib/premiumQuestionDisplay.ts", "utf8");
const checkoutPage = readFileSync("app/checkout/[productId]/page.tsx", "utf8");

// The pilot must be selected by exactly one canonical launched product ID.
assert(registry.includes('id: "money-shared-finance"'), "pilot product must remain in launch registry");
assert.equal((shared.match(/product\.id === "money-shared-finance"/g) ?? []).length, 1,
  "only the shared-finance product may opt in to this visual pilot");
assert(shared.includes('import MoneySharedFinancePilotDetail from "@/app/components/MoneySharedFinancePilotDetail"'),
  "shared detail must import the pilot");
assert(shared.includes('<MoneySharedFinancePilotDetail') && shared.includes('<CustomerFirstPremiumDetail')
  && shared.includes('getLaunchProductIds().includes(product.id)')
  && shared.includes('const isPeriod = product.kind === "PERIOD"'),
  "the unchanged pilot and nonlaunch fallback stay available");
assert(shared.includes('<PremiumReportValuePreview') && shared.includes('<ProductReviewSummary'),
  "ordinary product detail report preview and verified reviews must remain");

// All finance/payment and report state transitions remain in existing systems.
for (const required of [
  "getPremiumAnalysisHref(product.id, state, profileId)",
  "getProductPricing(product.id)",
  "saveAnalysisAction(product.id)",
  "buildPaidAnalysisV4PreviewModel(product)",
  "ProductReviewSummary productId={product.id} compactWhenEmpty",
  "TrustPrinciplesCard compact",
  'state === "not_purchased"',
  "STATUS_LABELS[state]",
  "ACTION_LABELS[state]",
]) {
  assert(pilot.includes(required), "pilot must preserve functional contract: " + required);
}
for (const forbidden of [
  "requestPayment(", "grantEntitlement(", "markOrderPaid(", "generatePaidReport(",
  "useSearchParams(", "window.location", "dummyReview", "fakeReview",
]) {
  assert(!pilot.includes(forbidden), "pilot must not implement or fake: " + forbidden);
}
assert(pricing.includes("9900"), "price must continue to originate from pricing registry");

for (const required of [
  "getReadablePaidQuestion(product.id, product.title)",
  "혹시 이런 고민을 해본 적 있으신가요?",
  "누가 결정하나요?",
  "언제, 누가 부담하나요?",
  "상황이 달라지면 어떻게 하나요?",
  "AI 상담은 보유한 리포트 범위와 질문권 등 별도 이용 조건",
  "금융·법률 자문을 대신하지 않습니다.",
  "심층분석 구매하기",
  "버튼을 누르면 결제 내용을 확인하는 화면으로 이동합니다.",
  "이 분석에서는 무엇을 알아볼까요?",
  "구매 후 받을 리포트의 주요 내용을 미리 살펴보세요.",
]) {
  assert(pilot.includes(required), "customer-first pilot content missing: " + required);
}

// One bottom-only state-aware purchase link: no hero CTA, fixed CTA, or duplicate entry.
assert(pilot.includes('id="finance-purchase-action"'), "the purchase action must remain in normal flow");
assert(pilot.indexOf('id="finance-purchase-action"') > pilot.indexOf('<ProductReviewSummary'),
  "the sole payment/report CTA must be after verified reviews at the end of the detail page");
assert.equal((pilot.match(/id="finance-purchase-action"/g) ?? []).length, 1,
  "no second purchase CTA container may be added");
assert(!pilot.includes("fixed inset-x") && !pilot.includes("sticky bottom-"),
  "the pilot must not cover body copy with a floating purchase bar");
assert.equal((pilot.match(/<Link\b/g) ?? []).length, 1, "pilot must expose exactly one primary CTA");
assert(!pilot.includes("내 사주로 자세히 알아보기") && !pilot.includes("다른 분석 선택"),
  "redundant hero buttons must not return");

// All launched product details omit the duplicate legacy cover strip.
assert(marketplace.includes('!LAUNCHED_CUSTOMER_FIRST_IDS.has(selected.id) ? ('),
  "pilot's redundant legacy product banner should be hidden");
assert(marketplace.includes('LAUNCHED_CUSTOMER_FIRST_IDS.has(selected.id) ? "p-0" : "p-3 sm:p-5"'),
  "pilot uses edge-to-edge hero while all other details preserve original padding");
assert(marketplace.includes("<PremiumProductDetail") && marketplace.includes("money(selected.id)"),
  "other products must retain original detail/price header and navigation");

// Hide generic discovery when any launched detail is selected.
// This must work even when selection is client-side and no productId URL param exists.
assert(page.includes("data-deep-analysis-page") && page.includes("data-deep-analysis-discovery-banner"),
  "server page should expose isolated banner target");
assert(styles.includes('main[data-deep-analysis-page]:has([data-premium-detail-active])')
  && styles.includes("[data-deep-analysis-discovery-banner]"),
  "selected details hide the redundant header, catalog keeps it");
assert(pilot.includes('data-pilot-product="money-shared-finance"'),
  "pilot needs a unique DOM scope marker");

// Actual report-generation specs and their time policy are unchanged. Only the pilot's
// marketing-facing preview is simplified (no generic annual-edition technical cards).
assert(pilot.includes("preview.cards.map(") && pilot.includes("FRIENDLY_REPORT_STEPS"),
  "simplified technical preview should track the real six-step report model");
assert(previewModel.includes("buildTopicTimeValue(policy)"),
  "the original purchased report edition policy must remain intact");
assert(!pilot.includes("<PremiumReportValuePreview"),
  "generic technical annual-edition preview must not be displayed in this pilot");
assert(!pilot.includes("연간 운세") && !pilot.includes("아래는 실제 결과가 아니라"),
  "technical/provocative copy should not reappear in the customer preview");
assert(pilot.includes("FRIENDLY_REPORT_STEPS") && pilot.includes("내 사주에서 어떤 성향을 살펴볼까요?"),
  "six preview items must use understandable questions");

// Pilot only: shrinking an empty review must never hide actual verified reviews.
assert(reviews.includes("compactWhenEmpty = false") && reviews.includes("summary.count === 0 && compactWhenEmpty"),
  "compact review behavior must be opt-in and empty-state only");
assert(reviews.includes("summary.reviews.slice(0, 4)") && reviews.includes('/api/reviews?productId='),
  "published reviews must still originate from the verified reviews API");

// Responsive/source-level guards: desktop grid only on lg, small viewport has full width
// CTA, natural document flow and no fixed purchase overlay.
assert(pilot.includes('className="flex min-h-12 w-full items-center') && pilot.includes('sm:grid-cols-[auto_minmax(0,1fr)]')
  && pilot.includes("text-[clamp(1.7rem,5.7vw,2.7rem)]")
  && pilot.includes("sm:grid-cols-2") && pilot.includes("min-w-0"),
  "pilot must keep responsive text and CTA at narrow widths");
// Same licensed Pexels source, delivered from the original-resolution CDN.
assert(pilot.includes("images.pexels.com/photos/6964105/pexels-photo-6964105.jpeg")
  && pilot.includes("photoFallback ? photo.src : originalPhotoUrl")
  && pilot.includes('className="object-contain"')
  && pilot.includes("aspect-[4/3]")
  && !pilot.includes('className="object-cover"'),
  "pilot photo must not enlarge/crop the old 330px local thumbnail");
assert(pilot.includes('onError={() => setPhotoFallback(true)}'), "CDN failure must retain local fallback");
assert(pilot.includes("🧾") && pilot.includes("💬") && pilot.includes("🔄"),
  "story section must visually distinguish the three worries without a card wall");
// Four requested polish changes apply ONLY to this single pilot product.
assert(marketplace.includes('LAUNCHED_CUSTOMER_FIRST_IDS.has(selected.id) ? (isPeriod ? "기간 선택" : "상품 목록")'),
  "all launch back buttons must omit the leading arrow");
assert(marketplace.includes('onClick={()=>onSelectProduct(null)}'),
  "product-list button must still navigate back to the catalog");
assert(marketplace.includes('<>← {isPeriod?"기간 선택":"상품 목록"}</>'),
  "other product/period detail back buttons must be unchanged");

assert(pilot.includes("<TrustPrinciplesCard compact inlineDetails />"),
  "pilot trust disclosure must expand full inline rules without another link");
assert(pilot.includes('cursor-pointer rounded-lg') && pilot.includes("운보다 이용 원칙 자세히 보기"),
  "trust summary must remain natively keyboard/mouse clickable");
assert(trustCard.includes("inlineDetails = false") && trustCard.includes("!inlineDetails ? (")
  && trustCard.includes("!compact || inlineDetails"),
  "only opted-in trust card must hide its secondary link and show explanations");
assert(trustCard.includes('href="/trust"'),
  "ordinary trust cards must keep their original navigation");

assert(reviews.includes('<Link href="/reviews" className="group flex flex-wrap items-center'),
  "the pilot's full empty-review panel must be click/tap navigable");
assert(reviews.includes("후기 확인") && !reviews.includes("후기 확인 →"),
  "the pilot review entry must not show the old arrow");
assert(reviews.includes("summary.count === 0 && compactWhenEmpty")
  && reviews.includes('summary.reviews.slice(0, 4)'),
  "verified review data display and opt-in empty state must be intact");

const purchaseArea = pilot.slice(pilot.indexOf('id="finance-purchase-action"'));
assert(purchaseArea.includes("href={href}") && purchaseArea.includes("{ACTION_LABELS[state]}"),
  "single bottom purchase must preserve correct state-specific checkout/report navigation");
assert(!purchaseArea.includes('aria-hidden="true">→</span>'),
  "the bottom purchase button must have no decorative arrow");
assert.equal((pilot.match(/href=\{href\}/g) ?? []).length, 1,
  "there must still be exactly one checkout/report navigation action");

// User-requested follow-up: the empty review's "후기 확인" is a bordered
// button-like target; the surrounding Link remains one accessible action.
assert(reviews.includes('className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[#d9cbea]'),
  "pilot review action should have the same outlined button treatment as save-interest");
assert(reviews.includes('<Link href="/reviews" className="group flex flex-wrap items-center'),
  "review panel must remain an accessible navigable link, not a nested button");
assert(!reviews.includes("후기 확인 →"),
  "pilot review action must remain arrow-free");

// All mobile catalog and detail views must hide the 57-product directory.
// Desktop public directory links stay accessible, without relying on :has(),
// user login state, client-side selection or the mobile viewport orientation.
assert(directory.includes('data-paid-product-directory')
  && directory.includes("57가지 심층 분석을 한눈에 보기"),
  "desktop public product directory and its 57 links must remain intact");
assert(styles.includes("@media (max-width: 1023px), (hover: none) and (pointer: coarse)")
  && styles.includes("section[data-paid-product-directory] {")
  && styles.includes("display: none;"),
  "the full directory must be hidden across mobile catalog/detail pages and landscape");
assert(styles.includes("section[data-paid-product-directory] {"),
  "mobile directory visibility remains independent of a selected product");
assert(page.includes("<PaidProductDiscoveryLinks />"),
  "keep server-rendered product directory for desktop users");

// Three-stage title identity. Keep official product title/ID stable while one
// customer-facing question is shared by the topic card, pilot hero, and checkout.
const pilotOfficialTitle = "공동 재정 경계 분석";
const pilotQuestion = "함께 쓰는 돈, 왜 나만 더 부담하는 것 같을까요?";
assert(registry.includes('id: "money-shared-finance", category: "money", title: "' + pilotOfficialTitle + '"'),
  "source-of-truth official product name must remain unchanged");
assert(questionLabels.includes('"money-shared-finance": "' + pilotQuestion + '"'),
  "exactly one shared readable customer question should be defined for the pilot");
assert(marketplace.includes("getReadablePaidQuestion(product.id,question??product.title)"),
  "catalog list must read the centrally defined pilot question");
assert(marketplace.includes('LAUNCHED_CUSTOMER_FIRST_IDS.has(product.id) ? (')
  && marketplace.includes('<h3 className="line-clamp-3 text-[16px] font-extrabold')
  && marketplace.includes('<h3 className="line-clamp-2 text-[16px] font-extrabold'),
  "catalog should show all launched product questions in up to 3 lines");
assert(pilot.includes('const headline = getReadablePaidQuestion(product.id, product.title)')
  && pilot.includes("{headlineLead}{headlineRest ?"),
  "pilot detail hero must share the catalog question, not duplicate hard-coded copy");
assert(checkoutPage.includes('premiumProduct && getLaunchProductIds().includes(premiumProduct.id)')
  && checkoutPage.includes('getReadablePaidQuestion(premiumProduct.id, premiumProduct.title)')
  && checkoutPage.includes("{checkoutQuestion}"),
  "all launched checkouts show the same readable question as list/detail");
assert(checkoutPage.includes("getPremiumProductDisplayTitle(premiumProduct!.id, premiumProduct!.title)")
  && checkoutPage.includes('<p className="text-sm font-bold leading-6 text-[#d6cafa]">{displayTitle}</p>')
  && checkoutPage.includes('<h1 className="mt-2 max-w-2xl break-keep text-[clamp(1.65rem,4.3vw,2.35rem)]')
  && checkoutPage.includes('{checkoutQuestion}')
  && checkoutPage.includes('productTitle: displayTitle'),
  "pilot checkout must emphasize the shared question in h1, show smaller official name and keep payment-panel product title");
assert(checkoutPage.includes('<h1 className="max-w-2xl text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl">{displayTitle}</h1>'),
  "other 56 and special product checkout hero titles must remain unchanged");
assert(checkoutPage.includes("resolved.amount.toLocaleString")
  && pilot.includes("getProductPricing(product.id).amount"),
  "both checkout and detail must still use existing authoritative pricing");
assert(checkoutPage.includes("resolveLaunchPurchasableProduct(productId)")
  && pilot.includes("getPremiumAnalysisHref(product.id, state, profileId)"),
  "product identity, canonical checkout and state-aware purchase path must remain intact");

console.log("money-shared-finance-pilot-regression: PASS (pilot and 57-launch presentation contracts; checkout/report/AI unchanged)");
