import { ZodError } from "zod";
import { generateAnalysisText } from "./ai";
import { PAID_REPORT_CUSTOMER_LANGUAGE_RULES } from "./paidReportCustomerLanguage";
import {
  buildCompatibilityReportContext,
  buildCompatibilityReportPrompt,
  validateCompatibilityReportOutput,
  type CompatibilityReportContext,
  type CompatibilityReportOutput,
} from "./compatibilityReportContract";
import type { CompatibilityTimingResult } from "./compatibilityTiming";
import type { CompatibilityPairRelationshipType } from "./specialAnalysisProducts";
import type { WorkplaceRelation } from "./workplaceCompatibilityRelation";

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

const CUSTOMER_COPY_GUIDE = `[CUSTOMER_COPY_GUIDE]
- relationshipCore.headline은 한 문장, 가능하면 55자 안팎으로 압축합니다.
- strengths는 이 두 사람의 근거에서 실제로 확인되는 차별점만 쓰고, 현재 관계 유형과 무관한 일반 조언을 피합니다.
- conflict는 갈등이 시작되는 패턴만, recovery는 갈등 뒤 다시 연결되는 조건만, longTerm은 현재 관계 유형에서 반복해서 합의해야 할 기준만 다룹니다.
- currentTiming은 기본 궁합을 반복하지 말고 해당 연도에 무엇을 늘리고 무엇을 줄일지 중심으로 설명합니다.
- currentTiming의 제목과 본문에서는 '운영', '관리'처럼 관계를 시스템처럼 들리게 하는 표현을 피하고 '조율', '균형', '속도', '흐름' 같은 생활 언어를 사용합니다.
- 각 summary는 같은 뜻을 반복하지 말고 핵심 2~3문장 안에서 끝냅니다.
- actionGuide는 위 섹션의 문장을 그대로 되풀이하지 말고 실제로 해볼 행동으로 바꿉니다.
- 같은 조언(예: 감정 진정, 한 번에 하나씩 대화하기)을 여러 섹션에서 반복하지 않습니다.
- doNext는 가장 중요한 2~3개, avoid는 1~2개만 우선 작성합니다.`;

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

  return `[SYSTEM]\n${prompt.system}\n\n${STRICT_CARDINALITY_LIMITS}\n\n${CUSTOMER_COPY_GUIDE}\n\n${PAID_REPORT_CUSTOMER_LANGUAGE_RULES}${retryInstruction}\n\n[USER]\n${prompt.user}`;
}

export async function generateCompatibilityReport(
  timingResult: CompatibilityTimingResult,
  relationshipType: CompatibilityPairRelationshipType = "romantic_partner",
  workplaceRelation?: WorkplaceRelation,
): Promise<GeneratedCompatibilityReport> {
  const context = buildCompatibilityReportContext(timingResult);
  const prompt = buildCompatibilityReportPrompt(context, relationshipType, workplaceRelation);
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
