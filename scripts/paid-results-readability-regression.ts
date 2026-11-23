import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TOPIC_TEACHERS, getTopicTeacher } from "../app/lib/topicTeachers";

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
const appShell = read("app/components/AppShell.tsx");
const wealthTeacher = read("app/components/WealthTeacherCard.tsx");
const wealthTeacherPortrait = read("public/teachers/geumun-v2.svg");
const consulting = read("app/paid-analysis/[productId]/report/AiConsultingEntryCard.tsx");
const preparing = read("app/components/CompatibilityPaidReportPreparing.tsx");
const topicTeacherCard = read("app/components/TopicTeacherCard.tsx");
const topicTeacherCatalog = read("app/components/PremiumCatalogMarketplace.tsx");
const topicTeacherDetail = read("app/components/CustomerFirstPremiumDetail.tsx");
const topicTeacherStyles = read("app/globals.css");
const topicTeacherPortrait = readFileSync("public/teachers/topic-teachers-seven.webp");
const teacherCategories = ["health", "growth", "social", "career", "business", "relationship"] as const;
assert.equal(Object.keys(TOPIC_TEACHERS).length, teacherCategories.length,
  "the six remaining topic categories must each have exactly one specialist");
assert.deepEqual(teacherCategories.map((category) => TOPIC_TEACHERS[category].portraitIndex), [1, 2, 3, 4, 5, 6],
  "specialists must use the exact agreed left-to-right portrait ordering");
assert.equal(new Set(teacherCategories.map((category) => TOPIC_TEACHERS[category].name)).size, 6,
  "specialist names must not duplicate");
assert.equal(new Set(teacherCategories.map((category) => TOPIC_TEACHERS[category].accent)).size, 6,
  "each specialist report theme must have a unique accent");
assert.equal(getTopicTeacher("money"), null, "wealth teacher must remain on its existing rendering path");
assert.equal(getTopicTeacher("period"), null, "period-analysis views must not gain a topic teacher");
assert.equal(topicTeacherPortrait.toString("ascii", 0, 4), "RIFF", "approved portrait must be a real image");
assert.equal(topicTeacherPortrait.toString("ascii", 8, 12), "WEBP", "approved portrait must have a valid WebP header");
assert(topicTeacherCard.includes("topic-teachers-seven.webp")
  && topicTeacherCard.includes('data-topic-teacher-profile="visible"')
  && !topicTeacherCard.includes("<details") && !topicTeacherCard.includes("가상") && !topicTeacherCard.includes("AI"),
  "specialists must use the approved artwork and inline accessible profiles without restricted text");
assert(topicTeacherCatalog.includes('currentGroup.category !== "money" ? <TopicTeacherCard')
  && topicTeacherCatalog.includes('currentGroup.category === "money" ? <WealthTeacherCard')
  && topicTeacherDetail.includes('product.category !== "money" ? <TopicTeacherCard')
  && !topicTeacherDetail.includes('product.category !== "money" ? <WealthTeacherCard'),
  "catalog and customer-first details must show exactly the category-matching teacher");
assert(topicTeacherStyles.includes('data-topic-teacher-variant="list"'),
  "other topic category lists must hide the redundant generic discovery banner");
assert(v4.includes('getTopicTeacher(productId ? getPremiumProduct(productId)?.category : null)')
  && v4.includes('data-topic-report-category={teacher?.category}')
  && v4.includes('data-report-feature="conclusion"')
  && v4.includes('data-report-feature="action"')
  && v4.includes('<TopicTeacherCard category={teacher.category} variant="report" />')
  && v4.includes('<TopicTeacherCard category={teacher.category} variant="closing"'),
  "the paid V4 report must use one resolved category teacher and themed conclusion and actions");

const sharedPreparing = read("app/components/PaidReportPreparing.tsx");

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
  ["shared paid report waiting", sharedPreparing],
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

assert(v4.includes('conclusion={detail.conclusion.headline}') && v4.includes('immediateAction={detail.conclusion.immediateAction}')
  && wealthTeacher.includes('이번 분석의 결론') && wealthTeacher.includes('실천할 한 가지'),
  "wealth report closing must show existing purchased report conclusion and next action rather than a generic placeholder");
