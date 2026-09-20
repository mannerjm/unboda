import { readFileSync } from "node:fs";
import { getPremiumAnalysisHref } from "../app/lib/premiumAnalysisNavigation";

function read(path: string): string {
  return readFileSync(path, "utf8");
}
function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const checkoutSuccess = read("app/checkout/success/page.tsx");
const confirmation = read("app/api/orders/[orderId]/confirm-payment/route.ts");
const commonWaiting = read("app/components/PaidReportPreparing.tsx");
const compatibilityWaiting = read("app/components/CompatibilityPaidReportPreparing.tsx");
const premiumClient = read("app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx");
const statusRoute = read("app/api/paid-analysis-detail-v2/status/route.ts");
const premiumReportRoute = read("app/paid-analysis/[productId]/report/page.tsx");
const recommendation = read("app/components/RecommendationTop3.tsx");
const catalogDetail = read("app/components/PremiumProductDetail.tsx");
const library = read("app/components/PurchasedAnalysesListMultiEdition.tsx");

assert(
  confirmation.includes("preparePaidReportGeneration(reportInput)")
    && confirmation.includes("after(() => runPaidReportGeneration"),
  "payment must preserve automatic, exact-edition generation after entitlement creation",
);
assert(
  checkoutSuccess.includes('router.replace(`/paid-analysis/${encodeURIComponent(productId)}/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`)'),
  "ordinary and recommended premium purchases must open the exact-edition report, not the product description",
);
for (const familyRoute of [
  "getCompatibilityPairReportPath(productId)",
  "/special-analysis/compatibility/family/parent-child/report",
  "/special-analysis/compatibility/family/siblings/report",
  "/special-analysis/compatibility/family/other/report",
]) {
  assert(checkoutSuccess.includes(familyRoute), `compatibility post-payment route missing: ${familyRoute}`);
}
assert(premiumReportRoute.includes("ReportAccessGate") && premiumReportRoute.includes("PaidAnalysisDetailV2Client"), "premium waiting must retain entitlement gate");
assert(compatibilityWaiting.includes('kind="compatibility"') && compatibilityWaiting.includes("router.refresh()") && compatibilityWaiting.includes("4_000"), "all compatibility report routes must continue automatically checking every 4 seconds");
assert(
  premiumClient.includes('kind="premium"')
    && premiumClient.includes("response.status === 202")
    && premiumClient.includes("/api/paid-analysis-detail-v2/status?")
    && premiumClient.includes('result.status === "completed"')
    && premiumClient.includes('result.status === "failed"')
    && premiumClient.includes("4_000")
    && premiumClient.includes("window.clearInterval(timer)"),
  "premium reports must poll, stop on actual failed state, and render completed report automatically",
);
for (const boundary of [
  "getCurrentUser()",
  "getUserProfile(profileId, user.id)",
  "getActiveProfile(user.id)",
  "getActiveEntitlementForProfileEdition",
  "getActiveEntitlementForProfile(",
  "getPaidReport(user.id, profile.id, resolved.productId, entitlement.analysisEditionKey)",
  'status: report?.status ?? "preparing"',
  '"Cache-Control": "private, no-store"',
]) {
  assert(statusRoute.includes(boundary), `read-only paid report status boundary missing: ${boundary}`);
}
assert(!statusRoute.includes("claimPaidReport(") && !statusRoute.includes("runPaidReportGeneration("), "status polling must never create, replay or alter a paid report");
for (const copy of [
  "예상 소요 시간: 약 1~3분",
  "시간이 더 걸릴 수 있습니다",
  "완료되면 결과 화면으로 자동 전환됩니다",
  "리포트 생성이 조금 더 걸리고 있어요",
  "구매 내역은 보존됩니다",
  "리포트 준비에 문제가 생겼어요",
  "구매한 분석으로 이동",
]) {
  assert(commonWaiting.includes(copy), `shared waiting UI must explain: ${copy}`);
}
for (const state of ["none", "generating"]) {
  const href = getPremiumAnalysisHref("career", state, "00000000-0000-4000-8000-000000000001");
  assert(href?.startsWith("/paid-analysis/career/report?profileId=") === true, `${state} premium report must remain reopenable without new payment`);
}
assert(recommendation.includes("리포트 준비 화면 보기") && catalogDetail.includes("리포트 준비 화면 보기"), "recommendations and premium catalog must link pending purchases to waiting screen");
assert(library.includes("리포트 준비 화면 보기") && library.includes("recentReportHref"), "purchase library must expose all pending exact-edition reports");

console.log("unified-paid-report-waiting-regression: PASS");
