/** Time scale of a period product; catalog grouping and report meta both read this. */
export type PeriodAnalysisProductType =
  | "monthly"
  | "monthly-series"
  | "yearly"
  | "yearly-series"
  | "daeun"
  | "lifetime";

export type PeriodAnalysisProductDefinition = {
  id: string;
  type: PeriodAnalysisProductType;
  title: string;
  shortDescription: string;
  purchaseDecision?: PeriodPurchaseDecision;
};

export type PeriodPurchaseDecision = {
  primaryQuestion: string;
  recommendedFor: readonly string[];
  analysisScope: readonly string[];
  expectedUnderstanding: readonly string[];
  distinction: string;
};

const PERIOD_PURCHASE_DECISIONS: Readonly<Record<string, PeriodPurchaseDecision>> = {
  "monthly-current": {
    primaryQuestion: "이번 달 안에서 지금 무엇을 우선해서 살펴봐야 할까?",
    recommendedFor: ["이번 달의 전체적인 흐름을 먼저 파악하고 싶을 때", "일·재물·관계·생활 중 어디에 힘을 더 써야 할지 고민될 때", "이번 달 안에서 주의 깊게 살펴볼 시기와 흐름을 구분하고 싶을 때"],
    analysisScope: ["이번 달 초반·중반·후반의 흐름", "일·재물·관계·생활에서 나타나는 주요 변화", "힘이 실리는 구간과 조심해서 살펴볼 구간", "이번 달의 실행 우선순위", "월말에 유지하거나 조정할 부분"],
    expectedUnderstanding: ["이번 달 전체 흐름 속에서 현재 위치", "지금 우선해서 살펴볼 영역", "시기별로 달라지는 흐름", "이번 달을 지나며 다시 점검할 기준"],
    distinction: "지금 진행 중인 한 달의 흐름과 우선순위를 가장 가까운 시점에서 살펴보는 분석입니다.",
  },
  "monthly-next": {
    primaryQuestion: "다음 달이 시작되기 전에 무엇을 미리 준비하면 좋을까?",
    recommendedFor: ["다음 달의 흐름을 미리 살펴보고 싶을 때", "이번 달과 다음 달의 차이가 궁금할 때", "다가오는 변화에 맞춰 미리 준비할 부분을 정리하고 싶을 때"],
    analysisScope: ["다음 달에 들어가기 전 준비할 부분", "다음 달 초반·중반·후반의 흐름", "이번 달과 비교해 달라지는 조건", "다음 달에 주의 깊게 관찰할 변화", "준비·유지·조정을 검토할 시점"],
    expectedUnderstanding: ["다음 달의 전반적인 흐름", "현재와 달라질 가능성이 있는 부분", "미리 준비해서 살펴볼 영역", "다음 달 진행 중 다시 확인할 기준"],
    distinction: "이번달 운이 현재 진행 중인 흐름을 살펴본다면, 다음달 운은 다가오는 한 달을 미리 준비하는 데 초점을 둡니다.",
  },
  "yearly-current": {
    primaryQuestion: "올해 전체 흐름에서 무엇을 우선하고 어떻게 조정해 나가야 할까?",
    recommendedFor: ["올해 전체 흐름을 한 번에 정리하고 싶을 때", "최근 몇 달의 변화가 올해 전체에서 어떤 위치인지 궁금할 때", "일·재물·관계·생활의 우선순위를 장기적으로 점검하고 싶을 때"],
    analysisScope: ["올해의 전반적인 흐름과 기준선", "연중 압력과 활용 가능한 자원의 변화", "흐름이 달라지는 주요 구간", "올해의 우선순위 배분", "연중 점검 시점과 연말 재정리 기준"],
    expectedUnderstanding: ["올해 전체 흐름에서 현재 위치", "올해 힘을 배분할 우선순위", "변화가 나타나는 주요 구간", "유지하거나 조정해서 살펴볼 부분"],
    distinction: "월 단위 분석보다 넓게, 현재 연도 전체의 흐름과 운영 우선순위를 종합해서 살펴봅니다.",
  },
  "annual-next": {
    primaryQuestion: "다음 해에는 무엇이 달라지고 지금부터 무엇을 준비해야 할까?",
    recommendedFor: ["내년의 전체 흐름을 미리 살펴보고 싶을 때", "올해와 내년 사이의 변화가 궁금할 때", "다음 해의 중요한 계획을 앞두고 준비 방향을 점검하고 싶을 때"],
    analysisScope: ["다음 해의 핵심 흐름", "현재 해와 비교해 달라지는 조건", "상반기와 하반기의 주요 흐름", "주요 변화·기회·주의 구간", "지금부터 준비해서 살펴볼 부분"],
    expectedUnderstanding: ["다음 해의 전체적인 방향", "올해와 달라지는 주요 흐름", "상·하반기의 역할과 변화", "다음 해를 앞두고 준비할 기준"],
    distinction: "올해 흐름 분석이 현재 연도의 운영에 집중한다면, 내년 운은 다음 해에 나타날 변화와 사전 준비에 초점을 둡니다.",
  },
  "annual-3years": {
    primaryQuestion: "앞으로 3년은 어떤 순서로 흐르고 중요한 전환은 어디에서 나타날까?",
    recommendedFor: ["한 해보다 긴 중기 흐름을 살펴보고 싶을 때", "앞으로 몇 년의 계획을 세우며 시기별 역할을 비교하고 싶을 때", "변화가 언제 시작되고 이어지는지 큰 순서를 이해하고 싶을 때"],
    analysisScope: ["1년차·2년차·3년차의 흐름", "각 연도 사이의 차이", "3년 동안 이어지는 중기 방향", "누적해서 나타나는 변화", "주요 전환점과 준비 순서"],
    expectedUnderstanding: ["앞으로 3년의 연도별 역할", "해마다 달라지는 흐름", "중기적으로 이어지는 방향", "중요한 전환을 준비할 순서"],
    distinction: "한 해의 세부 흐름보다, 3개 연도를 연결해서 변화의 순서와 중기 방향을 살펴보는 분석입니다.",
  },
  "daeun-current": {
    primaryQuestion: "나는 지금 장기 흐름의 어느 국면에 있고 앞으로 어떤 전환을 살펴봐야 할까?",
    recommendedFor: ["몇 년 단위로 반복되는 큰 흐름이 궁금할 때", "최근의 변화가 장기 흐름에서 어떤 의미인지 살펴보고 싶을 때", "현재 대운의 위치와 다음 장기 전환을 함께 이해하고 싶을 때"],
    analysisScope: ["현재 대운의 핵심 테마", "현재 위치한 장기 국면", "상승·조정·전환으로 이어지는 흐름", "장기간 반복해서 나타나는 과제", "다음 대운으로 넘어가는 전환 조건"],
    expectedUnderstanding: ["현재 장기 흐름의 핵심 성격", "지금 위치한 국면", "반복해서 살펴볼 장기 과제", "다음 큰 전환을 이해할 기준"],
    distinction: "연도별 흐름을 넘어, 현재 대운을 중심으로 수년 단위의 장기 국면과 전환 조건을 살펴봅니다.",
  },
  "lifetime-overview": {
    primaryQuestion: "내 삶 전체에서 반복되는 구조와 큰 전환의 패턴은 무엇일까?",
    recommendedFor: ["특정 달이나 해보다 삶 전체의 구조를 보고 싶을 때", "비슷한 선택이나 관계 패턴이 반복되는 이유를 살펴보고 싶을 때", "장기적인 강점과 취약점, 큰 변화의 성격을 함께 이해하고 싶을 때"],
    analysisScope: ["생애 초반·중반·후반의 구조", "삶에서 반복해서 나타나는 선택과 관계 패턴", "장기적으로 활용할 수 있는 강점", "반복해서 점검할 취약한 패턴", "생애의 큰 전환이 나타나는 성격과 조건"],
    expectedUnderstanding: ["삶 전체에서 반복되는 구조", "장기적으로 나타나는 강점", "반복해서 주의 깊게 살펴볼 패턴", "큰 전환을 바라보는 장기적인 기준"],
    distinction: "특정 기간의 운을 보는 분석이 아니라, 생애 전체를 연결해 반복 구조와 큰 전환의 성격을 종합적으로 살펴봅니다.",
  },
};

