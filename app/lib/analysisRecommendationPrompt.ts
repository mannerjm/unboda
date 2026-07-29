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
},
"conversionGuidance": {
  "whyNow": "왜 지금 이 심층 분석이 필요한지",
  "whatYouWillLearn": "심층 분석을 통해 무엇을 알게 되는지",
  "riskOfDelay": "지금 확인하지 않으면 놓칠 수 있는 점"
}

cardReasons.first는 1순위 추천 상품의 추천 이유를 작성합니다.
cardReasons.second는 2순위 추천 상품의 추천 이유를 작성합니다.
cardReasons.third는 3순위 추천 상품의 추천 이유를 작성합니다.

conversionGuidance.whyNow:
- 현재 사주 흐름과 사용자의 상황을 근거로, 왜 지금 심층 분석이 필요한지 설명한다.
- 막연한 불안감을 만들지 말고 실제 변화 시점, 선택 시점, 관계 흐름, 재물 흐름처럼 구체적으로 작성한다.
- 40~80자 이내로 작성한다.

conversionGuidance.whatYouWillLearn:
- 심층 분석을 통해 사용자가 구체적으로 무엇을 확인할 수 있는지 설명한다.
- 단순히 "자세히 알 수 있습니다"라고 쓰지 말고 시기, 방향, 대응 방법, 주의점 중 실제 제공되는 내용을 포함한다.
- 40~80자 이내로 작성한다.

conversionGuidance.riskOfDelay:
- 지금 확인을 미룰 경우 놓칠 수 있는 판단 시점이나 준비 기회를 설명한다.
- 공포를 조장하거나 손해를 단정하지 않는다.
- "큰일이 생깁니다", "반드시 후회합니다" 같은 표현은 사용하지 않는다.
- 40~80자 이내로 작성한다.

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