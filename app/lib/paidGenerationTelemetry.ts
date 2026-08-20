import type { Response } from "openai/resources/responses/responses";
import { getPaidAnalysisTopicConfig } from "./paidAnalysisTopicConfig";
import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";
import { getCanonicalPremiumProductId } from "./premiumProductRegistry";

export type PaidGenerationProductFamily = "TOPIC" | "PERIOD";

export type PaidGenerationCommercialBand =
  | "T1_ENTRY"
  | "T2_STANDARD"
  | "T3_DEEP"
  | "T4_STRATEGIC"
  | "T5_SIGNATURE"
  | "MONTHLY"
  | "ANNUAL"
  | "LONG_CYCLE"
  | "SIGNATURE";

export type PaidGenerationAttemptStatus =
  | "succeeded"
  | "failed"
  | "timed_out"
  | "incomplete"
  | "aborted";

export type PaidGenerationFailureStage =
  | "request"
  | "response"
  | "extraction"
  | "parse"
  | "schema"
  | "consistency"
  | "self_review"
  | "category_validation"
  | "persistence";

export type PaidGenerationUsage = {
  inputTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
};

export type PaidGenerationAttempt = {
  attemptId: string;
  generationId: string;
  reportId: string;
  productId: string;
  productFamily: PaidGenerationProductFamily;
  commercialBand: PaidGenerationCommercialBand;
  generationContractVersion: "V3";
  model: string;
  reasoningEffort: "low";
  maxOutputTokens: number;
  requestId: string | null;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: PaidGenerationAttemptStatus;
  failureStage: PaidGenerationFailureStage | null;
  retryIndex: number;
  usageAvailable: boolean;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
};

export type PaidGenerationAttemptRow = {
  attempt_id: string;
  generation_id: string;
  report_id: string;
  product_id: string;
  product_family: PaidGenerationProductFamily;
  commercial_band: PaidGenerationCommercialBand;
  generation_contract_version: "V3";
  model: string;
  reasoning_effort: "low";
  max_output_tokens: number;
  request_id: string | null;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  status: PaidGenerationAttemptStatus;
  failure_stage: PaidGenerationFailureStage | null;
  retry_index: number;
  usage_available: boolean;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  cache_write_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
  total_tokens: number | null;
};

export type PaidGenerationTelemetryContext = {
  attemptId?: string;
  reportId: string;
  generationId: string;
  retryIndex?: number;
};

