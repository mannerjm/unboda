import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const v4 = read("app/paid-analysis/[productId]/PaidAnalysisV4Report.tsx");
const legacy = read("app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx");
const timeline = read("app/paid-analysis/[productId]/PeriodTimelineSection.tsx");
const paidRoute = read("app/paid-analysis/[productId]/report/page.tsx");
const gate = read("app/paid-analysis/[productId]/report/ReportAccessGate.tsx");
const consulting = read("app/paid-analysis/[productId]/report/AiConsultingEntryCard.tsx");
const romantic = read("app/components/CompatibilityPaidReportView.tsx");
const parentChild = read("app/components/FamilyParentChildPaidReportView.tsx");
const extended = read("app/components/FamilyExtendedPaidReportView.tsx");
const preparing = read("app/components/CompatibilityPaidReportPreparing.tsx");
const romanticRoute = read("app/special-analysis/compatibility/report/page.tsx");
const pairReportRoute = read("app/special-analysis/compatibility/PairCompatibilityReportPage.tsx");
const parentChildRoute = read("app/special-analysis/compatibility/family/parent-child/report/page.tsx");
const siblingRoute = read("app/special-analysis/compatibility/family/siblings/report/page.tsx");
const otherRoute = read("app/special-analysis/compatibility/family/other/report/page.tsx");

const reportSurfaces = [
  ["v4 report", v4],
  ["legacy report", legacy],
  ["period timeline", timeline],
  ["paid report route", paidRoute],
  ["access gate", gate],
  ["AI consulting entry", consulting],
  ["romantic report", romantic],
  ["parent-child report", parentChild],
  ["extended-family report", extended],
  ["compatibility preparing", preparing],
  ["romantic route", romanticRoute],
  ["pair compatibility route", pairReportRoute],
  ["parent-child route", parentChildRoute],
  ["sibling route", siblingRoute],
  ["other-family route", otherRoute],
] as const;

for (const [name, source] of reportSurfaces) {
  for (const warmToken of [
    "#f7f2e8",
    "#fbfbfa",
    "#fffdfa",
    "#f8f2e7",
    "#fffdf8",
    "#f1ebe2",
    "#faf8f4",
    "#f5ecdc",
    "#faf6ee",
    "#e7dcc8",
    "#dfcfb4",
    "#e1d0b4",
    "#e5d7bf",
    "#eadfc9",
    "#f8f1e4",
  ]) {
    assert(!source.includes(warmToken), `${name} must not restore legacy warm report token ${warmToken}`);
  }
  assert(
    !source.includes("text-stone-")
      && !source.includes("bg-stone-")
      && !source.includes("border-stone-")
      && !source.includes("ring-stone-"),
    `${name} must use the cool Phase 6 reading system`,
  );
}

assert(v4.includes('bg-[#f5f7fc]'), "V4 report must use the cool reading canvas");
assert(v4.includes("결론 먼저"), "V4 report must lead with the conclusion");
assert(v4.includes("KEY POINTS") && v4.includes("핵심 포인트"), "V4 report must surface quick key points before details");
assert(v4.includes("01 · 문제 정의") && v4.includes("02 · 원인") && v4.includes("03 · 근거"), "V4 report must keep an explicit detailed-analysis sequence");
assert(v4.includes("ACTION GUIDE") && v4.includes("행동 제안"), "V4 report must collect actionable guidance after detailed analysis");
assert(v4.indexOf("결론 먼저") < v4.indexOf("KEY POINTS"), "V4 conclusion must precede key points");
assert(v4.indexOf("KEY POINTS") < v4.indexOf("01 · 문제 정의"), "V4 key points must precede detailed analysis");
assert(v4.indexOf("03 · 근거") < v4.indexOf("ACTION GUIDE"), "V4 detailed evidence must precede action guidance");

for (const contract of [
  "detail.conclusion.headline",
  "detail.conclusion.rationale",
  "detail.conclusion.immediateAction",
  "detail.coreProblem.title",
  "detail.cause.reasons",
  "detail.evidence.map",
  "detail.current.opportunities",
  "detail.current.cautions",
  "detail.timeline.map",
  "detail.action.map",
  "detail.avoid.map",
  "detail.decisionCheck",
  "detail.confidence.strongestEvidence",
  "detail.confidence.uncertaintyFactors",
  "detail.confidence.limitations",
]) {
  assert(v4.includes(contract), `V4 report data contract missing: ${contract}`);
}
assert(v4.includes("<PeriodTimelineSection periodAnalysis={detail.periodAnalysis} />"), "V4 report must preserve period analysis");
assert(legacy.includes("isPaidAnalysisDetailV4") && legacy.includes("<PaidAnalysisV4Report"), "legacy client must keep V4 dispatch");
assert(legacy.includes("detail.heroSummary") && legacy.includes("detail.confidence"), "legacy stored report rendering must remain available");

