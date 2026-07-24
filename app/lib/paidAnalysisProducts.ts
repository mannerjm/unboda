export const paidAnalysisProducts = {
  wealth: {
  id: "wealth",
  title: "재물운 심층 분석",
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
  details: [],
},

  health: {
  id: "health",
  title: "건강운 심층 분석",
  description: "건강 흐름과 생활 관리 포인트를 심층적으로 분석합니다.",
  details: [],
},

social: {
  id: "social",
  title: "인간관계 심층 분석",
  description: "대인관계의 흐름과 주의할 관계 패턴을 심층적으로 분석합니다.",
  details: [],
},

marriage: {
  id: "marriage",
  title: "결혼운 심층 분석",
  description: "결혼 인연과 관계 발전 흐름을 심층적으로 분석합니다.",
  details: [],
},

study: {
  id: "study",
  title: "학업운 심층 분석",
  description: "학업 성향과 성과가 높아지는 흐름을 심층적으로 분석합니다.",
  details: [],
},

business: {
  id: "business",
  title: "사업운 심층 분석",
  description: "사업 흐름과 중요한 선택 시기를 심층적으로 분석합니다.",
  details: [],
},

"job-change": {
  id: "job-change",
  title: "이직운 심층 분석",
  description: "이직 가능성과 직업 변화 시기를 심층적으로 분석합니다.",
  details: [],
},

yearly: {
  id: "yearly",
  title: "올해운 심층 분석",
  description: "올해의 주요 흐름과 중요한 시기를 심층적으로 분석합니다.",
  details: [],
},

daeun: {
  id: "daeun",
  title: "대운 심층 분석",
  description: "장기적인 운의 변화와 인생 흐름을 심층적으로 분석합니다.",
  details: [],
},
} as const;

export type PaidAnalysisProductId =
  keyof typeof paidAnalysisProducts;