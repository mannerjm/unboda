import { ZodError } from "zod";
import { generateAnalysisText } from "./ai";
import {
  buildFamilyParentChildReportContext,
  buildFamilyParentChildReportPrompt,
  validateFamilyParentChildReportOutput,
  type FamilyParentChildReportContext,
  type FamilyParentChildReportOutput,
} from "./familyCompatibilityParentChildReportContract";
import type { FamilyParentChildCompatibilityResult } from "./familyCompatibilityParentChild";

export type GeneratedFamilyParentChildReport = Readonly<{
  report: FamilyParentChildReportOutput;
  context: FamilyParentChildReportContext;
}>;

const MAX_ATTEMPTS = 2;

const STRICT_CARDINALITY_LIMITS = `[STRICT_CARDINALITY_LIMITS]
- relationshipCore.evidenceRefs: 1~5개
- emotionalConnection/communication/expectationAndAutonomy/boundariesAndPressure/recovery.keyPoints: 각각 1~3개
- 위 각 섹션의 evidenceRefs: 각각 1~5개
- currentTiming.keyPoints: 1~3개
- currentTiming.evidenceRefs: 1~5개
- actionGuide.doNext: 2~4개, actionGuide.avoid: 1~3개
- actionGuide 각 항목의 evidenceRefs: 1~3개
위 개수 제한을 반드시 지키고 같은 근거를 불필요하게 반복하지 마세요.`;

const CUSTOMER_COPY_GUIDE = `[CUSTOMER_COPY_GUIDE]
- relationshipCore.headline은 한 문장으로 압축하고 가능하면 55자 안팎으로 작성합니다.
- 부모와 자녀 중 한쪽을 탓하거나 가르치려는 어조를 사용하지 않습니다.
- emotionalConnection은 정서적 거리와 가까워지는 방식을 설명합니다.
- communication은 대화의 속도, 표현, 반응 차이만 설명합니다.
- expectationAndAutonomy는 가족의 기대와 각자의 결정 영역 사이의 기준을 설명합니다.
- boundariesAndPressure는 보호·조언·관심이 도움 또는 부담으로 느껴지는 경계를 설명합니다.
- recovery는 갈등 뒤 다시 연결되기 쉬운 조건만 설명합니다.
- currentTiming은 기본 관계를 반복하지 말고 해당 연도에 무엇을 서두르지 말고 무엇을 확인할지 중심으로 설명합니다.
- 각 summary는 같은 뜻을 반복하지 말고 2~3문장 안에서 끝냅니다.
- actionGuide는 실제 가족 관계에서 바로 해볼 수 있는 구체적 행동으로 작성합니다.
- 연애, 결혼, 배우자, 연인 관계에 사용하는 표현을 섞지 않습니다.`;

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("가족 궁합 리포트 응답에서 JSON을 찾지 못했습니다.");
  }
  return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)) as unknown;
}

function isRetryableCardinalityOverflow(error: unknown): boolean {
  return error instanceof ZodError
    && error.issues.length > 0
    && error.issues.every((issue) => issue.code === "too_big");
}

function buildGenerationRequest(
  prompt: ReturnType<typeof buildFamilyParentChildReportPrompt>,
  attempt: number,
): string {
  const retryInstruction = attempt === 0
    ? ""
    : "\n\n[REPAIR_INSTRUCTION]\n직전 응답은 배열 개수 제한을 초과했습니다. 내용과 근거 관계는 유지하되 가장 중요한 항목만 남겨 JSON 전체를 다시 작성하세요.";

  return `[SYSTEM]\n${prompt.system}\n\n${STRICT_CARDINALITY_LIMITS}\n\n${CUSTOMER_COPY_GUIDE}${retryInstruction}\n\n[USER]\n${prompt.user}`;
}

export async function generateFamilyParentChildReport(
  result: FamilyParentChildCompatibilityResult,
): Promise<GeneratedFamilyParentChildReport> {
  const context = buildFamilyParentChildReportContext(result);
  const prompt = buildFamilyParentChildReportPrompt(context);
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const outputText = await generateAnalysisText(
      buildGenerationRequest(prompt, attempt),
      { callType: "recommendation-analysis" },
    );

    try {
      const parsed = extractJsonObject(outputText);
      const report = validateFamilyParentChildReportOutput(parsed, context);
      return { report, context };
    } catch (error) {
      lastError = error;
      const canRetry = attempt + 1 < MAX_ATTEMPTS && isRetryableCardinalityOverflow(error);
      if (!canRetry) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("부모·자녀 궁합 리포트를 생성하지 못했습니다.");
}
