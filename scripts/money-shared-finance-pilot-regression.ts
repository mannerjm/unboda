import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shared = readFileSync("app/components/PremiumProductDetail.tsx", "utf8");
const pilot = readFileSync("app/components/MoneySharedFinancePilotDetail.tsx", "utf8");
const registry = readFileSync("app/lib/analysisTopics.ts", "utf8");
const marketplace = readFileSync("app/components/PremiumCatalogMarketplace.tsx", "utf8");
const pricing = readFileSync("app/lib/productPricing.ts", "utf8");
const previewModel = readFileSync("app/lib/paidAnalysisV4PreviewModel.ts", "utf8");
const reviews = readFileSync("app/components/ProductReviewSummary.tsx", "utf8");
const page = readFileSync("app/deep-analysis/page.tsx", "utf8");
const styles = readFileSync("app/globals.css", "utf8");

// The pilot must be selected by exactly one canonical launched product ID.
assert(registry.includes('id: "money-shared-finance"'), "pilot product must remain in launch registry");
assert.equal((shared.match(/product\.id === "money-shared-finance"/g) ?? []).length, 1,
  "only the shared-finance product may opt in to this visual pilot");
assert(shared.includes('import MoneySharedFinancePilotDetail from "@/app/components/MoneySharedFinancePilotDetail"'),
  "shared detail must import the pilot");
assert(shared.includes('<MoneySharedFinancePilotDetail') && shared.includes('const isPeriod = product.kind === "PERIOD"'),
  "all nonpilot detail pages must retain the original shared layout");
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
  "왜 나만 더 부담하는 것 같을까요?",
  "혹시 이런 고민을 해본 적 있으신가요?",
  "누가 결정하나요?",
  "언제, 누가 부담하나요?",
  "상황이 달라지면 어떻게 하나요?",
  "AI 상담은 보유한 리포트 범위와 질문권 등 별도 이용 조건",
  "금융·법률 자문을 대신하지 않습니다.",
  "심층분석 구매하기",
  "버튼을 누르면 결제 내용을 확인하는 화면으로 이동합니다.",
  "실제 리포트 구성과 해석 기준 보기",
  "이 상품은 구매하는 해의 사주 흐름도 참고합니다.",
]) {
  assert(pilot.includes(required), "customer-first pilot content missing: " + required);
}

// One inline, state-aware purchase link: no fixed CTA masking text or duplicate purchase entry.
assert(pilot.includes('id="finance-purchase-action"'), "the purchase action must be in normal reading flow");
assert(!pilot.includes("fixed inset-x") && !pilot.includes("sticky bottom-"),
  "the pilot must not cover body copy with a floating purchase bar");
assert.equal((pilot.match(/<Link\b/g) ?? []).length, 1, "pilot must expose exactly one primary CTA");
assert(!pilot.includes("내 사주로 자세히 알아보기") && !pilot.includes("다른 분석 선택"),
  "redundant hero buttons must not return");

// The shared marketplace duplicate cover/photo/price strip is omitted only for this pilot.
assert(marketplace.includes('selected.id !== "money-shared-finance" ? ('),
  "pilot's redundant legacy product banner should be hidden");
assert(marketplace.includes('selected.id === "money-shared-finance" ? "p-0" : "p-3 sm:p-5"'),
  "pilot uses edge-to-edge hero while all other details preserve original padding");
assert(marketplace.includes("<PremiumProductDetail") && marketplace.includes("money(selected.id)"),
  "other products must retain original detail/price header and navigation");

// Collapse the broad discovery banner dynamically ONLY when this pilot is open.
// This must work even when selection is client-side and no productId URL param exists.
assert(page.includes("data-deep-analysis-page") && page.includes("data-deep-analysis-discovery-banner"),
  "server page should expose isolated banner target");
assert(styles.includes('main[data-deep-analysis-page]:has([data-pilot-product="money-shared-finance"])')
  && styles.includes("[data-deep-analysis-discovery-banner]"),
  "pilot alone must hide the redundant discover banner; other catalog views retain it");
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
assert(pilot.includes("구매하는 해의 사주 흐름도 참고합니다."),
  "plain-language date-policy clarification is required");

// Pilot only: shrinking an empty review must never hide actual verified reviews.
assert(reviews.includes("compactWhenEmpty = false") && reviews.includes("summary.count === 0 && compactWhenEmpty"),
  "compact review behavior must be opt-in and empty-state only");
assert(reviews.includes("summary.reviews.slice(0, 4)") && reviews.includes('/api/reviews?productId='),
  "published reviews must still originate from the verified reviews API");

// Responsive/source-level guards: desktop grid only on lg, small viewport has full width
// CTA, natural document flow and no fixed purchase overlay.
assert(pilot.includes("sm:flex-1") && pilot.includes("w-full items-center")
  && pilot.includes("text-[clamp(1.7rem,5.7vw,2.7rem)]")
  && pilot.includes("sm:grid-cols-2") && pilot.includes("min-w-0"),
  "pilot must keep responsive text and CTA at narrow widths");
assert(pilot.includes("🧾") && pilot.includes("💬") && pilot.includes("🔄"),
  "story section must visually distinguish the three worries without a card wall");
console.log("money-shared-finance-pilot-regression: PASS (one product only; checkout/report/AI unchanged)");
