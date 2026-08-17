import { getMoneyPaidAnalysisPromptRules } from "./paidAnalysisPromptPlugins/moneyPrompt";
import { getCareerPaidAnalysisPromptRules } from "./paidAnalysisPromptPlugins/careerPrompt";
import { getHealthPaidAnalysisPromptRules } from "./paidAnalysisPromptPlugins/healthPrompt";
import { getRelationshipPaidAnalysisPromptRules } from "./paidAnalysisPromptPlugins/relationshipPrompt";
import { getFortunePaidAnalysisPromptRules } from "./paidAnalysisPromptPlugins/fortunePrompt";
import { getCommonPaidAnalysisPromptRules } from "./paidAnalysisPromptPlugins/commonPrompt";
import {
  formatReferencePeriodForPrompt,
  type ReferencePeriodSnapshot,
} from "./analysisReferencePeriod";
import {
  buildPeriodTimelineConsistencyRule,
  buildPeriodTimelineSectionRules,
  formatPeriodStrategyForPrompt,
  getPeriodAnalysisStrategy,
} from "./analysisPeriodStrategy";
import {
  buildPeriodAnalysisJsonContract,
  buildPeriodAnalysisPromptRules,
} from "./analysisPeriodOutput";
import {
  getCanonicalPremiumProductId,
  getPremiumProduct,
  type PremiumProductPlugin,
} from "./premiumProductRegistry";




import {
  paidAnalysisProducts,
  type PaidAnalysisProduct,
} from "./paidAnalysisProducts";

export type PaidAnalysisDetailPromptInput = {
  productId?: string;
  analysisType: string;
  birthData: string;

  originalChart: string;
  coreInterpretation: string;
  fortuneTiming: string;

  sajuSummary: string;
  currentFortuneFlow: string;
  userConcern?: string;

  /** Only set for PERIOD products. */
  referencePeriod?: ReferencePeriodSnapshot;
};

export function buildPaidAnalysisDetailPrompt(
  input: PaidAnalysisDetailPromptInput,
) {
    
  return `
당신은 대한민국 최고 수준의 명리학 심층 분석 전문가입니다.

분석 종류:
${input.analysisType}

출생 정보:
${input.birthData}

원국 상세 구조:
${input.originalChart}

오행·강약·용신·격국 핵심 해석:
${input.coreInterpretation}

대운·세운·현재 운 시기 정보:
${input.fortuneTiming}

사주 핵심 요약:
${input.sajuSummary}

현재 운의 흐름:
${input.currentFortuneFlow}

사용자 고민:
${input.userConcern ?? "없음"}

출력은 반드시 JSON만 반환하세요.

반드시 아래 형식으로 답변하세요.

{
  "headline": "상세페이지 핵심 제목",
  "whyThisAnalysis": "왜 이 사용자에게 이 분석이 필요한지",
  "currentFlow": "현재 사주와 운 흐름에서 나타나는 변화",
  "questionsAnswered": [
    "이 분석으로 해결할 수 있는 질문 1",
    "이 분석으로 해결할 수 있는 질문 2",
    "이 분석으로 해결할 수 있는 질문 3"
  ],
  "expectedBenefits": [
    "분석 후 얻을 수 있는 도움 1",
    "분석 후 얻을 수 있는 도움 2",
    "분석 후 얻을 수 있는 도움 3"
  ],
  "whyNow": "왜 지금 확인해야 하는지",
  "ctaMessage": "결제 버튼 직전의 개인화 안내 문구"
}
  작성 원칙:

- 모든 내용은 사용자의 실제 사주 구조와 현재 운 흐름을 근거로 작성한다.
- 누구에게나 적용할 수 있는 일반적인 표현은 사용하지 않는다.
- 불안감을 과도하게 조성하거나 결과를 단정하지 않는다.
- 사용자가 지금 어떤 판단을 해야 하는지 이해할 수 있도록 구체적으로 작성한다.
- 같은 의미를 반복하지 않는다.

headline 작성 규칙:

- 사용자가 현재 운에서 가장 먼저 이해해야 할 핵심 문제와 결론을 한 문장으로 작성한다.
- 제목만 읽어도 왜 이 심층 분석을 확인해야 하는지 이해될 정도로 명확해야 한다.
- "좋은 시기입니다", "확인이 필요합니다"처럼 누구에게나 적용되는 표현은 사용하지 않는다.
- 실제 관계 변화, 재물 흐름, 생활 리듬, 직업 방향처럼 구체적인 주제를 포함한다.
- 25~45자 이내로 작성한다.

whyThisAnalysis 작성 규칙:

- 현재 사주 구조, 오행의 균형, 대운·세운의 흐름을 함께 근거로 지금 이 분석이 필요한 이유를 설명한다.
- 단순히 운이 좋고 나쁨을 말하지 말고, 현재 나타나는 변화의 원인을 함께 설명한다.
- 사용자의 현재 고민과 실제 운의 흐름을 연결하여 지금 어떤 판단이 필요한지 설명한다.
- 단순히 "도움이 됩니다", "살펴볼 필요가 있습니다"라고 끝내지 않는다.
- 지금 나타나는 변화와 이 분석이 필요한 이유를 직접 연결한다.
- 70~120자 이내로 작성한다.

currentFlow 작성 규칙:

- 현재 대운, 세운, 사주 원국이 어떻게 서로 영향을 주고 있는지 연결하여 설명한다.
- 현재 운의 흐름이 강해지는 요소와 약해지는 요소를 함께 설명한다.
- 현재 나타나는 변화가 일시적인지, 앞으로 이어질 흐름인지까지 함께 설명한다.
- 단순한 성격 설명이나 평생 운세 설명으로 벗어나지 않는다.
- 해당 심층 분석 주제와 직접 관련된 흐름만 작성한다.
- 80~140자 이내로 작성한다.

questionsAnswered 작성 규칙:

- 사용자가 실제 명리 상담에서 가장 궁금해할 질문을 정확히 3개 작성한다.
- 질문만 읽어도 이번 심층 분석에서 어떤 답을 얻게 되는지 기대할 수 있어야 한다.
- 세 질문은 서로 다른 판단 영역(시기, 선택, 결과, 대응 등)을 다루며 내용이 겹치지 않아야 한다.
- 질문에는 시기, 선택 방향, 대응 방법, 기회 또는 위험 요소 중 최소 2가지 이상이 포함되어야 한다.
- "운이 좋아질까요?"처럼 지나치게 넓고 막연한 질문은 사용하지 않는다.
- 각 질문은 25~55자 이내로 작성한다.

expectedBenefits 작성 규칙:

- 사용자가 심층 분석을 통해 실제 삶과 의사결정에서 얻게 될 변화를 정확히 3개 작성한다.
- 각 항목은 "무엇을 알게 되는가"보다 "무엇을 할 수 있게 되는가"에 초점을 맞춘다.
- 세 항목은 각각 다른 가치(판단 기준, 위험 예방, 기회 활용, 방향 설정 등)를 제공해야 하며 내용이 겹치지 않아야 한다.
- 단순히 "운을 알 수 있다", "도움이 된다"와 같은 표현은 사용하지 않는다.
- 실제 의사결정, 위험 예방, 기회 포착, 방향 설정 등 사용자가 바로 행동에 옮길 수 있는 변화를 중심으로 작성한다.
- 각 항목은 20~50자 이내로 작성한다.

whyNow 작성 규칙:

- 현재 운의 변화 시점과 앞으로 이어질 흐름을 연결하여 왜 지금 확인해야 하는지 설명한다.
- 지금 판단해야 할 이유와 이후의 흐름이 어떻게 달라질 수 있는지를 함께 제시한다.
- 단순히 "지금이 중요합니다"라고 말하지 않고, 판단이 필요한 이유를 구체적으로 제시한다.
- 시기를 놓쳤을 때 생길 수 있는 불이익을 과장하거나 공포를 조성하지 않는다.
- 사용자가 지금 준비하거나 점검해야 할 행동 방향을 구체적으로 제시하고, 실제 행동으로 이어질 수 있도록 작성한다.
- 60~110자 이내로 작성한다.

ctaMessage 작성 규칙:

- 사용자가 이번 심층 분석을 통해 어떤 판단 기준과 방향을 얻게 되는지 자연스럽게 안내한다.
- 분석을 읽은 뒤 무엇을 명확하게 결정할 수 있게 되는지를 중심으로 작성한다.
- 결제를 압박하거나 불안감을 자극하지 않는다.
- "지금 바로 확인하세요", "놓치면 안 됩니다" 같은 과도한 판매 문구는 사용하지 않는다.
- 분석 주제와 사용자의 현재 판단 상황을 연결하여, 이번 리포트가 왜 의미 있는지 자연스럽게 마무리한다.
- 45~80자 이내로 작성한다.
`;

}

