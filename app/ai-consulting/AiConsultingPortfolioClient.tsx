"use client";

import Link from "next/link";
import Image from "next/image";
import { GENERAL_CONSULTING_SOURCE, isGeneralConsultingSource } from "@/app/lib/aiConsulting/generalSource";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AiConsultingPortfolioAnalysis,
  AiConsultingPortfolioMessage,
  AiConsultingPortfolioQuestionResult,
  AiConsultingPortfolioSource,
  AiConsultingPortfolioState,
} from "@/app/lib/aiConsulting/portfolio";
import type { ProfileFreeAnalysisStatus } from "@/app/lib/freeAnalysisResults/server";
import TrustPrinciplesCard from "@/app/components/TrustPrinciplesCard";

type AiConsultingUserMemory = {
  id: string;
  content: string;
  kind?: "user_fact" | "life_event" | "goal" | "preference";
  sourceMessageId: string | null;
  createdAt: string;
  updatedAt: string;
};

type RoutingNotice =
  | { kind: "info"; message: string }
  | { kind: "outside"; message: string };

function policyMessage(decision: AiConsultingPortfolioMessage["scopeDecision"]): string | null {
  if (decision === "CLARIFY") return "질문을 조금 더 구체적으로 적어 주세요. 질문권은 차감되지 않았습니다.";
  if (decision === "DENY") return "구매하신 분석 범위에서 답변할 수 없어 질문권을 차감하지 않았습니다.";
  if (decision === "SAFETY_REDIRECT") return "실제 전문가 확인이 필요한 안전 민감 영역이라 AI 답변을 생성하지 않았습니다. 질문권도 차감되지 않았습니다.";
  return null;
}

