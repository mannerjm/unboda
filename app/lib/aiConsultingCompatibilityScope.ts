import type { AiConsultingScopeResult } from "./aiConsultingScope";
import {
  COMPATIBILITY_BUSINESS_PRODUCT_ID,
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_FRIEND_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_WORKPLACE_PRODUCT_ID,
} from "./specialAnalysisProducts";

type CompatibilityScopeConfig = Readonly<{
  positiveSources: readonly string[];
  ownRelationshipPatterns: readonly RegExp[];
  conflictingRelationshipPatterns: readonly RegExp[];
  answerGuardrails: readonly string[];
}>;

const RELATIONSHIP_DOMAIN_PATTERNS: readonly RegExp[] = [
  /관계/u,
  /대화|소통/u,
  /갈등|싸우|다투|오해|서운/u,
  /회복|화해/u,
  /거리|연락/u,
  /경계|역할|기대|책임|권한/u,
  /협업|업무|의사결정/u,
  /신뢰|친밀/u,
  /영향/u,
  /감정|정서|마음|사랑/u,
  /비교|경쟁/u,
  /독립|보호/u,
];

const OUTSIDE_TOPIC_PATTERNS: readonly RegExp[] = [
  /이직|퇴사|취업|승진|직업|커리어/u,
  /재물|수입|저축|투자|사업|창업/u,
  /시험|학업|공부|학습/u,
  /건강|질병|치료|약물/u,
];

const OUTSIDE_YEAR_PATTERNS: readonly RegExp[] = [
  /내년|다음\s*해|다음\s*연도/u,
  /작년|지난\s*해|지난해/u,
  /향후\s*\d+\s*년|앞으로\s*\d+\s*년/u,
];

const COMMON_GUARDRAILS = [
  "구매한 궁합 리포트의 계산 결과와 저장된 관계 해석만 근거로 사용한다.",
  "상대방의 실제 감정·의도·생각을 사실처럼 단정하거나 마음을 읽는 표현을 하지 않는다.",
  "이별·결혼·재회·외도·임신 같은 사건의 발생 여부나 시점을 확정적으로 예언하지 않는다.",
  "연도 흐름은 저장된 구매 에디션에 포함된 연도만 사용하고 다른 연도의 흐름을 새로 만들지 않는다.",
  "구매하지 않은 다른 관계 유형의 궁합이나 별도 심층분석 주제를 대신하지 않는다.",
  "현실 조언은 관계에서 관찰할 신호, 대화 방식, 경계와 행동 선택지 수준으로 제시한다.",
] as const;

