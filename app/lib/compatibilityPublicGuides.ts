import {
  COMPATIBILITY_BUSINESS_PRODUCT,
  COMPATIBILITY_FAMILY_OTHER_PRODUCT,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT,
  COMPATIBILITY_FRIEND_PRODUCT,
  COMPATIBILITY_ROMANTIC_PRODUCT,
  COMPATIBILITY_WORKPLACE_PRODUCT,
  type SpecialAnalysisProductDefinition,
} from "./specialAnalysisProducts";

/**
 * Public descriptions only. No profile, auth, birth data or paid report content.
 * The existing product definitions remain the source of truth for price and scope.
 */
export const COMPATIBILITY_GUIDE_SLUGS = [
  "romantic",
  "workplace",
  "friend",
  "business",
  "parent-child",
  "siblings",
  "other-family",
] as const;

export type CompatibilityGuideSlug = (typeof COMPATIBILITY_GUIDE_SLUGS)[number];

export type CompatibilityPublicGuide = Readonly<{
  slug: CompatibilityGuideSlug;
  product: SpecialAnalysisProductDefinition;
  entryPath: string;
  audience: string;
  questions: readonly string[];
  focus: readonly string[];
  distinction: string;
  isFamily: boolean;
}>;

const FAMILY_ENTRY = "/special-analysis/compatibility/family/parent-child#family-relationship-selector";

