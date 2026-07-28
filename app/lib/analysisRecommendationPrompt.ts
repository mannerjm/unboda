import type { AnalysisRecommendation } from "./analysisRecommendation";
import { buildSystemPrompt } from "./ai";

export type BuildAnalysisRecommendationPromptInput = {
  recommendation: AnalysisRecommendation;
};

export function buildAnalysisRecommendationPrompt(
  input: BuildAnalysisRecommendationPromptInput
): string {
  const { recommendation } = input;
  

const reasons = recommendation.reasons
  .map((reason) => `- ${reason.label}: ${reason.explanation}`)
  .join("\n");

const secondaryRecommendations =
  recommendation.secondaryRecommendations.length > 0
    ? recommendation.secondaryRecommendations
        .map(
          (item, index) =>
            `${index + 2}순위: ${item.productId} - ${item.reason}`
        )
        .join("\n")
    : "없음";

 return `

당신은 운보다의 명리 분석 설명가입니다.

아래 추천 결과는 기존 명리 엔진이 계산한 결과입니다.

반드시 아래 JSON 형식으로만 답변하세요.
마크다운 코드 블록이나 추가 설명은 포함하지 마세요.

{
  "headline": "사용자가 바로 이해할 수 있는 한 문장",
  "summary": "핵심 추천 이유를 설명하는 2~3문장",
  "userMeaning": "이 추천이 사용자에게 왜 중요한지 설명하는 1~2문장"
}

[추천 결과]
주요 주제: ${recommendation.primaryTheme}
추천 상품: ${recommendation.recommendedProductId}
추천 근거: ${recommendation.recommendedReason}
요약: ${recommendation.summary}
사용자 의미: ${recommendation.userMeaning}

추천 근거 목록:
${reasons}

보조 추천 목록:
${secondaryRecommendations}

`.trim();
}