const COMPATIBILITY_SCOPE_CONFIG: Readonly<Record<string, CompatibilityScopeConfig>> = {
  [COMPATIBILITY_ROMANTIC_PRODUCT_ID]: {
    positiveSources: [
      "연인 배우자 두 사람의 관계 강점과 주의점",
      "정서적 연결과 애정 표현 방식",
      "대화 방식과 갈등 패턴",
      "나에서 상대 상대에서 나로 향하는 양방향 영향",
      "장기 관계 기준과 갈등 뒤 회복 방식",
      "구매 연도의 관계 흐름과 행동 가이드",
    ],
    ownRelationshipPatterns: [/연인|배우자|애인|남자\s*친구|여자\s*친구|남친|여친|파트너|상대/u],
    conflictingRelationshipPatterns: [
      /부모|아버지|어머니|엄마|아빠|자녀|아들|딸/u,
      /형제|자매|오빠|언니|누나|형|동생/u,
      /조부모|할머니|할아버지|손주|사촌|조카|삼촌|이모|고모|인척|시댁|처가/u,
    ],
    answerGuardrails: [
      ...COMMON_GUARDRAILS,
      "연인·배우자 관계 안의 정서적 연결, 대화, 갈등, 회복, 장기 기준, 양방향 영향만 상담한다.",
    ],
  },
  [COMPATIBILITY_WORKPLACE_PRODUCT_ID]: {
    positiveSources: [
      "상사 동료 팀원 업무 협업자의 일하는 방식",
      "업무 속도와 실행 방식",
      "역할 분담과 책임 경계",
      "보고 피드백 의사소통",
      "압박 상황의 업무 갈등과 협업 회복",
      "구매 연도의 업무 관계 흐름",
    ],
    ownRelationshipPatterns: [/직장|회사|상사|동료|팀원|팀장|부하|협업|업무|프로젝트/u],
    conflictingRelationshipPatterns: [
      /연인|배우자|애인|남자\s*친구|여자\s*친구|남친|여친/u,
      /부모|아버지|어머니|엄마|아빠|자녀|아들|딸|형제|자매/u,
      /동업|공동창업|공동대표|사업\s*파트너/u,
    ],
    answerGuardrails: [
      ...COMMON_GUARDRAILS,
      "직장·동료 관계 안의 업무 방식, 역할·책임, 보고·피드백, 의사결정, 갈등·협업 회복만 상담한다.",
      "승진·해고·인사평가나 상대의 업무 능력을 사실처럼 단정하지 않는다.",
    ],
  },
  [COMPATIBILITY_FRIEND_PRODUCT_ID]: {
    positiveSources: [
      "친구 지인 사이의 친밀감과 신뢰",
      "대화와 감정 표현",
      "연락 빈도와 거리 경계",
      "오해와 서운함 뒤 회복",
      "부담 없이 오래 유지하는 관계 기준",
      "구매 연도의 친구 관계 흐름",
    ],
    ownRelationshipPatterns: [/친구|지인|친분|동호회|모임|우정/u],
    conflictingRelationshipPatterns: [
      /연인|배우자|애인|남자\s*친구|여자\s*친구|남친|여친/u,
      /부모|아버지|어머니|엄마|아빠|자녀|아들|딸|형제|자매/u,
      /동업|공동창업|공동대표|사업\s*파트너/u,
    ],
    answerGuardrails: [
      ...COMMON_GUARDRAILS,
      "친구·지인 관계 안의 친밀감, 신뢰, 대화, 연락·거리 경계, 오해·회복과 관계 지속 기준만 상담한다.",
      "친구의 실제 속마음이나 절교 여부를 사실처럼 단정하지 않는다.",
    ],
  },
  [COMPATIBILITY_BUSINESS_PRODUCT_ID]: {
    positiveSources: [
      "동업자 공동창업자 사업 파트너의 역할과 책임",
      "의사결정 속도와 위험을 보는 방식",
      "돈 비용 성과 기준의 차이",
      "권한 통제와 갈등 구조",
      "의견 충돌 뒤 합의를 복구하는 방식",
      "장기 동업의 역할 책임 경계와 구매 연도 흐름",
    ],
    ownRelationshipPatterns: [/사업|동업|공동창업|창업|사업\s*파트너|공동대표|동업자/u],
    conflictingRelationshipPatterns: [
      /연인|배우자|애인|남자\s*친구|여자\s*친구|남친|여친/u,
      /부모|아버지|어머니|엄마|아빠|자녀|아들|딸|형제|자매/u,
    ],
    answerGuardrails: [
      ...COMMON_GUARDRAILS,
      "사업·동업 관계 안의 역할·책임, 의사결정, 돈과 성과를 보는 기준 차이, 권한·갈등, 합의·회복만 상담한다.",
      "사업 성공·실패, 매출·수익, 투자 성과를 예측하거나 보장하지 않는다.",
      "매수·매도·대출·투자 실행, 법적 계약 효력, 지분율, 세무 판단을 대신하지 않는다.",
    ],
  },
  [COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID]: {
    positiveSources: [
      "부모와 자녀의 정서적 연결",
      "부모와 자녀의 대화 방식",
      "부모에서 자녀 자녀에서 부모로 향하는 양방향 영향",
      "기대와 독립의 균형",
      "보호와 경계의 기준",
      "갈등 뒤 회복과 구매 연도의 관계 흐름",
    ],
    ownRelationshipPatterns: [/부모|아버지|어머니|엄마|아빠|자녀|아들|딸/u],
    conflictingRelationshipPatterns: [
      /연인|배우자|애인|남자\s*친구|여자\s*친구|남친|여친/u,
      /형제|자매|오빠|언니|누나|형|동생/u,
      /조부모|할머니|할아버지|손주|사촌|조카|삼촌|이모|고모|인척|시댁|처가/u,
    ],
    answerGuardrails: [
      ...COMMON_GUARDRAILS,
      "부모·자녀 관계 안의 정서 연결, 대화, 기대·독립, 보호·경계, 회복, 양방향 영향만 상담한다.",
      "양육 방식이나 자녀의 성격·발달을 진단하거나 부모의 책임을 단정하지 않는다.",
    ],
  },
  [COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID]: {
    positiveSources: [
      "형제 자매 사이의 정서적 연결",
      "형제 자매의 대화 방식",
      "나에서 형제 자매 형제 자매에서 나로 향하는 양방향 영향",
      "비교와 경쟁 패턴",
      "오래 굳어진 역할과 경계",
      "갈등 뒤 회복과 구매 연도의 관계 흐름",
    ],
    ownRelationshipPatterns: [/형제|자매|오빠|언니|누나|형|동생/u],
    conflictingRelationshipPatterns: [
      /연인|배우자|애인|남자\s*친구|여자\s*친구|남친|여친/u,
      /부모|아버지|어머니|엄마|아빠|자녀|아들|딸/u,
      /조부모|할머니|할아버지|손주|사촌|조카|삼촌|이모|고모|인척|시댁|처가/u,
    ],
    answerGuardrails: [
      ...COMMON_GUARDRAILS,
      "형제·자매 관계 안의 정서 연결, 대화, 비교·경쟁, 역할·경계, 회복, 양방향 영향만 상담한다.",
    ],
  },
  [COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID]: {
    positiveSources: [
      "기타 가족 관계의 정서적 거리",
      "가족 사이의 대화 방식",
      "서로에게 미치는 양방향 영향",
      "역할과 기대의 균형",
      "연락 도움 관여의 경계",
      "갈등 뒤 회복과 구매 연도의 관계 흐름",
      "조부모 손주 조카 사촌 인척 친족 관계",
    ],
    ownRelationshipPatterns: [/조부모|할머니|할아버지|손주|사촌|조카|삼촌|이모|고모|인척|시댁|처가|장인|장모|며느리|사위|친척|친족/u],
    conflictingRelationshipPatterns: [
      /연인|배우자|애인|남자\s*친구|여자\s*친구|남친|여친/u,
      /부모|아버지|어머니|엄마|아빠|자녀|아들|딸/u,
      /형제|자매|오빠|언니|누나|형|동생/u,
    ],
    answerGuardrails: [
      ...COMMON_GUARDRAILS,
      "저장된 기타 가족 관계 유형 안의 정서적 거리, 대화, 역할·기대, 연락·도움·관여 경계, 회복과 양방향 영향만 상담한다.",
    ],
  },
};

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function tokenize(value: string): Set<string> {
  return new Set(normalize(value).toLowerCase().match(/[가-힣a-z0-9]{2,}/gu) ?? []);
}

