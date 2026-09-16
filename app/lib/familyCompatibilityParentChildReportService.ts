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

const REQUIRED_JSON_SHAPE = `[REQUIRED_JSON_SHAPE]
반드시 아래 필드 구조를 빠짐없이 지켜 JSON 객체 하나만 반환하세요.
{
  "relationshipCore": { "headline": "문장", "summary": "문장", "evidenceRefs": ["근거 ID"] },
  "emotionalConnection": { "summary": "문장", "keyPoints": ["문장"], "evidenceRefs": ["근거 ID"] },
  "communication": { "summary": "문장", "keyPoints": ["문장"], "evidenceRefs": ["근거 ID"] },
  "expectationAndAutonomy": { "summary": "문장", "keyPoints": ["문장"], "evidenceRefs": ["근거 ID"] },
  "boundariesAndPressure": { "summary": "문장", "keyPoints": ["문장"], "evidenceRefs": ["근거 ID"] },
  "recovery": { "summary": "문장", "keyPoints": ["문장"], "evidenceRefs": ["근거 ID"] },
  "currentTiming": { "headline": "문장", "summary": "문장", "keyPoints": ["문장"], "evidenceRefs": ["근거 ID"] },
  "actionGuide": {
    "doNext": [{ "action": "문장", "reason": "문장", "evidenceRefs": ["근거 ID"] }],
    "avoid": [{ "action": "문장", "reason": "문장", "evidenceRefs": ["근거 ID"] }]
  }
}
- currentTiming은 현재 흐름 근거를 설명할 수 없을 때만 null로 반환할 수 있습니다. null이 아니라면 headline, summary, keyPoints, evidenceRefs 네 필드가 모두 필수입니다.
- actionGuide.doNext와 actionGuide.avoid의 모든 항목은 action, reason, evidenceRefs 세 필드가 모두 필수입니다.
- 키 이름을 바꾸거나 생략하지 마세요. Markdown 코드펜스나 JSON 밖의 설명문을 붙이지 마세요.`;

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

function buildRepairInstruction(error: unknown): string {
  if (error instanceof ZodError) {
    const issues = error.issues
      .slice(0, 12)
      .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "root"}: ${issue.message}`)
      .join("\n- ");
    return `[REPAIR_INSTRUCTION]
직전 응답은 리포트 스키마 검증에 실패했습니다. 아래 오류를 모두 고치고 JSON 전체를 처음부터 다시 작성하세요.
- ${issues}
특히 누락된 필드는 REQUIRED_JSON_SHAPE에 맞춰 반드시 채우고, 배열 개수 제한과 evidenceRefs 허용 범위도 함께 지키세요.`;
  }

  const message = error instanceof Error ? error.message : "알 수 없는 출력 형식 오류";
  return `[REPAIR_INSTRUCTION]
직전 응답은 올바른 가족 궁합 JSON으로 처리할 수 없었습니다: ${message}
REQUIRED_JSON_SHAPE를 그대로 따라 JSON 객체 전체를 다시 작성하고 JSON 밖의 문장은 반환하지 마세요.`;
}

function buildGenerationRequest(
  prompt: ReturnType<typeof buildFamilyParentChildReportPrompt>,
  repairInstruction: string,
): string {
  const repairBlock = repairInstruction ? `\n\n${repairInstruction}` : "";
  return `[SYSTEM]\n${prompt.system}\n\n${REQUIRED_JSON_SHAPE}\n\n${STRICT_CARDINALITY_LIMITS}\n\n${CUSTOMER_COPY_GUIDE}${repairBlock}\n\n[USER]\n${prompt.user}`;
}

export async function generateFamilyParentChildReport(
  result: FamilyParentChildCompatibilityResult,
): Promise<GeneratedFamilyParentChildReport> {
  const context = buildFamilyParentChildReportContext(result);
  const prompt = buildFamilyParentChildReportPrompt(context);
  let lastError: unknown;
  let repairInstruction = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const outputText = await generateAnalysisText(
      buildGenerationRequest(prompt, repairInstruction),
      { callType: "recommendation-analysis" },
    );

    try {
      const parsed = extractJsonObject(outputText);
      const report = validateFamilyParentChildReportOutput(parsed, context);
      return { report, context };
    } catch (error) {
      lastError = error;
      const canRetry = attempt + 1 < MAX_ATTEMPTS;
      if (!canRetry) throw error;
      repairInstruction = buildRepairInstruction(error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("부모·자녀 궁합 리포트를 생성하지 못했습니다.");
}
