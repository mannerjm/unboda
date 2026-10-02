import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";
import {
  evaluateCompatibilityAiConsultingScope,
  isAiConsultingCompatibilityProductId,
} from "./aiConsultingCompatibilityScope";
import {
  getLaunchProductIds,
  getPaidAnalysisTopicConfig,
  resolvePaidAnalysisLaunchSpecialization,
} from "./paidAnalysisTopicConfig";
import { getCanonicalPremiumProductId } from "./premiumProductRegistry";

export const AI_CONSULTING_QUESTION_MAX_CHARS = 300;

export type AiConsultingScopeDecision =
  | "ALLOW"
  | "CLARIFY"
  | "DENY"
  | "SAFETY_REDIRECT";

export type AiConsultingScopeTier =
  | "CORE"
  | "BRIDGE"
  | "OUTSIDE"
  | "NONE";

export type AiConsultingScopeReason =
  | "within_topic_scope"
  | "within_topic_bridge_scope"
  | "within_continuation_scope"
  | "within_period_scope"
  | "within_period_comparison_scope"
  | "within_compatibility_scope"
  | "question_too_short"
  | "question_too_long"
  | "unknown_or_unlaunched_product"
  | "topic_scope_unclear"
  | "topic_outside_purchased_scope"
  | "period_scope_unclear"
  | "period_mismatch"
  | "compatibility_scope_unclear"
  | "compatibility_outside_purchased_scope"
  | "safety_sensitive_request";

export type AiConsultingScopeResult = {
  decision: AiConsultingScopeDecision;
  reason: AiConsultingScopeReason;
  productId: string;
  kind: "topic" | "period" | "compatibility" | "none";
  normalizedQuestion: string;
  scopeTier: AiConsultingScopeTier;
  chargeable: boolean;
  answerGuardrails: readonly string[];
  userMessage: string;
};

type PeriodAnchorRule = {
  own: readonly RegExp[];
  conflicting: readonly RegExp[];
  /** A comparison explicitly promised inside this product's report scope. */
  comparison?: readonly RegExp[];
};

const PERIOD_ANCHOR_RULES: Record<string, PeriodAnchorRule> = {
  "monthly-current": {
    own: [/이번\s*달/u, /이달/u, /현재\s*달/u],
    conflicting: [/다음\s*달/u, /내달/u, /올해/u, /내년/u, /향후\s*3년/u, /앞으로\s*3년/u, /평생/u, /생애/u, /대운/u],
  },
  "monthly-next": {
    own: [/다음\s*달/u, /내달/u],
    conflicting: [/이번\s*달/u, /이달/u, /올해/u, /내년/u, /향후\s*3년/u, /앞으로\s*3년/u, /평생/u, /생애/u, /대운/u],
    comparison: [/이번\s*달/u, /이달/u],
  },
  "yearly-current": {
    own: [/올해/u, /금년/u, /이번\s*해/u, /현재\s*연도/u],
    conflicting: [/이번\s*달/u, /다음\s*달/u, /내년/u, /다음\s*해/u, /향후\s*3년/u, /앞으로\s*3년/u, /평생/u, /생애/u, /대운/u],
  },
  "annual-next": {
    own: [/내년/u, /다음\s*해/u, /다음\s*연도/u],
    conflicting: [/이번\s*달/u, /다음\s*달/u, /올해/u, /금년/u, /향후\s*3년/u, /앞으로\s*3년/u, /평생/u, /생애/u, /대운/u],
    comparison: [/올해/u, /금년/u, /이번\s*해/u, /현재\s*연도/u],
  },
  "annual-3years": {
    own: [/향후\s*3년/u, /앞으로\s*3년/u, /3년\s*(?:간|동안)?/u, /[123]\s*년차/u],
    conflicting: [/이번\s*달/u, /다음\s*달/u, /올해/u, /내년/u, /평생/u, /생애/u, /대운/u],
    comparison: [/올해/u, /내년/u, /다음\s*해/u, /1\s*년차/u, /2\s*년차/u, /3\s*년차/u],
  },
  "daeun-current": {
    own: [/현재\s*대운/u, /대운/u, /장기\s*국면/u],
    conflicting: [/이번\s*달/u, /다음\s*달/u, /올해/u, /내년/u, /향후\s*3년/u, /앞으로\s*3년/u, /평생/u, /생애/u],
  },
  "lifetime-overview": {
    own: [/평생/u, /생애/u, /인생\s*전체/u, /삶\s*전체/u, /장기\s*패턴/u],
    conflicting: [/이번\s*달/u, /다음\s*달/u, /올해/u, /내년/u, /향후\s*3년/u, /앞으로\s*3년/u],
  },
};

