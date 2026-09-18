import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const v4 = read("app/paid-analysis/[productId]/PaidAnalysisV4Report.tsx");
const legacy = read("app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx");
const timeline = read("app/paid-analysis/[productId]/PeriodTimelineSection.tsx");
const romantic = read("app/components/CompatibilityPaidReportView.tsx");
const parentChild = read("app/components/FamilyParentChildPaidReportView.tsx");
const extended = read("app/components/FamilyExtendedPaidReportView.tsx");
const premiumPreview = read("app/components/PremiumReportValuePreview.tsx");
const compatibilityPreview = read("app/components/CompatibilityReportValuePreview.tsx");
const recommendations = read("app/components/RecommendationTop3.tsx");
const premiumDetail = read("app/components/PremiumProductDetail.tsx");
const consulting = read("app/paid-analysis/[productId]/report/AiConsultingEntryCard.tsx");
const preparing = read("app/components/CompatibilityPaidReportPreparing.tsx");

const readabilitySurfaces = [
  ["V4 paid report", v4],
  ["legacy paid report", legacy],
  ["period timeline", timeline],
  ["romantic compatibility report", romantic],
  ["parent-child compatibility report", parentChild],
  ["extended-family compatibility report", extended],
  ["premium report preview", premiumPreview],
  ["compatibility report preview", compatibilityPreview],
  ["recommendation results", recommendations],
  ["premium product detail", premiumDetail],
  ["AI consulting entry", consulting],
  ["compatibility preparing", preparing],
] as const;

for (const [name, source] of readabilitySurfaces) {
  assert(!source.includes("text-[10px]"), `${name} must not use 10px customer-facing text`);
  assert(!source.includes("text-[11px]"), `${name} must not use 11px customer-facing text`);
  assert(
    !source.includes("text-stone-")
      && !source.includes("bg-stone-")
      && !source.includes("border-stone-")
      && !source.includes("ring-stone-"),
    `${name} must use the shared cool neutral system`,
  );
}

assert(v4.includes('text-[15px] leading-7 text-slate-700'), "V4 report must keep readable 15px body copy");
assert(v4.includes('className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-9"'), "V4 report must keep mobile-aware outer padding");
assert(v4.includes('className="mt-5 space-y-4"'), "V4 report must keep the tightened section rhythm");
assert(v4.includes("결론 먼저") && v4.includes("KEY POINTS") && v4.includes("ACTION GUIDE"), "V4 hierarchy must remain conclusion → key points → action");
assert(v4.includes("detail.evidence.map") && v4.includes("detail.action.map") && v4.includes("detail.confidence"), "V4 data contracts must remain intact");

assert(legacy.includes('text-[15px] leading-7 text-slate-700'), "legacy paid reports must receive the same readable body scale");
assert(legacy.includes("isPaidAnalysisDetailV4") && legacy.includes("<PaidAnalysisV4Report"), "legacy/V4 dispatch must remain intact");

assert(timeline.includes('text-[15px] leading-7 text-slate-700'), "period timeline must use the shared readable body scale");
assert(timeline.includes("periodAnalysis.timelineItems.map") && timeline.includes("periodAnalysis.keyPoints"), "period timeline data contract must remain intact");

for (const [name, source] of [
  ["romantic", romantic],
  ["parent-child", parentChild],
  ["extended-family", extended],
] as const) {
  assert(source.includes('text-[15px] leading-7 text-slate-700') || source.includes('text-[15px] leading-8 text-slate-700'), `${name} compatibility report must use readable body copy`);
}

assert(romantic.includes('data-section="pair-perspective"') && romantic.includes("report.actionGuide"), "romantic compatibility report contract must remain intact");
assert(parentChild.includes("directions.parentToChild") && parentChild.includes("directions.childToParent"), "parent-child directional contract must remain intact");
assert(extended.includes("directions.userToSibling") && extended.includes("directions.userToFamily"), "extended-family directional contracts must remain intact");

assert(premiumPreview.includes("리포트 구성 미리보기"), "premium report preview must remain present");
assert(premiumPreview.includes("text-sm leading-6 text-slate-600") || premiumPreview.includes("text-sm leading-6 text-slate-700"), "premium preview explanations must be at least text-sm");
assert(compatibilityPreview.includes("리포트 구성 미리보기"), "compatibility report preview must remain present");
assert(compatibilityPreview.includes("text-sm leading-6 text-slate-600"), "compatibility preview explanations must be at least text-sm");

assert(recommendations.includes("<PremiumReportValuePreview product={product} />"), "recommendation result must keep the shared premium report preview");
assert(recommendations.includes('text-[15px] leading-7 text-slate-700'), "recommendation result body must use the shared readable scale");
assert(recommendations.includes("getProductPricing(product.id)"), "recommendation pricing source must remain unchanged");

assert(premiumDetail.includes("PremiumReportValuePreview"), "premium product detail must keep report preview");
assert(premiumDetail.includes('text-[15px] leading-7 text-slate-700'), "premium product detail must use readable explanation copy");
assert(premiumDetail.includes("getPremiumAnalysisHref(product.id, state, profileId)"), "premium product navigation contract must remain intact");

assert(consulting.includes('text-[15px] leading-7 text-slate-700'), "AI consulting entry copy must use the shared readable scale");
assert(consulting.includes("이 리포트를 바탕으로 AI에게 질문하기"), "AI consulting CTA contract must remain intact");
assert(preparing.includes('text-[15px] leading-7 text-slate-700'), "report preparing state must use readable body copy");
assert(preparing.includes("window.setInterval") && preparing.includes("router.refresh()"), "report preparing auto-refresh must remain intact");

console.log("Paid results readability polish regression passed ✓");
