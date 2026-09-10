import { randomUUID } from "node:crypto";
import {
  generatePaidAnalysisDetailV2,
  generatePaidAnalysisDetailV4,
} from "./paidAnalysisDetailService";
import type {
  PaidAnalysisDetailOutputV3,
  ResolvedPaidAnalysisDetailV4,
} from "./paidAnalysisDetailOutput";
import type { PaidAnalysisDetailPromptInput } from "./paidAnalysisDetailPrompt";
import {
  getPaidGenerationCommercialBand,
  getPaidGenerationProductFamily,
  type PaidGenerationAttempt,
  type PaidGenerationAttemptStatus,
  type PaidGenerationFailureStage,
  type PaidGenerationTelemetryContext,
} from "./paidGenerationTelemetry";
import {
  resolveMaxOutputTokens,
  resolveModel,
  type PaidAnalysisResponseTelemetry,
} from "./ai/generateAnalysisText";
import { resolvePaidAnalysisLaunchSpecialization } from "./paidAnalysisTopicConfig";
import { getPaidAnalysisEngine } from "./paidAnalysisEngine";
import { validatePaidAnalysisV4HealthSafety } from "./paidAnalysisV4HealthSafetyValidator";

export const PAID_ANALYSIS_V4_RUNTIME_FLAG = "PAID_ANALYSIS_V4_RUNTIME_ENABLED";

export function isPaidAnalysisV4RuntimeEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment[PAID_ANALYSIS_V4_RUNTIME_FLAG] === "true";
}

function classifyFailureStage(error: unknown): PaidGenerationFailureStage {
  const message = error instanceof Error ? error.message : "";

  if (/incomplete/i.test(message)) return "response";
  if (/응답이 비어|empty/i.test(message)) return "extraction";
  if (/JSON|파싱/i.test(message)) return "parse";
  if (/일관성|consistency/i.test(message)) return "consistency";
  if (/Self Review|self-review/i.test(message)) return "self_review";
  if (/품질 기준|건강운.*안전|재무 안전|의료적 진단|치료 지시/i.test(message)) {
    return "category_validation";
  }
  if (/schema|스키마|근거를 확인하지 못/i.test(message)) return "schema";

  return "request";
}

function classifyAttemptStatus(
  error: unknown,
  responseTelemetry: PaidAnalysisResponseTelemetry | null,
): PaidGenerationAttemptStatus {
  if (responseTelemetry?.status === "incomplete") {
    return "incomplete";
  }

  if (
    error instanceof Error &&
    (error.name === "AbortError" || /abort|timeout/i.test(error.message))
  ) {
    return "timed_out";
  }

  return "failed";
}

async function persistV4Attempt(input: {
  telemetryContext: PaidGenerationTelemetryContext;
  productId: string;
  attemptId: string;
  retryIndex: number;
  startedAt: string;
  startedMs: number;
  status: PaidGenerationAttemptStatus;
  failureStage: PaidGenerationFailureStage | null;
  responseTelemetry: PaidAnalysisResponseTelemetry | null;
}): Promise<void> {
  const { persistPaidGenerationAttempt } = await import(
    "./paidGenerationTelemetryServer"
  );
  const completedAt = new Date().toISOString();
  const inputTokens = input.responseTelemetry?.inputTokens ?? null;
  const outputTokens = input.responseTelemetry?.outputTokens ?? null;
  const reasoningTokens = input.responseTelemetry?.reasoningTokens ?? null;
  const totalTokens =
    inputTokens !== null && outputTokens !== null
      ? inputTokens + outputTokens
      : null;
  const attempt: PaidGenerationAttempt = {
    attemptId: input.attemptId,
    generationId: input.telemetryContext.generationId,
    reportId: input.telemetryContext.reportId,
    productId: input.productId,
    productFamily: getPaidGenerationProductFamily(input.productId),
    commercialBand: getPaidGenerationCommercialBand(input.productId),
    generationContractVersion: "V4",
    model: resolveModel("paid-analysis-detail-v4"),
    reasoningEffort: "low",
    maxOutputTokens: resolveMaxOutputTokens("paid-analysis-detail-v4"),
    requestId: null,
    startedAt: input.startedAt,
    completedAt,
    durationMs:
      input.responseTelemetry?.durationMs ?? Date.now() - input.startedMs,
    status: input.status,
    failureStage: input.failureStage,
    retryIndex: input.retryIndex,
    usageAvailable:
      inputTokens !== null || outputTokens !== null || reasoningTokens !== null,
    inputTokens,
    cachedInputTokens: null,
    cacheWriteTokens: null,
    outputTokens,
    reasoningTokens,
    totalTokens,
  };

  await persistPaidGenerationAttempt(attempt);
}

