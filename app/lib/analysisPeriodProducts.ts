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
};

export const PERIOD_ANALYSIS_PRODUCTS: PeriodAnalysisProductDefinition[] = [
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