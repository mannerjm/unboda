/**
 * STEP 57D-48F-G: Multi-edition purchased analyses regression.
 *
 * Verifies that the grouping and display logic correctly handles multiple
 * editions of the same product without collision or data loss.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  compareEditionKeys,
  formatAnalysisEditionLabel,
} from "../app/lib/analysisEditionLabel";
import { groupPurchasedAnalysesByProduct } from "../app/lib/purchasedAnalysesGrouping";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const paidReportsServer = read("app/lib/paidReports/server.ts");
const groupingLib = read("app/lib/purchasedAnalysesGrouping.ts");
const labelLib = read("app/lib/analysisEditionLabel.ts");
const purchasedAnalysesPage = read("app/purchased-analyses/page.tsx");
const purchasedAnalysesRefresh = read("app/components/PurchasedAnalysesAutoRefresh.tsx");
const purchasedAnalysesListComponent = read("app/components/PurchasedAnalysesListMultiEdition.tsx");
const purchasesServer = read("app/lib/purchases/server.ts");
const reportGate = read("app/paid-analysis/[productId]/report/ReportAccessGate.tsx");
const detailRoute = read("app/api/paid-analysis-detail-v2/route.ts");

// Section 1: Backend multi-edition grouping
assert(paidReportsServer.includes("analysisEditionKey: string | null;"), "PaidAnalysisSummary must include analysisEditionKey field");
assert(paidReportsServer.includes('editionKey: string | null'), "paidReportKey must accept editionKey parameter");
assert(paidReportsServer.includes(".analysisEditionKey"), "listUserPaidReports must fetch analysis_edition_key from database");
assert(paidReportsServer.includes("analysisEditionKey: editionKey,") || paidReportsServer.includes("analysisEditionKey: entitlement.analysisEditionKey"), "listUserPaidAnalysisSummaries must preserve analysisEditionKey in result");
console.log("1. PaidAnalysisSummary includes analysisEditionKey in all branches ✓");

// Section 2: Edition grouping logic
assert(groupingLib.includes("export type PurchasedAnalysisProductGroup"), "grouping library must define product group type");
assert(groupingLib.includes("editions: Array"), "product groups must contain an editions array");
assert(groupingLib.includes("groupPurchasedAnalysesByProduct"), "must export grouping function");
assert(groupingLib.includes("${summary.profileId}|${summary.productId}"), "grouping must aggregate by profile + product");
assert(groupingLib.includes("isLatest: index === 0"), "must mark first (most recent) edition as latest");
console.log("2. groupPurchasedAnalysesByProduct creates product-level groups with edition tracking ✓");

// Section 3: Edition sorting logic
assert(groupingLib.includes("compareEditionKeys"), "grouping must use the edition sorting comparator");
assert(labelLib.includes("MONTH") && labelLib.includes("YEAR"), "sorting must handle all major edition types");
assert(groupingLib.includes("keyA === null"), "null editions (LEGACY) must sort correctly");
assert(/sortedEditions.*.sort\(/.test(groupingLib), "editions must be sorted before display");
console.log("3. compareEditionKeys sorts newer editions first within each product ✓");

// Section 4: Edition labels
assert(labelLib.includes("export function formatAnalysisEditionLabel"), "must export label formatter");
assert(labelLib.includes("MONTH:") && labelLib.includes("년 ") && labelLib.includes("월"), "MONTH labels must use Korean date formatting");
assert(labelLib.includes("DAEUN") && labelLib.includes("대운"), "DAEUN labels must use Korean terminology");
assert(labelLib.includes("LIFETIME") && labelLib.includes("평생"), "LIFETIME labels must use Korean terminology");
assert(labelLib.includes("getEditionSortKey"), "must provide semantic sort key extraction");
assert(formatAnalysisEditionLabel("MONTH:2026-09") === "2026년 9월 분석", "MONTH labels must be formatted safely");
assert(formatAnalysisEditionLabel("YEAR:2027") === "2027년 분석", "YEAR labels must be formatted safely");
assert(formatAnalysisEditionLabel("TARGET_MONTH:2026-10") === "2026년 10월 대상 분석", "TARGET_MONTH labels must be formatted safely");
assert(formatAnalysisEditionLabel("TARGET_YEAR:2027") === "2027년 대상 분석", "TARGET_YEAR labels must be formatted safely");
assert(formatAnalysisEditionLabel("RANGE:2026-2028") === "2026~2028년 분석", "RANGE labels must be formatted safely");
assert(formatAnalysisEditionLabel("DAEUN:3:계유") === "대운 분석", "DAEUN labels must not expose the raw key");
assert(formatAnalysisEditionLabel("LIFETIME") === "평생 분석", "LIFETIME labels must be stable");
assert(formatAnalysisEditionLabel("LEGACY") === "기존 구매 분석", "LEGACY labels must not infer a period");
assert(formatAnalysisEditionLabel("UNEXPECTED:internal") === "구매한 분석", "unknown edition labels must not expose raw internal keys");
console.log("4. formatAnalysisEditionLabel produces customer-facing Korean labels ✓");

assert(compareEditionKeys("MONTH:2026-10", "MONTH:2026-09") < 0, "October must sort before September");
assert(compareEditionKeys("YEAR:2027", "YEAR:2026") < 0, "later years must sort first");
assert(compareEditionKeys("TARGET_MONTH:2026-10", "TARGET_MONTH:2026-09") < 0, "later target months must sort first");
assert(compareEditionKeys("RANGE:2026-2028", "RANGE:2025-2027") < 0, "later ranges must sort first");
assert(compareEditionKeys("DAEUN:3:계유", "DAEUN:2:임신") < 0, "later daeun orders must sort first");
assert(compareEditionKeys("MONTH:2026-09", "LEGACY") < 0, "modern editions must sort before LEGACY");
assert(purchasesServer.includes("compareEditionKeys(") && purchasesServer.includes("b.createdAt.localeCompare(a.createdAt)"), "the no-edition selector must use the shared semantic comparator with deterministic tie-breakers");
assert(!purchasesServer.includes('.order("created_at", { ascending: false })\n    .limit(1)\n    .maybeSingle<EntitlementRow>()'), "the no-edition selector must not choose an arbitrary single entitlement row");
console.log("4a. edition sorting and default no-edition selection are semantic and deterministic ✓");

const completedSeptember = {
  profileId: "profile-a",
  productId: "wealth",
  productName: "재물운 심층 분석",
  reportStatus: "completed" as const,
  analysisEditionKey: "MONTH:2026-09",
};
const generatingOctober = {
  ...completedSeptember,
  reportStatus: "generating" as const,
  analysisEditionKey: "MONTH:2026-10",
};
const groupedWithGeneratingLatest = groupPurchasedAnalysesByProduct([
  completedSeptember,
  generatingOctober,
]);
assert(groupedWithGeneratingLatest.length === 1 && groupedWithGeneratingLatest[0].editions.length === 2, "two active editions of one product must remain in one product group");
assert(groupedWithGeneratingLatest[0].editions[0].analysisEditionKey === "MONTH:2026-10" && groupedWithGeneratingLatest[0].editions[0].reportStatus === "generating", "latest October edition must retain its generating state");
assert(groupedWithGeneratingLatest[0].editions[1].analysisEditionKey === "MONTH:2026-09" && groupedWithGeneratingLatest[0].editions[1].reportStatus === "completed", "completed September history must remain independently accessible");
const groupedWithFailedLatest = groupPurchasedAnalysesByProduct([
  completedSeptember,
  { ...generatingOctober, reportStatus: "failed" as const },
]);
assert(groupedWithFailedLatest[0].editions[0].reportStatus === "failed" && groupedWithFailedLatest[0].editions[1].reportStatus === "completed", "a failed latest edition must not suppress an older completed edition");
console.log("4b. generating or failed latest editions preserve historical completed access ✓");

assert(reportGate.includes("getActiveProfile(user.id)") && reportGate.includes("activeProfile?.id !== profile.id"), "the report page gate must deny a URL for a non-active profile");
assert(detailRoute.includes("getActiveProfile(user.id)") && detailRoute.includes("activeProfile.id !== profile.id"), "the report API must enforce the same active-profile boundary");
console.log("4c. profile A report URLs are denied while profile B is active ✓");

// Section 5: Purchased-analyses page composes grouping, refresh, and multi-edition rendering.
assert(purchasedAnalysesPage.includes("PurchasedAnalysesAutoRefresh") && purchasedAnalysesPage.includes("groups={groups}"), "page must pass grouped analyses to the server-refresh wrapper");
assert(purchasedAnalysesPage.includes("groupPurchasedAnalysesByProduct(summaries)") || purchasedAnalysesPage.includes("groupPurchasedAnalysesByProduct(analyses)"), "grouping must be applied to summaries");
assert(purchasedAnalysesRefresh.includes("PurchasedAnalysesListMultiEdition") && purchasedAnalysesRefresh.includes("groups={groups}"), "refresh wrapper must render the multi-edition list with the grouped data");
console.log("5. purchased-analyses page composes grouping, refresh, and multi-edition rendering ✓");

// Section 6: Component receives grouped structure
assert(purchasedAnalysesListComponent.includes("PurchasedAnalysisProductGroup"), "component must accept grouped product type");
assert(purchasedAnalysesListComponent.includes("group.editions.map"), "component must iterate editions within groups");
assert(purchasedAnalysesListComponent.includes("editionLabel"), "component must display edition labels");
assert(purchasedAnalysesListComponent.includes("isLatest"), "component must mark latest editions visually");
console.log("6. PurchasedAnalysesListMultiEdition renders grouped editions with labels ✓");

// Section 7: Report links include edition parameter
assert(purchasedAnalysesListComponent.includes("edition=") && purchasedAnalysesListComponent.includes("encodeURIComponent"), "links must pass edition as query parameter");
assert(purchasedAnalysesListComponent.includes("edition.analysisEditionKey"), "report links must preserve edition key");
console.log("7. Report links pass edition information to /paid-analysis/[productId]/report ✓");

// Section 8: Status labels support all edition states
assert(purchasedAnalysesListComponent.includes("statusLabels") && purchasedAnalysesListComponent.includes("none:") && purchasedAnalysesListComponent.includes("generating:") && purchasedAnalysesListComponent.includes("completed:") && purchasedAnalysesListComponent.includes("failed:"), "must support none, generating, completed, failed");
console.log("8. All report statuses (none / generating / completed / failed) render correctly ✓");

// Section 9: Backward compatibility - entitlements without edition field
assert(groupingLib.includes("keyA === null") && groupingLib.includes("keyB === null"), "null edition (LEGACY) must be supported for backwards compatibility");
assert(groupingLib.includes("editionKey ?? \"LEGACY\""), "missing edition keys must be formatted as LEGACY");
console.log("9. LEGACY editions (null analysisEditionKey) display correctly ✓");

console.log("\npurchased-analyses-multi-edition-regression passed ✓");
