import { evaluateAiConsultingScope, type AiConsultingScopeResult } from "../aiConsultingScope";
import { getAiConsultingPresentation } from "../aiConsultingPresentation";
import { listUserPaidAnalysisSummaries } from "../paidReports/server";
import {
  resolveAnalysisInputProfileVersion,
  type AnalysisInputProfileVersion,
} from "../analysisInputSnapshot";
import { getCanonicalPremiumProductId } from "../premiumProductRegistry";
import type { ProfileDto } from "../profiles/types";
import { createAdminClient } from "../supabase/admin";
import { answerAiConsultingQuestion } from "./answerPipeline";
import {
  recordAiConsultingFailureOutcome,
  recordAiConsultingSuccessOutcome,
} from "./operations";
import { ensureAiConsultingThreadForAnalysis } from "./session";
import { getAiConsultingCreditBalance } from "./server";

export type AiConsultingPortfolioAnalysis = {
  productId: string;
  analysisEditionKey: string;
  productTitle: string;
  editionLabel: string;
  acquiredAt: string;
  suggestedQuestions: readonly string[];
  scopeLabel: string;
  profileInputVersion: AnalysisInputProfileVersion;
};

export type AiConsultingPortfolioMessage = {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  content: string;
  scopeDecision: "ALLOW" | "CLARIFY" | "DENY" | "SAFETY_REDIRECT" | null;
  charged: boolean;
  createdAt: string;
  sourceProductId: string;
  sourceEditionKey: string;
  sourceTitle: string;
  sourceEditionLabel: string;
};

export type AiConsultingPortfolioState = {
  profileId: string;
  questionsRemaining: number;
  analyses: AiConsultingPortfolioAnalysis[];
  messages: AiConsultingPortfolioMessage[];
  hasOlderMessages?: boolean;
  previousAnalysesExcluded: number;
};

export type AiConsultingPortfolioSource = Pick<
  AiConsultingPortfolioAnalysis,
  "productId" | "analysisEditionKey" | "productTitle" | "editionLabel"
>;

export type AiConsultingPortfolioQuestionResult =
  | {
      state: "answered";
      questionsRemaining: number;
      source: AiConsultingPortfolioSource;
    }
  | {
      state: "credit_required";
      questionsRemaining: 0;
      source: AiConsultingPortfolioSource;
    }
  | {
      state: "clarify_source";
      message: string;
      candidates: AiConsultingPortfolioSource[];
      questionsRemaining: number;
    }
  | {
      state: "non_chargeable";
      message: string;
      reason: string;
      questionsRemaining: number;
    }
  | {
      state: "outside_portfolio";
      message: string;
      questionsRemaining: number;
    };

type ThreadRow = {
  id: string;
  base_product_id: string;
  analysis_edition_key: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  scope_decision: AiConsultingPortfolioMessage["scopeDecision"];
  charged: boolean;
  created_at: string;
};

const ROUTING_STOPWORDS = new Set([
  "그리고", "그러면", "그럼", "그런데", "하지만", "대해서", "관련", "무엇", "어떤", "어떻게",
  "있는", "없는", "하는", "해야", "하면", "인가", "인지", "일까", "알려줘", "궁금해", "궁금합니다",
  "현재", "지금", "정도", "기준", "분석", "질문", "내가", "나는", "저는", "제가", "우리", "나의",
  "것은", "것이", "것을", "수", "때", "중", "더", "잘", "좀", "관련된", "관련해서",
]);

function analysisKey(productId: string, editionKey: string): string {
  return `${productId}|${editionKey}`;
}

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

function tokens(value: string): string[] {
  return (normalize(value).match(/[가-힣a-z0-9]{2,}/gu) ?? [])
    .filter((token) => !ROUTING_STOPWORDS.has(token));
}