export type PaidGenerationTextResult = {
  text: string;
  requestId: string | null;
  model: string;
  reasoningEffort: "low";
  maxOutputTokens: number;
  usage: PaidGenerationUsage;
  usageAvailable: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

export class PaidGenerationTextError extends Error {
  readonly telemetry: PaidGenerationTextResult;
  readonly failureStage: Extract<PaidGenerationFailureStage, "request" | "response" | "extraction">;
  readonly status: Extract<PaidGenerationAttemptStatus, "failed" | "timed_out" | "incomplete" | "aborted">;

  constructor(input: {
    message: string;
    telemetry: PaidGenerationTextResult;
    failureStage: Extract<PaidGenerationFailureStage, "request" | "response" | "extraction">;
    status: Extract<PaidGenerationAttemptStatus, "failed" | "timed_out" | "incomplete" | "aborted">;
  }) {
    super(input.message);
    this.name = "PaidGenerationTextError";
    this.telemetry = input.telemetry;
    this.failureStage = input.failureStage;
    this.status = input.status;
  }
}

type ResponseWithRequestId = Pick<Response, "usage"> & {
  _request_id?: string | null;
};

function nullableNumber(value: number | undefined): number | null {
  return value === undefined ? null : value;
}

export function extractPaidGenerationUsage(
  response: ResponseWithRequestId,
): PaidGenerationUsage {
  const usage = response.usage;

  return {
    inputTokens: nullableNumber(usage?.input_tokens),
    cachedInputTokens: nullableNumber(usage?.input_tokens_details?.cached_tokens),
    cacheWriteTokens: nullableNumber(usage?.input_tokens_details?.cache_write_tokens),
    outputTokens: nullableNumber(usage?.output_tokens),
    reasoningTokens: nullableNumber(usage?.output_tokens_details?.reasoning_tokens),
    totalTokens: nullableNumber(usage?.total_tokens),
  };
}

export function hasPaidGenerationUsage(usage: PaidGenerationUsage): boolean {
  return Object.values(usage).some((value) => value !== null);
}

export function nextPaidGenerationRetryIndex(
  highestExistingRetryIndex: number | null,
): number {
  return highestExistingRetryIndex === null ? 0 : highestExistingRetryIndex + 1;
}

export function toPaidGenerationAttemptRow(
  attempt: PaidGenerationAttempt,
): PaidGenerationAttemptRow {
  return {
    attempt_id: attempt.attemptId,
    generation_id: attempt.generationId,
    report_id: attempt.reportId,
    product_id: attempt.productId,
    product_family: attempt.productFamily,
    commercial_band: attempt.commercialBand,
    generation_contract_version: attempt.generationContractVersion,
    model: attempt.model,
    reasoning_effort: attempt.reasoningEffort,
    max_output_tokens: attempt.maxOutputTokens,
    request_id: attempt.requestId,
    started_at: attempt.startedAt,
    completed_at: attempt.completedAt,
    duration_ms: attempt.durationMs,
    status: attempt.status,
    failure_stage: attempt.failureStage,
    retry_index: attempt.retryIndex,
    usage_available: attempt.usageAvailable,
    input_tokens: attempt.inputTokens,
    cached_input_tokens: attempt.cachedInputTokens,
    cache_write_tokens: attempt.cacheWriteTokens,
    output_tokens: attempt.outputTokens,
    reasoning_tokens: attempt.reasoningTokens,
    total_tokens: attempt.totalTokens,
  };
}

export function getPaidGenerationRequestId(
  response: ResponseWithRequestId,
): string | null {
  return response._request_id ?? null;
}

const TOPIC_T1 = new Set([
  "career-workplace-adaptation",
  "career-workplace-relationships",
  "relationship-unrequited",
  "relationship-partner-pattern",
  "relationship-intimacy",
  "health-energy-recovery",
  "health-sleep-rhythm",
  "health-stress-regulation",
  "health-habit-continuity",
  "study-learning-strategy",
  "study-exam-preparation",
  "study-focus-routine",
]);

const TOPIC_T2 = new Set([
  "career-job-fit",
  "career-leadership-readiness",
  "money-wealth-accumulation",
  "money-saving-discipline",
  "money-spending-decision",
  "relationship-new-connection",
  "relationship-friendship",
  "relationship-family-role",
  "health-body-signal-review",
  "study-credential-decision",
  "business-startup-readiness",
  "business-client-relationship",
]);

const TOPIC_T3 = new Set([
  "career-job-change",
  "career-specialization",
  "career-promotion-readiness",
  "career-freelance-transition",
  "career-workload-recovery",
  "money-leak-risk",
  "money-income-stability",
  "money-debt-repayment",
  "money-emergency-buffer",
  "money-shared-finance",
  "money-contract-commitment",
  "relationship-long-distance",
  "relationship-current",
  "relationship-marriage",
  "relationship-conflict",
  "relationship-boundary",
  "relationship-reunion",
  "health-burnout-risk",
  "business-expansion-control",
  "business-team-management",
]);

const TOPIC_T4 = new Set(["career", "wealth", "relationship"]);

const PERIOD_BANDS: Record<string, PaidGenerationCommercialBand> = {
  "monthly-current": "MONTHLY",
  "monthly-next": "MONTHLY",
  "yearly-current": "ANNUAL",
  "annual-next": "ANNUAL",
  "annual-3years": "LONG_CYCLE",
  "daeun-current": "LONG_CYCLE",
  "lifetime-overview": "SIGNATURE",
};

export function getPaidGenerationProductFamily(
  productId: string,
): PaidGenerationProductFamily {
  const canonicalProductId = getCanonicalPremiumProductId(productId);

  if (getPeriodAnalysisStrategy(canonicalProductId)) {
    return "PERIOD";
  }

  if (getPaidAnalysisTopicConfig(canonicalProductId)) {
    return "TOPIC";
  }

  throw new Error(`Unknown paid generation product: ${productId}`);
}

export function getPaidGenerationCommercialBand(
  productId: string,
): PaidGenerationCommercialBand {
  const canonicalProductId = getCanonicalPremiumProductId(productId);
  const periodBand = PERIOD_BANDS[canonicalProductId];

  if (periodBand) {
    return periodBand;
  }

  if (TOPIC_T1.has(canonicalProductId)) return "T1_ENTRY";
  if (TOPIC_T2.has(canonicalProductId)) return "T2_STANDARD";
  if (TOPIC_T3.has(canonicalProductId)) return "T3_DEEP";
  if (TOPIC_T4.has(canonicalProductId)) return "T4_STRATEGIC";

  throw new Error(`Missing commercial band for paid product: ${productId}`);
}