const PERIOD_ANALYSIS_PRODUCT_DEFINITIONS: Omit<PeriodAnalysisProductDefinition, "purchaseDecision">[] = [
  {
    id: "monthly-current",
    type: "monthly",
    title: "이번달 운",
    shortDescription:
      "이번 달의 일·재물·관계·생활 흐름과 실제 행동 기준을 분석합니다.",
  },
  {
    id: "monthly-next",
    type: "monthly",
    title: "다음달 운",
    shortDescription:
      "다가오는 달의 주요 변화와 미리 준비할 판단 기준을 분석합니다.",
  },
  {
    id: "yearly-current",
    type: "yearly",
    title: "올해 흐름 종합 분석",
    shortDescription:
      "올해의 압력·자원 변화와 운영 우선순위를 관찰·조정 기준으로 종합 분석합니다.",
  },
  {
    id: "annual-next",
    type: "yearly",
    title: "내년 운",
    shortDescription:
      "다음 해의 전체 흐름과 준비해야 할 변화·기회·주의점을 종합 분석합니다.",
  },
  {
    id: "annual-3years",
    type: "yearly-series",
    title: "향후 3년 운",
    shortDescription:
      "현재 기준 향후 3개 연도의 중기 흐름을 연도별로 비교해 분석합니다.",
  },
  {
    id: "monthly-12months",
    type: "monthly-series",
    title: "앞으로 12개월",
    shortDescription:
      "앞으로 12개월을 월별로 나누어 강약·변화·기회·주의 시점을 비교합니다.",
  },
  {
    id: "daeun-current",
    type: "daeun",
    title: "대운 · 10년 흐름",
    shortDescription:
      "현재 대운을 중심으로 앞으로 10년의 장기 흐름과 전환 조건을 분석합니다.",
  },
  {
    id: "lifetime-overview",
    type: "lifetime",
    title: "평생운",
    shortDescription:
      "생애 전체 구조와 주요 전환 흐름을 대운 단위로 이어서 종합 분석합니다.",
  },
];

export const PERIOD_ANALYSIS_PRODUCTS: PeriodAnalysisProductDefinition[] =
  PERIOD_ANALYSIS_PRODUCT_DEFINITIONS.map((product) => {
    const purchaseDecision = PERIOD_PURCHASE_DECISIONS[product.id];
    return purchaseDecision ? { ...product, purchaseDecision } : product;
  });