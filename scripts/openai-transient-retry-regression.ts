import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveTransientRetryDelayMs,
  resolveTransientRetryLimit,
  shouldRetryPaidAnalysisV4TransientError,
} from "../app/lib/ai/generateAnalysisText";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  process.stdout.write(".");
}

assert(
  resolveTransientRetryLimit("paid-analysis-detail-v4") === 2,
  "V4 paid analysis must allow exactly two transient retries",
);

for (const callType of [
  "main-analysis",
  "recommendation-analysis",
  "paid-analysis-detail",
  "ai-consulting",
] as const) {
  assert(
    resolveTransientRetryLimit(callType) === 0,
    `${callType} must remain outside the V4 transient retry policy`,
  );
}

for (const status of [429, 500, 502, 503, 504]) {
  assert(
    shouldRetryPaidAnalysisV4TransientError({ status }),
    `HTTP ${status} must be retryable for V4 paid analysis`,
  );
}

assert(
  shouldRetryPaidAnalysisV4TransientError({
    status: 429,
    code: "rate_limit_exceeded",
    type: "rate_limit_error",
  }),
  "ordinary 429 rate limits must remain retryable",
);

for (const quotaError of [
  {
    status: 429,
    code: "credit_balance_exhausted",
    type: "insufficient_quota",
  },
  { status: 429, code: "credit_balance_exhausted" },
  { status: 429, code: "insufficient_quota" },
  { status: 429, type: "insufficient_quota" },
  { status: "429", code: "CREDIT_BALANCE_EXHAUSTED", type: "INSUFFICIENT_QUOTA" },
]) {
  assert(
    !shouldRetryPaidAnalysisV4TransientError(quotaError),
    "quota and credit exhaustion must fail immediately instead of retrying",
  );
}

for (const status of [400, 401, 403, 404, 409, 422]) {
  assert(
    !shouldRetryPaidAnalysisV4TransientError({ status }),
    `HTTP ${status} must not be retried`,
  );
}

assert(
  !shouldRetryPaidAnalysisV4TransientError(new Error("JSON parse failed")),
  "quality and parsing failures without a transient HTTP status must not retry",
);

const abortError = new Error("request aborted");
abortError.name = "AbortError";
assert(
  !shouldRetryPaidAnalysisV4TransientError(abortError),
  "timeouts and aborts must not retry automatically",
);

assert(resolveTransientRetryDelayMs(1) === 400, "first retry delay must be 400ms");
assert(resolveTransientRetryDelayMs(2) === 1200, "second retry delay must be 1200ms");
assert(resolveTransientRetryDelayMs(3) === 0, "there must be no third retry delay");

const openAIClientSource = readFileSync(
  join(process.cwd(), "app/lib/ai/openAIClient.ts"),
  "utf8",
);
assert(
  openAIClientSource.includes("maxRetries: 0"),
  "global OpenAI SDK retries must stay disabled so only the V4 boundary retries",
);

const generatorSource = readFileSync(
  join(process.cwd(), "app/lib/ai/generateAnalysisText.ts"),
  "utf8",
);
const retryWarnMatch = generatorSource.match(
  /console\.warn\("\[generateAnalysisText\] transient-retry",\s*\{[\s\S]*?\}\s*\);/,
);
assert(Boolean(retryWarnMatch), "retry telemetry log must exist");

const retryWarnPayload = retryWarnMatch![0].slice(retryWarnMatch![0].indexOf("{"));
for (const forbidden of [
  "prompt",
  "input",
  "responseText",
  "birthData",
  "saju",
  "userConcern",
]) {
  assert(
    !retryWarnPayload.includes(forbidden),
    `retry telemetry must not log ${forbidden} content`,
  );
}

for (const allowed of [
  "callType",
  "model",
  "retryAttempt",
  "retryLimit",
  "retryDelayMs",
  "errorStatus",
  "errorCode",
]) {
  assert(
    retryWarnPayload.includes(allowed),
    `retry telemetry should include ${allowed}`,
  );
}

console.log("\n✅ V4 transient OpenAI retry policy regression passed");
