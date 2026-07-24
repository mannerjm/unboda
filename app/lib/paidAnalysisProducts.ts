export const paidAnalysisProducts = {
  wealth: {
    id: "wealth",
    title: "재물운 심층 분석",
  },

  relationship: {
    id: "relationship",
    title: "연애·관계 심층 분석",
  },

  career: {
    id: "career",
    title: "직업운 심층 분석",
  },

  health: {
    id: "health",
    title: "건강운 심층 분석",
  },

  social: {
    id: "social",
    title: "인간관계 심층 분석",
  },

  marriage: {
    id: "marriage",
    title: "결혼운 심층 분석",
  },

  study: {
    id: "study",
    title: "학업운 심층 분석",
  },

  business: {
    id: "business",
    title: "사업운 심층 분석",
  },

  "job-change": {
    id: "job-change",
    title: "이직운 심층 분석",
  },

  yearly: {
    id: "yearly",
    title: "올해운 심층 분석",
  },

  daeun: {
    id: "daeun",
    title: "대운 심층 분석",
  },
} as const;

export type PaidAnalysisProductId =
  keyof typeof paidAnalysisProducts;