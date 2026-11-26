import {
  COMPATIBILITY_BUSINESS_PRODUCT_ID,
  COMPATIBILITY_FRIEND_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  type CompatibilityPairProductId,
  type CompatibilityPairRelationshipType,
} from "./specialAnalysisProducts";

export type PairCompatibilityPreviewMode = "romantic" | "workplace" | "friend" | "business";

export type PairCompatibilityConfig = Readonly<{
  productId: CompatibilityPairProductId;
  relationshipType: CompatibilityPairRelationshipType;
  slug: "romantic" | "workplace" | "friend" | "business";
  title: string;
  label: string;
  partnerNoun: string;
  partnerPlaceholder: string;
  introDescription: string;
  previewMode: PairCompatibilityPreviewMode;
  cardDescription: string;
  cardTags: readonly string[];
  reportBadge: string;
  reportCoreEyebrow: string;
  reportKeyPointsDescription: string;
  reportDirectionTitle: string;
  reportDirectionDescription: string;
  reportStrengthEyebrow: string;
  reportStrengthTitle: string;
  reportStrengthDescription: string;
  reportConflictEyebrow: string;
  reportConflictTitle: string;
  reportRecoveryEyebrow: string;
  reportRecoveryTitle: string;
  reportLongTermEyebrow: string;
  reportLongTermTitle: string;
  reportTimingTitle: string;
  reportActionTitle: string;
  promptFocus: readonly string[];
  promptAvoid: readonly string[];
}>;

