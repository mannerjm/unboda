export type PaidAnalysisProduct = {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  details: readonly string[];
};
export const paidAnalysisProducts = {
  wealth: {
  id: "wealth",
  title: "재물운 심층 분석",
   shortTitle: "재물운",
  description:
    "돈의 흐름, 기회가 커지는 시기와 지출·손실에 주의할 흐름을 분석합니다.",
  details: [
    "현재 재물 흐름이 나타나는 명리학적 이유",
    "수입과 재물 기회가 강해지는 중요한 시기",
    "재물 흐름에서 활용할 수 있는 기회",
    "지출·손실과 금전 판단에 주의할 시기와 요인",
    "현재 상황에 맞는 현실적인 재물 관리 방향",
  ],
},

 relationship: {
  id: "relationship",
  title: "연애·관계 심층 분석",
   shortTitle: "연애·관계",
  description:
    "관계의 변화, 인연의 흐름과 현재 관계에서 살펴볼 핵심 포인트를 분석합니다.",
  details: [
    "현재 관계 흐름이 나타나는 명리학적 이유",
    "새로운 인연과 관계 변화가 강해지는 시기",
    "관계를 발전시키기 좋은 흐름",
    "갈등과 거리감에 주의할 시기와 요인",
    "현재 관계에서 살펴볼 현실적인 대응 방향",
  ],
},

  career: {
  id: "career",
  title: "직업운 심층 분석",
  description: "직업 방향과 변화의 흐름을 심층적으로 분석합니다.",
  details: [
  "현재 직업운 흐름이 나타나는 이유",
  "성과가 커질 수 있는 시기",
  "승진·평가에 유리한 흐름",
  "직장에서 주의해야 하는 변화",
  "커리어 전략과 현실적인 대응 방향",
],
},

  health: {
  id: "health",
  title: "건강운 심층 분석",
    shortTitle: "건강운",
  description: "건강 흐름과 생활 관리 포인트를 심층적으로 분석합니다.",
  details: [
  "현재 건강 흐름이 나타나는 명리학적 이유",
  "오행 균형이 건강에 미치는 영향",
  "생활 습관을 조정하기 좋은 시기",
  "피로와 컨디션 저하에 주의해야 하는 흐름",
  "현재 운에 맞는 현실적인 건강 관리 방향",
],
},

social: {
  id: "social",
  title: "인간관계 심층 분석",
   shortTitle: "인간관계",
  description: "대인관계의 흐름과 주의할 관계 패턴을 심층적으로 분석합니다.",
  details: [
  "현재 인간관계 흐름이 나타나는 명리학적 이유",
  "도움이 되는 인연과 멀어져야 할 관계",
  "신뢰와 협력이 강해지는 시기",
  "갈등이 커질 수 있는 관계 패턴",
  "관계를 정리하고 유지하는 현실적인 기준",
],
},

marriage: {
  id: "marriage",
  title: "결혼운 심층 분석",
  description: "결혼 인연과 관계 발전 흐름을 심층적으로 분석합니다.",
  details: [
  "결혼운 흐름이 나타나는 명리학적 이유",
  "결혼 적기와 인연이 강해지는 시기",
  "배우자와의 관계에서 중요한 요소",
  "결혼을 미루면 생길 수 있는 변화",
  "안정적인 결혼을 위한 현실적인 준비",
],
},

study: {
  id: "study",
  title: "학업운 심층 분석",
  description: "학업 성향과 성과가 높아지는 흐름을 심층적으로 분석합니다.",
  details: [
  "현재 학업운 흐름이 나타나는 이유",
  "집중력이 높아지는 시기",
  "시험과 평가에 유리한 흐름",
  "공부 효율이 떨어질 수 있는 시기",
  "학습 전략과 현실적인 준비 방향",
],
},

business: {
  id: "business",
  title: "사업운 심층 분석",
  description: "사업 흐름과 중요한 선택 시기를 심층적으로 분석합니다.",
  details: [
  "사업운 흐름과 현재 시장 타이밍",
  "확장하기 좋은 시기",
  "투자와 계약에서 주의할 점",
  "매출 변화 가능성이 높은 흐름",
  "사업 운영 전략과 현실적인 대응",
],
},

"job-change": {
  id: "job-change",
  title: "이직운 심층 분석",
  description: "이직 가능성과 직업 변화 시기를 심층적으로 분석합니다.",
  details: [
  "현재 이직운 흐름이 나타나는 이유",
  "이직에 유리한 시기",
  "지금 회사를 유지해야 하는 이유",
  "새로운 기회를 잡는 방법",
  "커리어 변화의 현실적인 방향",
],
},

yearly: {
  id: "yearly",
  title: "올해운 심층 분석",
  description: "올해의 주요 흐름과 중요한 시기를 심층적으로 분석합니다.",
  details: [
  "올해 운세의 핵심 흐름",
  "기회가 커지는 시기",
  "주의해야 하는 달",
  "올해 가장 중요한 결정 포인트",
  "올해 운을 활용하는 현실적인 전략",
],
},

daeun: {
  id: "daeun",
  title: "대운 심층 분석",
  description: "장기적인 운의 변화와 인생 흐름을 심층적으로 분석합니다.",
 details: [
  "현재 대운이 인생에 미치는 영향",
  "앞으로 10년의 변화 방향",
  "강해지는 운과 약해지는 운",
  "주의해야 하는 전환 시기",
  "장기적인 인생 전략",
],
},
} satisfies Record<string, PaidAnalysisProduct>;

export type PaidAnalysisProductId =
  keyof typeof paidAnalysisProducts;

  export function isPaidAnalysisProductId(
  value: unknown
): value is PaidAnalysisProductId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(paidAnalysisProducts, value)
  );
}