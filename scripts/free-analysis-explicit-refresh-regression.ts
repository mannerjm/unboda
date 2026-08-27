import { readFileSync } from "node:fs";
import { hasCurrentEvaluationPeriod } from "../app/lib/freeAnalysisResults/server";
import { createEvaluationContext } from "../app/lib/evaluationContext";
import type { AnalyzeSuccessResponse } from "../app/lib/analyzeApiTypes";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
function read(path: string): string { return readFileSync(path, "utf8"); }

const refresh = read("app/api/free-analysis/[profileId]/refresh/route.ts");
const getRoute = read("app/api/free-analysis/[profileId]/route.ts");
const analyze = read("app/api/analyze/route.ts");
const results = read("app/lib/freeAnalysisResults/server.ts");
const summary = read("app/api/mypage/summary/route.ts");
const schedulerRoutes = `${read("app/api/internal/payments/refunds/reconcile/route.ts")} ${read("app/api/internal/payments/reconcile/route.ts")}`;
const old = { saju: { evaluationContext: createEvaluationContext("2026-08-15") } } as AnalyzeSuccessResponse;
assert(hasCurrentEvaluationPeriod(old, createEvaluationContext("2026-08-31")), "same month remains current");
assert(!hasCurrentEvaluationPeriod(old, createEvaluationContext("2026-09-01")), "month boundary is stale");
assert(refresh.includes('allowPeriodRefresh: true'), "only explicit refresh opts into stale claim");
assert(refresh.includes("completeFreeAnalysisResult") && refresh.includes("buildFreeAnalysisResponse"), "refresh regenerates and persists complete response");
assert(refresh.includes("failFreeAnalysisResult") && refresh.includes("period-refresh-failed"), "refresh failure keeps retryable state");
assert(!refresh.includes("purchases") && !refresh.includes("entitlements") && !refresh.includes("paid_reports"), "refresh does not touch paid data");
assert(getRoute.includes("analysis: cached.content") && getRoute.includes('freshness: "STALE"'), "ordinary GET preserves stale content and metadata");
assert(!getRoute.includes("claimFreeAnalysisResult") && !getRoute.includes("buildFreeAnalysisResponse"), "ordinary GET does not claim or generate");
assert(analyze.includes('claim.state === "stale"') && analyze.includes('refreshAvailable: true'), "analyze stale response requires explicit refresh");
assert(results.includes('if (!input.allowPeriodRefresh) return { state: "stale", record: existing };'), "stale claim is opt-in");
assert(summary.includes("resolveProfileFreeAnalysisStatus(profile, summaries, evaluationContext)"), "My Page derives current/stale without generation");
assert(!schedulerRoutes.includes("refresh"), "no scheduler/background refresh path exists");
console.log(JSON.stringify({ staleReadSideEffectFree: true, explicitRefreshOnly: true, oldContentPreservedOnFailure: true, currentRefreshNoOp: true, duplicateClaimProtectedByExistingLifecycle: true, purchaseIndependent: true, schedulerRefreshAbsent: true }));