const STOPWORDS = new Set([
  "그리고", "그러면", "그럼", "그런데", "하지만", "대해서", "관련", "무엇", "어떤", "어떻게",
  "있는", "없는", "하는", "해야", "하면", "인가", "인지", "일까", "알려줘", "궁금해", "궁금합니다",
  "현재", "지금", "정도", "기준", "분석", "질문", "내가", "나는", "저는", "제가", "우리", "나의",
  "것은", "것이", "것을", "수", "때", "중", "더", "잘", "좀", "관련된", "관련해서",
]);

const SAFETY_PATTERNS: readonly RegExp[] = [
  /(?:자살|죽고\s*싶|목숨을\s*끊|자해)/u,
  /(?:암|심근경색|뇌졸중|우울증|공황장애|조현병|임신|질병).*(?:진단|확진|치료|처방)/u,
  /(?:약|약물|처방약).*(?:먹어|복용|끊어|용량|처방)/u,
  /(?:소송|형사|민사|계약).*(?:승소|패소|법적\s*효력|법률\s*판단)/u,
  /(?:주식|코인|가상화폐|부동산).*(?:매수|매도|종목\s*추천|얼마\s*넣|투자\s*지시)/u,
];

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function tokenize(value: string): Set<string> {
  const normalized = normalize(value).toLowerCase();
  const tokens = normalized.match(/[가-힣a-z0-9]{2,}/gu) ?? [];
  return new Set(tokens.filter((token) => !STOPWORDS.has(token)));
}

const SEMANTIC_TOKEN_FAMILIES: readonly (readonly string[])[] = [
  ["이직", "퇴사", "직장옮기", "회사옮기", "직장이동"],
  ["갈등", "싸우", "다투", "충돌", "마찰"],
  ["저축", "돈모으", "축적", "목돈"],
  ["수입", "소득", "벌이"],
  ["지출", "소비", "돈쓰", "큰지출"],
  ["부채", "빚", "대출", "상환"],
  ["승진", "진급", "직급", "책임확대"],
  ["리더십", "리더", "관리자", "팀장", "위임"],
  ["프리랜서", "독립", "외주"],
  ["결혼", "혼인", "장기결합", "부부"],
  ["배우자", "남편", "아내", "와이프", "신랑", "신부"],
  ["자녀", "아이", "자식", "아들", "딸"],
  ["재회", "다시만나", "재연결", "다시연락"],
  ["직장", "회사", "회사생활", "업무"],
  ["친구", "지인", "우정"],
] as const;

function tokenFamily(token: string): number {
  return SEMANTIC_TOKEN_FAMILIES.findIndex((family) =>
    family.some((term) => token.startsWith(term) || term.startsWith(token)),
  );
}

function tokensSemanticallyMatch(left: string, right: string): boolean {
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;
  if (shorter.length >= 2 && longer.startsWith(shorter)) return true;
  const leftFamily = tokenFamily(left);
  return leftFamily >= 0 && leftFamily === tokenFamily(right);
}

function overlapScore(question: string, sources: readonly string[]): number {
  const questionTokens = [...tokenize(question)];
  if (questionTokens.length === 0) return 0;

  let score = 0;
  for (const source of sources) {
    const sourceTokens = [...tokenize(source)];
    let local = 0;
    for (const token of questionTokens) {
      if (sourceTokens.some((sourceToken) => tokensSemanticallyMatch(token, sourceToken))) {
        local += token.length >= 4 ? 2 : 1;
      }
    }
    score = Math.max(score, local);
  }
  return score;
}

function includesOneOf(question: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question));
}

function result(
  partial: Omit<AiConsultingScopeResult, "chargeable" | "scopeTier"> & {
    scopeTier?: AiConsultingScopeTier;
  },
): AiConsultingScopeResult {
  const scopeTier = partial.scopeTier
    ?? (partial.decision === "ALLOW"
      ? "CORE"
      : partial.decision === "DENY"
        ? "OUTSIDE"
        : "NONE");
  return { ...partial, scopeTier, chargeable: partial.decision === "ALLOW" };
}