function formatRecentActivity(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * The shared AI hub has no selected report. Suggestions must name an actual
 * topic and never depend on the deictic "this report" wording from individual
 * paid-report continuation cards. The server still chooses and validates the
 * purchased report independently for each submitted question.
 */
function unifiedSuggestedQuestion(analysis: AiConsultingPortfolioAnalysis): string {
  if (analysis.productId === "wealth") {
    return "재물운과 관련해 수입과 지출에서 지금 가장 먼저 점검할 점은 뭐야?";
  }
  if (analysis.productId === "health-sleep-rhythm") {
    return "수면 리듬을 지키려면 취침 전 생활 습관 중 무엇부터 점검해야 할까?";
  }

  const topic = analysis.productTitle
    .replace(/(?:[· ]?(?:심층|전문|종합|맞춤|정밀))?\s*(?:점검\s*)?분석$/u, "")
    .trim() || analysis.productTitle;
  // Product-specific follow-ups are useful only when they do not refer to a
  // selected report/period whose context the unified chat does not have.
  const topical = analysis.suggestedQuestions.find((question) =>
    !/(?:이\s*리포트|이\s*분석|이\s*기간|해당\s*리포트|이\s*결과)/u.test(question)
    && !/^다음(?:에|\s*점검)/u.test(question),
  );
  return topical
    ? `${topic}에 관해 ${topical}`
    : `${topic}에 관해 지금 가장 먼저 확인할 점은 뭐야?`;
}

/**
 * Preserve the four stored evidence layers for old and new answers. Only the
 * display order changes: immediate advice first, report evidence on demand.
 * Unknown legacy formats are shown verbatim rather than dropping any text.
 */
function ConsultingAnswer({ content, general = false }: { content: string; general?: boolean }) {
  const sections = new Map<string, string>();
  let heading: string | null = null;
  for (const line of content.split("\n")) {
    const match = line.trim().match(/^(?:#{1,4}\s*)?(확인된 사용자 사실|운보다 명리 해석|AI 상담 해석|지금 확인할 점)\s*:?$/u);
    if (match) {
      heading = match[1];
      if (!sections.has(heading)) sections.set(heading, "");
    } else if (heading) {
      sections.set(heading, `${sections.get(heading)}\n${line}`.trim());
    }
  }

  const main = sections.get("AI 상담 해석");
  const action = sections.get("지금 확인할 점");
  const report = sections.get("운보다 명리 해석");
  const userFacts = sections.get("확인된 사용자 사실");
  if (!main || !action || !report || userFacts === undefined) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }
  // Older paid replies can be long: show the first complete sentence without
  // cutting a thought in half. The remaining original answer stays available.
  const firstSentenceEnd = main.search(/[.!?](?:\s|$)/u);
  const hasLongAnswer = main.length > 190 && firstSentenceEnd >= 0 && firstSentenceEnd < 185;
  const shortAnswer = hasLongAnswer ? main.slice(0, firstSentenceEnd + 1) : main;
  const extraAnswer = hasLongAnswer ? main.slice(firstSentenceEnd + 1).trim() : "";

  return (
    <div className="space-y-2">
      <div>
        <p className="mb-1 text-xs font-bold text-[#5e4bd1]">핵심 답변</p>
        <p className="whitespace-pre-wrap text-base font-semibold leading-7 sm:text-[18px]">{shortAnswer}</p>
        {extraAnswer ? (
          <details className="mt-2 text-sm leading-6">
            <summary className="cursor-pointer font-semibold text-[#5e4bd1]">답변 더 읽기</summary>
            <p className="mt-2 whitespace-pre-wrap">{extraAnswer}</p>
          </details>
        ) : null}
      </div>
      <div className="rounded-xl bg-[#f3f1ff] px-3 py-2">
        <p className="mb-1 text-xs font-bold text-[#5e4bd1]">지금 해볼 일</p>
        <p className="whitespace-pre-wrap leading-7">{action}</p>
      </div>
      <details className="rounded-lg border-t border-[#e4d9f1] pt-2 text-sm">
        <summary className="cursor-pointer font-semibold text-[#5e4bd1]">{general ? "상담 근거 보기" : "구매 분석 근거 보기"}</summary>
        <div className="mt-3 space-y-3 border-t border-[#e4e7f0] pt-3">
          <div>
            <p className="mb-1 text-xs font-bold text-slate-500">{general ? "일반 상담 참고 자료" : "구매 리포트에서 확인한 내용"}</p>
            <p className="whitespace-pre-wrap">{report}</p>
          </div>
          {userFacts && userFacts !== "별도 확인된 사실 없음" ? (
            <div>
              <p className="mb-1 text-xs font-bold text-slate-500">직접 알려주신 상황 · 목표</p>
              <p className="whitespace-pre-wrap">{userFacts}</p>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}

const MEMORY_KIND_LABELS = {
  user_fact: "현재 상황",
  life_event: "최근 변화",
  goal: "목표",
  preference: "내 기준",
} as const;

type CustomerMemoryKind = keyof typeof MEMORY_KIND_LABELS;

/**
 * Conservative suggestion only. The customer can change the category before
 * saving, and nothing becomes long-term memory until the customer confirms it.
 */
function inferCustomerMemoryKind(content: string): CustomerMemoryKind {
  if (/(?:입사|퇴사|이직했|이사했|결혼했|헤어졌|시작했|끝났|바뀌었|생겼|발생했)/u.test(content)) {
    return "life_event";
  }
  if (/(?:더\s*중요|중요하게|선호|좋아하는|싫어하는|우선으로|기준은)/u.test(content)) {
    return "preference";
  }
  if (/(?:목표|(?:하고|되고|늘리고|시작하고|바꾸고|이루고)\s*싶|(?:하려고|할\s*계획|할\s*예정|하고자))/u.test(content)) {
    return "goal";
  }
  return "user_fact";
}

export type AiConsultingPortfolioPreviewData = {
  state: AiConsultingPortfolioState;
  memories: AiConsultingUserMemory[];
};

export default function AiConsultingPortfolioClient({
  profileId,
  focusProductId,
  focusEdition,
  previewData,
  initialPortfolioState,
  reportEntryUnavailable = false,
  creditCheckoutAvailable = false,
}: {
  profileId: string;
  focusProductId?: string | null;
  focusEdition?: string | null;
  previewData?: AiConsultingPortfolioPreviewData;
  /** A server-verified, profile-scoped report entry; does not enable preview mode. */
  initialPortfolioState?: AiConsultingPortfolioState | null;
  reportEntryUnavailable?: boolean;
  freeAnalysisStatus?: ProfileFreeAnalysisStatus | null;
  /** Server-confirmed availability for this user, including Toss TEST allowlist. */
  creditCheckoutAvailable?: boolean;
}) {
  const [portfolio, setPortfolio] = useState<AiConsultingPortfolioState | null>(previewData?.state ?? initialPortfolioState ?? null);
  const [memories, setMemories] = useState<AiConsultingUserMemory[]>(previewData?.memories ?? []);
  const [question, setQuestion] = useState("");
  const [draftHydratedFor, setDraftHydratedFor] = useState<string | null>(null);
  // Keep unsent questions only in this browser tab, separate for each profile.
  const draftKey = `unboda:ai-consulting:draft:${profileId}`;
  const [routingNotice, setRoutingNotice] = useState<RoutingNotice | null>(null);
  const [isLoading, setIsLoading] = useState(!previewData && !initialPortfolioState);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [savingMemoryMessageId, setSavingMemoryMessageId] = useState<string | null>(null);
  const [memoryDraftMessageId, setMemoryDraftMessageId] = useState<string | null>(null);
  const [memoryDraftContent, setMemoryDraftContent] = useState("");
  const [memoryDraftKind, setMemoryDraftKind] = useState<CustomerMemoryKind>("user_fact");
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState("");
  const [isSavingMemoryEdit, setIsSavingMemoryEdit] = useState(false);
  const [showAllAnalyses, setShowAllAnalyses] = useState(false);
  const [analysisSearch, setAnalysisSearch] = useState("");
  const [visibleAnalysisLimit, setVisibleAnalysisLimit] = useState(8);
  const [showMemories, setShowMemories] = useState(false);
  const [managementPanel, setManagementPanel] = useState<"owned" | "memory" | "guide" | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastChatPosition = useRef<{ profileId: string; latestId: string | undefined } | null>(null);
  const latestChatId = portfolio?.messages[portfolio.messages.length - 1]?.id;
  const initialMessageCount = portfolio?.messages.length ?? 0;
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el || isLoading) return;
    const previous = lastChatPosition.current;
    const firstView = previous?.profileId !== profileId;
    const newReply = previous?.latestId !== latestChatId;
    lastChatPosition.current = { profileId, latestId: latestChatId };
    // Repeated hydration effects must never push the initial greeting offscreen.
    if (!isSending && initialMessageCount <= 2) {
      el.scrollTop = 0;
    } else if (firstView || newReply || isSending) {
      el.scrollTop = el.scrollHeight;
    }
  }, [profileId, latestChatId, initialMessageCount, isSending, isLoading]);
  useEffect(() => {
    if (!managementPanel) return;
    const ids = { owned: "owned-analysis-selector", memory: "undam-memory", guide: "undam-guide" } as const;
    document.getElementById(ids[managementPanel])?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [managementPanel]);
  const [latestAnswerSource, setLatestAnswerSource] = useState<AiConsultingPortfolioSource | null>(null);
  const [olderMessages, setOlderMessages] = useState<AiConsultingPortfolioMessage[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(previewData?.state.hasOlderMessages ?? initialPortfolioState?.hasOlderMessages ?? false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const portfolioRequestSeq = useRef(0);
  const isPreview = Boolean(previewData);
  const creditCheckoutEnabled = creditCheckoutAvailable;
  // Free analysis is optional context, not an access requirement.

  useEffect(() => {
    if (isPreview) return;
    try {
      setQuestion((window.sessionStorage.getItem(draftKey) ?? "").slice(0, 300));
    } catch {
      // Private browsing and restricted browsers may block session storage.
      setQuestion("");
    }
    setDraftHydratedFor(draftKey);
  }, [draftKey, isPreview]);

  useEffect(() => {
    if (isPreview || draftHydratedFor !== draftKey) return;
    try {
      if (question) window.sessionStorage.setItem(draftKey, question);
      else window.sessionStorage.removeItem(draftKey);
    } catch {
      // The composer remains usable even if tab-only draft storage is blocked.
    }
  }, [draftHydratedFor, draftKey, isPreview, question]);

  const loadPortfolio = useCallback(async () => {
    const requestSeq = ++portfolioRequestSeq.current;
    if (previewData) {
      setPortfolio(previewData.state);
      setHasOlderMessages(previewData.state.hasOlderMessages ?? false);
      return;
    }
    const portfolioParams = new URLSearchParams({ profileId });
    if (focusProductId && focusEdition) {
      portfolioParams.set("includeProductId", focusProductId);
      portfolioParams.set("includeEdition", focusEdition);
    }
    const response = await fetch(
      `/api/ai-consulting/portfolio?${portfolioParams.toString()}`,
      { cache: "no-store" },
    );
    const body = (await response.json()) as AiConsultingPortfolioState & { error?: string };
    if (!response.ok) throw new Error(body.error ?? "통합 AI 상담을 불러오지 못했습니다.");
    if (requestSeq !== portfolioRequestSeq.current) return;
    setPortfolio(body);
    setOlderMessages([]);
    setHasOlderMessages(body.hasOlderMessages ?? false);
  }, [focusEdition, focusProductId, previewData, profileId]);

  const loadMemories = useCallback(async () => {
    if (previewData) {
      setMemories(previewData.memories);
      return;
    }
    const response = await fetch(
      `/api/ai-consulting/memories?profileId=${encodeURIComponent(profileId)}`,
      { cache: "no-store" },
    );
    const body = (await response.json()) as { memories?: AiConsultingUserMemory[]; error?: string };
    if (!response.ok) throw new Error(body.error ?? "AI 기억을 불러오지 못했습니다.");
    setMemories(body.memories ?? []);
  }, [previewData, profileId]);

  useEffect(() => {
    if (previewData) {
      setPortfolio(previewData.state);
      setHasOlderMessages(previewData.state.hasOlderMessages ?? false);
      setMemories(previewData.memories);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    if (initialPortfolioState) {
      setPortfolio(initialPortfolioState);
      setHasOlderMessages(initialPortfolioState.hasOlderMessages ?? false);
      setIsLoading(false);
      void loadMemories().catch((reason) => {
        if (!cancelled) setMemoryError(reason instanceof Error ? reason.message : "AI 기억을 불러오지 못했습니다.");
      });
      return () => { cancelled = true; };
    }
    setIsLoading(true);
    Promise.all([loadPortfolio(), loadMemories()])
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "통합 AI 상담을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialPortfolioState, loadMemories, loadPortfolio, previewData]);

  const focusAnalysis = useMemo(() => {
    if (!portfolio || !focusProductId || !focusEdition) return null;
    return portfolio.analyses.find(
      (analysis) =>
        analysis.productId === focusProductId
        && analysis.analysisEditionKey === focusEdition,
    ) ?? null;
  }, [focusEdition, focusProductId, portfolio]);

  const suggestedQuestions = useMemo(() => {
    if (!portfolio) return [];
    const suggestions: string[] = [];
    for (const analysis of portfolio.analyses.slice(0, 8)) {
      const question = unifiedSuggestedQuestion(analysis);
      if (!suggestions.includes(question)) suggestions.push(question);
      if (suggestions.length >= 3) break;
    }
    return suggestions;
  }, [portfolio]);

  const ownedAnalyses = isPreview ? portfolio?.analyses ?? [] : portfolio?.ownedAnalyses ?? [];
  const filteredAnalyses = useMemo(() => {
    const search = analysisSearch.trim().toLocaleLowerCase("ko-KR");
    if (!search) return ownedAnalyses;
    return ownedAnalyses.filter((analysis) =>
      `${analysis.productTitle} ${analysis.editionLabel} ${analysis.scopeLabel}`.toLocaleLowerCase("ko-KR").includes(search),
    );
  }, [analysisSearch, ownedAnalyses]);

  const visibleAnalyses = useMemo(() => showAllAnalyses
    ? filteredAnalyses.slice(0, visibleAnalysisLimit)
    : ownedAnalyses.slice(0, 3), [filteredAnalyses, ownedAnalyses, showAllAnalyses, visibleAnalysisLimit]);
  const hiddenAnalysisCount = Math.max(ownedAnalyses.length - 3, 0);
  const allLoadedMessages = useMemo(() => [...olderMessages, ...(portfolio?.messages ?? [])], [olderMessages, portfolio]);
  const previousAnswer = useMemo(() => [...(portfolio?.messages ?? [])].reverse().find((message) => message.role === "assistant") ?? null, [portfolio]);
  const automaticSource = latestAnswerSource ?? (previousAnswer ? {
    productId: previousAnswer.sourceProductId,
    analysisEditionKey: previousAnswer.sourceEditionKey,
    productTitle: previousAnswer.sourceTitle,
    editionLabel: previousAnswer.sourceEditionLabel,
  } : focusAnalysis);
  // The report list is informational only. Chat history is always unified;
  // each answer still names its actual owned source below the message.
  const visibleChatMessages = allLoadedMessages;

  const latestActivity = useMemo(
    () => formatRecentActivity(portfolio?.messages[portfolio.messages.length - 1]?.createdAt),
    [portfolio],
  );

  const rememberedSourceMessageIds = useMemo(
    () => new Set(memories.map((memory) => memory.sourceMessageId).filter((value): value is string => Boolean(value))),
    [memories],
  );

  const creditContext = portfolio?.analyses.find((analysis) => analysis.profileInputVersion === "current") ?? GENERAL_CONSULTING_SOURCE;
  const creditCheckoutHref = creditContext
    ? `/ai-consulting/credits?${new URLSearchParams({
        profileId,
        productId: creditContext.productId,
        edition: creditContext.analysisEditionKey,
      }).toString()}`
    : null;
  const creditPurchaseHref = creditCheckoutHref ? `${creditCheckoutHref}#question-bundles` : null;

  async function loadOlderMessages() {
    const oldest = allLoadedMessages[0];
    if (isPreview || !oldest || !hasOlderMessages || isLoadingOlder) return;
    setIsLoadingOlder(true);
    setError(null);
    const requestSeq = portfolioRequestSeq.current;
    try {
      const params = new URLSearchParams({ profileId, before: oldest.createdAt, beforeId: oldest.id });
      if (focusProductId && focusEdition) {
        params.set("includeProductId", focusProductId);
        params.set("includeEdition", focusEdition);
      }
      const response = await fetch(`/api/ai-consulting/portfolio?${params.toString()}`, { cache: "no-store" });
      const body = await response.json() as AiConsultingPortfolioState & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "이전 상담을 불러오지 못했습니다.");
      if (requestSeq !== portfolioRequestSeq.current) return;
      setOlderMessages((existing) => {
        const known = new Set([...existing, ...(portfolio?.messages ?? [])].map((message) => message.id));
        return [...body.messages.filter((message) => !known.has(message.id)), ...existing];
      });
      setHasOlderMessages(body.hasOlderMessages ?? false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "이전 상담을 불러오지 못했습니다.");
    } finally {
      setIsLoadingOlder(false);
    }
  }

  async function sendQuestion(content: string) {
    // The client never posts without credits. The server independently verifies
    // the balance and retains the authoritative charge-safe reservation path.
    if (isPreview || !portfolio || portfolio.questionsRemaining <= 0 || !content.trim() || content.trim().length < 2 || content.trim().length > 300) return;

    setIsSending(true);
    setError(null);
    setRoutingNotice(null);
    // A report entry and the most recent reply provide conversational context,
    // not a customer-selected restriction. New topics route over all owned reports.
    const sourcePreference = automaticSource;

    try {
      const response = await fetch("/api/ai-consulting/portfolio/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          requestId: crypto.randomUUID(),
          question: content.trim(),
          preferredProductId: sourcePreference?.productId ?? null,
          preferredEditionKey: sourcePreference?.analysisEditionKey ?? null,
          preferContinuation: true,
        }),
      });

      const body = (await response.json()) as AiConsultingPortfolioQuestionResult & { error?: string };
      if (!response.ok && body.state !== "credit_required") {
        throw new Error(body.error ?? "AI 상담 답변을 완료하지 못했습니다.");
      }

      if (body.state === "answered") {
        setQuestion("");
        setLatestAnswerSource(body.source);
        await loadPortfolio();
        return;
      }

      if (body.state === "outside_portfolio") {
        setRoutingNotice({ kind: "outside", message: body.message });
        return;
      }

      if (body.state === "non_chargeable") {
        setRoutingNotice({ kind: "info", message: body.message });
        return;
      }

      if (body.state === "credit_required") {
        setRoutingNotice({ kind: "info", message: "남은 AI 질문권이 없습니다. 질문권을 추가하면 상담을 계속할 수 있습니다." });
        await loadPortfolio();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI 상담 답변을 완료하지 못했습니다.");
    } finally {
      setIsSending(false);
    }
  }

  async function submitQuestion(event: FormEvent) {
    event.preventDefault();
    if (!portfolio || portfolio.questionsRemaining <= 0) return;
    await sendQuestion(question);
  }

  async function saveMemory(message: AiConsultingPortfolioMessage) {
    if (isPreview || message.role !== "user" || memoryDraftMessageId !== message.id) return;
    // The customer authors the memory. A conservative client-side classifier
    // categorizes clearly stated goals; uncertain notes remain user facts.
    const content = memoryDraftContent.trim();
    if (!content || content.length > 300) return;

    setSavingMemoryMessageId(message.id);
    setMemoryError(null);
    try {
      const response = await fetch("/api/ai-consulting/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          threadId: message.threadId,
          sourceMessageId: message.id,
          writeRequestId: crypto.randomUUID(),
          kind: memoryDraftKind,
          content,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "AI 기억을 저장하지 못했습니다.");
      await loadMemories();
      setMemoryDraftMessageId(null);
      setMemoryDraftContent("");
      setMemoryDraftKind("user_fact");
    } catch (reason) {
      setMemoryError(reason instanceof Error ? reason.message : "AI 기억을 저장하지 못했습니다.");
    } finally {
      setSavingMemoryMessageId(null);
    }
  }

  async function saveEditedMemory() {
    if (isPreview || !editingMemoryId || !editingMemoryContent.trim() || isSavingMemoryEdit) return;
    setIsSavingMemoryEdit(true);
    setMemoryError(null);
    try {
      const response = await fetch("/api/ai-consulting/memories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          memoryId: editingMemoryId,
          writeRequestId: crypto.randomUUID(),
          content: editingMemoryContent.trim(),
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "AI 기억을 수정하지 못했습니다.");
      setEditingMemoryId(null);
      setEditingMemoryContent("");
      await loadMemories();
    } catch (reason) {
      setMemoryError(reason instanceof Error ? reason.message : "AI 기억을 수정하지 못했습니다.");
    } finally {
      setIsSavingMemoryEdit(false);
    }
  }

  async function deleteMemory(memory: AiConsultingUserMemory) {
    if (isPreview) return;
    if (!window.confirm("이 내용을 AI 기억에서 삭제할까요? 삭제 후에는 다음 상담 문맥에 사용되지 않습니다.")) return;

    setDeletingMemoryId(memory.id);
    setMemoryError(null);
    try {
      const response = await fetch("/api/ai-consulting/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, memoryId: memory.id }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "AI 기억을 삭제하지 못했습니다.");
      await loadMemories();
    } catch (reason) {
      setMemoryError(reason instanceof Error ? reason.message : "AI 기억을 삭제하지 못했습니다.");
    } finally {
      setDeletingMemoryId(null);
    }
  }

  // The library is rendered even when there are no current-input reports to
  // route questions through. It is never used directly as an AI answer source.
  const ownedAnalysisLibrary = portfolio && ownedAnalyses.length > 0 ? (
<section id="owned-analysis-selector" hidden={managementPanel !== "owned"} aria-label="구매한 분석 보기" className="mt-3 scroll-mt-6 rounded-2xl border border-[#e1d3f3] bg-white p-4">
              <div className="mt-4">
              <div className={portfolio.questionsRemaining > 0 ? "grid gap-5 lg:grid-cols-[1.05fr_0.95fr]" : "grid gap-5"}>
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">내 보유 분석</p>
                  <h2 className="mt-2 text-xl font-black">구매한 분석 보기</h2>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">
                    이 목록은 구매한 분석을 확인하는 곳이에요. 상담할 분석은 질문 내용에 따라 AI가 자동으로 찾습니다. 질문권은 모든 보유 분석에서 함께 사용해요.
                  </p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold tracking-[0.1em] text-slate-500">
                        {showAllAnalyses ? `전체 보유 분석 ${filteredAnalyses.length}개` : `최근 구매한 분석 ${Math.min(3, ownedAnalyses.length)}개`}
                      </p>
                      {hiddenAnalysisCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setShowAllAnalyses((value) => !value)}
                          className="shrink-0 text-xs font-bold text-[#5e4bd1] underline decoration-[#c8c0ff] underline-offset-4"
                          aria-expanded={showAllAnalyses}
                        >
                          {showAllAnalyses ? "접기" : `전체 보기 · +${hiddenAnalysisCount}개`}
                        </button>
                      ) : null}
                    </div>
                    {showAllAnalyses ? <label className="mt-3 block text-sm font-semibold text-slate-700">분석 검색<input type="search" value={analysisSearch} onChange={(event) => { setAnalysisSearch(event.target.value); setVisibleAnalysisLimit(8); }} placeholder="리포트 이름이나 연도 검색" className="mt-2 w-full rounded-xl border border-[#dce1ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#7866de]" /></label> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {visibleAnalyses.map((analysis) => (
                        <span
                          key={`${analysis.productId}|${analysis.analysisEditionKey}`}
                          className="rounded-full border border-[#dce1ef] bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                        >
                          {analysis.productTitle} · {analysis.editionLabel}
                          {analysis.profileInputVersion !== "current" ? " · 이전 정보 기준" : ""}
                        </span>
                      ))}
                    </div>
                    {showAllAnalyses && filteredAnalyses.length === 0 ? <p className="mt-3 text-sm text-slate-500">해당하는 분석이 없습니다.</p> : null}
                    {showAllAnalyses && visibleAnalysisLimit < filteredAnalyses.length ? <button type="button" onClick={() => setVisibleAnalysisLimit((value) => value + 8)} className="mt-3 w-full rounded-xl border border-[#dce1ef] bg-white px-4 py-3 text-sm font-bold text-[#5e4bd1]">분석 8개 더 보기</button> : null}
                  </div>

                  <p className="mt-4 border-t border-[#e4e7f0] pt-3 text-xs leading-5 text-slate-500">답변 완료 시 질문권 1회 차감 · 답할 수 없는 질문은 차감하지 않아요.</p>
                </div>

                {portfolio.questionsRemaining > 0 ? <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-slate-500">추천 질문 · 자동 연결</p>
                  <div className="mt-3 space-y-2">
                    {suggestedQuestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setQuestion(suggestion)}
                        className="w-full rounded-2xl border border-[#dce1ef] bg-white px-4 py-3 text-left text-sm font-semibold leading-6 text-slate-700 transition hover:border-[#aaa0f4] hover:bg-[#faf9ff]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div> : null}
              </div>
              </div>
            </section>
  ) : null;

  const managementMenu = (
    <nav id="undam-management" aria-label="AI 상담 관리" className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-[#e1d3f3] bg-white p-2 shadow-sm sm:gap-3 sm:p-3">
      {ownedAnalyses.length > 0 ? (
        <button type="button" aria-expanded={managementPanel === "owned"} aria-controls="owned-analysis-selector" onClick={() => setManagementPanel((value) => value === "owned" ? null : "owned")} className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[#6841aa] hover:bg-[#f5effb] aria-expanded:bg-[#eee2ff] sm:px-3">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7m-7 4h7"/></svg><span className="text-sm font-bold sm:text-base">구매한 분석</span><span className="text-xs text-slate-600">{ownedAnalyses.length}개 보유</span>
        </button>
      ) : <Link href="/purchased-analyses" className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[#6841aa] hover:bg-[#f5effb]"><span className="text-sm font-bold sm:text-base">구매한 분석</span><span className="text-xs text-slate-600">보관함 보기</span></Link>}
      <button type="button" disabled={!portfolio} aria-expanded={managementPanel === "memory"} aria-controls={portfolio ? "undam-memory" : undefined} onClick={() => { setManagementPanel((value) => value === "memory" ? null : "memory"); setShowMemories(true); }} className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[#6841aa] hover:bg-[#f5effb] aria-expanded:bg-[#eee2ff] disabled:opacity-50 sm:px-3">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg><span className="text-sm font-bold sm:text-base">기억 관리</span><span className="text-xs text-slate-600">{memories.length}개 저장</span>
      </button>
      <button type="button" aria-expanded={managementPanel === "guide"} aria-controls="undam-guide" onClick={() => setManagementPanel((value) => value === "guide" ? null : "guide")} className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[#6841aa] hover:bg-[#f5effb] aria-expanded:bg-[#eee2ff] sm:px-3">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg><span className="text-sm font-bold sm:text-base">이용 안내</span><span className="text-xs text-slate-600">이용 방법</span>
      </button>
    </nav>
  );

  return (
    <main className="min-h-screen bg-[#f5f0fb] px-3 py-3 text-[#25183d] sm:px-5 lg:px-6 lg:py-4">
      <div className="mx-auto w-full max-w-[1360px]">


        {isPreview ? (
          <div className="mt-4 rounded-2xl border border-[#d8d3ff] bg-[#f3f1ff] px-4 py-3 text-sm leading-6 text-[#5e4bd1]">
            운영자 통합 상담 미리보기입니다. 질문 전송·질문권 차감·AI 기억 저장은 동작하지 않습니다.
          </div>
        ) : null}

        {!isLoading && focusAnalysis && focusAnalysis.profileInputVersion !== "current" ? (
          <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
            <p className="font-black">이전 출생정보 기준 상담 기록</p>
            <p className="mt-1">
              이전 출생정보의 리포트와 상담 기록은 보관됩니다. 새 질문에는 현재 프로필의 실제 사주를 사용하며 이전 출생정보의 리포트는 섞지 않습니다.
            </p>
            <p className="mt-2 font-semibold">남아 있는 공용 AI 질문권은 그대로 사용할 수 있습니다.</p>
          </section>
        ) : null}

        {!isLoading && portfolio && (portfolio.previousAnalysesExcluded ?? 0) > 0 && !focusAnalysis ? (
          <section className="mt-4 rounded-2xl border border-[#e4d5f6] bg-white px-5 py-4 text-sm leading-6 text-slate-700 shadow-[0_10px_26px_rgba(104,67,168,.08)]">
            <p className="font-bold text-[#11162d]">출생정보 변경 전 리포트 {(portfolio.previousAnalysesExcluded ?? 0)}개는 자동 상담 범위에서 제외되어 있습니다.</p>
            <p className="mt-1">이전 리포트와 상담 기록은 그대로 보관됩니다. 보유 분석 목록에는 모두 표시하며, 새 상담은 현재 출생정보에 일치하는 사주를 기준으로 진행합니다.</p>
          </section>
        ) : null}

        <header className="relative isolate overflow-hidden rounded-[1.5rem] border border-[#ded0f5] bg-[radial-gradient(ellipse_at_86%_20%,#e2d0fa,transparent_65%),linear-gradient(120deg,#fcf9ff,#f0e5fb)] px-4 py-4 shadow-sm sm:px-7 lg:min-h-[248px] lg:px-9 lg:py-7">
          <div className="relative z-10 min-w-0 lg:w-[62%] xl:w-[60%]">
            <p className="text-xs font-black tracking-[0.16em] text-[#7941d0]">UNBODA AI CONSULTING</p>
            <h1 className="mt-2 break-keep text-2xl font-black tracking-[-0.045em] sm:text-3xl xl:text-[clamp(1.9rem,2.6vw,2.65rem)]">운담 선생님과 AI 상담하기</h1>
            <p className="mt-2 text-base leading-7 text-[#58476d] sm:text-lg">등록하신 실제 사주를 바탕으로 일상과 인생의 궁금한 점을 상담해 드립니다.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#d9c5f5] bg-white/90 px-3 py-2 text-base shadow-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold"><svg aria-hidden="true" className="h-5 w-5 text-[#7139ce]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6z"/><path d="M13 8v2m0 4v2"/></svg>공용 질문권 <strong className="text-lg text-[#6734c5]" aria-live="polite">{portfolio ? portfolio.questionsRemaining : "—"}회</strong></span>
                {creditPurchaseHref && !isPreview ? (
                  <Link href={creditPurchaseHref} className="rounded-full bg-[#eee2ff] px-3 py-2 text-base font-bold text-[#6333b2] hover:bg-[#e5d2fa]">
                    {creditCheckoutEnabled ? "질문권 구매하기 →" : "질문권 상품 안내 보기 →"}
                  </Link>
                ) : null}
              </div>
              <a href={ownedAnalyses.length ? "#owned-analysis-selector" : "/purchased-analyses"} onClick={(event) => { if (ownedAnalyses.length) { event.preventDefault(); setManagementPanel("owned"); document.getElementById("undam-management")?.scrollIntoView({ block: "nearest" }); } }} className="inline-flex items-center gap-2 rounded-full border border-[#d9c5f5] bg-white/90 px-4 py-3 text-base font-bold text-[#6333b2] shadow-sm"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7m-7 4h7"/></svg>구매한 분석 보기 →</a>
            </div>
            {!creditCheckoutEnabled && !isPreview ? <p className="mt-2 text-xs font-medium text-[#675779]">현재 질문권 결제 준비 중</p> : null}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 hidden h-full aspect-[2.38] lg:block" data-undam-banner="reference">
            <Image src="/teachers/undam-consulting-banner.webp" alt="산과 소나무를 배경으로 한 운담 선생님 · 사주·운세 전문 AI 상담 선생님" fill sizes="600px" className="object-cover object-[right_38%]" style={{ maskImage: "linear-gradient(to right, transparent 0%, black 32%), linear-gradient(to bottom, transparent 0%, black 8%)", maskComposite: "intersect" }} priority unoptimized />
          </div>
          <div className="mt-3 flex items-center gap-3 lg:hidden"><Image src="/teachers/undam-consulting.webp" alt="운담 선생님 AI 캐릭터" width={52} height={52} className="h-12 w-12 rounded-full object-cover object-top" /><span className="text-sm font-bold text-[#6841aa]">운담 선생님 · AI 상담</span></div>
        </header>


        {isLoading ? (
          <section className="mt-5 rounded-[1.75rem] border border-[#dce1ef] bg-white p-7 text-center shadow-sm">
            보유 분석과 상담 기록을 확인하고 있어요.
          </section>
        ) : null}

        {!isLoading && portfolio ? (
          <>
            <section data-section="portfolio-conversation" className="relative mt-3 flex h-[min(540px,70dvh)] min-h-[320px] min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-[#ded0f5] bg-white p-3 shadow-[0_6px_20px_rgba(76,46,130,0.08)] sm:p-5 lg:h-[calc(100dvh-18.5rem)] lg:min-h-[21rem]">
              <h2 className="sr-only">통합 AI 상담</h2>
              {reportEntryUnavailable ? <p role="status" className="shrink-0 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">이전에 보시던 리포트는 현재 상담에서 참고할 수 없습니다. 일반 상담은 계속 이용할 수 있습니다.</p> : null}


              <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain [overflow-anchor:none] px-1 py-2 sm:px-3" aria-label="상담 대화 기록">
              {routingNotice ? (
                <div className={routingNotice.kind === "outside"
                  ? "mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900"
                  : "mb-4 rounded-2xl border border-[#d8d3ff] bg-[#f3f1ff] px-4 py-4 text-sm leading-6 text-[#40359a]"}>
                  <p>{routingNotice.message}</p>
                  {routingNotice.kind === "outside" ? (
                    <Link href="/deep-analysis" className="mt-3 inline-flex font-bold underline underline-offset-4">
                      관련 심층 분석 둘러보기
                    </Link>
                  ) : null}
                </div>
              ) : null}

                <div className="flex items-start gap-3">
                  <Image src="/teachers/undam-consulting.webp" alt="" width={56} height={56} className="h-12 w-12 shrink-0 rounded-full object-cover object-top sm:h-14 sm:w-14" />
                  <div className="max-w-[85%]"><p className="mb-1 text-base font-bold">운담 선생님</p><p className="w-fit rounded-2xl rounded-tl-sm bg-[#f1eafa] px-4 py-2.5 text-base leading-7 sm:text-[17px]">안녕하세요. 운담 선생님입니다.<br/>오늘은 어떤 고민이 있으신가요?</p></div>
                </div>
                {hasOlderMessages ? <button type="button" onClick={() => void loadOlderMessages()} disabled={isLoadingOlder} className="w-full rounded-xl border border-[#dce1ef] bg-white px-4 py-3 text-sm font-semibold text-[#5e4bd1] disabled:opacity-50">{isLoadingOlder ? "이전 상담 불러오는 중..." : "이전 상담 더 보기"}</button> : null}
                {!isSending && visibleChatMessages.length === 0 && (portfolio.questionsRemaining > 0 || hasOlderMessages) ? (
                  <div className="rounded-[1.5rem] border border-dashed border-[#cfd5e6] bg-white p-7 text-center text-sm leading-7 text-slate-600">
                    {hasOlderMessages
                      ? "이전 상담 더 보기에서 오래된 대화를 확인할 수 있어요."
                      : "리포트 구매 없이도 내 사주를 바탕으로 궁금한 내용을 질문할 수 있어요."}
                  </div>
                ) : null}

                {visibleChatMessages.map((message) => {
                  const policy = message.role === "user" ? policyMessage(message.scopeDecision) : null;
                  const remembered = message.role === "user" && rememberedSourceMessageIds.has(message.id);
                  const savingMemory = message.role === "user" && savingMemoryMessageId === message.id;

                  return (
                    <div key={message.id} className={message.role === "assistant" ? "relative min-w-0 space-y-1 pl-14 sm:pl-[68px]" : "relative min-w-0 space-y-1 pr-14 sm:pr-[68px]"}>
                      {message.role === "assistant" ? <div className="flex items-center gap-2"><Image src="/teachers/undam-consulting.webp" alt="" width={56} height={56} className="absolute left-0 top-0 h-12 w-12 rounded-full object-cover object-top sm:h-14 sm:w-14" /><span className="text-base font-bold">운담 선생님</span></div> : <span data-user-avatar="true" aria-hidden="true" className="absolute right-0 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#e8d7fc] text-[#7844d7] sm:h-14 sm:w-14"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z"/></svg></span>}
                      <div className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                        <span className="rounded-full bg-[#eef0f6] px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          {message.sourceTitle} · {message.sourceEditionLabel}
                        </span>
                      </div>
                      <div
                        className={message.role === "user"
                          ? "ml-auto w-fit max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-[#e8d9fa] px-4 py-2.5 text-base leading-7 text-[#302045] sm:text-[17px]"
                          : "w-fit max-w-[94%] break-words whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-[#f3edf9] px-4 py-3 text-base leading-7 text-slate-800 sm:min-w-[min(100%,34rem)] sm:max-w-[82%] sm:text-[17px]"}
                      >
                        {message.role === "assistant"
                          ? <ConsultingAnswer content={message.content} general={isGeneralConsultingSource(message.sourceProductId, message.sourceEditionKey)} />
                          : message.content}
                      </div>
                      {message.role === "user" ? (
                        <div className="ml-auto w-full max-w-[88%]">
                          {remembered ? (
                            <p className="text-right text-xs font-semibold text-slate-500">✓ 내가 저장한 기억</p>
                          ) : isPreview ? (
                            <p className="text-right text-xs font-semibold text-slate-400">기억 저장 미리보기</p>
                          ) : memoryDraftMessageId === message.id ? (
                            <div className="space-y-3 rounded-2xl border border-[#d8d3ff] bg-white p-4">
                              <div>
                                <p className="text-sm font-bold text-slate-800">다음 상담에서도 기억할까요?</p>
                                <p className="mt-1 text-xs leading-5 text-slate-600">내가 허용한 내용만 장기 기억으로 남습니다. 아래 문장과 분류를 직접 바꾼 뒤 저장할 수 있어요.</p>
                              </div>
                              <div className="flex flex-wrap gap-2" aria-label="기억 분류">
                                {(Object.entries(MEMORY_KIND_LABELS) as Array<[CustomerMemoryKind, string]>).map(([kind, label]) => (
                                  <button key={kind} type="button" onClick={() => setMemoryDraftKind(kind)} className={memoryDraftKind === kind ? "rounded-full bg-[#6f5ce7] px-3 py-1.5 text-xs font-bold text-white" : "rounded-full border border-[#dce1ef] bg-[#f7f8fc] px-3 py-1.5 text-xs font-semibold text-slate-600"}>
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <label className="block text-xs font-bold text-slate-700">기억할 내용
                                <textarea
                                  value={memoryDraftContent}
                                  onChange={(event) => setMemoryDraftContent(event.target.value.slice(0, 300))}
                                  maxLength={300}
                                  rows={2}
                                  className="mt-1 block w-full rounded-xl border border-[#d8d3ff] bg-white px-3 py-2 text-sm font-normal leading-6"
                                />
                              </label>
                              <div className="flex flex-wrap justify-end gap-2">
                                <button type="button" onClick={() => { setMemoryDraftMessageId(null); setMemoryDraftContent(""); setMemoryDraftKind("user_fact"); }} disabled={savingMemory} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600">이번만 사용</button>
                                <button type="button" onClick={() => void saveMemory(message)} disabled={savingMemory || !memoryDraftContent.trim()} className="rounded-xl bg-[#6f5ce7] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{savingMemory ? "저장 중..." : "기억하기"}</button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setMemoryDraftMessageId(message.id);
                                  setMemoryDraftContent(message.content.slice(0, 300));
                                  setMemoryDraftKind(inferCustomerMemoryKind(message.content));
                                }}
                                className="text-xs font-semibold text-slate-600 underline underline-offset-4"
                              >
                                다음 상담에서도 기억하기
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                      {policy ? (
                        <div className="max-w-[94%] rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                          {policy}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {isSending ? (
                  <div
                    role="status"
                    aria-live="polite"
                    aria-label="AI 답변 준비 중"
                    className="flex max-w-[94%] items-center gap-3 rounded-3xl rounded-bl-lg border border-[#d8d3ff] bg-white px-5 py-4 text-[15px] font-semibold text-slate-700 shadow-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#d7d1fb] border-t-[#6f5ce7]"
                    />
                    <span>운담 선생님이 답변을 정리하고 있어요</span>
                  </div>
                ) : null}
              </div>
              <form
                  data-ai-composer="portfolio-sticky"
                  onSubmit={submitQuestion}
                  className="relative z-20 mt-2 shrink-0 rounded-[1.25rem] border border-[#d8c5f6] bg-white px-2 py-2 shadow-[0_4px_20px_rgba(70,35,130,0.08)]"
                >
                  <label htmlFor="portfolio-question" className="sr-only">무엇이 궁금하세요?</label>
                  <div className="flex min-w-0 items-center gap-2">
                  <textarea
                    id="portfolio-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value.slice(0, 300))}
                    placeholder="운담 선생님에게 궁금한 내용을 입력해 주세요."
                    rows={1}
                    disabled={isSending}
                    className="min-h-12 min-w-0 flex-1 resize-none rounded-xl bg-white px-3 py-2.5 text-base leading-7 text-slate-800 outline-none ring-[#6f5ce7] focus:ring-1 disabled:opacity-60"
                  />
                    {portfolio.questionsRemaining > 0 ? (
                      <button
                        type="submit"
                        disabled={isPreview || isSending || question.trim().length < 2}
                        aria-busy={isSending}
                        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#713bd6] px-5 py-2 text-base font-bold text-white transition hover:bg-[#5f4fd2] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSending ? (
                          <>
                            <span
                              aria-hidden="true"
                              className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
                            />
                            <span>답변 준비 중...</span>
                          </>
                        ) : isPreview ? "미리보기" : <><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M22 2 9 15l-6-3 19-10ZM22 2l-3 19-7-7 10-12Z"/></svg><span>상담하기</span></>}
                      </button>
                    ) : creditPurchaseHref && !isPreview ? (
                      <Link href={creditPurchaseHref} className="inline-flex min-h-12 max-w-[48%] shrink-0 items-center justify-center rounded-full bg-[#713bd6] px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-[#5f4fd2] sm:max-w-none sm:px-4 sm:text-sm">
                        {creditCheckoutEnabled ? "질문권 구매 후 상담하기 →" : "질문권 상품 안내 보기 →"}
                      </Link>
                    ) : (
                      <button type="button" disabled className="rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white opacity-40">미리보기 · 전송 불가</button>
                    )}
                  </div>
                  <div className="px-3 pt-1 text-xs">
                    <span className="text-xs leading-5 text-slate-500">
                      {isPreview
                        ? "미리보기에서는 질문이 전송되지 않습니다."
                        : portfolio.questionsRemaining > 0
                          ? `${question.length}/300 · 답변 완료 시 질문권 1회 차감`
                          : `${question.length}/300 · 질문권 0회 · 질문은 이 탭에 임시 보관되며 지금은 전송되지 않아요.`}
                    </span>
                  </div>
                </form>
            </section>

            {managementMenu}
            {ownedAnalysisLibrary}

            <section id="undam-memory" hidden={managementPanel !== "memory"} aria-label="기억 관리" className="mt-3 rounded-2xl border border-[#e1d3f3] bg-white p-4">
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">내 상황 · 목표</p>
                  <h2 className="mt-2 text-base font-bold">AI가 이어서 참고하는 내 현재 상황</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">내가 직접 허용해 저장한 내용만 다음 상담에서 참고합니다. AI가 상담 내용을 마음대로 장기 기억으로 만들지 않아요.</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href="/my-unboda" aria-label="나의 운보다 기록 보기" className="rounded-full border border-[#d8d3ff] bg-white px-4 py-2 text-xs font-semibold text-[#5e4bd1]">나의 운보다 기록</Link>
                  <button type="button" onClick={() => setShowMemories((value) => !value)} aria-expanded={showMemories} className="rounded-full bg-[#eef0f6] px-4 py-2 text-xs font-semibold text-[#5e4bd1]">{memories.length}개 저장됨 · {showMemories ? "접기" : "관리하기"}</button>
                </div>
              </div>

              {memories.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {memories.slice(0, 4).map((memory) => (
                    <div key={`snapshot-${memory.id}`} className="rounded-2xl bg-[#f7f8fc] px-4 py-3">
                      <p className="text-xs font-bold text-[#5e4bd1]">{MEMORY_KIND_LABELS[memory.kind ?? "user_fact"]}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-800">{memory.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm leading-6 text-slate-600">
                  아직 저장된 내 상황이 없어요. 상담에서 <strong className="font-semibold text-slate-800">다음 상담에서도 기억하기</strong>를 눌러 직접 선택해 주세요.
                </div>
              )}

              {showMemories && memories.length > 0 ? (
                <div className="mt-4 space-y-2 border-t border-[#e4e7f0] pt-4">
                  {memories.map((memory) => (
                    <div key={memory.id} className="flex flex-col gap-3 rounded-2xl bg-[#f7f8fc] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                      {editingMemoryId === memory.id ? (
                        <div className="w-full space-y-2">
                          <p className="text-xs font-bold text-[#5e4bd1]">{MEMORY_KIND_LABELS[memory.kind ?? "user_fact"]} 업데이트</p>
                          <label className="block text-sm font-bold text-slate-700">지금 상황으로 바꿔 적어주세요
                            <textarea value={editingMemoryContent} onChange={(event) => setEditingMemoryContent(event.target.value.slice(0, 300))} rows={3} maxLength={300} className="mt-2 w-full rounded-xl border border-[#d8d3ff] bg-white px-3 py-2 text-sm font-normal leading-6 outline-none focus:border-[#6f5ce7]" />
                          </label>
                          <p className="text-xs leading-5 text-slate-500">기존 내용은 지워지지 않고 이전 상황으로 보관됩니다.</p>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void saveEditedMemory()} disabled={isSavingMemoryEdit || !editingMemoryContent.trim()} className="rounded-xl bg-[#6f5ce7] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{isSavingMemoryEdit ? "저장 중..." : "변화 저장"}</button>
                            <button type="button" onClick={() => { setEditingMemoryId(null); setEditingMemoryContent(""); }} disabled={isSavingMemoryEdit} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600">취소</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <p className="mb-1 text-xs font-bold text-[#5e4bd1]">{MEMORY_KIND_LABELS[memory.kind ?? "user_fact"]}</p>
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{memory.content}</p>
                            <p className="mt-1 text-[11px] text-slate-400">마지막 업데이트 {formatRecentActivity(memory.updatedAt) ?? "기록됨"}</p>
                          </div>
                          {!isPreview ? (
                            <div className="flex shrink-0 items-center gap-3 self-start">
                              <button type="button" onClick={() => { setEditingMemoryId(memory.id); setEditingMemoryContent(memory.content); }} className="text-xs font-semibold text-[#5e4bd1] underline underline-offset-4">상황이 바뀌었어요</button>
                              <button type="button" onClick={() => void deleteMemory(memory)} disabled={deletingMemoryId === memory.id} className="text-xs font-semibold text-slate-500 underline underline-offset-4 disabled:opacity-50">{deletingMemoryId === memory.id ? "삭제 중" : "삭제"}</button>
                            </div>
                          ) : <span className="shrink-0 text-xs font-semibold text-slate-500">미리보기</span>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

          </>
        ) : null}

        {(!portfolio || isLoading) ? managementMenu : null}

        <section id="undam-guide" hidden={managementPanel !== "guide"} aria-label="이용 안내" className="mt-3 rounded-2xl border border-[#e1d3f3] bg-white p-4"><h2 className="font-bold text-[#6841aa]">이용 안내</h2><div className="mt-2"><TrustPrinciplesCard compact /><p className="mt-2 text-sm leading-6 text-slate-600">현재 연결된 상담 분석 {portfolio ? `${portfolio.analyses.length}개` : "확인 중"} · 무료 사주 분석과 성인인증을 완료하면 리포트 구매 여부와 관계없이 질문권으로 상담할 수 있습니다. 관련 구매 분석이 있으면 참고하며, 없으면 현재 사주를 기반으로 답변합니다.</p><p className="mt-2 text-sm leading-6 text-slate-600">유료 리포트 열람 권한은 별도입니다. 출생 정보가 다른 시기의 해석은 섞지 않습니다. 운담 선생님은 AI 캐릭터입니다. 명리 해석은 참고용입니다.</p></div></section>
        {memoryError ? (
          <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{memoryError}</p>
        ) : null}
        {error ? (
          <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">{error}</p>
        ) : null}
      </div>
    </main>
  );
}