export async function generatePaidAnalysisDetailV4ForPaidReport(
  input: PaidAnalysisDetailPromptInput,
  telemetryContext: PaidGenerationTelemetryContext,
): Promise<ResolvedPaidAnalysisDetailV4> {
  if (!input.productId) {
    throw new Error("V4 유료 분석 상품 ID를 확인하지 못했습니다.");
  }

  const attemptId = telemetryContext.attemptId ?? randomUUID();
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const { getNextPaidGenerationRetryIndex } = await import(
    "./paidGenerationTelemetryServer"
  );
  const retryIndex =
    telemetryContext.retryIndex ??
    (await getNextPaidGenerationRetryIndex(telemetryContext.generationId));
  let responseTelemetry: PaidAnalysisResponseTelemetry | null = null;
  let status: PaidGenerationAttemptStatus = "failed";
  let failureStage: PaidGenerationFailureStage | null = "request";

  try {
    const detail = await generatePaidAnalysisDetailV4(input, {
      onResponseTelemetry: (telemetry) => {
        responseTelemetry = telemetry;
      },
    });

    if (getPaidAnalysisEngine(input.productId) === "HEALTH") {
      failureStage = "category_validation";
      const healthSafety = validatePaidAnalysisV4HealthSafety(detail);

      if (!healthSafety.ok) {
        const issueMessage = healthSafety.issues
          .map((issue) => `${issue.field}: ${issue.message}`)
          .join(" | ");

        throw new Error(
          `건강운 V4 심층 분석 결과의 안전 검증에 실패했습니다. ${issueMessage}`,
        );
      }
    }

    status = "succeeded";
    failureStage = null;
    return detail;
  } catch (error) {
    status = classifyAttemptStatus(error, responseTelemetry);
    failureStage = classifyFailureStage(error);
    throw error;
  } finally {
    try {
      await persistV4Attempt({
        telemetryContext,
        productId: input.productId,
        attemptId,
        retryIndex,
        startedAt,
        startedMs,
        status,
        failureStage,
        responseTelemetry,
      });
    } catch (telemetryError) {
      console.error("[paid-generation-v4-telemetry] persistence-failed", {
        attemptId,
        reportId: telemetryContext.reportId,
        productId: input.productId,
        error:
          telemetryError instanceof Error
            ? telemetryError.message
            : "unknown",
      });
    }
  }
}

export async function generatePaidAnalysisDetailForPurchasedRuntime(
  input: PaidAnalysisDetailPromptInput,
  telemetryContext: PaidGenerationTelemetryContext,
): Promise<PaidAnalysisDetailOutputV3 | ResolvedPaidAnalysisDetailV4> {
  const specialization = resolvePaidAnalysisLaunchSpecialization(input.productId);

  if (
    !isPaidAnalysisV4RuntimeEnabled() ||
    specialization.kind === "none"
  ) {
    return generatePaidAnalysisDetailV2(input, telemetryContext);
  }

  return generatePaidAnalysisDetailV4ForPaidReport(input, telemetryContext);
}