export function isAiConsultingContinuationQuestion(question: string): boolean {
  return /^(?:그럼|그러면|그렇다면|그래서|이어서|아까|지난번|저번에|방금|그때|그건|그게|그것|그 부분|그 이야기|그 후|그와 관련|이것도|그렇군요|그런데 그|왜(?:\s|[?？]|$)|좀 더|조금 더|더 자세히|자세히|쉽게 설명|그래서 나는|그러면 나는)/u.test(
    normalize(question),
  );
}

const UMBRELLA_TOPIC_BRIDGE_PATTERNS: Readonly<Record<string, readonly RegExp[]>> = {
  career: [
    /이직|퇴사|직장\s*옮|회사\s*옮/u,
    /직업\s*적성|맞는\s*(?:일|직업|업무)|업무\s*방식/u,
    /전문성|전문\s*역량|커리어\s*역량/u,
    /승진|진급|직급|책임\s*확대/u,
    /직장\s*적응|온보딩/u,
    /리더|리더십|위임|피드백|팀장/u,
    /프리랜서|독립\s*(?:전환|근무)|외주/u,
    /과부하|업무량|야근|소진/u,
    /직장\s*관계|상사|동료|협업\s*갈등/u,
  ],
  wealth: [
    /돈\s*모으|자산\s*축적|축적/u,
    /돈\s*새|손실|재정\s*누수/u,
    /저축|예산|자동\s*이체/u,
    /수입\s*안정|소득\s*안정/u,
    /부채|빚|상환/u,
    /비상\s*자금|비상금/u,
    /공동\s*(?:재정|지출)|생활비\s*분담/u,
    /장기\s*계약|고정비|해지/u,
    /큰\s*지출|고가\s*구매|큰\s*돈/u,
  ],
  relationship: [
    /장거리/u,
    /짝사랑|고백/u,
    /현재\s*(?:관계|상대)|계속\s*만나/u,
    /결혼|혼인|장기\s*관계/u,
    /배우자|파트너\s*패턴|반복\s*상대/u,
    /새\s*인연|새로운\s*사람|새\s*사람/u,
    /친밀|감정\s*개방/u,
    /갈등|싸우|다투|화해/u,
    /경계|거리\s*조절|감정\s*소모/u,
    /재회|다시\s*만나|다시\s*연락/u,
  ],
};

function safetyRedirect(
  productId: string,
  kind: AiConsultingScopeResult["kind"],
  question: string,
): AiConsultingScopeResult {
  return result({
    decision: "SAFETY_REDIRECT",
    reason: "safety_sensitive_request",
    productId,
    kind,
    normalizedQuestion: question,
    answerGuardrails: [],
    userMessage: "이 질문은 사주 상담 범위를 넘어 실제 전문가의 확인이 필요한 내용이 포함되어 있어요. 운보다 AI는 진단·처방·법률 판단·구체 투자 실행을 대신하지 않습니다.",
  });
}

