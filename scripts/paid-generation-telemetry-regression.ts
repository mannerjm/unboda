import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractPaidGenerationUsage,
  getPaidGenerationCommercialBand,
  getPaidGenerationProductFamily,
  hasPaidGenerationUsage,
  nextPaidGenerationRetryIndex,
  toPaidGenerationAttemptRow,
} from "../app/lib/paidGenerationTelemetry";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const usage = extractPaidGenerationUsage({
  _request_id: "req-usage",
  usage: {
    input_tokens: 100,
    input_tokens_details: { cached_tokens: 20, cache_write_tokens: 5 },
    output_tokens: 80,
    output_tokens_details: { reasoning_tokens: 30 },
    total_tokens: 180,
  },
});

assert(usage.inputTokens === 100, "input tokens must be extracted");
assert(usage.cachedInputTokens === 20, "cached input tokens must be extracted");
assert(usage.cacheWriteTokens === 5, "cache write tokens must be extracted");
assert(usage.outputTokens === 80, "output tokens must be extracted");
assert(usage.reasoningTokens === 30, "reasoning tokens must be extracted");
assert(usage.totalTokens === 180, "total tokens must be extracted");
assert(hasPaidGenerationUsage(usage), "present usage must be distinguishable");

const zeroUsage = extractPaidGenerationUsage({
  usage: {
    input_tokens: 0,
    input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
    output_tokens: 0,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 0,
  },
});

assert(zeroUsage.inputTokens === 0, "zero input tokens must remain zero");
assert(zeroUsage.totalTokens === 0, "zero total tokens must remain zero");
assert(hasPaidGenerationUsage(zeroUsage), "zero usage must be available");

const unavailableUsage = extractPaidGenerationUsage({});
assert(unavailableUsage.inputTokens === null, "missing input tokens must be null");
assert(unavailableUsage.totalTokens === null, "missing total tokens must be null");
assert(!hasPaidGenerationUsage(unavailableUsage), "missing usage must be unavailable");
assert(nextPaidGenerationRetryIndex(null) === 0, "first attempt must use retry index zero");
assert(nextPaidGenerationRetryIndex(0) === 1, "retry index must increment from zero");
assert(nextPaidGenerationRetryIndex(4) === 5, "retry index must increment from the highest attempt");

const launchIds = getLaunchProductIds();
const bands = launchIds.map((productId) => ({
  productId,
  family: getPaidGenerationProductFamily(productId),
  band: getPaidGenerationCommercialBand(productId),
}));

assert(bands.length === 54, "all launch products must be classified");
assert(new Set(bands.map((item) => item.productId)).size === 54, "launch IDs must be unique");
assert(bands.filter((item) => item.family === "TOPIC").length === 47, "47 topics must be classified");
assert(bands.filter((item) => item.family === "PERIOD").length === 7, "7 periods must be classified");
assert(!bands.some((item) => item.productId === "monthly-12months"), "non-launch monthly series must stay absent");
assert(getPaidGenerationCommercialBand("monthly-current") === "MONTHLY", "monthly band must map");
assert(getPaidGenerationCommercialBand("annual-3years") === "LONG_CYCLE", "long-cycle band must map");
assert(getPaidGenerationCommercialBand("lifetime-overview") === "SIGNATURE", "lifetime band must map");

const row = toPaidGenerationAttemptRow({
  attemptId: "attempt-1",
  generationId: "generation-1",
  reportId: "report-1",
  productId: "monthly-current",
  productFamily: "PERIOD",
  commercialBand: "MONTHLY",
  generationContractVersion: "V3",
  model: "gpt-5",
  reasoningEffort: "low",
  maxOutputTokens: 4800,
  requestId: "req-1",
  startedAt: "2026-08-20T00:00:00.000Z",
  completedAt: "2026-08-20T00:00:01.000Z",
  durationMs: 1000,
  status: "succeeded",
  failureStage: null,
  retryIndex: 0,
  usageAvailable: true,
  inputTokens: 100,
  cachedInputTokens: 20,
  cacheWriteTokens: 5,
  outputTokens: 80,
  reasoningTokens: 30,
  totalTokens: 180,
});

assert(row.attempt_id === "attempt-1", "attempt row mapping must preserve identity");
assert(row.input_tokens === 100 && row.total_tokens === 180, "attempt row mapping must preserve usage");
assert(row.product_family === "PERIOD" && row.commercial_band === "MONTHLY", "attempt row mapping must preserve commercial dimensions");

const detailService = read("app/lib/paidAnalysisDetailService.ts");

const consistencyHookIndex = detailService.indexOf('hooks?.onFailureStage("consistency")');
const consistencyCallIndex = detailService.indexOf("validatePaidAnalysisConsistency(compressedDetail)");
assert(
  consistencyHookIndex !== -1 && consistencyCallIndex !== -1 && consistencyHookIndex < consistencyCallIndex,
  "onFailureStage('consistency') must be set before validatePaidAnalysisConsistency runs, so an internal throw is still tagged correctly",
);

const selfReviewHookIndex = detailService.indexOf('hooks?.onFailureStage("self_review")');
const selfReviewCallIndex = detailService.indexOf("reviewPaidAnalysisDetail(compressedDetail)");
assert(
  selfReviewHookIndex !== -1 && selfReviewCallIndex !== -1 && selfReviewHookIndex < selfReviewCallIndex,
  "onFailureStage('self_review') must be set before reviewPaidAnalysisDetail runs, so an internal throw is still tagged correctly",
);
console.log("5. consistency/self_review failureStage hooks are set before the fallible call ✓");

const telemetryServer = read("app/lib/paidGenerationTelemetryServer.ts");
assert(
  telemetryServer.includes('.update({ failure_stage: input.failureStage, status: "failed" })'),
  "markPaidGenerationPersistenceFailure must move status to failed alongside failure_stage, never leaving status=succeeded with failure_stage=persistence",
);
console.log("6. persistence failure marking updates both failure_stage and status ✓");

console.log("paid-generation-telemetry-regression passed");