assert(romantic.includes("getPairCompatibilityConfigByRelationshipType") && romantic.includes("config.reportKeyPointsDescription"), "pair report must present a relation-specific quick summary");
assert(romantic.includes('data-section="pair-perspective"'), "pair compatibility report must preserve two-way perspective");
assert(romantic.includes("report.strengths") && romantic.includes("report.conflict") && romantic.includes("report.recovery") && romantic.includes("report.longTerm"), "pair compatibility report sections must remain intact");
assert(romantic.includes("report.currentTiming") && romantic.includes("report.actionGuide.doNext") && romantic.includes("report.actionGuide.avoid"), "pair compatibility timing and action guide must remain intact");
assert(!romantic.includes('bg-[#171a3d] px-6 py-10 text-white'), "pair compatibility report must not use a large dark reading section");

assert(parentChild.includes("directions.parentToChild") && parentChild.includes("directions.childToParent"), "parent-child report must preserve both directions");
assert(parentChild.includes("report.emotionalConnection") && parentChild.includes("report.expectationAndAutonomy") && parentChild.includes("report.boundariesAndPressure"), "parent-child domains must remain intact");
assert(parentChild.includes("report.currentTiming") && parentChild.includes("report.actionGuide.doNext") && parentChild.includes("report.actionGuide.avoid"), "parent-child timing and action guide must remain intact");
assert(!parentChild.includes('bg-[#171a3d] px-6 py-8 text-white'), "parent-child report must not use a large dark reading section");

assert(extended.includes("directions.userToSibling") && extended.includes("directions.siblingToUser"), "sibling report must preserve both directions");
assert(extended.includes("directions.userToFamily") && extended.includes("directions.familyToUser"), "other-family report must preserve both directions");
assert(extended.includes("report.comparisonAndCompetition") && extended.includes("report.rolesAndBoundaries"), "sibling-specific domains must remain intact");
assert(extended.includes("report.roleAndExpectations") && extended.includes("report.boundariesAndContact"), "other-family-specific domains must remain intact");
assert(extended.includes("report.currentTiming") && extended.includes("ActionSection"), "extended family timing and action guide must remain intact");
assert(!extended.includes('bg-[#171a3d] px-6 py-8 text-white'), "extended-family report must not use a large dark reading section");

assert(timeline.includes("periodAnalysis.timelineItems.map"), "period timeline must preserve every timeline item");
assert(timeline.includes("item.actions") && timeline.includes("item.cautions") && timeline.includes("periodAnalysis.keyPoints"), "period timeline must preserve actions, cautions, and key points");

assert(paidRoute.includes("ReportAccessGate") && paidRoute.includes("PaidAnalysisDetailV2Client"), "paid report route must preserve the security gate and stored-report loader");
assert(gate.includes("hasActiveEntitlementForProfileEdition") && gate.includes("hasActiveEntitlementForProfile"), "report access must remain entitlement scoped");
assert(gate.includes("getUserProfile(profileId, user.id)") && gate.includes("activeProfile?.id !== profile.id"), "report access must remain profile scoped");

assert(romanticRoute.includes("PairCompatibilityReportPage"), "romantic report wrapper must use the shared pair report route");
assert(pairReportRoute.includes("getPaidReport") && pairReportRoute.includes("CompatibilityPaidReportView"), "shared pair compatibility route must keep its paid report renderer");
assert(pairReportRoute.includes("AiConsultingEntryCard"), "shared pair compatibility route must keep AI consulting entry");

for (const [name, source, marker] of [
  ["parent-child route", parentChildRoute, "FamilyParentChildPaidReportView"],
  ["sibling route", siblingRoute, 'FamilyExtendedPaidReportView mode="siblings"'],
  ["other-family route", otherRoute, 'FamilyExtendedPaidReportView mode="other_family"'],
] as const) {
  assert(source.includes("getPaidReport") && source.includes(marker), `${name} must keep its paid report renderer`);
  assert(source.includes("AiConsultingEntryCard"), `${name} must keep AI consulting entry`);
}
assert(consulting.includes("이 리포트를 바탕으로 AI에게 질문하기"), "AI consulting entry contract must remain intact");
assert(preparing.includes("window.setInterval") && preparing.includes("router.refresh()"), "compatibility preparing state must keep automatic refresh");

console.log("Paid report Phase 6 reading UX regression passed ✓");
