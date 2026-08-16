import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const summaryRoute = read("app/api/mypage/summary/route.ts");
const reportsServer = read("app/lib/paidReports/server.ts");
const purchasesServer = read("app/lib/purchases/server.ts");
const myPage = read("app/mypage/page.tsx");
const detailRoute = read("app/api/paid-analysis-detail-v2/route.ts");

assert(summaryRoute.includes("listUserPaidAnalysisSummaries(user.id)"), "summary must build the paid list on the server for the session user");
assert(summaryRoute.includes("{ freeAnalysisResults, profileDeletability, paidAnalysis }"), "summary must add paidAnalysis without dropping the existing arrays");
assert(summaryRoute.includes("resolveProfileFreeAnalysisStatus(profile, summaries)"), "the P0-3 free analysis contract must stay unchanged");
assert(summaryRoute.includes("listProfileDeleteBlockers(user.id)") && summaryRoute.includes("deleteBlockers.get(profile.id)"), "the P0-4 deletability contract must stay unchanged");
assert(!summaryRoute.includes("delete(") && !summaryRoute.includes("update("), "summary must stay read-only");
console.log("1. summary exposes paidAnalysis while preserving the P0-3 and P0-4 contracts ✓");

assert(reportsServer.includes("export async function listUserPaidReports") && reportsServer.includes('.eq("user_id", userId)'), "paid report listing must be scoped to the session user in Postgres");
assert(reportsServer.includes('.select("profile_id, product_id, status")'), "paid report listing must stay minimal and read-only");
assert(purchasesServer.includes("export async function listUserEntitlements") && purchasesServer.includes('.eq("is_active", true)'), "the entitlement source must return active rows only");
assert(reportsServer.includes("entitlement.resourceType === PAID_ANALYSIS_RESOURCE_TYPE"), "only paid_analysis entitlements may appear in the list");
assert(reportsServer.includes("listUserEntitlements(userId)") && reportsServer.includes("listUserPaidReports(userId)"), "the summary must combine entitlements with report state");
assert(reportsServer.includes("Promise.all(["), "entitlements and reports must be fetched once each, never per profile");
assert(!/for \(const entitlement[\s\S]*?await /.test(reportsServer), "the summary must not await inside a per-entitlement loop (no N+1)");
console.log("2. active paid_analysis entitlements drive the list, reports are joined in two queries ✓");

assert(reportsServer.includes('statusByKey.get(paidReportKey(entitlement.profileId, productId)) ?? "none"'), "a missing report must resolve to none and match on profile + product");
assert(reportsServer.includes("function paidReportKey(profileId: string, productId: string)"), "report state must be keyed by profile and product together");
assert(reportsServer.includes("getCanonicalPremiumProductId(entitlement.resourceId)") && reportsServer.includes("getCanonicalPremiumProductId(report.productId)"), "both sides of the join must be canonicalized before matching");
assert(reportsServer.includes('reportStatus: PaidReportStatus | "none"'), "the exposed status must be the stored report status plus none");
assert(!reportsServer.includes("entitlementActive"), "an always-true field must not be added to the response");
console.log("3. none / generating / completed / failed resolve from the stored report status ✓");

assert(reportsServer.includes("getPremiumProduct(productId)") && reportsServer.includes("product?.title"), "the display name must come from the premium product registry");
assert(!/["']relationship-conflict["']\s*:/.test(reportsServer) && !/["']relationship-conflict["']\s*:/.test(myPage), "no hardcoded productId to Korean name mapping may exist");
assert(getPremiumProduct("relationship-conflict")?.title === "갈등 패턴과 회복 방식", "the registry must still resolve a known product title");
console.log("4. product names are derived from the registry, never duplicated ✓");

assert(myPage.includes("구매한 심층 분석"), "the card must label the purchased section");
assert(myPage.includes('(paidAnalysisByProfileId[profile.id] ?? []).length > 0 ?'), "the section must be hidden for profiles without purchases");
assert(myPage.includes('completed: "리포트 보기"'), "a completed report must offer 리포트 보기");
assert(myPage.includes('none: "심층 분석 생성하기"'), "a missing report must warn that generation starts");
assert(myPage.includes('failed: "다시 생성하기"'), "a failed report must warn that regeneration starts");
assert(!/none: "리포트 보기"|failed: "리포트 보기"/.test(myPage), "none and failed must never read as a plain view action");
assert(myPage.includes('item.reportStatus === "generating" ?') && myPage.includes("disabled"), "a generating report must not be clickable");
assert(!myPage.includes("setInterval") && !myPage.includes("setTimeout"), "no polling may be introduced for generating reports");
console.log("5. status labels and actions match the OpenAI cost of each transition ✓");

assert(myPage.includes("href={`/paid-analysis/${item.productId}/report?profileId=${profile.id}`}"), "the report link must use the profile-scoped report route");
assert(!myPage.includes("hasActiveEntitlementForProfile") && !myPage.includes("/api/paid-analysis-detail-v2"), "the client must not re-implement or bypass the entitlement gate");
const gate = read("app/paid-analysis/[productId]/report/ReportAccessGate.tsx");
assert(gate.includes("getUserProfile(profileId, user.id)") && gate.includes("hasActiveEntitlementForProfile(user.id, profile.id, canonicalProductId)"), "ReportAccessGate must remain the security boundary");
console.log("6. the link reuses the existing server-side access gate ✓");

const generateIndex = detailRoute.indexOf("generatePaidAnalysisDetailV2(");
const completedIndex = detailRoute.indexOf('claim.state === "completed"');
assert(completedIndex > 0 && completedIndex < generateIndex, "a completed report must be returned from cache before any OpenAI call");
assert(detailRoute.indexOf("claimPaidReport(") < generateIndex, "the claim must still precede generation");
console.log("7. paid-analysis-detail-v2 keeps returning completed reports from cache ✓");

console.log("\nmypage-paid-analysis-summary-regression passed ✓");
