import { getOpenAIClient } from "./openAIClient";

export type AnalysisTextCallType =
  | "main-analysis"
  | "recommendation-analysis"
  | "paid-analysis-detail";

export function resolveMaxOutputTokens(
  callType?: AnalysisTextCallType,
): number {
  if (callType === "main-analysis" || callType === "paid-analysis-detail") {
    return 4800;
  }

  return 3200;
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

  const model = "gpt-5";
  const promptLength = prompt.length;
  const startedAt = Date.now();
  let response;

  try {
    response = await Promise.race([
      getOpenAIClient().responses.create({
        model,
        input: prompt,
        max_output_tokens: maxOutputTokens,
        reasoning: {
          effort: "low",
        },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("OpenAI 응답이 시간 내에 완료되지 않았습니다."));
        }, timeoutMs);
      }),
    ]);
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
    });

    throw new Error(`OpenAI 응답 생성에 실패했습니다. ${errorMeta.message}`);
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
    responseLength: response.output_text?.length ?? 0,
  });

  return response.output_text;
}