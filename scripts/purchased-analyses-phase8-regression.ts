import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  "AI 상담",
  "다음 질문이 생겼다면",
]) {
  assert(list.includes(marker), `Phase 8 library must expose ${marker}`);
}
assert(list.includes('data-next-question-slot="phase9"'), "Phase 8 must reserve a stable next-question slot for Phase 9");
assert(list.includes("allEditions") && list.includes("acquiredAt.localeCompare"), "recent item must derive from acquisition time");
assert(list.includes("completedCount") && list.includes("preparingCount"), "library must summarize completed/preparing states");
assert(list.includes("consultingHref(") && list.includes("/ai-consulting?"), "completed reports must support AI consultation re-entry");
assert(list.includes("edition.reportStatus === \"completed\" && Boolean(edition.analysisEditionKey)"), "AI consultation must only be offered for completed edition-scoped reports");
assert(list.includes("reportHref(") && list.includes("encodeURIComponent(editionKey)"), "report reopening must preserve the exact edition");
assert(list.includes('previewMode = false'), "shared library renderer must support a non-mutating operator preview");
assert(list.includes('if (previewMode) return "/admin/report-preview"'), "preview report actions must stay in admin preview flow");
assert(list.includes('if (previewMode) return "/admin/ai-consulting-preview"'), "preview AI actions must stay in admin preview flow");

assert(refresh.includes("router.refresh()"), "preparing reports must keep server refresh");
assert(refresh.includes("window.setInterval") && refresh.includes("window.clearInterval"), "preparing auto-refresh lifecycle must remain intact");
assert(!refresh.includes("claimPaidReport") && !refresh.includes("generatePaidAnalysis"), "library refresh must remain read-only");

assert(preview.includes("await requireOperator()"), "Phase 8 preview must be operator gated");
assert(preview.includes("PREVIEW_GROUPS"), "Phase 8 preview must use local sample library data");
assert(preview.includes("previewMode"), "Phase 8 preview must render the real shared library component in preview mode");
for (const forbidden of ["/api/orders", "requestPayment", "grantEntitlement", "createPurchaseFromPaidOrder"]) {
  assert(!preview.includes(forbidden), `Phase 8 preview must not invoke commercial mutation: ${forbidden}`);
}
assert(admin.includes('href="/admin/purchased-analyses-preview"'), "admin dashboard must expose Phase 8 preview");

console.log("Purchased analyses Phase 8 library regression passed ✓");
