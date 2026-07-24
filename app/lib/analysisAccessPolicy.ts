export type AnalysisAccessLevel =
  | "free"
  | "summary"
  | "premium"
  | "internal";

export type AnalysisFieldPolicy = {
  field: string;
  access: AnalysisAccessLevel;
  description: string;
};

export const analysisAccessPolicy: AnalysisFieldPolicy[] = [
  {
    field: "pillars",
    access: "free",
    description: "사주 원국과 기본 명식 정보",
  },
  {
    field: "elementAnalysis",
    access: "free",
    description: "오행 분포와 기본 균형 정보",
  },
  {
    field: "strengthAnalysis",
    access: "free",
    description: "신강·신약 기본 판정",
  },
  {
    field: "elementInterpretation",
    access: "summary",
    description: "오행 구조 핵심 요약",
  },
  {
    field: "yongshinAnalysis",
    access: "summary",
    description: "용신 핵심 요약",
  },
  {
    field: "gyeokgukAnalysis",
    access: "summary",
    description: "격국 핵심 요약",
  },
  {
    field: "daeunAnalysis",
    access: "summary",
    description: "현재 대운 중심의 핵심 흐름",
  },
  {
    field: "seunAnalysis",
    access: "summary",
    description: "현재 세운 중심의 핵심 흐름",
  },
  {
    field: "elementRelations",
    access: "premium",
    description: "오행 간 세부 관계와 심층 분석 근거",
  },
  {
    field: "fortuneBrain",
    access: "internal",
    description: "상품 추천과 심층 분석을 위한 내부 종합 판단 데이터",
  },
];

export function getAnalysisAccessLevel(
  field: string
): AnalysisAccessLevel {
  return (
    analysisAccessPolicy.find((item) => item.field === field)?.access ??
    "internal"
  );
}