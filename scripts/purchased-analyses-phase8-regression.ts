import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeAnalysisEditionKey } from "../app/lib/analysisEditionKey";
import { formatAnalysisEditionLabel } from "../app/lib/analysisEditionLabel";
import { groupPurchasedAnalysesByProduct } from "../app/lib/purchasedAnalysesGrouping";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const page = read("app/purchased-analyses/page.tsx");
const list = read("app/components/PurchasedAnalysesListMultiEdition.tsx");
const refresh = read("app/components/PurchasedAnalysesAutoRefresh.tsx");
const grouping = read("app/lib/purchasedAnalysesGrouping.ts");
const paidReports = read("app/lib/paidReports/server.ts");
const preview = read("app/admin/purchased-analyses-preview/page.tsx");
const admin = read("app/admin/page.tsx");

assert(page.includes('redirect("/auth/login?returnTo=/purchased-analyses")'), "Phase 8 library must remain authenticated");
assert(page.includes("getActiveProfile(user.id)"), "Phase 8 library must resolve the active profile");
assert(page.includes("analysis.profileId === activeProfile.id"), "Phase 8 library must remain active-profile scoped");
assert(page.includes("groupPurchasedAnalysesByProduct(analyses)"), "Phase 8 page must group only the filtered profile summaries");
assert(page.includes("구매한 분석 보관함") && page.includes("MY LIBRARY"), "Phase 8 must present the library as a revisit hub while keeping the shared library hierarchy");
assert(page.includes("현재 분석 대상") && page.includes("activeProfile.label"), "Phase 8 must keep profile orientation visible");
assert(!page.includes("ProfileSelector"), "Phase 8 must not introduce an inline profile switcher");

assert(paidReports.includes("acquiredAt: string;"), "paid summary must expose acquisition time");
assert(paidReports.includes("acquisitionSource:"), "paid summary must expose acquisition source");
assert(paidReports.includes("acquiredAt: entitlement.createdAt"), "acquisition time must come from the active entitlement row");
assert(paidReports.includes("acquisitionSource: entitlement.source"), "acquisition source must come from the active entitlement row");
assert(paidReports.includes("entitlement.resourceType === PAID_ANALYSIS_RESOURCE_TYPE"), "library must remain active-entitlement backed");

assert(grouping.includes("latestAcquiredAt"), "grouping must retain latest acquisition time per product");
assert(grouping.includes("b.latestAcquiredAt.localeCompare(a.latestAcquiredAt)"), "product groups must sort by recent acquisition");
assert(grouping.includes("acquiredAt: summary.acquiredAt"), "edition rows must preserve acquisition time");
assert(grouping.includes("acquisitionSource: summary.acquisitionSource"), "edition rows must preserve acquisition source");

const sample = [
  {
    profileId: "profile-a",
    productId: "wealth",
    productName: "재물 분석",
    reportStatus: "completed" as const,
    analysisEditionKey: "YEAR:2025",
    acquiredAt: "2025-12-01T00:00:00.000Z",
    acquisitionSource: "purchase" as const,
  },
  {
    profileId: "profile-a",
    productId: "wealth",
    productName: "재물 분석",
    reportStatus: "completed" as const,
    analysisEditionKey: "YEAR:2026",
    acquiredAt: "2026-09-01T00:00:00.000Z",
    acquisitionSource: "purchase" as const,
  },
  {
    profileId: "profile-a",
    productId: "career",
    productName: "직업 분석",
    reportStatus: "generating" as const,
    analysisEditionKey: "YEAR:2026",
    acquiredAt: "2026-09-10T00:00:00.000Z",
    acquisitionSource: "grant" as const,
  },
  {
    profileId: "profile-b",
    productId: "wealth",
    productName: "재물 분석",
    reportStatus: "completed" as const,
    analysisEditionKey: "YEAR:2026",
    acquiredAt: "2026-09-12T00:00:00.000Z",
    acquisitionSource: "purchase" as const,
  },
];

const grouped = groupPurchasedAnalysesByProduct(sample);
assert(grouped.length === 3, "same product across different profiles must never merge into one group");
assert(grouped[0].profileId === "profile-b", "most recently acquired product group should appear first");
const profileAWealth = grouped.find((group) => group.profileId === "profile-a" && group.productId === "wealth");
assert(profileAWealth?.editions.length === 2, "multiple editions for one profile/product must remain together");
assert(profileAWealth?.editions[0].analysisEditionKey === "YEAR:2026", "semantic newest edition must remain first within a group");
assert(profileAWealth?.latestAcquiredAt === "2026-09-01T00:00:00.000Z", "group must keep its latest acquisition timestamp");

