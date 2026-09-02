import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const page = readFileSync("app/purchased-analyses/page.tsx", "utf8");
const refresh = readFileSync("app/components/PurchasedAnalysesAutoRefresh.tsx", "utf8");
const list = readFileSync("app/components/PurchasedAnalysesListMultiEdition.tsx", "utf8");
const reports = readFileSync("app/lib/paidReports/server.ts", "utf8");

assert(page.includes("PurchasedAnalysesAutoRefresh") && page.includes("groups={groups}"), "purchased page must use the server-refresh wrapper");
assert(refresh.includes("const REFRESH_INTERVAL_MS = 4_000"), "refresh interval must remain a conservative four seconds");
assert(refresh.includes('edition.reportStatus === "none" || edition.reportStatus === "generating"'), "polling must begin only for visible preparing editions");
assert(refresh.includes("if (!hasPreparingEdition)") && refresh.includes("window.clearInterval"), "polling must stop and clean up when every visible edition is terminal");
assert(refresh.includes("document.hidden"), "hidden tabs must skip refresh requests");
assert(refresh.includes("useTransition") && refresh.includes("refreshInFlight.current || isRefreshing"), "overlapping refreshes must be prevented");
assert(refresh.includes("router.refresh()"), "polling must refresh only the server-backed display state");
assert(!refresh.includes("fetch(") && !refresh.includes("claimPaidReport") && !refresh.includes("generatePaidAnalysis"), "display refresh must not trigger generation or mutate commercial state");
assert(list.includes('completed: "분석 완료"') && list.includes('failed: "분석 준비에 문제가 있어요"'), "terminal status transitions must render customer-safe copy");
assert(list.includes("edition.analysisEditionKey") && list.includes("&edition=${encodeURIComponent"), "completed links must retain exact edition routing");
assert(reports.includes('entitlement.resourceType === PAID_ANALYSIS_RESOURCE_TYPE'), "server refresh must keep active-entitlement-backed revoked exclusion");
assert(!list.includes('none: "심층 분석 생성하기"'), "manual generation must not return to the purchased library");

console.log("purchased-analyses-auto-refresh-regression passed ✓");