function overlapScore(question: string, sources: readonly string[]): number {
  const questionTokens = tokenize(question);
  let best = 0;
  for (const source of sources) {
    const sourceText = normalize(source).toLowerCase();
    const sourceTokens = tokenize(source);
    let local = 0;
    for (const token of questionTokens) {
      if (sourceTokens.has(token) || sourceText.includes(token)) local += token.length >= 4 ? 2 : 1;
    }
    best = Math.max(best, local);
  }
  return best;
}

function includesOneOf(question: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question));
}

function compatibilityResult(input: Omit<AiConsultingScopeResult, "chargeable">): AiConsultingScopeResult {
  return { ...input, chargeable: input.decision === "ALLOW" };
}

export function isAiConsultingCompatibilityProductId(productId: string): boolean {
  return Boolean(COMPATIBILITY_SCOPE_CONFIG[productId]);
}

export function evaluateCompatibilityAiConsultingScope(input: {
  productId: string;
  question: string;
}): AiConsultingScopeResult {
  const question = normalize(input.question);
  const config = COMPATIBILITY_SCOPE_CONFIG[input.productId];

  if (!config) {
    return compatibilityResult({
      decision: "DENY",
      reason: "unknown_or_unlaunched_product",
      productId: input.productId,
      kind: "none",
      normalizedQuestion: question,
      answerGuardrails: [],
      userMessage: "현재 구매한 궁합 분석에 연결할 수 없는 상담입니다.",
    });
  }

  if (includesOneOf(question, config.conflictingRelationshipPatterns)) {
    return compatibilityResult({
      decision: "DENY",
      reason: "compatibility_outside_purchased_scope",
      productId: input.productId,
      kind: "compatibility",
      normalizedQuestion: question,
      answerGuardrails: config.answerGuardrails,
      userMessage: "이 질문은 현재 구매한 궁합의 관계 유형과 다릅니다. 해당 관계의 궁합 리포트에서 이어서 질문해 주세요.",
    });
  }

  if (includesOneOf(question, OUTSIDE_YEAR_PATTERNS)) {
    return compatibilityResult({
      decision: "DENY",
      reason: "compatibility_outside_purchased_scope",
      productId: input.productId,
      kind: "compatibility",
      normalizedQuestion: question,
      answerGuardrails: config.answerGuardrails,
      userMessage: "현재 구매한 궁합 리포트에 저장된 연도 범위를 벗어난 질문입니다. 해당 연도판을 구매한 뒤 이어서 질문해 주세요.",
    });
  }

  const hasRelationshipDomain = includesOneOf(question, RELATIONSHIP_DOMAIN_PATTERNS);
  const hasOwnRelationship = includesOneOf(question, config.ownRelationshipPatterns);
  if (includesOneOf(question, OUTSIDE_TOPIC_PATTERNS) && !hasRelationshipDomain && !hasOwnRelationship) {
    return compatibilityResult({
      decision: "DENY",
      reason: "compatibility_outside_purchased_scope",
      productId: input.productId,
      kind: "compatibility",
      normalizedQuestion: question,
      answerGuardrails: config.answerGuardrails,
      userMessage: "이 질문은 현재 구매한 궁합 리포트의 관계 상담 범위를 벗어납니다. 관련 심층 분석이 있다면 그 분석에서 질문해 주세요.",
    });
  }

  const semanticScore = overlapScore(question, config.positiveSources);
  if (!hasOwnRelationship && !hasRelationshipDomain && semanticScore === 0) {
    return compatibilityResult({
      decision: "CLARIFY",
      reason: "compatibility_scope_unclear",
      productId: input.productId,
      kind: "compatibility",
      normalizedQuestion: question,
      answerGuardrails: config.answerGuardrails,
      userMessage: "현재 구매한 궁합에서 어떤 관계 장면이나 리포트 내용을 이어서 묻는지 조금 더 구체적으로 적어 주세요.",
    });
  }

  return compatibilityResult({
    decision: "ALLOW",
    reason: "within_compatibility_scope",
    productId: input.productId,
    kind: "compatibility",
    normalizedQuestion: question,
    answerGuardrails: config.answerGuardrails,
    userMessage: "",
  });
}
