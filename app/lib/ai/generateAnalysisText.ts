import { getOpenAIClient } from "./openAIClient";
import type { Response as OpenAIResponse } from "openai/resources/responses/responses";
import {
  extractPaidGenerationUsage,
  getPaidGenerationRequestId,
  PaidGenerationTextError,
  type PaidGenerationTextResult,
} from "../paidGenerationTelemetry";

export type AnalysisTextCallType =
  | "main-analysis"
  | "recommendation-analysis"
  | "paid-analysis-detail";

export type PaidAnalysisResponseTelemetry = {
  status: string;
  incompleteReason: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  responseIdPresent: boolean;
  durationMs: number;
};

export function resolveMaxOutputTokens(
  callType?: AnalysisTextCallType,
): number {
  if (callType === "main-analysis") {
    return 6000;
  }

  if (callType === "paid-analysis-detail") {
    return 4800;
  }

  return 3200;
}

export function resolveModel(callType?: AnalysisTextCallType): string {
  if (callType === "main-analysis") {
    return "gpt-5.6-luna";
  }

  return "gpt-5";
}

// Narrows an unknown thrown value to loggable OpenAI SDK error fields without
// dumping the full error/response object (which may carry request payloads).
function extractOpenAIErrorMeta(error: unknown): {
  name?: string;
  status?: unknown;
  code?: unknown;
  type?: unknown;
  message: string;
} {
  if (error instanceof Error) {
    const maybeSdkError = error as Error & { status?: unknown; code?: unknown; type?: unknown };
    return {
      name: maybeSdkError.name,
      status: maybeSdkError.status,
      code: maybeSdkError.code,
      type: maybeSdkError.type,
      message: maybeSdkError.message,
    };
  }

  return { message: "unknown-openai-error" };
}

export async function generateAnalysisText(
  prompt: string,
  options?: {
    callType?: AnalysisTextCallType;
    onResponseTelemetry?: (telemetry: PaidAnalysisResponseTelemetry) => void;
  },
): Promise<string> {
  const callType = options?.callType;
  const maxOutputTokens = resolveMaxOutputTokens(callType);
  const timeoutMs =
    callType === "main-analysis" ||
    callType === "recommendation-analysis" ||
    callType === "paid-analysis-detail"
      ? 120000
      : 45000;

  const model = resolveModel(callType);
  const promptLength = prompt.length;
  const startedAt = Date.now();
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let response;

  try {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    response = await getOpenAIClient().responses.create(
      {
        model,
        input: prompt,
        max_output_tokens: maxOutputTokens,
        reasoning: {
          effort: "low",
        },
      },
      {
        signal: controller.signal,
      },
    );

    if (options?.onResponseTelemetry) {
      options.onResponseTelemetry({
        status: response.status ?? "unknown",
        incompleteReason: response.incomplete_details?.reason ?? null,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens ?? null,
        responseIdPresent: Boolean(response.id || response._request_id),
        durationMs: Date.now() - startedAt,
      });
    }

    if (response.status === "incomplete") {
      const incompleteReason = response.incomplete_details?.reason ?? "unknown";
      throw new Error(`OpenAI 응답이 incomplete 상태입니다. reason=${incompleteReason}`);
    }

    const outputText = (response.output_text ?? "").trim();
    if (!outputText) {
      throw new Error("OpenAI 응답이 비어 있습니다.");
    }

    console.info("[generateAnalysisText] success", {
      callType,
      model,
      promptLength,
      maxOutputTokens,
      timeoutMs,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      responseLength: outputText.length,
      responseStatus: response.status,
    });

    return outputText;
  } catch (error) {
    const errorMeta = extractOpenAIErrorMeta(error);

    console.error("[generateAnalysisText] failed", {
      callType,
      model,
      promptLength,
      maxOutputTokens,
      timeoutMs,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      errorName: errorMeta.name,
      errorStatus: errorMeta.status,
      errorCode: errorMeta.code,
      errorType: errorMeta.type,
      details: errorMeta.message,
      responseStatus: response?.status,
      incompleteReason: response?.incomplete_details?.reason,
    });

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/** Paid-only boundary that preserves Responses API usage without changing main-analysis callers. */
export async function generatePaidAnalysisTextWithUsage(
  prompt: string,
): Promise<PaidGenerationTextResult> {
  const maxOutputTokens = resolveMaxOutputTokens("paid-analysis-detail");
  const model = resolveModel("paid-analysis-detail");
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let response: OpenAIResponse | undefined;

  const buildTelemetry = (): PaidGenerationTextResult => {
    const completedAt = new Date().toISOString();
    const usage = extractPaidGenerationUsage(response ?? {});

    return {
      text: (response?.output_text ?? "").trim(),
      requestId: response ? getPaidGenerationRequestId(response) : null,
      model,
      reasoningEffort: "low",
      maxOutputTokens,
      usage,
      usageAvailable: Object.values(usage).some((value) => value !== null),
      startedAt,
      completedAt,
      durationMs: Date.now() - startedMs,
    };
  };

  try {
    timeoutId = setTimeout(() => controller.abort(), 120000);
    response = await getOpenAIClient().responses.create(
      {
        model,
        input: prompt,
        max_output_tokens: maxOutputTokens,
        reasoning: { effort: "low" },
      },
      { signal: controller.signal },
    ) as OpenAIResponse;

    if (response.status === "incomplete") {
      const reason = response.incomplete_details?.reason ?? "unknown";
      const telemetry = buildTelemetry();
      throw new PaidGenerationTextError({
        message: `OpenAI 응답이 incomplete 상태입니다. reason=${reason}`,
        telemetry,
        failureStage: "response",
        status: "incomplete",
      });
    }

    const telemetry = buildTelemetry();
    if (!telemetry.text) {
      throw new PaidGenerationTextError({
        message: "OpenAI 응답이 비어 있습니다.",
        telemetry,
        failureStage: "extraction",
        status: "failed",
      });
    }

    console.info("[paid-generation-telemetry] attempt", {
      requestId: telemetry.requestId,
      model: telemetry.model,
      durationMs: telemetry.durationMs,
      status: "succeeded",
      ...telemetry.usage,
    });

    return telemetry;
  } catch (error) {
    if (error instanceof PaidGenerationTextError) {
      console.error("[paid-generation-telemetry] attempt", {
        requestId: error.telemetry.requestId,
        model,
        durationMs: error.telemetry.durationMs,
        status: error.status,
        failureStage: error.failureStage,
        ...error.telemetry.usage,
      });
      throw error;
    }

    const telemetry = buildTelemetry();
    const timedOut = error instanceof Error
      && (error.name === "AbortError" || /abort|timeout/i.test(error.message));
    const status = timedOut ? "timed_out" : "failed";

    console.error("[paid-generation-telemetry] attempt", {
      requestId: telemetry.requestId,
      model,
      durationMs: telemetry.durationMs,
      status,
      failureStage: "request",
      ...telemetry.usage,
    });

    throw new PaidGenerationTextError({
      message: error instanceof Error ? error.message : "OpenAI request failed",
      telemetry,
      failureStage: "request",
      status,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}