const CONFIG: Readonly<Record<CompatibilityPairProductId, PairCompatibilityConfig>> = {
  [COMPATIBILITY_ROMANTIC_PRODUCT_ID]: {
    productId: COMPATIBILITY_ROMANTIC_PRODUCT_ID,
    relationshipType: "romantic_partner",
    slug: "romantic",
    title: "연인·배우자 궁합 분석",
    label: "연인·배우자",
    partnerNoun: "상대방",
    partnerPlaceholder: "예: 지민, 배우자",
    introDescription: "내 사주와 상대의 사주로 우리 두 사람의 이야기를 알아봐요.",
    previewMode: "romantic",
    cardDescription: "마음이 통하는 순간, 자꾸 서운해지는 이유와 오래 함께하는 방법을 알아봐요.",
    cardTags: ["서로에게 미치는 영향", "갈등·회복 방식", "현재 관계 흐름"],
    reportBadge: "연인·배우자",
    reportCoreEyebrow: "관계 핵심",
    reportKeyPointsDescription: "우리 두 사람의 궁합에서 기억할 세 가지 이야기예요.",
    reportDirectionTitle: "서로에게 미치는 방식",
    reportDirectionDescription: "같은 관계라도 내가 상대에게 주는 영향과 상대가 나에게 주는 영향은 다르게 나타날 수 있습니다.",
    reportStrengthEyebrow: "01 · 잘 맞는 부분",
    reportStrengthTitle: "잘 맞는 부분",
    reportStrengthDescription: "두 사람 사이에서 자연스럽게 연결되거나 함께 살릴 수 있는 강점입니다.",
    reportConflictEyebrow: "03 · 부딪히기 쉬운 부분",
    reportConflictTitle: "부딪히기 쉬운 부분",
    reportRecoveryEyebrow: "04 · 갈등 뒤 회복",
    reportRecoveryTitle: "다툰 뒤 다시 마음을 나누는 방법",
    reportLongTermEyebrow: "05 · 오래 가는 기준",
    reportLongTermTitle: "오래 함께하려면 무엇을 맞춰볼까요?",
    reportTimingTitle: "현재 관계 흐름",
    reportActionTitle: "지금 해볼 것",
    promptFocus: [
      "정서적 친밀감과 애정 표현",
      "대화와 갈등 패턴",
      "갈등 뒤 회복 조건",
      "장기 관계에서 맞춰야 할 생활 기준",
    ],
    promptAvoid: ["직장 업무 평가", "사업 성공 여부", "투자 판단"],
  },
  [COMPATIBILITY_WORKPLACE_PRODUCT_ID]: {
    productId: COMPATIBILITY_WORKPLACE_PRODUCT_ID,
    relationshipType: "workplace_colleague",
    slug: "workplace",
    title: "직장·동료 궁합 분석",
    label: "직장·동료",
    partnerNoun: "직장 관계 상대",
    partnerPlaceholder: "예: 팀장님, 민수 동료",
    introDescription: "내 사주와 직장 사람의 사주로 함께 일할 때의 모습을 알아봐요.",
    previewMode: "workplace",
    cardDescription: "함께 일하며 잘 맞는 점과 자주 어긋나는 부분을 알아봐요.",
    cardTags: ["업무 스타일", "역할·소통", "협업 갈등"],
    reportBadge: "직장·동료",
    reportCoreEyebrow: "협업 핵심",
    reportKeyPointsDescription: "함께 일할 때 잘 맞는 점과 조심할 점, 지금의 흐름을 먼저 읽어 보세요.",
    reportDirectionTitle: "함께 일할 때 서로에게 어떤 느낌을 줄까요?",
    reportDirectionDescription: "내 방식이 상대의 업무 리듬에 어떻게 닿는지, 상대의 방식이 나에게 어떻게 느껴지는지 나눠 봅니다.",
    reportStrengthEyebrow: "01 · 함께 일할 때 강점",
    reportStrengthTitle: "함께 일할 때 잘 맞는 점",
    reportStrengthDescription: "함께 일할 때 역할과 실행을 보완할 수 있는 지점입니다.",
    reportConflictEyebrow: "03 · 업무 마찰이 생기기 쉬운 부분",
    reportConflictTitle: "함께 일하다 오해가 생기기 쉬운 순간",
    reportRecoveryEyebrow: "04 · 갈등 뒤 협업 회복",
    reportRecoveryTitle: "서운함을 풀고 다시 함께 일하는 방법",
    reportLongTermEyebrow: "05 · 오래 협업하는 기준",
    reportLongTermTitle: "오래 편하게 함께 일하는 방법",
    reportTimingTitle: "현재 업무 관계 흐름",
    reportActionTitle: "지금 함께 해볼 일",
    promptFocus: [
      "업무 속도와 실행 방식",
      "역할 분담과 책임 경계",
      "보고·피드백·의사소통",
      "압박 상황에서의 갈등과 협업 회복",
      "오래 편하게 함께 일하는 방법",
    ],
    promptAvoid: ["연애 감정 해석", "승진·해고 예언", "상대의 인사 평가를 사실처럼 단정"],
  },
  [COMPATIBILITY_FRIEND_PRODUCT_ID]: {
    productId: COMPATIBILITY_FRIEND_PRODUCT_ID,
    relationshipType: "friend_acquaintance",
    slug: "friend",
    title: "친구·지인 궁합 분석",
    label: "친구·지인",
    partnerNoun: "친구·지인",
    partnerPlaceholder: "예: 수진 친구, 동호회 지인",
    introDescription: "내 사주와 친구의 사주로 서로 마음이 통하는 모습을 알아봐요.",
    previewMode: "friend",
    cardDescription: "친구와 가까워지는 방법, 서운함이 생기는 이유와 오래 지내는 방법을 알아봐요.",
    cardTags: ["친밀감·신뢰", "거리·경계", "오해·회복"],
    reportBadge: "친구·지인",
    reportCoreEyebrow: "친구 관계 핵심",
    reportKeyPointsDescription: "친구 사이에서 기억할 세 가지 이야기예요.",
    reportDirectionTitle: "친구와 함께할 때 서로 어떤 마음을 느낄까요?",
    reportDirectionDescription: "내 표현이 친구에게 어떻게 느껴지는지, 친구의 반응이 나에게 어떻게 닿는지 양방향으로 봅니다.",
    reportStrengthEyebrow: "01 · 편하게 이어지는 부분",
    reportStrengthTitle: "친구 관계에서 살릴 수 있는 강점",
    reportStrengthDescription: "신뢰와 친밀감이 자연스럽게 이어지기 쉬운 지점입니다.",
    reportConflictEyebrow: "03 · 오해와 거리감이 생기기 쉬운 부분",
    reportConflictTitle: "오해가 시작되는 지점",
    reportRecoveryEyebrow: "04 · 서운함 뒤 회복",
    reportRecoveryTitle: "다시 편해지는 방식",
    reportLongTermEyebrow: "05 · 오래 유지하는 기준",
    reportLongTermTitle: "부담 없이 오래 친구로 지내는 방법",
    reportTimingTitle: "현재 친구 관계 흐름",
    reportActionTitle: "친구에게 지금 해볼 수 있는 일",
    promptFocus: [
      "친밀감과 신뢰 형성 방식",
      "대화와 감정 표현",
      "연락 빈도와 거리 경계",
      "오해·서운함 뒤 회복",
      "관계를 오래 유지하는 조건",
    ],
    promptAvoid: ["연애 관계로 임의 해석", "친구의 실제 속마음 단정", "절교 여부 예언"],
  },
  [COMPATIBILITY_BUSINESS_PRODUCT_ID]: {
    productId: COMPATIBILITY_BUSINESS_PRODUCT_ID,
    relationshipType: "business_partner",
    slug: "business",
    title: "사업·동업 궁합 분석",
    label: "사업·동업",
    partnerNoun: "사업 파트너",
    partnerPlaceholder: "예: 공동대표 김OO, 동업자",
    introDescription: "내 사주와 동업자의 사주로 함께 사업할 때의 모습을 알아봐요.",
    previewMode: "business",
    cardDescription: "함께 돈과 일을 나누고 중요한 결정을 할 때 잘 맞는 부분을 알아봐요.",
    cardTags: ["역할·책임", "의사결정", "돈·권한 갈등"],
    reportBadge: "사업·동업",
    reportCoreEyebrow: "동업 핵심",
    reportKeyPointsDescription: "함께 사업할 때 기억할 세 가지 이야기예요.",
    reportDirectionTitle: "함께 결정할 때 서로에게 어떤 힘이 될까요?",
    reportDirectionDescription: "내 결정 방식이 파트너에게 주는 압박과 보완, 파트너의 방식이 나에게 미치는 영향을 나눠 봅니다.",
    reportStrengthEyebrow: "01 · 함께 사업할 때 강점",
    reportStrengthTitle: "동업에서 살릴 수 있는 강점",
    reportStrengthDescription: "역할과 의사결정을 서로 보완할 수 있는 지점입니다.",
    reportConflictEyebrow: "03 · 돈·권한·판단이 충돌하기 쉬운 부분",
    reportConflictTitle: "동업 갈등이 시작되는 지점",
    reportRecoveryEyebrow: "04 · 충돌 뒤 다시 합의하는 방식",
    reportRecoveryTitle: "의견이 다를 때 다시 이야기하는 방법",
    reportLongTermEyebrow: "05 · 장기 동업 기준",
    reportLongTermTitle: "오래 함께 사업하려면 맞춰볼 이야기",
    reportTimingTitle: "현재 사업 파트너십 흐름",
    reportActionTitle: "지금 함께 이야기해 볼 일",
    promptFocus: [
      "역할과 책임 분담",
      "의사결정 속도와 위험을 보는 방식",
      "돈·비용·성과를 대하는 기준의 차이",
      "권한과 통제에서 생기는 갈등",
      "장기 동업을 위한 합의와 책임 경계",
    ],
    promptAvoid: [
      "사업 성공·실패나 수익을 예언",
      "투자·매수·매도·대출 같은 구체 금융 실행 지시",
      "법적 계약의 효력이나 지분 배분을 대신 판단",
    ],
  },
};

export function getPairCompatibilityConfig(productId: CompatibilityPairProductId): PairCompatibilityConfig {
  return CONFIG[productId];
}

export function getPairCompatibilityConfigByRelationshipType(
  relationshipType: CompatibilityPairRelationshipType,
): PairCompatibilityConfig {
  return Object.values(CONFIG).find((item) => item.relationshipType === relationshipType)
    ?? CONFIG[COMPATIBILITY_ROMANTIC_PRODUCT_ID];
}

export function getPairCompatibilityConfigBySlug(
  slug: PairCompatibilityConfig["slug"],
): PairCompatibilityConfig {
  return Object.values(CONFIG).find((item) => item.slug === slug)
    ?? CONFIG[COMPATIBILITY_ROMANTIC_PRODUCT_ID];
}

export const PAIR_COMPATIBILITY_CONFIGS = Object.values(CONFIG);
