import { openAIClient } from "./openAIClient";

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

export async function generateAnalysisText(
  prompt: string,
  options?: { callType?: AnalysisTextCallType },
): Promise<string> {
  const callType = options?.callType;
  const maxOutputTokens = resolveMaxOutputTokens(callType);
  const timeoutMs =
    callType === "main-analysis" || callType === "paid-analysis-detail"
      ? 120000
      : 45000;

  const startedAt = Date.now();
  let response;

  try {
    response = await Promise.race([
      openAIClient.responses.create({
        model: "gpt-5",
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
    const details =
      error instanceof Error
        ? error.message
        : "unknown-openai-error";

    console.error("[generateAnalysisText] failed", {
      callType,
      timeoutMs,
      elapsedMs: Date.now() - startedAt,
      details,
    });

    throw new Error(`OpenAI 응답 생성에 실패했습니다. ${details}`);
  }

  console.info("[generateAnalysisText] success", {
    callType,
    elapsedMs: Date.now() - startedAt,
    responseLength: response.output_text?.length ?? 0,
  });

  return response.output_text;
}