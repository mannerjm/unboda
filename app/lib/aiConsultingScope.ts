import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";
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

export type AiConsultingScopeReason =
  | "within_topic_scope"
  | "within_period_scope"
  | "question_too_short"
  | "question_too_long"
  | "unknown_or_unlaunched_product"
  | "topic_scope_unclear"
  | "topic_outside_purchased_scope"
  | "period_scope_unclear"
  | "period_mismatch"
  | "safety_sensitive_request";

export type AiConsultingScopeResult = {
  decision: AiConsultingScopeDecision;
  reason: AiConsultingScopeReason;
  productId: string;
  kind: "topic" | "period" | "none";
  normalizedQuestion: string;
  /** Never charge a consulting turn unless this is true. */
  chargeable: boolean;
  /** Static boundaries that must be included in the eventual answer prompt. */
  answerGuardrails: readonly string[];
  /** Safe user-facing explanation. No LLM call is needed for non-ALLOW results. */
  userMessage: string;
};

type PeriodAnchorRule = {
  own: readonly RegExp[];
  conflicting: readonly RegExp[];
};

const PERIOD_ANCHOR_RULES: Record<string, PeriodAnchorRule> = {
  "monthly-current": {
    own: [/이번\s*달/u, /이달/u, /현재\s*달/u],
    conflicting: [/다음\s*달/u, /내달/u, /올해/u, /내년/u, /향후\s*3년/u, /앞으로\s*3년/u, /평생/u, /생애/u, /대운/u],
  },
  "monthly-next": {
    own: [/다음\s*달/u, /내달/u],
    conflicting: [/이번\s*달/u, /이달/u, /올해/u, /내년/u, /향후\s*3년/u, /앞으로\s*3년/u, /평생/u, /생애/u, /대운/u],
  },
  "yearly-current": {
    own: [/올해/u, /금년/u, /이번\s*해/u, /현재\s*연도/u],
    conflicting: [/이번\s*달/u, /다음\s*달/u, /내년/u, /다음\s*해/u, /향후\s*3년/u, /앞으로\s*3년/u, /평생/u, /생애/u, /대운/u],
  },
  "annual-next": {
    own: [/내년/u, /다음\s*해/u, /다음\s*연도/u],
    conflicting: [/이번\s*달/u, /다음\s*달/u, /올해/u, /금년/u, /향후\s*3년/u, /앞으로\s*3년/u, /평생/u, /생애/u, /대운/u],
  },
  "annual-3years": {
    own: [/향후\s*3년/u, /앞으로\s*3년/u, /3년\s*(?:간|동안)?/u],
    conflicting: [/이번\s*달/u, /다음\s*달/u, /올해/u, /내년/u, /평생/u, /생애/u, /대운/u],
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
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): Set<string> {
  const normalized = normalize(value).toLowerCase();
  const tokens = normalized.match(/[가-힣a-z0-9]{2,}/gu) ?? [];
  return new Set(tokens.filter((token) => !STOPWORDS.has(token)));
}

function overlapScore(question: string, sources: readonly string[]): number {
  const questionTokens = tokenize(question);
  if (questionTokens.size === 0) {
    return 0;
  }

  let score = 0;
  for (const source of sources) {
    const normalizedSource = normalize(source).toLowerCase();
    const sourceTokens = tokenize(source);
    let local = 0;

    for (const token of questionTokens) {
      if (sourceTokens.has(token) || normalizedSource.includes(token)) {
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
  partial: Omit<AiConsultingScopeResult, "normalizedQuestion" | "chargeable"> & {
    normalizedQuestion: string;
  },
): AiConsultingScopeResult {
  return {
    ...partial,
    chargeable: partial.decision === "ALLOW",
  };
}

function safetyRedirect(productId: string, kind: AiConsultingScopeResult["kind"], question: string): AiConsultingScopeResult {
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

function evaluateTopic(productId: string, question: string): AiConsultingScopeResult {
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

  if (excludedScore > 0 && excludedScore > positiveScore) {
    return result({
      decision: "DENY",
      reason: "topic_outside_purchased_scope",
      productId,
      kind: "topic",
      normalizedQuestion: question,
      answerGuardrails: config.prohibitedClaims,
      userMessage: "이 질문은 현재 구매한 심층 분석의 상담 범위를 벗어납니다. 해당 주제의 분석을 보유한 경우 그 상담에서 이어서 질문해 주세요.",
    });
  }

  if (positiveScore === 0) {
    return result({
      decision: "CLARIFY",
      reason: "topic_scope_unclear",
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

function evaluatePeriod(productId: string, question: string): AiConsultingScopeResult {
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

  if (includesOneOf(question, rule.conflicting)) {
    return result({
      decision: "DENY",
      reason: "period_mismatch",
      productId,
      kind: "period",
      normalizedQuestion: question,
      answerGuardrails: strategy.prohibitedPatterns,
      userMessage: "질문에 적힌 기간이 현재 구매한 기간 분석의 범위와 다릅니다. 이 분석의 기간 안에서 질문해 주세요.",
    });
  }

  const ownsAnchor = includesOneOf(question, rule.own);
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

  if (!ownsAnchor && semanticScore === 0) {
    return result({
      decision: "CLARIFY",
      reason: "period_scope_unclear",
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

/**
 * Pure, deterministic preflight. This function must run before any LLM call or turn charge.
 * It does not read memory, payment state or user data; callers must first select a purchased
 * product entitlement and pass that productId here.
 */
export function evaluateAiConsultingScope(input: {
  productId: string;
  question: string;
}): AiConsultingScopeResult {
  const question = normalize(input.question);
  const canonicalProductId = getCanonicalPremiumProductId(input.productId);
  const launchIds = new Set(getLaunchProductIds());
  const specialization = resolvePaidAnalysisLaunchSpecialization(canonicalProductId);
  const kind = specialization.kind === "none" ? "none" : specialization.kind;

  if (!launchIds.has(canonicalProductId) || specialization.kind === "none") {
    return result({
      decision: "DENY",
      reason: "unknown_or_unlaunched_product",
      productId: canonicalProductId,
      kind: "none",
      normalizedQuestion: question,
      answerGuardrails: [],
      userMessage: "현재 판매·구매 가능한 심층 분석에 연결된 상담이 아닙니다.",
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

  return specialization.kind === "topic"
    ? evaluateTopic(canonicalProductId, question)
    : evaluatePeriod(canonicalProductId, question);
}