function evaluateTopic(
  productId: string,
  question: string,
  continuation = false,
): AiConsultingScopeResult {
  const config = getPaidAnalysisTopicConfig(productId);
  if (!config) {
    return result({
      decision: "DENY",
      reason: "unknown_or_unlaunched_product",
      productId,
      kind: "none",
      normalizedQuestion: question,
      answerGuardrails: [],
      userMessage: "현재 구매한 분석에 연결할 수 없는 상담 주제입니다.",
    });
  }

  const positiveSources = [
    config.userQuestion,
    ...config.analysisFocus,
    ...config.requiredInsights.map((item) => item.prompt),
    ...config.actionFocus,
  ];
  const excludedSources = config.excludedFocus?.map((item) => item.prompt) ?? [];
  const positiveScore = overlapScore(question, positiveSources);
  const excludedScore = overlapScore(question, excludedSources);
  const umbrellaBridge = UMBRELLA_TOPIC_BRIDGE_PATTERNS[productId]?.some((pattern) =>
    pattern.test(question),
  ) ?? false;
  const continuationFollowup = continuation && isAiConsultingContinuationQuestion(question);

  if (umbrellaBridge || (excludedScore > 0 && excludedScore > positiveScore)) {
    return result({
      decision: "ALLOW",
      reason: "within_topic_bridge_scope",
      scopeTier: "BRIDGE",
      productId,
      kind: "topic",
      normalizedQuestion: question,
      answerGuardrails: [
        ...config.prohibitedClaims,
        "연결 답변은 현재 구매한 리포트에 실제로 들어 있는 결과·관찰 신호·행동 기준만 사용한다.",
        "인접한 다른 심층분석의 독자적인 결론·예측·적합성 판정·시기 판단을 새로 만들어 대신하지 않는다.",
        ...(config.excludedFocus?.map((item) => `인접 전문 범위는 연결 설명까지만 허용: ${item.prompt}`) ?? []),
      ],
      userMessage: "",
    });
  }

  if (positiveScore === 0 && continuationFollowup) {
    return result({
      decision: "ALLOW",
      reason: "within_continuation_scope",
      scopeTier: "CORE",
      productId,
      kind: "topic",
      normalizedQuestion: question,
      answerGuardrails: [
        ...config.prohibitedClaims,
        ...(config.excludedFocus?.map((item) => `이전 답변을 이어가더라도 다음 별도 영역의 새 분석으로 확장하지 않음: ${item.prompt}`) ?? []),
      ],
      userMessage: "",
    });
  }

  if (positiveScore === 0) {
    return result({
      decision: "CLARIFY",
      reason: "topic_scope_unclear",
      scopeTier: "NONE",
      productId,
      kind: "topic",
      normalizedQuestion: question,
      answerGuardrails: config.prohibitedClaims,
      userMessage: "현재 구매한 분석과 어떤 부분을 이어서 묻는 질문인지 조금 더 구체적으로 적어 주세요.",
    });
  }

  return result({
    decision: "ALLOW",
    reason: "within_topic_scope",
    scopeTier: "CORE",
    productId,
    kind: "topic",
    normalizedQuestion: question,
    answerGuardrails: [
      ...config.prohibitedClaims,
      ...(config.excludedFocus?.map((item) => `핵심 상담 범위를 다음 영역으로 확장하지 않음: ${item.prompt}`) ?? []),
    ],
    userMessage: "",
  });
}

function evaluatePeriod(
  productId: string,
  question: string,
  continuation = false,
): AiConsultingScopeResult {
  const strategy = getPeriodAnalysisStrategy(productId);
  const rule = PERIOD_ANCHOR_RULES[productId];
  if (!strategy || !rule) {
    return result({
      decision: "DENY",
      reason: "unknown_or_unlaunched_product",
      productId,
      kind: "none",
      normalizedQuestion: question,
      answerGuardrails: [],
      userMessage: "현재 구매한 기간 분석에 연결할 수 없는 상담입니다.",
    });
  }

  const ownsAnchor = includesOneOf(question, rule.own);
  const continuationFollowup = continuation && isAiConsultingContinuationQuestion(question);
  const includesComparison = Boolean(
    rule.comparison && includesOneOf(question, rule.comparison),
  );
  const allowedComparison = includesComparison && (ownsAnchor || continuationFollowup);

  if (includesOneOf(question, rule.conflicting) && !allowedComparison) {
    return result({
      decision: "DENY",
      reason: "period_mismatch",
      scopeTier: "OUTSIDE",
      productId,
      kind: "period",
      normalizedQuestion: question,
      answerGuardrails: strategy.prohibitedPatterns,
      userMessage: "질문에 적힌 기간이 현재 구매한 기간 분석의 범위와 다릅니다. 이 분석의 기간 안에서 질문해 주세요.",
    });
  }

  const semanticScore = overlapScore(question, [
    strategy.coreQuestion,
    ...strategy.focus,
    ...strategy.requiredInsights.flatMap((item) => [
      item.title,
      item.evidenceInterpretation,
      item.mechanismResponsibility,
      item.observableSignal,
      item.actionResponsibility,
    ]),
  ]);

  if (allowedComparison) {
    return result({
      decision: "ALLOW",
      reason: "within_period_comparison_scope",
      scopeTier: "CORE",
      productId,
      kind: "period",
      normalizedQuestion: question,
      answerGuardrails: [
        ...strategy.prohibitedPatterns,
        `시간 해상도 유지: ${strategy.timeGranularity}`,
        `핵심 질문 범위를 유지: ${strategy.coreQuestion}`,
        "비교는 이 기간 리포트가 이미 약속한 비교 범위에서만 수행하고, 별도 기간 상품의 독립 분석을 새로 생성하지 않는다.",
      ],
      userMessage: "",
    });
  }

  if (!ownsAnchor && semanticScore === 0 && continuationFollowup) {
    return result({
      decision: "ALLOW",
      reason: "within_continuation_scope",
      scopeTier: "CORE",
      productId,
      kind: "period",
      normalizedQuestion: question,
      answerGuardrails: [
        ...strategy.prohibitedPatterns,
        `시간 해상도 유지: ${strategy.timeGranularity}`,
        `핵심 질문 범위를 유지: ${strategy.coreQuestion}`,
        "직전 답변을 이어 설명하되 현재 구매한 기간 밖의 새로운 시기 분석을 만들지 않는다.",
      ],
      userMessage: "",
    });
  }

  if (!ownsAnchor && semanticScore === 0) {
    return result({
      decision: "CLARIFY",
      reason: "period_scope_unclear",
      scopeTier: "NONE",
      productId,
      kind: "period",
      normalizedQuestion: question,
      answerGuardrails: strategy.prohibitedPatterns,
      userMessage: "현재 구매한 기간의 흐름과 연결해 무엇을 확인하고 싶은지 기간 또는 상황을 조금 더 구체적으로 적어 주세요.",
    });
  }

  return result({
    decision: "ALLOW",
    reason: "within_period_scope",
    scopeTier: "CORE",
    productId,
    kind: "period",
    normalizedQuestion: question,
    answerGuardrails: [
      ...strategy.prohibitedPatterns,
      `시간 해상도 유지: ${strategy.timeGranularity}`,
      `핵심 질문 범위를 유지: ${strategy.coreQuestion}`,
      "기간 상품 상담은 시간 흐름과 관찰·조정 기준을 설명하되, 별도 주제형 상품의 고유 의사결정 분석을 대신하지 않는다.",
    ],
    userMessage: "",
  });
}

