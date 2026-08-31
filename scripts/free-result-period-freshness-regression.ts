import { readFileSync } from "node:fs";
import { hasCurrentEvaluationPeriod } from "../app/lib/freeAnalysisResults/server";
import type { AnalyzeSuccessResponse } from "../app/lib/analyzeApiTypes";
import { createEvaluationContext } from "../app/lib/evaluationContext";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }

const content = { saju: { evaluationContext: createEvaluationContext("2026-08-15") } } as AnalyzeSuccessResponse;
assert(hasCurrentEvaluationPeriod(content, createEvaluationContext("2026-08-31")), "same evaluation month is reusable");
assert(!hasCurrentEvaluationPeriod(content, createEvaluationContext("2026-09-01")), "month change is stale");
assert(!hasCurrentEvaluationPeriod(content, createEvaluationContext("2027-01-01")), "year change is stale");
assert(!hasCurrentEvaluationPeriod({ saju: {} } as AnalyzeSuccessResponse, createEvaluationContext("2026-08-15")), "legacy missing context is stale");
assert(!hasCurrentEvaluationPeriod(null, createEvaluationContext("2026-08-15")), "missing content is stale");

const results = readFileSync("app/lib/freeAnalysisResults/server.ts", "utf8");
const registeredRetry = readFileSync("app/api/free-analysis/[profileId]/retry-main-analysis/route.ts", "utf8");
const registeredAnalyze = readFileSync("app/api/analyze/route.ts", "utf8");
const guestGet = readFileSync("app/api/guest-free-analysis/route.ts", "utf8");
const guestRetry = readFileSync("app/api/guest-free-analysis/retry-main-analysis/route.ts", "utf8");
const paidReports = readFileSync("app/lib/paidReports/server.ts", "utf8");
assert(results.includes("hasCurrentEvaluationPeriod") && results.includes('content: null'), "stale registered results claim whole-response regeneration");
assert(registeredRetry.includes("STALE_EVALUATION_PERIOD") && registeredAnalyze.includes("evaluationContext"), "registered read and generation paths use period context");
assert(guestGet.includes("STALE_EVALUATION_PERIOD") && guestRetry.includes("STALE_EVALUATION_PERIOD"), "guest read and retry paths protect freshness");
assert(!results.includes("purchases") && !results.includes("entitlements"), "freshness key excludes purchase and entitlement state");
assert(paidReports.includes("getPaidReport") && !paidReports.includes("evaluationContext"), "paid report persistence is not invalidated by recommendation period");
console.log(JSON.stringify({ samePeriodReusable: true, monthStale: true, yearStale: true, legacySafe: true, purchaseIndependent: true, entitlementIndependent: true, paidReportUnchanged: true }));