for (const marker of [
  "최근 이어보기",
  "전체 보관함",
  "연도판과 분석 상태",
  "리포트 보기",
  "통합 AI 상담 바로가기",
  "다음 질문이 생겼다면",
]) {
  assert(list.includes(marker), `Phase 8 library must expose ${marker}`);
}
assert(list.includes('data-next-question-slot="phase9"'), "Phase 8 must reserve a stable next-question slot for Phase 9");
assert(list.includes("다른 심층 분석이나 전문 분석을 둘러볼 수 있습니다.") && !list.includes("다른 심층 분석이나 관계 분석을 둘러볼 수 있습니다."), "next-question copy must stay category-neutral for future specialist analysis expansion");
assert(list.includes("전문 분석 보기") && !list.includes("관계·전문 분석 보기"), "next-question CTA must use the generic specialist-analysis label");
assert(list.includes("allEditions") && list.includes("acquiredAt.localeCompare"), "recent item must derive from acquisition time");
assert(list.includes("completedCount") && list.includes("preparingCount"), "library must summarize completed/preparing states");
assert(list.includes("const consultingHubHref") && list.includes("/ai-consulting?profileId="), "library must expose exactly one profile-wide AI consultation hub entry");
assert(list.includes("UNBODA AI CONSULTING · 핵심 기능") && list.includes("직접 저장한 기억"), "library must visually foreground the unified AI consultation differentiator");
assert(!list.includes("이 리포트로 질문하기"), "library must not expose per-report AI consultation buttons");
assert(!list.includes("consultingHref("), "library must not retain per-report AI consultation routing helpers");
assert(list.includes("reportHref(") && list.includes("encodeURIComponent(editionKey)"), "report reopening must preserve the exact edition");
assert(list.includes('previewMode = false'), "shared library renderer must support a non-mutating operator preview");
assert(list.includes('if (previewMode) return "/admin/report-preview"'), "preview report actions must stay in admin preview flow");
assert(list.includes('? "/admin/ai-consulting-preview"'), "preview unified AI hub action must stay in admin preview flow");

assert(refresh.includes("router.refresh()"), "preparing reports must keep server refresh");
assert(refresh.includes("window.setInterval") && refresh.includes("window.clearInterval"), "preparing auto-refresh lifecycle must remain intact");
assert(!refresh.includes("claimPaidReport") && !refresh.includes("generatePaidAnalysis"), "library refresh must remain read-only");

assert(preview.includes("await requireOperator()"), "Phase 8 preview must be operator gated");
assert(preview.includes("PREVIEW_GROUPS"), "Phase 8 preview must use local sample library data");
assert(preview.includes("previewMode"), "Phase 8 preview must render the real shared library component in preview mode");
assert(preview.includes("computeAnalysisEditionKey") && preview.includes("formatAnalysisEditionLabel"), "Phase 8 preview must derive sample editions from the real edition policy helpers");
assert(preview.includes('previewEdition("career-workplace-relationships", "2026-09-13")'), "monthly career preview must derive its month edition from the actual policy");
assert(preview.includes('previewEdition("relationship-current", "2026-08-03")'), "monthly relationship preview must derive its month edition from the actual policy");
assert(preview.includes('previewEdition("monthly-next", "2026-09-18")'), "target-month preview must derive the next-month edition from the actual policy");
assert(!preview.includes('productId: "career-workplace-relationships"') || !preview.includes('analysisEditionKey: "YEAR:2026"'), "monthly preview products must not be hardcoded as yearly editions");

const yearlyEdition = computeAnalysisEditionKey({ productId: "wealth", anchorDate: "2026-09-17" });
const monthlyEdition = computeAnalysisEditionKey({ productId: "career-workplace-relationships", anchorDate: "2026-09-13" });
const relationshipMonthlyEdition = computeAnalysisEditionKey({ productId: "relationship-current", anchorDate: "2026-08-03" });
const targetMonthEdition = computeAnalysisEditionKey({ productId: "monthly-next", anchorDate: "2026-09-18" });

assert(yearlyEdition === "YEAR:2026", "wealth preview must remain a yearly edition");
assert(monthlyEdition === "MONTH:2026-09", "workplace relationship preview must be a September monthly edition");
assert(relationshipMonthlyEdition === "MONTH:2026-08", "current relationship preview must be an August monthly edition");
assert(targetMonthEdition === "TARGET_MONTH:2026-10", "next-month preview must point to October when purchased in September");
assert(formatAnalysisEditionLabel(yearlyEdition) === "2026년 분석", "yearly preview label must stay customer-readable");
assert(formatAnalysisEditionLabel(monthlyEdition) === "2026년 9월 분석", "monthly preview label must show the purchase/reference month");
assert(formatAnalysisEditionLabel(relationshipMonthlyEdition) === "2026년 8월 분석", "monthly relationship label must show the month");
assert(formatAnalysisEditionLabel(targetMonthEdition) === "2026년 10월 대상 분석", "target-month label must show the analyzed target month");
for (const forbidden of ["/api/orders", "requestPayment", "grantEntitlement", "createPurchaseFromPaidOrder"]) {
  assert(!preview.includes(forbidden), `Phase 8 preview must not invoke commercial mutation: ${forbidden}`);
}
assert(!admin.includes('href="/admin/purchased-analyses-preview"'), "admin dashboard must not expose the completed Phase 8 preview");

console.log("Purchased analyses Phase 8 library regression passed ✓");
