import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const page = read("app/paid-analysis/[productId]/report/page.tsx");
const client = read("app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx");
const gate = read("app/paid-analysis/[productId]/report/ReportAccessGate.tsx");
const status = read("app/api/paid-analysis-detail-v2/status/route.ts");
const generation = read("app/api/paid-analysis-detail-v2/route.ts");

assert(page.includes("<ReportAccessGate") && page.indexOf("<ReportAccessGate") < page.lastIndexOf("<PaidReportBody"), "the server report body must be nested inside the entitlement gate");
assert(gate.includes("hasActiveEntitlementForProfileEdition") && gate.includes("activeProfile?.id !== profile.id"), "do not bypass edition or active-profile authorization");
assert(page.includes("getActiveEntitlementForProfileEdition") && page.includes("getActiveEntitlementForProfile("), "resolve the purchased edition, including legacy URLs");
assert(page.includes("getPaidReport(user.id, profileId, productId, exactEdition)"), "existing report lookup must be account/profile/product/edition scoped");
assert(page.includes('stored?.status === "completed" && stored.content'), "prefetch only completed persisted reports");
assert(page.includes("initialDetail={initialDetail}") && page.includes("key={"), "render the exact stored report snapshot without stale client state between editions");
assert(!page.includes("claimPaidReport(") && !page.includes("generatePaidAnalysisDetailForPurchasedRuntime("), "server revisit path must never start generation");
assert(client.includes("if (initialDetail) return;") && client.includes("initialDetail && isPaidAnalysisDetailV4(initialDetail)"), "a completed persisted report must render without a generation request");
assert(client.includes("if (isGeneratingElsewhere)") && client.includes('<PaidReportPreparing kind="premium" />'), "show the actual generation animation only after an in-progress response");
assert(client.includes("저장된 리포트를 열고 있습니다.") && !client.includes("if (isGeneratingElsewhere || isLoading || !detail)"), "initial network loading must never masquerade as paid generation");
assert(status.includes('"Cache-Control": "private, no-store"'), "status polling must remain private");
assert(generation.includes('claimPaidReport({') && generation.includes('if (claim.state === "completed" && claim.report.content)'), "unfinished first-time purchases and idempotent completed-report fallback must remain intact");
console.log("stored paid report direct-open regression: PASS");