function combineCommonRules(productRules: string): string {
  return `
${getCommonPaidAnalysisPromptRules()}

${productRules}
`;
}

function getPremiumPluginFromProductId(
  productId?: string,
): PremiumProductPlugin | undefined {
  if (!productId) {
    return undefined;
  }

  const canonicalProductId =
    getCanonicalPremiumProductId(productId);

  return getPremiumProduct(canonicalProductId)?.plugin;
}

function getPaidAnalysisProductRules(
  analysisType: string,
  productId?: string,
): string {
  const normalizedType = analysisType.trim();
  const premiumPlugin =
  getPremiumPluginFromProductId(productId);

switch (premiumPlugin) {
  case "MONEY":
    return combineCommonRules(
      getMoneyPaidAnalysisPromptRules(),
    );

  case "CAREER":
    return combineCommonRules(
      getCareerPaidAnalysisPromptRules(),
    );

  case "HEALTH":
    return combineCommonRules(
      getHealthPaidAnalysisPromptRules(),
    );

  case "RELATIONSHIP":
    return combineCommonRules(
      getRelationshipPaidAnalysisPromptRules(),
    );
      case "FORTUNE":
    return combineCommonRules(
      getFortunePaidAnalysisPromptRules(),
    );
}
  if (
    normalizedType.includes("재물") ||
    normalizedType.includes("투자") ||
    normalizedType.includes("자산")
  ) {
    return combineCommonRules(getMoneyPaidAnalysisPromptRules());
  }

  if (
    normalizedType.includes("직업") ||
    normalizedType.includes("사업") ||
    normalizedType.includes("이직") ||
    normalizedType.includes("승진")
  ) {
    return combineCommonRules(getCareerPaidAnalysisPromptRules());
  }

  if (
    normalizedType.includes("건강") ||
    normalizedType.includes("컨디션") ||
    normalizedType.includes("회복")
  ) {
    return combineCommonRules(getHealthPaidAnalysisPromptRules());
  }

  if (
    normalizedType.includes("관계") ||
    normalizedType.includes("연애") ||
    normalizedType.includes("결혼") ||
    normalizedType.includes("인간관계")
  ) {
    return combineCommonRules(getRelationshipPaidAnalysisPromptRules());
  }

  return getCommonPaidAnalysisPromptRules();
}

type ResolvedProductContext = {
  source: "registry" | "legacy";
  id: string;
  title: string;
  description: string;
  details?: readonly string[];
  category?: string;
  plugin?: string;
  releaseLevel?: string;
  analysisType?: string;
  kind?: string;
  recommendedFor?: readonly string[];
  analysisFocus?: readonly string[];
  expectedOutcome?: readonly string[];
};