export function evaluateAiConsultingScope(input: {
  productId: string;
  question: string;
  /** Server-provided conversational context; never inferred from customer ownership alone. */
  continuation?: boolean;
}): AiConsultingScopeResult {
  const question = normalize(input.question);
  const compatibilityProduct = isAiConsultingCompatibilityProductId(input.productId);
  const canonicalProductId = compatibilityProduct
    ? input.productId
    : getCanonicalPremiumProductId(input.productId);
  const launchIds = new Set(getLaunchProductIds());
  const specialization = resolvePaidAnalysisLaunchSpecialization(canonicalProductId);
  const kind: AiConsultingScopeResult["kind"] = compatibilityProduct
    ? "compatibility"
    : specialization.kind === "none"
      ? "none"
      : specialization.kind;

  if (
    !compatibilityProduct
    && (!launchIds.has(canonicalProductId) || specialization.kind === "none")
  ) {
    return result({
      decision: "DENY",
      reason: "unknown_or_unlaunched_product",
      productId: canonicalProductId,
      kind: "none",
      normalizedQuestion: question,
      answerGuardrails: [],
      userMessage: "현재 판매·구매 가능한 분석에 연결된 상담이 아닙니다.",
    });
  }

  if (question.length < 2) {
    return result({
      decision: "CLARIFY",
      reason: "question_too_short",
      productId: canonicalProductId,
      kind,
      normalizedQuestion: question,
      answerGuardrails: [],
      userMessage: "질문을 조금 더 구체적으로 적어 주세요.",
    });
  }

  if (question.length > AI_CONSULTING_QUESTION_MAX_CHARS) {
    return result({
      decision: "DENY",
      reason: "question_too_long",
      productId: canonicalProductId,
      kind,
      normalizedQuestion: question,
      answerGuardrails: [],
      userMessage: `한 번의 질문은 ${AI_CONSULTING_QUESTION_MAX_CHARS}자 이내로 작성해 주세요.`,
    });
  }

  if (includesOneOf(question, SAFETY_PATTERNS)) {
    return safetyRedirect(canonicalProductId, kind, question);
  }

  if (compatibilityProduct) {
    return evaluateCompatibilityAiConsultingScope({
      productId: canonicalProductId,
      question,
      continuation: input.continuation === true,
    });
  }

  return specialization.kind === "topic"
    ? evaluateTopic(canonicalProductId, question, input.continuation === true)
    : evaluatePeriod(canonicalProductId, question, input.continuation === true);
}
