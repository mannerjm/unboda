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
  "cardReasons": {
  "first": "1순위 상품을 추천하는 이유를 한 문장으로",
  "second": "2순위 상품을 추천하는 이유를 한 문장으로",
  "third": "3순위 상품을 추천하는 이유를 한 문장으로"
}

cardReasons.first는 1순위 추천 상품의 추천 이유를 작성합니다.
cardReasons.second는 2순위 추천 상품의 추천 이유를 작성합니다.
cardReasons.third는 3순위 추천 상품의 추천 이유를 작성합니다.

각 문장은 30~55자 정도의 한 문장으로 작성하고,
카드 안에서 3줄을 넘지 않도록 간결하게 표현하세요.
세 문장은 서로 다른 내용으로 작성하세요.
각 추천 이유에는 반드시
현재 사주 구조나 운의 흐름에서 드러난 구체적인 변화 요인 1개와,
그 분석을 지금 확인해야 하는 이유 1개를 함께 포함하세요.
first는 가장 우선순위가 높은 핵심 변화와 직접 연결하세요.
second는 1순위를 보완하는 현실적인 관리 포인트와 연결하세요.
third는 놓치기 쉬운 보조 흐름이나 주변 영향과 연결하세요.
"좋은 시기입니다", "점검이 필요합니다", "도움이 됩니다"처럼
어느 사용자에게나 적용될 수 있는 일반적인 표현만으로 끝내지 마세요.

반드시 관계 변화, 생활 리듬, 재물 기회, 주변 환경처럼
해당 추천 상품과 직접 연결되는 구체적인 표현을 포함하세요.

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