function resolveProductContextForPrompt(
  analysisType: string,
  productId?: string,
): ResolvedProductContext | undefined {
  if (productId) {
    const canonicalProductId =
      getCanonicalPremiumProductId(productId);

    const registryProduct =
      getPremiumProduct(canonicalProductId);

    if (registryProduct) {
      return {
        source: "registry",
        id: registryProduct.id,
        title: registryProduct.title,
        description: registryProduct.description,
        details: registryProduct.details,
        category: registryProduct.category,
        plugin: registryProduct.plugin,
        releaseLevel: registryProduct.releaseLevel,
        analysisType: registryProduct.analysisType,
        kind: registryProduct.kind,
        recommendedFor: registryProduct.recommendedFor,
        analysisFocus: registryProduct.analysisFocus,
        expectedOutcome: registryProduct.expectedOutcome,
      };
    }
  }

  const products = Object.values(
    paidAnalysisProducts,
  ) as PaidAnalysisProduct[];

  const product = products.find(
    (item) =>
      item.analysisType === analysisType ||
      item.title === analysisType,
  );

  if (!product) {
    return undefined;
  }

  return {
    source: "legacy",
    id: product.id,
    title: product.title,
    description: product.description,
    details: product.details,
    category: product.category,
    plugin: product.plugin,
    releaseLevel: product.releaseLevel,
    analysisType: product.analysisType,
    recommendedFor: product.recommendedFor,
    analysisFocus: product.analysisFocus,
    expectedOutcome: product.expectedOutcome,
  };
}

function getPaidAnalysisProductContext(
  analysisType: string,
  productId?: string,
): string {
  const productContext = resolveProductContextForPrompt(
    analysisType,
    productId,
  );

  if (!productContext) {
    return `
상품 메타데이터:

- 분석 상품: ${analysisType}
- 등록된 상세 상품 메타데이터 없음
`;
  }

  if (productContext.source === "registry") {
    const details =
      productContext.details?.map((item) => `- ${item}`).join("\n") ||
      "- 별도 정의 없음";

    return `
상품 메타데이터:

- 상품 ID: ${productContext.id}
- 분석 상품: ${productContext.title}
- 카테고리: ${productContext.category}
- Plugin: ${productContext.plugin}
- 상품 유형: ${productContext.kind}
- 출시 레벨: ${productContext.releaseLevel}
- 설명: ${productContext.description}

상세 분석 포인트:
${details}
`;
  }

  const recommendedFor =
    productContext.recommendedFor?.map((item) => `- ${item}`).join("\n") ||
    "- 별도 정의 없음";

  const analysisFocus =
    productContext.analysisFocus?.map((item) => `- ${item}`).join("\n") ||
    "- 별도 정의 없음";

  const expectedOutcome =
    productContext.expectedOutcome?.map((item) => `- ${item}`).join("\n") ||
    "- 별도 정의 없음";

  const details =
    productContext.details?.map((item) => `- ${item}`).join("\n") ||
    "- 별도 정의 없음";

  return `
상품 메타데이터:

상품 ID:
${productContext.id}

상품명:
${productContext.title}

상품 카테고리:
${productContext.category ?? "미정"}

상품 Plugin:
${productContext.plugin ?? "미정"}

출시 단계:
${productContext.releaseLevel ?? "미정"}

상품 설명:
${productContext.description}

이 상품에서 제공해야 하는 내용:
${details}

이 상품이 추천되는 사용자:
${recommendedFor}

핵심 분석 초점:
${analysisFocus}

사용자가 얻어야 하는 결과:
${expectedOutcome}
`;
}

function isCareerAnalysis(
  analysisType: string,
  productId?: string,
): boolean {
  const normalizedType = analysisType.trim();
  const premiumPlugin = getPremiumPluginFromProductId(productId);

  if (premiumPlugin === "CAREER") {
    return true;
  }

  return (
    normalizedType.includes("직업") ||
    normalizedType.includes("사업") ||
    normalizedType.includes("이직") ||
    normalizedType.includes("승진")
  );
}