function routingScore(
  analysis: AiConsultingPortfolioAnalysis,
  question: string,
  scope: AiConsultingScopeResult,
): number {
  if (scope.decision !== "ALLOW") return -1;

  const sourceText = normalize([
    analysis.productTitle,
    analysis.scopeLabel,
    ...analysis.suggestedQuestions,
  ].join(" "));
  let score = scope.kind === "period" || scope.kind === "compatibility" ? 2 : 1;

  for (const token of tokens(question)) {
    if (sourceText.includes(token)) {
      score += token.length >= 4 ? 2 : 1;
    }
  }

  return score;
}

type PurchaseInputRow = {
  product_id: string;
  analysis_edition_key: string | null;
  analysis_input_snapshot: unknown;
  purchased_at: string;
};

async function listPortfolioAnalyses(input: {
  userId: string;
  profileId: string;
  profile: ProfileDto;
  includePreviousSource?: {
    productId: string;
    analysisEditionKey: string;
  } | null;
}): Promise<{
  analyses: AiConsultingPortfolioAnalysis[];
  previousAnalysesExcluded: number;
}> {
  const summaries = await listUserPaidAnalysisSummaries(input.userId);
  const { data: purchaseData, error: purchaseError } = await createAdminClient()
    .from("purchases")
    .select("product_id,analysis_edition_key,analysis_input_snapshot,purchased_at")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .order("purchased_at", { ascending: false });

  if (purchaseError) {
    throw new Error(`AI_CONSULTING_PURCHASE_INPUT_LOOKUP_FAILED: ${purchaseError.message}`);
  }

  // The newest purchase for an exact product/edition is the relevant source if
  // a refunded historical purchase and a later re-purchase both exist.
  const purchaseInputByKey = new Map<string, unknown>();
  for (const row of (purchaseData ?? []) as PurchaseInputRow[]) {
    if (!row.analysis_edition_key) continue;
    const canonicalProductId = getCanonicalPremiumProductId(row.product_id);
    const key = analysisKey(canonicalProductId, row.analysis_edition_key);
    if (!purchaseInputByKey.has(key)) {
      purchaseInputByKey.set(key, row.analysis_input_snapshot);
    }
  }

  const seen = new Set<string>();
  const analyses: AiConsultingPortfolioAnalysis[] = [];
  let previousAnalysesExcluded = 0;

  for (const summary of summaries
    .filter((summary) =>
      summary.profileId === input.profileId
      && summary.reportStatus === "completed"
      && Boolean(summary.analysisEditionKey),
    )
    .sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt))) {
    const editionKey = summary.analysisEditionKey!;
    const key = analysisKey(summary.productId, editionKey);
    if (seen.has(key)) continue;
    seen.add(key);

    const profileInputVersion = resolveAnalysisInputProfileVersion(
      purchaseInputByKey.get(key),
      input.profile,
    );
    const explicitPreviousProductId = input.includePreviousSource
      ? getCanonicalPremiumProductId(input.includePreviousSource.productId)
      : null;
    const explicitPreviousSource = Boolean(
      input.includePreviousSource
      && explicitPreviousProductId === summary.productId
      && input.includePreviousSource.analysisEditionKey === editionKey,
    );

    if (profileInputVersion !== "current" && !explicitPreviousSource) {
      previousAnalysesExcluded += 1;
      continue;
    }

    const presentation = getAiConsultingPresentation(summary.productId, editionKey);
    analyses.push({
      productId: summary.productId,
      analysisEditionKey: editionKey,
      productTitle: presentation.productTitle,
      editionLabel: presentation.editionLabel,
      acquiredAt: summary.acquiredAt,
      suggestedQuestions: presentation.suggestedQuestions,
      scopeLabel: presentation.scopeLabel,
      profileInputVersion,
    });
  }

  const explicitPrevious = input.includePreviousSource
    ? analyses.find((analysis) =>
        analysis.productId === getCanonicalPremiumProductId(input.includePreviousSource!.productId)
        && analysis.analysisEditionKey === input.includePreviousSource!.analysisEditionKey
        && analysis.profileInputVersion !== "current",
      )
    : null;

  // A historical report continuation is intentionally isolated: once the user
  // enters from a report purchased with previous/unknown birth inputs, that
  // consultation cannot silently jump to a current-input report.
  if (explicitPrevious) {
    return {
      analyses: [explicitPrevious],
      previousAnalysesExcluded,
    };
  }

  return { analyses, previousAnalysesExcluded };
}

