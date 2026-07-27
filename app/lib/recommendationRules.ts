import type { PaidAnalysisProductId } from "./paidAnalysisProducts";

export type RecommendationRuleContribution = {
  productId: PaidAnalysisProductId;
  score: number;
  reason: string;
};

export type StrengthRecommendationLevel =
  | "매우 신강"
  | "신강"
  | "중화"
  | "신약"
  | "매우 신약";

export const STRENGTH_RECOMMENDATION_RULES: Readonly<
  Record<
    StrengthRecommendationLevel,
    readonly RecommendationRuleContribution[]
  >
> = {
  "매우 신강": [
    {
      productId: "career",
      score: 20,
      reason:
        "자기 주도성과 실행력이 강하게 나타나 직업 방향 점검의 우선도가 높습니다.",
    },
    {
      productId: "business",
      score: 15,
      reason:
        "독립적인 판단과 추진력을 활용할 수 있는 사업 흐름을 살펴볼 필요가 있습니다.",
    },
  ],

  신강: [
    {
      productId: "career",
      score: 20,
      reason:
        "자기 주도성과 실행력이 강하게 나타나 직업 방향 점검의 우선도가 높습니다.",
    },
    {
      productId: "business",
      score: 15,
      reason:
        "독립적인 판단과 추진력을 활용할 수 있는 사업 흐름을 살펴볼 필요가 있습니다.",
    },
  ],

  중화: [
    {
      productId: "yearly",
      score: 15,
      reason:
        "전체 구조가 비교적 균형적이므로 현재 시기별 흐름을 세밀하게 확인하는 것이 유용합니다.",
    },
    {
      productId: "daeun",
      score: 10,
      reason:
        "장기적인 운의 변화 속에서 중요한 전환 시기를 점검할 필요가 있습니다.",
    },
  ],

  신약: [
    {
      productId: "relationship",
      score: 20,
      reason:
        "주변 환경과 관계의 영향을 크게 받을 수 있어 관계 흐름 점검이 중요합니다.",
    },
    {
      productId: "health",
      score: 15,
      reason:
        "에너지 관리와 생활 균형을 우선적으로 살펴볼 필요가 있습니다.",
    },
  ],

  "매우 신약": [
    {
      productId: "relationship",
      score: 20,
      reason:
        "주변 환경과 관계의 영향을 크게 받을 수 있어 관계 흐름 점검이 중요합니다.",
    },
    {
      productId: "health",
      score: 15,
      reason:
        "에너지 관리와 생활 균형을 우선적으로 살펴볼 필요가 있습니다.",
    },
  ],
};