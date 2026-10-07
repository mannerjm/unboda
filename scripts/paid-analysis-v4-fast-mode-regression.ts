import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolveMaxOutputTokens,
  resolveModel,
  resolveReasoningEffort,
  resolveServiceTier,
  shouldFallbackPaidAnalysisV4FastMode,
} from "../app/lib/ai/generateAnalysisText";

assert.equal(resolveModel("paid-analysis-detail-v4"), "gpt-5.6-sol");
assert.equal(resolveReasoningEffort("paid-analysis-detail-v4"), "low");
assert.equal(resolveMaxOutputTokens("paid-analysis-detail-v4"), 6000);
assert.equal(resolveServiceTier("paid-analysis-detail-v4"), "fast");

for (const callType of [
  "main-analysis",
  "recommendation-analysis",
  "paid-analysis-detail",
  "ai-consulting",
] as const) {
  assert.equal(
    resolveServiceTier(callType),
    undefined,
    `${callType} must not change service tier`,
  );
}

assert.equal(
  shouldFallbackPaidAnalysisV4FastMode(
    Object.assign(new Error("service_tier fast is not supported for this project"), { status: 400 }),
  ),
  true,
);
assert.equal(
  shouldFallbackPaidAnalysisV4FastMode(
    Object.assign(new Error("permission denied for priority processing"), { status: 403 }),
  ),
  true,
);
assert.equal(
  shouldFallbackPaidAnalysisV4FastMode(
    Object.assign(new Error("upstream unavailable"), { status: 503 }),
  ),
  false,
);

const aiSource = readFileSync("app/lib/ai/generateAnalysisText.ts", "utf8");
assert(aiSource.includes("service_tier: activeServiceTier"));
assert(aiSource.includes("[generateAnalysisText] fast-mode-fallback"));
assert(aiSource.includes("fastModeFallbackCount === 0"));

const serviceSource = readFileSync("app/lib/paidAnalysisDetailService.ts", "utf8");
for (const marker of [
  "buildPaidAnalysisDetailPromptV4(input)",
  'callType: "paid-analysis-detail-v4"',
  "validatePaidAnalysisConsistencyV4(detail)",
  "reviewPaidAnalysisDetailV4(detail)",
  "validateCustomerFacingLanguage(detail)",
  "validateCustomerFacingDistinctness(detail)",
  "validatePremiumCustomerValue(detail)",
  "resolvePaidAnalysisDetailV4(",
  "auditPaidAnalysisV4ActualOutputTier(input.productId, result)",
]) {
  assert(
    serviceSource.includes(marker),
    `V4 quality pipeline marker changed or disappeared: ${marker}`,
  );
}

console.log(
  "paid-analysis-v4-fast-mode-regression: PASS (same Sol/V4 quality pipeline + Fast mode + safe fallback)",
);