async function listPortfolioMessages(input: {
  userId: string;
  profileId: string;
  analyses: readonly AiConsultingPortfolioAnalysis[];
  before?: string;
  beforeId?: string;
}): Promise<{ messages: AiConsultingPortfolioMessage[]; hasOlderMessages: boolean }> {
  if (input.analyses.length === 0) return { messages: [], hasOlderMessages: false };

  const sourceByKey = new Map(
    input.analyses.map((analysis) => [
      analysisKey(analysis.productId, analysis.analysisEditionKey),
      analysis,
    ]),
  );

  const supabase = createAdminClient();
  const { data: threadData, error: threadError } = await supabase
    .from("ai_consulting_threads")
    .select("id,base_product_id,analysis_edition_key")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("status", "active");

  if (threadError) {
    throw new Error(`AI_CONSULTING_PORTFOLIO_THREADS_FAILED: ${threadError.message}`);
  }

  const threads = ((threadData ?? []) as ThreadRow[])
    .filter((thread) => sourceByKey.has(analysisKey(thread.base_product_id, thread.analysis_edition_key)));

  if (threads.length === 0) return { messages: [], hasOlderMessages: false };

  const threadById = new Map(threads.map((thread) => [thread.id, thread]));
  // Load the latest messages first. An older, long-running thread must never
  // hide the newest conversation just because the profile has over 200 messages.
  let messageQuery = supabase
    .from("ai_consulting_messages")
    .select("id,thread_id,role,content,scope_decision,charged,created_at")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .in("thread_id", threads.map((thread) => thread.id))
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(41);
  if (input.before && input.beforeId) {
    // Sort by both fields so messages with the same timestamp never disappear
    // across page boundaries. These cursor parts are validated in the API.
    messageQuery = messageQuery.or(`created_at.lt.${input.before},and(created_at.eq.${input.before},id.lt.${input.beforeId})`);
  }
  const { data: messageData, error: messageError } = await messageQuery;

  if (messageError) {
    throw new Error(`AI_CONSULTING_PORTFOLIO_MESSAGES_FAILED: ${messageError.message}`);
  }

  const hasOlderMessages = (messageData ?? []).length > 40;
  const messages = ((messageData ?? []).slice(0, 40) as MessageRow[]).flatMap((message) => {
    const thread = threadById.get(message.thread_id);
    if (!thread) return [];
    const source = sourceByKey.get(analysisKey(thread.base_product_id, thread.analysis_edition_key));
    if (!source) return [];

    return [{
      id: message.id,
      threadId: message.thread_id,
      role: message.role,
      content: message.content,
      scopeDecision: message.scope_decision,
      charged: message.charged,
      createdAt: message.created_at,
      sourceProductId: source.productId,
      sourceEditionKey: source.analysisEditionKey,
      sourceTitle: source.productTitle,
      sourceEditionLabel: source.editionLabel,
    }];
  }).reverse();
  return { messages, hasOlderMessages };
}

export async function getAiConsultingPortfolioState(input: {
  userId: string;
  profileId: string;
  profile: ProfileDto;
  includePreviousSource?: {
    productId: string;
    analysisEditionKey: string;
  } | null;
  messageBefore?: string;
  messageBeforeId?: string;
}): Promise<AiConsultingPortfolioState> {
  const { analyses, previousAnalysesExcluded } = await listPortfolioAnalyses(input);
  const [questionsRemaining, messagePage] = await Promise.all([
    getAiConsultingCreditBalance(input),
    listPortfolioMessages({
      userId: input.userId,
      profileId: input.profileId,
      analyses,
      before: input.messageBefore,
      beforeId: input.messageBeforeId,
    }),
  ]);

  return {
    profileId: input.profileId,
    questionsRemaining,
    analyses,
    messages: messagePage.messages,
    hasOlderMessages: messagePage.hasOlderMessages,
    previousAnalysesExcluded,
  };
}

