import { ZodError } from "zod";
import { generateAnalysisText } from "./ai";
import {
  buildCompatibilityReportContext,
  buildCompatibilityReportPrompt,
  validateCompatibilityReportOutput,
  type CompatibilityReportContext,
  type CompatibilityReportOutput,
} from "./compatibilityReportContract";
import type { CompatibilityTimingResult } from "./compatibilityTiming";

export type GeneratedCompatibilityReport = {
  report: CompatibilityReportOutput;
  context: CompatibilityReportContext;
};

const COMPATIBILITY_REPORT_GENERATION_MAX_ATTEMPTS = 2;

const STRICT_CARDINALITY_LIMITS = `[STRICT_CARDINALITY_LIMITS]
- relationshipCore.evidenceRefs: 1~5개
- strengths: 최대 3개, 각 evidenceRefs는 1~5개
- conflict/recovery/longTerm.keyPoints: 각각 1~3개
- conflict/recovery/longTerm.evidenceRefs: 각각 1~5개
- currentTiming.keyPoints: 1~3개
- currentTiming.evidenceRefs: 1~5개
- actionGuide.doNext: 2~4개, actionGuide.avoid: 1~3개
- actionGuide 각 항목의 evidenceRefs: 1~3개
위 개수 제한을 반드시 지키고, 같은 evidence id를 불필요하게 반복하지 마세요.`;

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("궁합 리포트 응답에서 JSON을 찾지 못했습니다.");
  }

  return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)) as unknown;
}

function isRetryableCardinalityOverflow(error: unknown): boolean {
  return error instanceof ZodError
    && error.issues.length > 0
    && error.issues.every((issue) => issue.code === "too_big");
}

function buildGenerationRequest(
  prompt: ReturnType<typeof buildCompatibilityReportPrompt>,
  attempt: number,
): string {
  const retryInstruction = attempt === 0
    ? ""
    : `\n\n[REPAIR_INSTRUCTION]\n직전 응답은 배열 개수 제한을 초과했습니다. 내용과 근거 관계는 유지하되 아래 개수 제한에 맞춰 가장 중요한 항목만 남겨 JSON 전체를 다시 작성하세요.`;

  return `[SYSTEM]\n${prompt.system}\n\n${STRICT_CARDINALITY_LIMITS}${retryInstruction}\n\n[USER]\n${prompt.user}`;
}

export async function generateCompatibilityReport(
  timingResult: CompatibilityTimingResult,
): Promise<GeneratedCompatibilityReport> {
  const context = buildCompatibilityReportContext(timingResult);
  const prompt = buildCompatibilityReportPrompt(context);
  let lastError: unknown;

  for (let attempt = 0; attempt < COMPATIBILITY_REPORT_GENERATION_MAX_ATTEMPTS; attempt += 1) {
    const outputText = await generateAnalysisText(
      buildGenerationRequest(prompt, attempt),
      { callType: "recommendation-analysis" },
    );

    try {
      const parsed = extractJsonObject(outputText);
      const report = validateCompatibilityReportOutput(parsed, context);
      return { report, context };
    } catch (error) {
      lastError = error;
      const canRetry = attempt + 1 < COMPATIBILITY_REPORT_GENERATION_MAX_ATTEMPTS
        && isRetryableCardinalityOverflow(error);
      if (!canRetry) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("궁합 리포트 생성을 완료하지 못했습니다.");
}