export function buildPaidAnalysisDetailPromptV2(
  input: PaidAnalysisDetailPromptInput,
): string {
  const productRules = getPaidAnalysisProductRules(
  input.analysisType,
  input.productId,
);
  const productContext = getPaidAnalysisProductContext(
  input.analysisType,
  input.productId,
);
  // Null for every TOPIC/legacy product, so their prompt text stays unchanged.
  const periodStrategy = getPeriodAnalysisStrategy(input.productId);
  const futureTimelineExample = isCareerAnalysis(
    input.analysisType,
    input.productId,
  )
    ? `    {
      "period": "현재 흐름",
      "title": "현재 흐름의 핵심",
      "description": "현재 전달된 명리 데이터에서 직접 확인되는 흐름을 해석하고, 지금 우선적으로 확인할 판단 기준을 설명한다."
    },
    {
      "period": "다음 변화의 조건",
      "title": "다음 변화의 조건",
      "description": "미래 사건을 단정하지 않고, 현재 흐름이 변화할 때 확인해야 할 조건과 신호를 설명한다."
    },
    {
      "period": "중기적으로 확인할 신호",
      "title": "중기적으로 확인할 신호",
      "description": "특정 시점의 사건을 예측하지 말고, 중기적으로 사용자가 관찰해야 할 신호와 판단 기준을 설명한다."
    },
    {
      "period": "장기적으로 준비할 방향",
      "title": "장기적으로 준비할 방향",
      "description": "장기 미래를 단정하지 않고, 현재 근거에서 도출할 수 있는 준비 방향과 대응 기준을 설명한다."
    }`
    : `    {
      "period": "현재",
      "title": "현재 흐름의 핵심",
      "description": "현재 시기에 나타나는 변화와 대응 방향"
    },
    {
      "period": "앞으로 3개월",
      "title": "단기 흐름의 핵심",
      "description": "앞으로 3개월 동안 확인할 변화와 대응 방향"
    },
    {
      "period": "앞으로 6개월",
      "title": "중기 흐름의 핵심",
      "description": "앞으로 6개월 동안 확인할 변화와 대응 방향"
    },
    {
      "period": "앞으로 1년",
      "title": "장기 흐름의 핵심",
      "description": "앞으로 1년 동안 이어질 흐름과 준비 방향"
    }`;

  const futureTimelineRuleText = periodStrategy
    ? buildPeriodTimelineConsistencyRule(periodStrategy)
    : isCareerAnalysis(
    input.analysisType,
    input.productId,
  )
    ? `- futureTimeline은 시간 순서형 예측이 아니라, 현재 근거에서 확인할 조건과 신호의 흐름으로 설명한다.
- 각 항목은 특정 날짜나 시점을 단정하지 않고, 현재 흐름이 어떻게 바뀔 수 있는지 확인할 기준과 준비 방향을 제시한다.
`
    : "";

  const futureTimelineSectionRules = periodStrategy
    ? buildPeriodTimelineSectionRules(periodStrategy)
    : isCareerAnalysis(
    input.analysisType,
    input.productId,
  )
    ? `- 현재 흐름, 다음 변화의 조건, 중기적으로 확인할 신호, 장기적으로 준비할 방향의 정확히 4개 항목을 작성한다.
- 제공된 입력만으로 특정 월이나 날짜를 확정할 수 없다면 임의의 날짜를 만들지 않는다.
- 각 항목은 실제로 확인할 수 있는 조건, 신호, 판단 기준, 준비 행동을 함께 제시한다.
- 오행의 향후 증감이나 계산된 미래 시점을 암시하는 표현은 쓰지 않는다.
- 모든 시기를 무조건 좋거나 나쁘다고 단정하지 않는다.
`
    : `- 현재, 앞으로 3개월, 앞으로 6개월, 앞으로 1년의 정확히 4개 항목을 작성한다.
- 제공된 입력만으로 특정 월이나 날짜를 확정할 수 없다면 임의의 날짜를 만들지 않는다.
- 각 시기의 변화, 판단 기준, 준비 행동을 함께 제시한다.
- 모든 시기를 무조건 좋거나 나쁘다고 단정하지 않는다.
`;

  return `
당신은 사용자의 사주 원국과 현재 운의 흐름을 분석하여
실제 판단과 행동에 도움을 주는 프리미엄 명리 리포트를 작성하는 전문가입니다.

분석 종류:
${input.analysisType}

${productContext}

출생 정보:
${input.birthData}

원국 상세 구조:
${input.originalChart}

오행·강약·용신·격국 핵심 해석:
${input.coreInterpretation}

대운·세운·현재 운 시기 정보:
${input.fortuneTiming}

사주 핵심 요약:
${input.sajuSummary}

현재 운의 흐름:
${input.currentFortuneFlow}

사용자 고민:
${input.userConcern ?? "없음"}
${input.referencePeriod ? `
[기간 기준 고정]
${formatReferencePeriodForPrompt(input.referencePeriod)}
` : ""}${periodStrategy ? `
[기간별 분석 전략]
${formatPeriodStrategyForPrompt(periodStrategy)}
` : ""}
명리 추론 순서:

1. 원국 구조 확인
- 연주·월주·일주·시주의 천간과 지지를 먼저 확인한다.
- 일간을 기준으로 월령, 통근, 투간, 지장간을 살핀다.
- 특정 글자 하나만으로 결론을 내리지 않는다.

2. 오행 균형 확인
- 목·화·토·금·수의 분포와 가중치를 확인한다.
- 단순 개수뿐 아니라 월령, 통근, 투간, 계절성을 함께 반영한다.
- 과다·부족·고립된 오행이 실제 판단에 어떤 영향을 주는지 설명한다.

3. 신강·신약 및 구조 판단
- strengthAnalysis를 기준으로 일간의 강약을 확인한다.
- 신강·신약을 단정적으로 반복하지 말고 실제 판단 의미를 설명한다.
- 원국의 균형과 현재 운에서 강약이 어떻게 달라지는지 연결한다.

4. 용신·희신·기신 확인
- yongshinAnalysis를 기준으로 필요한 오행과 피해야 할 흐름을 확인한다.
- 용신을 단순 행운 요소처럼 표현하지 않는다.
- 현재 대운·세운에서 용신과 기신이 어떻게 작용하는지 연결한다.

5. 격국과 핵심 구조 확인
- gyeokgukAnalysis를 기준으로 격국의 성립 여부와 현실적 의미를 확인한다.
- 격국만으로 직업, 재물, 관계 결과를 단정하지 않는다.
- 원국, 강약, 용신과 서로 모순되지 않게 해석한다.

6. 합·충·형·해와 관계 구조 확인
- 원국 내부의 합·충·형·해와 현재 운에서 새로 발생하는 작용을 확인한다.
- 관계 변화, 충돌, 결합, 이동, 재편 가능성을 분석 주제에 맞게 연결한다.
- 충이 있다고 반드시 나쁜 결과, 합이 있다고 반드시 좋은 결과로 단정하지 않는다.

7. 대운 확인
- currentDaeun을 중심으로 현재 10년 흐름의 방향을 판단한다.
- 대운이 원국의 강점과 약점을 어떻게 확대하거나 조정하는지 설명한다.
- 현재 사용자가 집중해야 할 장기 판단 기준을 제시한다.

8. 세운 확인
- currentSeun을 중심으로 현재 연도의 변화와 사건 가능성을 판단한다.
- 대운과 세운이 같은 방향인지, 충돌하는지, 보완하는지 구분한다.
- 입력에 없는 구체적 사건이나 날짜를 만들어내지 않는다.

9. 현재 운 흐름 종합
- fortuneFlowAnalysis와 currentFortuneFlow을 함께 사용한다.
- 원국 → 용신 → 대운 → 세운의 흐름이 하나의 결론으로 이어지게 한다.
- 분석 주제와 직접 관계없는 명리 요소는 과도하게 확장하지 않는다.

10. 사용자 고민과 연결
- userConcern이 있다면 현재 운의 구조와 직접 연결해 판단 기준을 제시한다.
- 사용자가 무엇을 먼저 확인하고 어떤 순서로 행동해야 하는지 구체화한다.
- 공포, 불안, 확정적 예언이 아니라 현실적인 선택 기준과 대응 방향을 제시한다.

11. JSON 작성
- 위 추론 과정을 내부적으로 수행한 뒤 최종 결과만 지정된 JSON 구조로 반환한다.
- 추론 과정 자체를 장황하게 출력하지 않는다.
- 모든 섹션이 같은 핵심 결론과 모순되지 않도록 한다.

출력은 반드시 유효한 JSON 하나만 반환하세요.
마크다운, 코드 블록, 설명 문장, JSON 앞뒤의 부가 문구는 절대 포함하지 마세요.

반드시 아래 구조와 필드명을 그대로 사용하세요.

{
  "heroSummary": {
    "headline": "현재 가장 중요한 판단을 보여주는 핵심 제목",
    "subheadline": "분석 주제와 현재 상황을 연결하는 보조 제목",
    "keyMessage": "리포트 전체를 관통하는 핵심 메시지"
  },
    "decisionAnchor": {
    "direction": "확대 | 유지 | 조정 | 보류 중 하나",
    "focus": "현재 가장 먼저 다뤄야 할 핵심 대상",
    "rationale": "해당 방향을 선택한 명리학적·현실적 근거"
  },
  "causeAnalysis": {
    "summary": "현재 흐름이 나타나는 명리학적 원인 요약",
    "reasons": [
      "구체적인 원인 1",
      "구체적인 원인 2",
      "구체적인 원인 3"
    ]
  },
  "fortuneStructure": {
    "summary": "사주 원국과 현재 운의 구조를 연결한 요약",
    "items": [
      {
        "label": "분석 기준",
        "value": "현재 확인된 구조",
        "interpretation": "사용자의 현실에 미치는 의미"
      }
    ]
  },
  "currentSituation": {
    "summary": "현재 상황과 판단 기준을 설명하는 요약",
    "opportunities": [
      "현재 활용할 수 있는 기회 1",
      "현재 활용할 수 있는 기회 2",
      "현재 활용할 수 있는 기회 3"
    ],
    "cautions": [
      "현재 주의할 점 1",
      "현재 주의할 점 2",
      "현재 주의할 점 3"
    ]
  },
  "futureTimeline": [
    {
      "period": "현재 흐름",
      "title": "현재 흐름의 핵심",
      "description": "현재 전달된 명리 데이터에서 직접 확인되는 흐름을 해석하고, 지금 우선적으로 확인할 판단 기준을 설명한다."
    },
    {
      "period": "다음 변화의 조건",
      "title": "다음 변화의 조건",
      "description": "미래 사건을 단정하지 않고, 현재 흐름이 변화할 때 확인해야 할 조건과 신호를 설명한다."
    },
    {
      "period": "중기적으로 확인할 신호",
      "title": "중기적으로 확인할 신호",
      "description": "특정 시점의 사건을 예측하지 말고, 중기적으로 사용자가 관찰해야 할 신호와 판단 기준을 설명한다."
    },
    {
      "period": "장기적으로 준비할 방향",
      "title": "장기적으로 준비할 방향",
      "description": "장기 미래를 단정하지 않고, 현재 근거에서 도출할 수 있는 준비 방향과 대응 기준을 설명한다."
    }
  ],
  "actionGuide": [
    "실제로 실행할 행동 1",
    "실제로 실행할 행동 2",
    "실제로 실행할 행동 3",
   
  ],
  "avoidGuide": [
    "피하거나 줄여야 할 행동 1",
    "피하거나 줄여야 할 행동 2",
    "피하거나 줄여야 할 행동 3",
    "피하거나 줄여야 할 행동 4"
  ],
  "coachMessage": {
    "title": "사용자에게 전하는 핵심 조언",
    "message": "현재 흐름을 이해하고 선택 기준을 세울 수 있도록 돕는 종합 조언"
  },
  "checklist": [
    "지금 점검할 항목 1",
    "지금 점검할 항목 2",
    "지금 점검할 항목 3",
    "지금 점검할 항목 4",
    "지금 점검할 항목 5"
  ],
  "recommendations": []
}

리포트 일관성 원칙:

- heroSummary.keyMessage를 리포트 전체의 중심 결론으로 사용한다.
- causeAnalysis는 중심 결론이 나온 명리학적 원인을 설명한다.
- fortuneStructure는 중심 결론을 뒷받침하는 원국·용신·대운·세운 근거만 선택한다.
- currentSituation은 중심 결론이 현재 어떻게 나타나는지를 설명한다.
${futureTimelineRuleText}- actionGuide는 중심 결론을 실제 행동으로 옮길 수 있는 방법을 제시한다.
- avoidGuide는 중심 결론을 해치는 행동이나 주의사항만 제시한다.
- coachMessage는 새로운 결론을 추가하지 않고 리포트 전체를 하나의 메시지로 정리한다.
- checklist는 actionGuide와 coachMessage를 사용자가 바로 실천할 수 있는 체크 항목으로 변환한다.
- 모든 섹션은 서로 다른 역할을 수행하되 같은 핵심 결론을 유지한다.
- 같은 문장을 반복하지 말고 서로 보완되는 내용으로 작성한다.
- 앞부분에서는 신중함을 강조하고 뒷부분에서는 무조건적인 확장을 권하는 등 서로 모순되는 내용을 작성하지 않는다.
- 기회와 주의가 동시에 존재할 경우 각각 어떤 조건에서 해당되는지 구분하여 설명한다.
- decisionAnchor를 먼저 확정한 뒤 모든 섹션을 작성하며, 각 섹션은 decisionAnchor의 direction과 focus를 변경하거나 뒤집지 않는다.

${productRules}

작성 원칙:

- 모든 내용은 제공된 사주 원국, 현재 대운·세운 흐름, 분석 주제에 근거해 작성한다.
- 입력에 없는 사실이나 날짜, 사건, 상대방의 성격을 임의로 만들어내지 않는다.
- 단순한 성격 설명이나 평생 운세로 벗어나지 않는다.
- 분석 종류와 직접 관련된 내용만 작성한다.
- 불안과 공포를 조성하거나 결과를 단정하지 않는다.
- 사용자가 실제 상황에서 적용할 수 있는 판단 기준과 행동 방향을 제시한다.
- 같은 의미를 여러 섹션에서 반복하지 않는다.
- 명리 용어를 사용할 때는 일반 사용자가 이해할 수 있도록 현실적인 의미를 함께 설명한다.
- 지나치게 추상적인 표현보다 관계, 돈, 직업, 계약, 일정, 선택처럼 구체적인 상황을 다룬다.
- 실제 입력 데이터에 직업·조직 정보가 없다면 R&R, 승인 단계, 승인 담당자, 산출물, 프로젝트, 계약·규정, 평가자, 보고 체계, 조직 프로세스 같은 특정 업무 환경을 사실처럼 가정하지 않는다.
- 현실 직업 정보가 없는 경우에는 책임 범위, 의사결정 권한, 완료 기준, 흐름 안정성, 확인 경로, 관찰할 신호처럼 공통적이고 근거 있는 판단 기준으로 표현한다.
- 근거 없는 현실 구체성은 금지하고, 근거 있는 현실 구체성만 허용한다.
- recommendations는 현재 단계에서는 반드시 빈 배열로 반환한다.

heroSummary 작성 규칙:

- headline은 사용자가 지금 가장 먼저 이해해야 할 핵심 판단을 한 문장으로 작성한다.
- 상품명만 반복하거나 누구에게나 적용되는 표현은 사용하지 않는다.
- subheadline은 분석 주제와 사용자의 현재 운을 자연스럽게 연결한다.
- keyMessage는 리포트 전체의 결론을 1~2문장으로 요약한다.

decisionAnchor 작성 규칙:

- direction은 반드시 "확대", "유지", "조정", "보류" 중 하나만 사용한다.
- direction은 리포트 전체의 중심 판단이며 다른 모든 섹션은 이 방향과 모순되지 않아야 한다.
- focus는 지금 가장 먼저 다뤄야 할 대상을 구체적인 명사형 표현으로 작성한다.
- focus에 "운을 높이기", "조심하기", "좋은 선택" 같은 추상적인 표현을 사용하지 않는다.
- rationale은 원국, 용신, 대운, 세운, 현재 상황을 연결하여 해당 방향을 선택한 이유를 설명한다.
- rationale은 불안을 조장하거나 미래를 확정하지 않으며 40~100자 이내로 작성한다.
- heroSummary.keyMessage, futureTimeline, actionGuide, coachMessage는 decisionAnchor의 direction과 focus를 유지한다.

causeAnalysis 작성 규칙:

- summary는 현재 흐름이 생기는 이유를 사주 원국과 대운·세운의 관계로 설명한다.
- reasons는 서로 다른 명리학적 원인을 정확히 3개 작성한다.
- 원인과 현실에서 나타나는 현상을 함께 연결한다.

fortuneStructure 작성 규칙:

- summary는 현재 운의 전체 구조를 이해하기 쉽게 설명한다.
- items는 정확히 4개 작성한다.
- 각 항목은 서로 다른 분석 기준을 사용한다.
- label에는 예를 들어 원국 균형, 대운 작용, 세운 작용, 합·충 변화와 같은 기준을 사용한다.
- value에는 실제 입력에서 확인되는 구조를 작성한다.
- interpretation에는 그 구조가 현재 판단에 미치는 의미를 작성한다.

currentSituation 작성 규칙:

- summary는 사용자가 현재 어떤 국면에 있는지 설명한다.
- opportunities는 활용 가능한 기회를 정확히 3개 작성한다.
- cautions는 주의해야 할 요소를 정확히 3개 작성한다.
- 기회와 주의점이 서로 같은 내용을 반복하지 않도록 한다.

futureTimeline 작성 규칙:

${futureTimelineSectionRules}

actionGuide 작성 규칙:

- 사용자가 실제로 실행할 수 있는 행동을 2개 이상 3개 이하로 작성한다.
- 가능하면 3개로 작성하되, 억지로 행동을 늘리지 않는다.
- 각 행동은 서로 다른 목적을 가져야 한다.
- 같은 목적의 행동을 연락 빈도, 답장 시간, 기록처럼 잘게 쪼개 여러 항목으로 만들지 않는다.
- 추상적인 마음가짐보다 확인, 정리, 기록, 비교, 대화, 준비 같은 구체적인 행동을 사용한다.
- 각 항목은 하나의 행동만 담는다.
- 행동은 구체적으로 작성하되 숫자·기간·횟수를 한 항목에 과도하게 넣어 업무 체크리스트처럼 만들지 않는다.
- "이행률", "지표", "프로토콜" 같은 관리·평가 용어보다 사용자가 일상에서 자연스럽게 이해할 수 있는 관계 언어를 우선한다.
- 입력 정보나 분석 근거에 없는 "24시간", "48시간", "몇 회", "몇 %" 같은 정밀한 수치를 임의의 정답처럼 만들지 않는다. 기간이 필요하면 "이번 주", "당분간", "다음 몇 주"처럼 행동을 점검하기 위한 현실적인 범위로 표현한다.
- 각 섹션은 서로 다른 역할을 맡는다. heroSummary는 판단 우선순위, decisionAnchor는 기준, causeAnalysis는 원인, fortuneStructure는 구조 해석, currentSituation은 현재 신호, futureTimeline은 변화 조건과 방향, actionGuide는 실행 행동, avoidGuide는 회피 행동, checklist는 검증 질문으로 역할을 분리한다.
- 동일한 핵심 명사구나 동일 의미 문장을 3개 이상 섹션에서 반복하지 않는다.
- 이미 actionGuide에서 다룬 내용을 checklist에서 다시 서술하지 않는다.
- coachMessage나 aiInsight는 앞 내용을 단순 요약하지 않고, 전체 분석을 관통하는 상위 통찰 1개만 제공한다.

avoidGuide 작성 규칙:

- 피하거나 줄여야 할 행동을 정확히 4개 작성한다.
- 공포를 조성하지 않고 실수와 손실 가능성을 줄이는 방향으로 작성한다.
- actionGuide와 반대말만 반복하지 않는다.

coachMessage 작성 규칙:

- title은 현재 사용자에게 가장 필요한 조언을 간결하게 작성한다.
- message는 운을 단정하기보다 사용자가 선택 기준을 세울 수 있도록 안내한다.
- 과도한 위로나 판매 문구는 사용하지 않는다.
- 앞 섹션의 핵심 문장을 그대로 반복하지 않고, 전체 분석을 관통하는 상위 통찰 1개만 제공한다.

checklist 작성 규칙:

- 지금 바로 점검할 수 있는 항목을 정확히 5개 작성한다.
- 각 항목은 체크박스 하나로 확인할 수 있는 구체적인 문장으로 작성한다.
- actionGuide를 그대로 복사하지 않는다.
- checklist는 실행 지시보다 "확인한다", "비교한다", "문구를 점검한다", "권한을 확인한다"처럼 결정 전 검증 질문/확인 항목으로 작성한다.
`;
}

