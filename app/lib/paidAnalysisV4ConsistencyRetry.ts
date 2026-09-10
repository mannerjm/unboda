import {
  generatePaidAnalysisDetailV4,
} from "./paidAnalysisDetailService";
import type { ResolvedPaidAnalysisDetailV4 } from "./paidAnalysisDetailOutput";
import type { PaidAnalysisDetailPromptInput } from "./paidAnalysisDetailPrompt";
import type { PaidAnalysisResponseTelemetry } from "./ai/generateAnalysisText";

export const PAID_ANALYSIS_V4_CONSISTENCY_RETRY_LIMIT = 1;

const CONSISTENCY_ERROR_PREFIX =
  "심층 분석 결과의 섹션 간 일관성 검증에 실패했습니다.";

type PaidAnalysisV4Generator = (
  input: PaidAnalysisDetailPromptInput,
  options?: {
    onResponseTelemetry?: (telemetry: PaidAnalysisResponseTelemetry) => void;
  },
) => Promise<ResolvedPaidAnalysisDetailV4>;

export function isRetryablePaidAnalysisV4ConsistencyError(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith(CONSISTENCY_ERROR_PREFIX)
  );
}

function sumTelemetryField(
  telemetry: PaidAnalysisResponseTelemetry[],
  field: "inputTokens" | "outputTokens" | "reasoningTokens",
): number | null {
  const values = telemetry.map((item) => item[field]);
  if (values.some((value) => value === null)) {
    return null;
  }

  return (values as number[]).reduce((sum, value) => sum + value, 0);
}

export function mergePaidAnalysisV4ResponseTelemetry(
  telemetry: PaidAnalysisResponseTelemetry[],
): PaidAnalysisResponseTelemetry | null {
  if (telemetry.length === 0) {
    return null;
  }

  const last = telemetry[telemetry.length - 1];

  return {
    status: last.status,
    incompleteReason: last.incompleteReason,
    inputTokens: sumTelemetryField(telemetry, "inputTokens"),
    outputTokens: sumTelemetryField(telemetry, "outputTokens"),
    reasoningTokens: sumTelemetryField(telemetry, "reasoningTokens"),
    responseIdPresent: last.responseIdPresent,
    durationMs: telemetry.reduce((sum, item) => sum + item.durationMs, 0),
  };
}

export async function generatePaidAnalysisDetailV4WithConsistencyRetry(
  input: PaidAnalysisDetailPromptInput,
  options?: {
    onResponseTelemetry?: (telemetry: PaidAnalysisResponseTelemetry) => void;
    generator?: PaidAnalysisV4Generator;
  },
): Promise<ResolvedPaidAnalysisDetailV4> {
  const generator = options?.generator ?? generatePaidAnalysisDetailV4;
  const telemetryEvents: PaidAnalysisResponseTelemetry[] = [];
  let consistencyRetryCount = 0;

  const emitMergedTelemetry = () => {
    const merged = mergePaidAnalysisV4ResponseTelemetry(telemetryEvents);
    if (merged && options?.onResponseTelemetry) {
      options.onResponseTelemetry(merged);
    }
  };

  while (true) {
    try {
      const result = await generator(input, {
        onResponseTelemetry: (telemetry) => {
          telemetryEvents.push(telemetry);
        },
      });

      emitMergedTelemetry();
      return result;
    } catch (error) {
      const shouldRetry =
        consistencyRetryCount < PAID_ANALYSIS_V4_CONSISTENCY_RETRY_LIMIT &&
        isRetryablePaidAnalysisV4ConsistencyError(error);

      if (!shouldRetry) {
        emitMergedTelemetry();
        throw error;
      }

      consistencyRetryCount += 1;
      console.warn("[paid-analysis-v4] consistency-regeneration", {
        productId: input.productId,
        retryAttempt: consistencyRetryCount,
        retryLimit: PAID_ANALYSIS_V4_CONSISTENCY_RETRY_LIMIT,
      });
    }
  }
}
