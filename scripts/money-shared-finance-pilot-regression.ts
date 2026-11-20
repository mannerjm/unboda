import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shared = readFileSync("app/components/PremiumProductDetail.tsx", "utf8");
const pilot = readFileSync("app/components/MoneySharedFinancePilotDetail.tsx", "utf8");
const registry = readFileSync("app/lib/analysisTopics.ts", "utf8");
const pricing = readFileSync("app/lib/productPricing.ts", "utf8");

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
  "PremiumReportValuePreview product={product}",
  "ProductReviewSummary productId={product.id}",
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
  "혹시 이런 순간이 익숙한가요?",
  "누가 결정할까요?",
  "언제, 누가 부담할까요?",
  "달라진 상황은 어떻게 맞출까요?",
  "AI 상담은 보유한 리포트 범위와 질문권 등 별도 이용 조건",
  "금융·법률 자문을 대신하지 않습니다.",
  "내 사주로 분석 시작하기",
]) {
  assert(pilot.includes(required), "customer-first pilot content missing: " + required);
}
assert(pilot.includes("fixed inset-x-0 bottom-3"), "pilot needs one persistent, accessible CTA");
assert.equal((pilot.match(/<Link\b/g) ?? []).length, 1, "pilot must expose exactly one primary CTA");
assert(!pilot.includes("내 사주로 자세히 알아보기") && !pilot.includes("다른 분석 선택"),
  "redundant hero buttons must not return");
console.log("money-shared-finance-pilot-regression: PASS (one product only; checkout/report/AI unchanged)");
