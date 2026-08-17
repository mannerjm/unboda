import type { PeriodAnalysisProductType } from "./analysisPeriodProducts";

export type PeriodAnalysisTimeGranularity =
  | "month"
  | "year"
  | "multi-year"
  | "rolling-months"
  | "daeun"
  | "lifetime";

export type PeriodAnalysisStrategy = {
  productId: string;
  /** Registry periodType this strategy is bound to; verified by regression. */
  periodType: PeriodAnalysisProductType;
  timeGranularity: PeriodAnalysisTimeGranularity;
  coreQuestion: string;
  focus: readonly string[];
  timelineSpec: {
    /** Must stay at 4+ entries: the V3 schema requires futureTimeline.min(4). */
    labels: readonly string[];
    rule: string;
  };
  prohibitedPatterns: readonly string[];
};

export const PERIOD_ANALYSIS_STRATEGIES: readonly PeriodAnalysisStrategy[] = [
  {
    productId: "monthly-current",
    periodType: "monthly",
    timeGranularity: "month",
    coreQuestion: "이번 달 안에서 지금 무엇을 우선해야 하는가",
    focus: [
      "기준 월 전체의 흐름과 체감되는 변화",
      "이번 달 안에서 힘이 실리는 구간과 조심할 구간",
      "이번 달 안에 바로 실행할 행동의 우선순위",
      "지금 상황에서 확인할 수 있는 현실 신호",
    ],
    timelineSpec: {
      labels: [
        "이번 달 초반",
        "이번 달 중반",
        "이번 달 후반",
        "이번 달 전체의 핵심 전환",
      ],
      rule: "한 달 내부의 구간 변화만 다루고, 분기·반기·연 단위 전망으로 확장하지 않는다.",
    },
    prohibitedPatterns: [
      "생애 전체나 장기 인생론으로 확장하는 서술",
      "3개월·6개월·1년 같은 연 단위 장기 전망",
      "특정 날짜의 사건이나 길흉을 단정하는 표현",
    ],
  },
  {
    productId: "monthly-next",
    periodType: "monthly",
    timeGranularity: "month",
    coreQuestion: "다음 달에 들어가기 전에 무엇을 준비해야 하는가",
    focus: [
      "기준 월의 핵심 흐름과 그 달의 성격",
      "직전 달과 비교해 달라지는 조건",
      "다음 달에 진입하기 전에 미리 준비할 사항",
      "그 달 안의 기회 구간과 주의 구간",
    ],
    timelineSpec: {
      labels: [
        "다음 달 진입 전 준비",
        "다음 달 초반",
        "다음 달 중반",
        "다음 달 후반",
      ],
      rule: "진입 전 준비와 해당 월 내부의 구간 변화를 다루고, 직전 달의 상황을 다시 분석하지 않는다.",
    },
    prohibitedPatterns: [
      "직전 달(이번 달) 분석을 그대로 반복하는 서술",
      "장기 인생론이나 연 단위 전망으로의 확장",
      "특정 날짜의 사건을 단정하는 표현",
    ],
  },
  {
    productId: "annual-current",
    periodType: "yearly",
    timeGranularity: "year",
    coreQuestion: "올해 전체 흐름 속에서 남은 기간을 어떻게 활용할 것인가",
    focus: [
      "기준 연도 전체를 관통하는 테마",
      "기준 확정일 이전 흐름과 이후 흐름의 구분",
      "기준 확정일 이후 남은 기간에서 우선할 판단",
      "연중 주요 전환 구간",
      "남은 기간의 행동 우선순위",
    ],
    timelineSpec: {
      labels: [
        "올해 전반의 흐름",
        "기준 확정일 이후 남은 기간",
        "올해 후반의 전환 구간",
        "올해 마무리와 다음 해로의 연결",
      ],
      rule: "반기·분기 또는 기준일 이전/이후처럼 연 단위 해상도로 구분하고, 월별로 나누어 나열하지 않는다.",
    },
    prohibitedPatterns: [
      "12개월 상품처럼 월별로 길게 나열하는 서술",
      "특정 사건의 발생을 확정하는 표현",
    ],
  },
  {
    productId: "annual-next",
    periodType: "yearly",
    timeGranularity: "year",
    coreQuestion: "다음 해의 핵심 변화는 무엇이고 지금 무엇을 준비해야 하는가",
    focus: [
      "기준 연도(실제 연도 숫자)를 명시한 핵심 테마",
      "현재 해와 비교해 달라지는 흐름",
      "다음 해의 주요 기회 구간과 주의 구간",
      "지금부터 진행할 사전 준비 전략",
    ],
    timelineSpec: {
      labels: [
        "다음 해 상반기",
        "다음 해 하반기",
        "다음 해의 핵심 전환 구간",
        "지금부터의 사전 준비",
      ],
      rule: "다음 해 내부의 큰 구간을 기준으로 구분하고, 각 항목에서 실제 기준 연도 숫자를 사용한다.",
    },
    prohibitedPatterns: [
      "현재 해(올해) 운 분석을 반복하는 서술",
      "실제 연도 없이 '내년'이라는 상대 표현만 사용하는 서술",
      "특정 사건의 발생을 확정하는 표현",
    ],
  },
  {
    productId: "annual-3years",
    periodType: "yearly-series",
    timeGranularity: "multi-year",
    coreQuestion: "향후 3년의 방향성과 주요 전환점은 무엇인가",
    focus: [
      "1년차·2년차·3년차 각각의 역할과 성격",
      "세 연도 사이의 차이와 변화의 방향",
      "중기적으로 유지해야 할 방향성",
      "3년에 걸쳐 누적되는 변화",
      "주요 전환점과 장기 준비 순서",
    ],
    timelineSpec: {
      labels: [
        "1년차",
        "2년차",
        "3년차",
        "3년 전체의 전환점과 준비 순서",
      ],
      rule: "각 연도 항목의 period에는 기준 기간에 제시된 실제 연도를 사용하고, 세 연도를 반드시 서로 비교해 차이를 드러낸다.",
    },
    prohibitedPatterns: [
      "월 단위 타이밍 분석으로 내려가는 서술",
      "3년을 하나의 뭉뚱그린 문단으로 처리하는 서술",
      "특정 사건의 발생을 확정하는 표현",
    ],
  },
  {
    productId: "monthly-12months",
    periodType: "monthly-series",
    timeGranularity: "rolling-months",
    coreQuestion: "앞으로 12개월 중 언제 움직이고 언제 조정해야 하는가",
    focus: [
      "12개월 전체 흐름의 강약",
      "힘이 실리는 핵심 월과 구간",
      "속도를 줄이고 조정할 월과 구간",
      "흐름이 바뀌는 전환 구간",
      "실행 타이밍의 우선순위",
    ],
    timelineSpec: {
      labels: [
        "가장 강하게 움직일 구간",
        "조정이 필요한 구간",
        "흐름이 바뀌는 전환 구간",
        "12개월 전체 강약 요약",
      ],
      rule: "월 단위 해상도를 사용하되 12개월을 모두 같은 분량으로 나열하지 말고, 실제 연·월을 붙여 핵심 월과 강약 구간만 선별한다.",
    },
    prohibitedPatterns: [
      "연 단위 중기 인생 방향으로 확장하는 서술",
      "12개월을 기계적으로 동일 분량으로 나열하는 서술",
      "특정 사건의 발생을 확정하는 표현",
    ],
  },
  {
    productId: "daeun-current",
    periodType: "daeun",
    timeGranularity: "daeun",
    coreQuestion: "현재 대운의 장기 테마와 현재 위치는 무엇인가",
    focus: [
      "현재 대운을 관통하는 핵심 테마",
      "상승·조정·전환 국면의 구분",
      "이 대운에서 반복되는 장기 과제",
      "현재 시점이 이 대운의 어느 위치인지",
      "수년 단위의 장기 대응 전략",
    ],
    timelineSpec: {
      labels: [
        "현재 대운의 진입 국면",
        "현재 위치한 국면",
        "이후 조정 국면",
        "다음 대운으로의 전환 조건",
      ],
      rule: "월이나 특정 연도가 아니라 수년 단위의 장기 국면으로 구분한다.",
    },
    prohibitedPatterns: [
      "기준 기간에 제시되지 않은 대운 번호나 간지를 추정해 만들어내는 서술",
      "월 단위 단기 예측",
      "특정 사건의 발생을 확정하는 표현",
    ],
  },
  {
    productId: "lifetime-overview",
    periodType: "lifetime",
    timeGranularity: "lifetime",
    coreQuestion: "생애 전체에서 반복되는 구조와 큰 전환 패턴은 무엇인가",
    focus: [
      "생애 전체를 관통하는 구조",
      "삶에서 반복되는 선택과 관계의 패턴",
      "장기적으로 유지되는 강점",
      "장기적으로 반복되는 취약점",
      "큰 전환이 나타나는 성격과 조건",
    ],
    timelineSpec: {
      labels: [
        "생애 초반의 구조",
        "생애 중반의 구조",
        "생애 후반의 구조",
        "생애 전체의 큰 전환 성격",
      ],
      rule: "생애 국면과 장기 전환 중심으로 서술하고, 특정 연도나 월을 지목하지 않는다.",
    },
    prohibitedPatterns: [
      "3개월·6개월·1년 같은 단기 전망",
      "특정 연도나 월의 사건을 예측하는 서술",
      "기준 기간에 분석 대상 기간(coverage)이 있다고 가정하는 서술",
    ],
  },
];