function toSource(analysis: AiConsultingPortfolioAnalysis): AiConsultingPortfolioSource {
  return {
    productId: analysis.productId,
    analysisEditionKey: analysis.analysisEditionKey,
    productTitle: analysis.productTitle,
    editionLabel: analysis.editionLabel,
  };
}

export async function answerAiConsultingPortfolioQuestion(input: {
  userId: string;
  profileId: string;
  requestId: string;
  question: string;
  preferredProductId?: string | null;
  preferredEditionKey?: string | null;
  preferContinuation?: boolean;
  profile: ProfileDto;
}): Promise<AiConsultingPortfolioQuestionResult> {
  const includePreviousSource = input.preferredProductId && input.preferredEditionKey
    ? {
        productId: input.preferredProductId,
        analysisEditionKey: input.preferredEditionKey,
      }
    : null;
  const state = await getAiConsultingPortfolioState({
    userId: input.userId,
    profileId: input.profileId,
    profile: input.profile,
    includePreviousSource,
  });

  if (state.analyses.length === 0) {
    return {
      state: "outside_portfolio",
      message: state.previousAnalysesExcluded > 0
        ? "현재 출생 정보와 일치하는 완료 리포트가 없습니다. 이전 출생정보 기준 리포트는 자동 상담 범위에서 제외되며, 해당 리포트에서 직접 들어오면 기존 상담을 이어갈 수 있습니다."
        : "완료된 구매 리포트가 아직 없습니다. 유료 리포트가 완성되면 보유 분석이 AI 상담 범위에 자동으로 추가됩니다.",
      questionsRemaining: state.questionsRemaining,
    };
  }

  const evaluated = state.analyses.map((analysis) => {
    const scope = evaluateAiConsultingScope({
      productId: analysis.productId,
      question: input.question,
    });
    return {
      analysis,
      scope,
      score: routingScore(analysis, input.question, scope),
    };
  });

  const safety = evaluated.find((candidate) => candidate.scope.decision === "SAFETY_REDIRECT");
  if (safety) {
    return {
      state: "non_chargeable",
      message: safety.scope.userMessage,
      reason: safety.scope.reason,
      questionsRemaining: state.questionsRemaining,
    };
  }

  const allowed = evaluated
    .filter((candidate) => candidate.scope.decision === "ALLOW")
    .sort((a, b) =>
      b.score - a.score
      || b.analysis.acquiredAt.localeCompare(a.analysis.acquiredAt),
    );

  if (allowed.length === 0) {
    const clarify = evaluated.find((candidate) => candidate.scope.decision === "CLARIFY");
    if (clarify) {
      return {
        state: "non_chargeable",
        message: "보유한 분석 중 어떤 내용을 이어서 묻는지 조금 더 구체적으로 적어 주세요. 예: 재물 흐름, 이직 판단, 이번 달 흐름, 연인과의 갈등처럼 질문의 주제를 함께 적어 주세요.",
        reason: clarify.scope.reason,
        questionsRemaining: state.questionsRemaining,
      };
    }

    return {
      state: "outside_portfolio",
      message: "현재 보유한 유료 분석의 범위에서는 이 질문에 답할 근거가 없습니다. 관련 분석을 추가로 구매하면 같은 AI 상담에서 새 분석 범위가 자동으로 확장됩니다.",
      questionsRemaining: state.questionsRemaining,
    };
  }

  const preferredCandidate = input.preferredProductId && input.preferredEditionKey
    ? allowed.find((candidate) =>
        candidate.analysis.productId === input.preferredProductId
        && candidate.analysis.analysisEditionKey === input.preferredEditionKey,
      )
    : undefined;
  // An explicitly chosen report must not silently fall back to another report.
  // Choosing a different report or automatic mode is the customer's decision.
  if (!input.preferContinuation && input.preferredProductId && input.preferredEditionKey && !preferredCandidate) {
    return {
      state: "non_chargeable",
      message: "선택한 분석에서는 이 질문에 답할 수 없습니다. 다른 분석을 선택하거나 자동 선택으로 바꿔 주세요.",
      reason: "SELECTED_REPORT_OUT_OF_SCOPE",
      questionsRemaining: state.questionsRemaining,
    };
  }
  // An explicit report selection stays pinned. An automatic follow-up only
  // reuses the previous source for conversational wording when another report
  // is not materially more relevant; clear topic switches still re-route.
  const followup = /^(그럼|그러면|그렇다면|그래서|이어서|아까|지난번|저번에|방금|그때|그건|그게|그것|그 부분|그 이야기|그 후|그와 관련|이것도|그렇군요|그런데 그)/u.test(input.question.trim());
  const preferred = input.preferContinuation
    ? followup && preferredCandidate && allowed[0].score - preferredCandidate.score <= 1 ? preferredCandidate : undefined
    : preferredCandidate;
  const top = preferred ?? allowed[0];
  const next = preferred ? undefined : allowed[1];

  if (
    !preferred
    && next
    && next.score === top.score
    && next.analysis.productId !== top.analysis.productId
  ) {
    return {
      state: "clarify_source",
      message: "이 질문은 보유한 분석 두 개 이상과 연결됩니다. 어떤 리포트를 기준으로 먼저 답할지 선택해 주세요. 선택만으로 질문권은 차감되지 않습니다.",
      candidates: allowed.slice(0, 4).map(({ analysis }) => toSource(analysis)),
      questionsRemaining: state.questionsRemaining,
    };
  }

  if (state.questionsRemaining <= 0) {
    return {
      state: "credit_required",
      questionsRemaining: 0,
      source: toSource(top.analysis),
    };
  }

  const threadId = await ensureAiConsultingThreadForAnalysis({
    userId: input.userId,
    profileId: input.profileId,
    productId: top.analysis.productId,
    analysisEditionKey: top.analysis.analysisEditionKey,
    title: `${top.analysis.productTitle} AI 상담`,
  });

  try {
    const result = await answerAiConsultingQuestion({
      userId: input.userId,
      profileId: input.profileId,
      threadId,
      requestId: input.requestId,
      question: input.question,
    });

    if (result.state !== "answered") {
      return {
        state: "non_chargeable",
        message: result.userMessage,
        reason: result.scopeReason,
        questionsRemaining: result.questionsRemaining,
      };
    }

    try {
      await recordAiConsultingSuccessOutcome({
        userId: input.userId,
        profileId: input.profileId,
        threadId,
        requestId: input.requestId,
        assistantMessageId: result.assistantMessageId,
      });
    } catch (telemetryError) {
      console.error("[ai-consulting-portfolio] success telemetry failed", {
        message: telemetryError instanceof Error ? telemetryError.message : "unknown-telemetry-error",
      });
    }

    return {
      state: "answered",
      questionsRemaining: result.questionsRemaining,
      source: toSource(top.analysis),
    };
  } catch (error) {
    try {
      await recordAiConsultingFailureOutcome({
        userId: input.userId,
        profileId: input.profileId,
        threadId,
        requestId: input.requestId,
        error,
      });
    } catch (telemetryError) {
      console.error("[ai-consulting-portfolio] failure telemetry failed", {
        message: telemetryError instanceof Error ? telemetryError.message : "unknown-telemetry-error",
      });
    }
    throw error;
  }
}