assert(wealthTeacher.includes('topic-teachers-seven.webp')
  && wealthTeacher.includes('backgroundPosition: "0% center"')
  && topicTeacherPortrait.toString("ascii", 8, 12) === "WEBP",
  "wealth teacher must use the approved first portrait from the final seven-person set");
assert(
  wealthTeacher.includes('data-wealth-teacher-profile="visible"')
    && wealthTeacher.includes('profileByVariant')
    && wealthTeacher.includes('살펴보는 분야')
    && wealthTeacher.includes('풀이 방식')
    && wealthTeacher.includes('수입·지출')
    && wealthTeacher.includes('저축·자산 관리'),
  "wealth teacher profile must be visible without opening any additional controls",
);
assert(
  !wealthTeacher.includes("<details") && !wealthTeacher.includes("<summary")
    && !wealthTeacher.includes("가상") && !wealthTeacher.includes("인공지능")
    && !wealthTeacher.includes("AI"),
  "wealth teacher profile must remain inline and use approved customer-facing language",
);
assert(!wealthTeacher.includes('pointer-events-none absolute -right-9 -top-14') && wealthTeacher.includes('areas.map((area)'),
  "wealth teacher must use compact readable topic chips without the right gold decorative circle");
assert(wealthTeacher.includes('text-[13px]') && wealthTeacher.includes('sm:text-[15px]'),
  "wealth profile typography should remain easy to read at a glance");
assert(appShell.includes('>명리 분석 플랫폼</p>') && !appShell.includes('>AI 명리 분석 플랫폼</p>'),
  "brand sidebar tagline must omit the requested term");
assert(v4.includes('text-[15px] leading-7 text-slate-700'), "V4 report must keep readable 15px body copy");
assert(v4.includes('className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-9"'), "V4 report must keep mobile-aware outer padding");
assert(v4.includes('className="mt-5 space-y-4"'), "V4 report must keep the tightened section rhythm");
assert(v4.includes("결론 먼저") && v4.includes("KEY POINTS") && v4.includes("ACTION GUIDE"), "V4 hierarchy must remain conclusion → key points → action");
assert(
  v4.includes("evidenceItems.map")
    && v4.includes("const evidenceItems = evidenceOverride?.length ? evidenceOverride : detail.evidence")
    && v4.includes("detail.action.map")
    && v4.includes("detail.confidence"),
  "V4 data contracts must remain intact while supporting rebuilt professional evidence",
);

assert(legacy.includes('text-[15px] leading-7 text-slate-700'), "legacy paid reports must receive the same readable body scale");
assert(legacy.includes("isPaidAnalysisDetailV4") && legacy.includes("<PaidAnalysisV4Report"), "legacy/V4 dispatch must remain intact");
assert(legacy.includes("getLegacyTimelineDescription(item.period, item.description)"), "legacy timeline fallback must use period-aware guidance instead of repeating the title");
assert(!legacy.includes('이 단계에서는 "${title}" 관련 변화가 실제 생활에서 나타나는지 확인해 보세요.'), "legacy timeline fallback must never repeat the title as body copy");
assert(legacy.includes("simplifyLegacyTimelineLanguage") && legacy.includes("활동량과 생활 변화가 커지는") && legacy.includes("잠드는 과정") && legacy.includes("비슷한 시간에 일어나는 생활 리듬"), "legacy timeline must translate common technical sleep-rhythm wording into everyday language");

assert(
  timeline.includes('text-[15px] leading-7 text-slate-700')
    || timeline.includes('text-[15px] leading-7 text-slate-200'),
  "period timeline must use the shared readable body scale with sufficient contrast",
);
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
assert(consulting.includes("이 리포트로 상담 선생님에게 질문하기") && consulting.includes("presentation.productTitle"), "AI consulting CTA must retain report context with concise customer-facing action");
assert(sharedPreparing.includes("MysticLoadingScreen") && sharedPreparing.includes('text-left text-sm leading-6 text-[#514064]') && sharedPreparing.includes('font-bold text-[#31204d]') && !sharedPreparing.includes("text-[#d9ddef]"), "shared paid waiting must reuse the free visual while keeping actual high-contrast copy on the light panel");
assert(preparing.includes("window.setInterval") && preparing.includes("router.refresh()"), "report preparing auto-refresh must remain intact");

console.log("Paid results readability polish regression passed ✓");