const GUIDES: Readonly<Record<CompatibilityGuideSlug, CompatibilityPublicGuide>> = {
  romantic: {
    slug: "romantic",
    product: COMPATIBILITY_ROMANTIC_PRODUCT,
    entryPath: "/special-analysis/compatibility/romantic",
    audience: "연인 사이의 소통을 이해하고 싶거나, 결혼·동거처럼 관계를 오래 이어갈 기준을 고민할 때",
    questions: [
      "서로 애정을 표현하고 받아들이는 방식은 어떻게 다를까요?",
      "대화 중 반복해서 부딪히는 부분과 갈등을 풀어가는 방식은 무엇일까요?",
      "두 사람이 오래 함께하려면 어떤 생활 기준을 맞춰야 할까요?",
    ],
    focus: ["친밀감과 애정 표현", "서로에게 미치는 영향", "갈등과 회복", "현재 관계 흐름"],
    distinction: "연애 결과나 결혼 성사 여부를 단정하지 않고, 두 사람이 관계를 이해하고 조정할 때 살펴볼 기준에 집중합니다.",
    isFamily: false,
  },
  workplace: {
    slug: "workplace",
    product: COMPATIBILITY_WORKPLACE_PRODUCT,
    entryPath: "/special-analysis/compatibility/workplace",
    audience: "상사·동료·팀원과의 협업 방식이 다르거나 업무 중 소통과 역할 분담이 어려울 때",
    questions: [
      "서로의 일하는 속도와 의사소통 방식이 어떻게 다를까요?",
      "업무 책임과 역할을 나눌 때 마찰이 생기기 쉬운 지점은 무엇일까요?",
      "압박이 큰 상황에서도 협업을 이어가려면 어떤 기준이 필요할까요?",
    ],
    focus: ["업무 방식과 리듬", "역할·책임 경계", "소통과 피드백", "협업 갈등과 회복"],
    distinction: "인사 평가나 승진을 예측하는 분석이 아니라, 실제로 함께 일하는 관계의 특성과 조정 기준을 살펴봅니다.",
    isFamily: false,
  },
  friend: {
    slug: "friend",
    product: COMPATIBILITY_FRIEND_PRODUCT,
    entryPath: "/special-analysis/compatibility/friend",
    audience: "친구·지인과의 친밀감, 연락 빈도, 서운함이나 신뢰의 차이를 이해하고 싶을 때",
    questions: [
      "친밀감과 신뢰를 쌓는 속도나 표현이 어떻게 다를까요?",
      "연락과 거리 조절에서 오해가 생기는 이유를 어떻게 살펴볼까요?",
      "서운함이 생긴 뒤 다시 편하게 지내기 위한 기준은 무엇일까요?",
    ],
    focus: ["친밀감과 신뢰", "연락·거리와 경계", "오해와 서운함", "관계 회복과 지속"],
    distinction: "연애·사업 관계와 구분하여 친구와 지인 사이의 거리, 신뢰, 관계 지속에 초점을 맞춥니다.",
    isFamily: false,
  },
  business: {
    slug: "business",
    product: COMPATIBILITY_BUSINESS_PRODUCT,
    entryPath: "/special-analysis/compatibility/business",
    audience: "동업자·공동창업자·사업 파트너와 책임이나 의사결정 방식을 맞춰야 할 때",
    questions: [
      "서로 역할과 책임을 나눌 때 어떤 방식으로 움직일까요?",
      "돈, 권한, 의사결정에서 갈등이 생기기 쉬운 부분은 무엇일까요?",
      "의견이 다를 때 파트너십을 유지하기 위해 무엇을 확인할까요?",
    ],
    focus: ["업무 역할과 책임", "의사결정과 권한", "금전 관련 갈등", "협업과 회복 기준"],
    distinction: "매출·수익이나 사업 성공을 예측하지 않으며, 사업 파트너 사이의 협업과 책임 경계를 이해하도록 돕는 분석입니다.",
    isFamily: false,
  },
  "parent-child": {
    slug: "parent-child",
    product: COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
    entryPath: FAMILY_ENTRY,
    audience: "부모와 자녀가 기대하는 방식, 보호와 독립의 균형, 서로의 대화법을 이해하고 싶을 때",
    questions: [
      "부모의 보호와 자녀의 독립 욕구는 어떻게 부딪힐 수 있을까요?",
      "서로에게 전하는 기대와 마음이 다르게 받아들여지는 부분은 무엇일까요?",
      "갈등 뒤 관계를 회복하기 위해 어떤 대화 기준을 살펴볼까요?",
    ],
    focus: ["부모·자녀의 양방향 영향", "보호·독립과 경계", "대화와 기대", "갈등 회복과 연도 흐름"],
    distinction: "누가 옳고 그른지 판단하지 않고 부모와 자녀의 서로 다른 위치와 역할을 나누어 살펴봅니다.",
    isFamily: true,
  },
  siblings: {
    slug: "siblings",
    product: COMPATIBILITY_FAMILY_SIBLING_PRODUCT,
    entryPath: FAMILY_ENTRY,
    audience: "형제·자매 사이에 오래된 역할이나 비교, 연락과 거리 조절 문제가 반복될 때",
    questions: [
      "어릴 때부터 굳어진 역할과 비교가 지금 관계에 어떻게 이어질까요?",
      "서로의 말과 행동이 서운함이나 경쟁으로 느껴지는 조건은 무엇일까요?",
      "독립적인 관계를 유지하면서도 가족으로 연결될 방법은 무엇일까요?",
    ],
    focus: ["정서적 연결과 대화", "비교·경쟁", "역할과 경계", "갈등 뒤 회복과 연도 흐름"],
    distinction: "부모·자녀 관계와 달리 형제·자매 사이의 비교, 독립성, 오래 굳어진 역할을 중심으로 살펴봅니다.",
    isFamily: true,
  },
  "other-family": {
    slug: "other-family",
    product: COMPATIBILITY_FAMILY_OTHER_PRODUCT,
    entryPath: FAMILY_ENTRY,
    audience: "조부모·손주, 조카, 사촌, 인척 등 가족 관계에서 적절한 거리와 기대를 조율하고 싶을 때",
    questions: [
      "가족의 역할과 기대가 서로 다르게 느껴지는 부분은 무엇일까요?",
      "연락과 관여의 적절한 경계는 어떻게 살펴볼 수 있을까요?",
      "가족 안에서 오해와 갈등을 풀 때 어떤 소통 방식을 확인할까요?",
    ],
    focus: ["역할과 기대", "정서적 거리", "연락·관여의 경계", "회복과 연도 흐름"],
    distinction: "연인이나 형제·자매 분석과 구분해, 다양한 가족 관계에 맞는 소통과 경계를 살펴봅니다.",
    isFamily: true,
  },
};

export function getCompatibilityPublicGuide(slug: string): CompatibilityPublicGuide | undefined {
  return Object.prototype.hasOwnProperty.call(GUIDES, slug)
    ? GUIDES[slug as CompatibilityGuideSlug]
    : undefined;
}

export function getCompatibilityPublicGuidePath(slug: CompatibilityGuideSlug): string {
  return `/special-analysis/compatibility/guide/${slug}`;
}
