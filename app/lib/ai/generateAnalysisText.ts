import { getOpenAIClient } from "./openAIClient";

export type AnalysisTextCallType =
  | "main-analysis"
  | "recommendation-analysis"
  | "paid-analysis-detail";

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
  options?: { callType?: AnalysisTextCallType },
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