export function buildPaidAnalysisDetailPromptV3(
  input: PaidAnalysisDetailPromptInput,
): string {
  const v2Prompt = buildPaidAnalysisDetailPromptV2(input);

  const recommendationsMarker = `"recommendations": []`;

  if (!v2Prompt.includes(recommendationsMarker)) {
    throw new Error(
      "V3 프롬프트를 만들 수 없습니다: V2 JSON 구조에서 recommendations 필드를 찾지 못했습니다.",
    );
  }

  const v3Fields = `"aiInsight": {
  "headline": "사용자가 지금 가장 먼저 이해해야 할 핵심 통찰을 한 문장으로 작성. 단순 운세 요약이 아니라 현재 문제와 실제 판단 기준의 차이를 드러낼 것",
  "explanation": "핵심 통찰을 뒷받침하는 명리 근거와 현재 현실에서 나타나는 의미를 연결해 설명. 원국·오행·용신·대운·세운 중 실제 입력 데이터에서 확인되는 근거를 사용하고, 같은 근거를 다른 섹션에서 반복하지 않을 것"
},
"pastPattern": {
  "summary": "현재 핵심 문제와 연결되는 반복 패턴의 구조를 요약. 단순 과거 회상이 아니라 어떤 선택·오해·거리 변화·감정 소모 패턴이 반복되기 쉬운지 설명. 이때 분석 주제에 실제로 해당하는 신호를 최소 하나 이상 구체적인 표현으로 드러낼 것. 예를 들어 관계 분석이라면 연락·거리·갈등·감정·관계·약속·경계·친밀·대화 중 실제 해당하는 신호를 사용하고, 해당하지 않는 신호를 형식적으로 나열하지 말 것",
  "periods": [
    {
      "period": "입력된 계산 데이터로 확인 가능한 과거 시기만 사용",
      "pattern": "그 시기에 활성화되었을 가능성이 있는 명리 작용과 실제 관계 패턴을 연결하되, 실제 사건이 있었다고 단정하지 않고 조건부로 설명",
      "verificationQuestion": "사용자가 당시 경험을 직접 확인할 수 있도록 연락 빈도, 관계 거리, 갈등 방식, 감정 소모, 관계 시작·정리 등의 구체적인 관찰 질문을 작성"
    }
  ]
},
"currentCoreProblem": {
  "title": "현재 가장 먼저 해결해야 할 핵심 문제를 하나만 선택해 현실적인 언어로 작성",
  "description": "현재 문제를 명리 근거 → 현실에서 나타나는 패턴 → 사용자가 확인할 수 있는 신호의 순서로 설명. 여러 문제를 나열하지 말고 중심 문제 하나에 집중",
  "whyItMatters": "이 문제를 지금 다뤄야 하는 이유, 방치할 경우 반복될 수 있는 관계 비용·감정 소모·판단 지연, 해결했을 때 기대할 수 있는 변화를 함께 설명"
},
"confidence": {
  "level": "높음 | 중간 | 낮음 중 하나",
  "strongestEvidence": [
    "현재 판단을 가장 강하게 뒷받침하는 서로 다른 명리 근거 1",
    "현재 판단을 가장 강하게 뒷받침하는 서로 다른 명리 근거 2"
  ],
  "uncertaintyFactors": [
    "상대방 정보, 실제 관계 상태, 사용자 행동, 생활 환경처럼 현재 입력만으로 확인할 수 없어 판단이 달라질 수 있는 현실 변수"
  ],
  "limitations": "이 분석에서 판단 가능한 범위와 판단할 수 없는 범위를 구분하여 작성. 상대방의 감정·의도·미래 행동이나 사건 발생을 확정하지 않을 것"
},
"recommendations": []`;

  const promptWithV3Json = v2Prompt.replace(
    recommendationsMarker,
    v3Fields,
  );

  // PERIOD-only: the JSON contract and rules never appear for TOPIC/legacy products.
  const periodStrategy = getPeriodAnalysisStrategy(input.productId);
  const promptWithPeriodJson = periodStrategy
    ? promptWithV3Json.replace(
        recommendationsMarker,
        `${buildPeriodAnalysisJsonContract(periodStrategy)}${recommendationsMarker}`,
      )
    : promptWithV3Json;
  const periodRules = periodStrategy
    ? `\n${buildPeriodAnalysisPromptRules(periodStrategy)}`
    : "";

  return `${promptWithPeriodJson}
${periodRules}
V3 추가 섹션 작성 규칙:

aiInsight 작성 규칙:

이 섹션은 Premium Report에서 사용자가 가장 먼저 읽는 핵심 분석이다.

단순한 요약을 작성하지 않는다.

반드시 다음 순서를 따른다.

1.
사용자의 현재 가장 핵심적인 문제를
한 문장으로 진단한다.

2.
사주 원국과 현재 운의 흐름 중
어떤 구조 때문에
그 문제가 생기는지 설명한다.

3.
그 구조가 현실에서는
어떤 모습으로 나타나는지
사용자가 자신의 삶과 연결할 수 있도록
구체적인 사례를 들어 설명한다.

4.
사용자가 지금 가장 먼저
우선순위를 두어야 할 행동을 제시한다.

5.
명리 용어를 그대로 나열하지 않는다.

명리 개념은
일반인이 이해할 수 있는 언어로
자연스럽게 번역한다.

6.
막연한 조언은 금지한다.

반드시

"왜"

"그래서"

"지금"

이 세 가지를 포함한다.

사용자가

"왜 이런 일이 생겼는지 이해했다."

라고 느낄 수 있도록 작성한다.

headline은
표면적인 고민과 실제 핵심 원인의 차이를
한 문장으로 보여준다.

headline은
충격적인 표현보다
명확한 통찰을 우선한다.

explanation은
원국과 운의 구조를
현실 언어로 풀어서 설명해야 한다.

headline과 explanation은
decisionAnchor의 direction 및 focus와
반드시 일치해야 한다.

pastPattern 작성 규칙:

이 섹션은

현재 문제(currentCoreProblem)가

어떻게 만들어졌는지

사용자가 이해하도록 만드는 역할이다.

summary 작성 규칙

과거의 사건을 나열하지 않는다.

현재 운의 구조가

과거에도 어떤 방식으로 반복되었을 가능성이 있는지

흐름 중심으로 설명한다.

반드시

현재 문제와 연결한다.

periods 작성 규칙

반드시 1개 이상 작성한다.

최대 3개까지 작성한다.

period는

입력 데이터에서 실제 계산 가능한 시기만 사용한다.

pattern 작성 규칙

사건을 단정하지 않는다.

"반복되었을 가능성이 있습니다."

"비슷한 선택이 이어졌을 수 있습니다."

처럼

사용자가 실제 경험과 비교할 수 있는 표현을 사용한다.

왜 그런 흐름이 반복되었는지

명리 구조와 연결해서 설명한다.

verificationQuestion 작성 규칙

사용자가

"맞다."

또는

"아니다."

를 스스로 판단할 수 있는

구체적인 질문을 작성한다.

질문은

현재 문제(currentCoreProblem)와

직접 연결되어야 한다.

사고

질병

이별

실패

재산 손실

등의 사건은

절대로 임의로 만들어내지 않는다.

ccurrentCoreProblem 작성 규칙:

이 섹션은

"지금 가장 먼저 해결해야 하는 단 하나의 문제"

를 결정하는 섹션이다.

절대로 여러 문제를 동시에 제시하지 않는다.

title 작성 규칙

- 행동 가능한 문제를 짧게 표현한다.
- 추상적인 성격 표현을 사용하지 않는다.
- "재물운 부족", "운이 약함" 같은 표현은 금지한다.

좋은 예

"현금흐름보다 투자 규모가 앞서는 구조"

"관계보다 감정 반응이 먼저 나오는 구조"

"description 작성 규칙"

반드시

현재 구조

↓

왜 이런 판단이 반복되는가

↓

현실에서 어떤 문제가 생기는가

순서로 설명한다.

사용자가

"맞다. 지금 내 문제가 정확히 이거다."

라고 느낄 정도로 현실적으로 작성한다.

whyItMatters 작성 규칙

현재 시점에서

왜 반드시 지금 해결해야 하는지를 설명한다.

"나중에"

"언젠가"

같은 표현은 금지한다.

반드시

현재 운의 흐름과 연결한다.

decisionAnchor의 focus와 직접 연결되어야 한다.

이 섹션 하나만 읽어도

사용자가

"이번 리포트가 무엇을 말하려는지"

바로 이해할 수 있어야 한다.

confidence 작성 규칙:

이 섹션은

분석이 얼마나 믿을 만한지

사용자가 스스로 판단하도록 돕는 역할이다.

level 작성 규칙

"높음"

"중간"

"낮음"

중 하나만 사용한다.

이 값은

예언 성공 확률이 아니다.

명리 근거가

얼마나 일관되게 같은 결론을 지지하는지를 의미한다.

strongestEvidence 작성 규칙

반드시

서로 다른 명리 근거를 최소 2개 작성한다.

같은 내용을 표현만 바꾸어 반복하지 않는다.

각 근거는

왜 현재 결론을 지지하는지까지 설명한다.

uncertaintyFactors 작성 규칙

결과를 바꿀 수 있는 현실 요인을 작성한다.

사용자 선택

환경 변화

직업

경제 상황

관계 변화

등 실제 변수만 사용한다.

막연하게

"운이 변할 수 있습니다."

같은 표현은 사용하지 않는다.

limitations 작성 규칙

이 리포트가

대신할 수 없는 전문 판단의 범위를 설명한다.

불필요하게 책임을 회피하는 문장이 아니라

분석의 적용 범위를 명확히 설명한다.

근거가 부족한 경우

억지로 "높음"을 선택하지 않는다.

confidence는

리포트 전체의 일관성과

명리 근거의 강도를 반영해야 한다.

V3 리포트 일관성 원칙:

- heroSummary.keyMessage, aiInsight, currentCoreProblem, decisionAnchor는 같은 중심 결론을 유지한다.
- causeAnalysis와 fortuneStructure는 aiInsight 및 currentCoreProblem의 근거가 되어야 한다.
- pastPattern은 현재 결론을 강화할 수 있지만 과거 사건을 확정해서는 안 된다.
- futureTimeline은 currentCoreProblem이 시간에 따라 어떻게 달라지는지 보여준다.
- actionGuide와 checklist는 currentCoreProblem을 실제로 조정할 수 있는 행동이어야 한다.
- confidence는 분석의 근거와 한계를 투명하게 설명해야 한다.
- V3 필드를 포함한 모든 필드를 빠짐없이 반환한다.
- 출력은 반드시 유효한 JSON 하나만 반환한다.
`;
}