const STRATEGY_BY_PRODUCT_ID = new Map(
  PERIOD_ANALYSIS_STRATEGIES.map((strategy) => [strategy.productId, strategy]),
);

/** Null for TOPIC, legacy and unknown products. */
export function getPeriodAnalysisStrategy(
  productId: string | undefined,
): PeriodAnalysisStrategy | null {
  return productId ? STRATEGY_BY_PRODUCT_ID.get(productId) ?? null : null;
}

const TIME_GRANULARITY_LABELS: Record<PeriodAnalysisTimeGranularity, string> = {
  month: "한 달 내부 (월 내 구간)",
  year: "1개 연도 (반기·분기 구간)",
  "multi-year": "여러 연도 (연도별 비교)",
  "rolling-months": "앞으로의 연속 월 (월 단위 타이밍)",
  daeun: "대운 단위 (수년 단위 장기 국면)",
  lifetime: "생애 전체 (장기 국면과 전환)",
};

export function formatPeriodStrategyForPrompt(
  strategy: PeriodAnalysisStrategy,
): string {
  return [
    `핵심 질문: ${strategy.coreQuestion}`,
    `시간 해상도: ${TIME_GRANULARITY_LABELS[strategy.timeGranularity]}`,
    "반드시 분석할 내용:",
    ...strategy.focus.map((item) => `- ${item}`),
    "시간축 구성:",
    `- ${strategy.timelineSpec.rule}`,
    `- futureTimeline은 ${strategy.timelineSpec.labels.join(" / ")}의 정확히 ${strategy.timelineSpec.labels.length}개 항목으로 작성한다.`,
    "이 분석에서 하지 말아야 할 것:",
    ...strategy.prohibitedPatterns.map((item) => `- ${item}`),
  ].join("\n");
}

export function buildPeriodTimelineConsistencyRule(
  strategy: PeriodAnalysisStrategy,
): string {
  return `- futureTimeline은 ${TIME_GRANULARITY_LABELS[strategy.timeGranularity]} 해상도를 유지하며, ${strategy.timelineSpec.rule}
`;
}

export function buildPeriodTimelineSectionRules(
  strategy: PeriodAnalysisStrategy,
): string {
  return [
    `- ${strategy.timelineSpec.labels.join(", ")}의 정확히 ${strategy.timelineSpec.labels.length}개 항목을 작성한다.`,
    `- ${strategy.timelineSpec.rule}`,
    "- period에는 기준 기간에 고정된 실제 연·월 표현을 사용하고, 기준 기간에 없는 시점을 새로 만들지 않는다.",
    "- 각 항목은 서로 다른 구간을 다루며 같은 내용을 반복하지 않는다.",
    "- 모든 시기를 무조건 좋거나 나쁘다고 단정하지 않는다.",
    ...strategy.prohibitedPatterns.map((item) => `- ${item}을 하지 않는다.`),
    "",
  ].join("\n");
}
