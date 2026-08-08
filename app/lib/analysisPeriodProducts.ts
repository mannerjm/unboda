export type PeriodAnalysisProductDefinition = {
  id: string;
  type: "yearly" | "monthly" | "monthly-series";
  title: string;
  shortDescription: string;
};

export const PERIOD_ANALYSIS_PRODUCTS: PeriodAnalysisProductDefinition[] = [
  {
    id: "annual-current",
    type: "yearly",
    title: "올해 세운 종합 분석",
    shortDescription:
      "올해의 전체 흐름을 일·재물·관계·건강·변화 시기를 중심으로 종합 분석합니다.",
  },
  {
    id: "annual-next",
    type: "yearly",
    title: "내년 세운 종합 분석",
    shortDescription:
      "다음 해의 전체 흐름과 준비해야 할 변화·기회·주의점을 종합 분석합니다.",
  },
  {
    id: "monthly-current",
    type: "monthly",
    title: "이번 달 월운 종합 분석",
    shortDescription:
      "이번 달의 일·재물·관계·생활 흐름과 실제 행동 기준을 분석합니다.",
  },
  {
    id: "monthly-next",
    type: "monthly",
    title: "다음 달 월운 종합 분석",
    shortDescription:
      "다가오는 달의 주요 변화와 미리 준비할 판단 기준을 분석합니다.",
  },
  {
    id: "monthly-12months",
    type: "monthly-series",
    title: "앞으로 12개월 월별 흐름",
    shortDescription:
      "앞으로 12개월을 월별로 나누어 강약·변화·기회·주의 시점을 비교합니다.",
  },
];