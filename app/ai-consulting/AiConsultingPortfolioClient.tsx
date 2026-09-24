"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AiConsultingPortfolioAnalysis,
  AiConsultingPortfolioMessage,
  AiConsultingPortfolioQuestionResult,
  AiConsultingPortfolioSource,
  AiConsultingPortfolioState,
} from "@/app/lib/aiConsulting/portfolio";
import type { ProfileFreeAnalysisStatus } from "@/app/lib/freeAnalysisResults/server";

type AiConsultingUserMemory = {
  id: string;
  content: string;
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
  freeAnalysisStatus,
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
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState("");
  const [isSavingMemoryEdit, setIsSavingMemoryEdit] = useState(false);
  const [showAllAnalyses, setShowAllAnalyses] = useState(false);
  const [analysisSearch, setAnalysisSearch] = useState("");
  const [visibleAnalysisLimit, setVisibleAnalysisLimit] = useState(8);
  const [showMemories, setShowMemories] = useState(false);
  const [latestAnswerSource, setLatestAnswerSource] = useState<AiConsultingPortfolioSource | null>(null);
  const [olderMessages, setOlderMessages] = useState<AiConsultingPortfolioMessage[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(previewData?.state.hasOlderMessages ?? initialPortfolioState?.hasOlderMessages ?? false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const portfolioRequestSeq = useRef(0);
  const isPreview = Boolean(previewData);
  const creditCheckoutEnabled = creditCheckoutAvailable;
  const freeAnalysisReady = freeAnalysisStatus === "completed" || freeAnalysisStatus === "needs_retry";

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
    for (const analysis of portfolio.analyses.slice(0, 4)) {
      const first = analysis.suggestedQuestions[0];
      if (first && !suggestions.includes(first)) suggestions.push(first);
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

  const creditContext = portfolio?.analyses.find((analysis) => analysis.profileInputVersion === "current") ?? portfolio?.analyses[0] ?? null;
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
        setRoutingNotice({ kind: "info", message: "남은 AI 질문권이 없습니다. 질문권을 추가하면 보유 분석 범위에서 상담을 계속할 수 있습니다." });
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
    if (isPreview || message.role !== "user") return;
    const content = message.content.trim();
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
          kind: "user_fact",
          content,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "AI 기억을 저장하지 못했습니다.");
      await loadMemories();
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
        body: JSON.stringify({ profileId, memoryId: editingMemoryId, content: editingMemoryContent.trim() }),
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
<section id="owned-analysis-selector" className="mt-5 scroll-mt-6 rounded-[1.75rem] border border-[#d8d3ff] bg-[linear-gradient(145deg,#ffffff_0%,#f8f7ff_100%)] p-5 shadow-sm sm:p-6">
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
                  <p className="text-xs font-bold tracking-[0.14em] text-slate-500">추천 질문</p>
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
            </section>
  ) : null;

  return (
    <main className="min-h-screen bg-[#f5f7fc] px-4 py-7 text-[#11162d] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center">
          <Link href="/purchased-analyses" className="inline-flex rounded-full border border-[#dce1ef] bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            ← 구매한 분석 보관함
          </Link>
        </div>

        {isPreview ? (
          <div className="mt-4 rounded-2xl border border-[#d8d3ff] bg-[#f3f1ff] px-4 py-3 text-sm leading-6 text-[#5e4bd1]">
            운영자 통합 상담 미리보기입니다. 질문 전송·질문권 차감·AI 기억 저장은 동작하지 않습니다.
          </div>
        ) : null}

        {!isLoading && focusAnalysis && focusAnalysis.profileInputVersion !== "current" ? (
          <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
            <p className="font-black">이전 출생정보 기준 상담</p>
            <p className="mt-1">
              구매 당시 출생 정보가 같은 리포트는 함께 상담할 수 있습니다. 출생 정보를 수정한 뒤 새로 구매한 리포트와는 분석 결과를 섞지 않습니다. 보유한 리포트 목록은 모두 볼 수 있습니다.
            </p>
            <p className="mt-2 font-semibold">남아 있는 공용 AI 질문권은 그대로 사용할 수 있습니다.</p>
          </section>
        ) : null}

        {!isLoading && portfolio && (portfolio.previousAnalysesExcluded ?? 0) > 0 && !focusAnalysis ? (
          <section className="mt-4 rounded-2xl border border-[#dce1ef] bg-white px-5 py-4 text-sm leading-6 text-slate-700 shadow-sm">
            <p className="font-bold text-[#11162d]">출생정보 변경 전 리포트 {(portfolio.previousAnalysesExcluded ?? 0)}개는 자동 상담 범위에서 제외되어 있습니다.</p>
            <p className="mt-1">이전 리포트와 상담 기록은 그대로 보관됩니다. 보유 분석 목록에는 모두 표시하며, 해당 리포트에서 상담으로 들어가면 같은 구매 당시 정보 기준으로 이어갈 수 있습니다.</p>
          </section>
        ) : null}

        <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-[#35375f] bg-[radial-gradient(circle_at_82%_20%,rgba(113,89,233,0.26),transparent_28%),radial-gradient(circle_at_18%_85%,rgba(79,146,224,0.14),transparent_30%),linear-gradient(145deg,#0b1025_0%,#171a3d_58%,#24204d_100%)] p-6 text-white shadow-[0_22px_60px_rgba(24,29,67,0.14)] sm:p-8">
          <p className="text-xs font-black tracking-[0.16em] text-[#b9b2f6]">UNBODA AI CONSULTING</p>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] sm:text-3xl">나를 기억하는 AI 운세 상담</h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-200">
            지난 상담을 이어가거나 새로운 고민을 질문해 보세요. 새 분석을 구매하면 이 상담에서 답할 수 있는 범위도 함께 넓어집니다.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-4">
              <p className="text-xs font-bold tracking-[0.12em] text-[#c9c3ff]">현재 연결된 상담 분석</p>
              <p className="mt-2 text-xl font-black">
                {portfolio ? `${portfolio.analyses.length}개 분석` : "확인 중"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                {focusAnalysis?.profileInputVersion !== "current" && focusAnalysis
                  ? `구매한 분석 총 ${ownedAnalyses.length}개 · 현재는 같은 구매 당시 출생 정보 기준으로 상담합니다.`
                  : `구매한 분석 총 ${ownedAnalyses.length}개 · 출생 정보가 다른 시기의 해석은 섞지 않습니다.`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.11] px-5 py-4 sm:min-w-56">
              <p className="text-xs font-bold tracking-[0.12em] text-slate-300">공용 질문권</p>
              <p className="mt-1 text-3xl font-black" aria-live="polite">
                {portfolio ? portfolio.questionsRemaining : "—"}
                <span className="ml-1 text-sm font-semibold text-slate-300">회 남음</span>
              </p>
              <p className="mt-1 text-xs text-slate-300">모든 보유 분석에서 함께 사용</p>
              {creditPurchaseHref && !isPreview && portfolio?.analyses.length && portfolio.questionsRemaining > 0 ? (
                <Link href={creditPurchaseHref} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-[#211b52] transition hover:bg-[#eeeaff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  {creditCheckoutEnabled ? "질문권 구매하기 →" : "질문권 상품 안내 보기 →"}
                </Link>
              ) : null}
              {!creditCheckoutEnabled && !isPreview ? <p className="mt-2 text-xs text-slate-300">현재 질문권 결제 준비 중</p> : null}
            </div>
          </div>
        </header>

        {isLoading ? (
          <section className="mt-5 rounded-[1.75rem] border border-[#dce1ef] bg-white p-7 text-center shadow-sm">
            보유 분석과 상담 기록을 확인하고 있어요.
          </section>
        ) : null}

        {!isLoading && portfolio && portfolio.analyses.length === 0 ? (
          <section className="mt-5 rounded-[1.75rem] border border-[#dce1ef] bg-white p-7 text-center shadow-sm">
            {(portfolio.previousAnalysesExcluded ?? 0) > 0 && freeAnalysisReady ? (
              <>
                <p className="text-xs font-black tracking-[0.14em] text-[#6f5ce7]">AI CONSULTING · NEW PROFILE INPUT</p>
                <h2 className="mt-2 text-lg font-bold">이전 리포트는 보관 중이고, 새 기준 상담은 아직 준비되지 않았습니다</h2>
                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-slate-700">
                  출생정보 변경 전 리포트와 상담 기록은 그대로 남아 있습니다. 새 출생정보 기준 AI 상담은 현재 기준으로 새로 구매한 유료 리포트가 생긴 뒤 시작할 수 있습니다.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link href="/purchased-analyses" className="rounded-2xl border border-[#dce1ef] bg-white px-5 py-3 text-sm font-bold text-slate-700">이전 구매 리포트 보기</Link>
                  <Link href="/recommendations" className="rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white">현재 사주 기반 추천 보기</Link>
                </div>
              </>
            ) : !freeAnalysisReady ? (
              <>
                <p className="text-xs font-black tracking-[0.14em] text-[#6f5ce7]">AI CONSULTING · STEP 2</p>
                <h2 className="mt-2 text-lg font-bold">무료 사주부터 확인해 주세요</h2>
                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-slate-700">
                  AI 상담은 바로 시작하는 독립 분석이 아닙니다. 현재 프로필의 무료 사주를 먼저 확인하고, 그 기준으로 필요한 심층·전문 분석을 구매한 뒤 이용할 수 있습니다.
                </p>
                <Link href="/saju" className="mt-5 inline-flex rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white">
                  무료 사주 먼저 보기
                </Link>
              </>
            ) : (
              <>
                <p className="text-xs font-black tracking-[0.14em] text-[#6f5ce7]">AI CONSULTING · STEP 3</p>
                <h2 className="mt-2 text-lg font-bold">유료 분석 리포트가 먼저 필요합니다</h2>
                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-slate-700">
                  무료 사주는 준비되었습니다. 궁금한 주제의 심층·전문 분석을 구매해 리포트를 확인한 뒤, 추가 질문이 있을 때 AI 상담 이용권을 별도로 구매해 이어갈 수 있습니다.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link href="/recommendations" className="rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white">내 사주 기반 추천 보기</Link>
                  <Link href="/deep-analysis" className="rounded-2xl border border-[#dce1ef] bg-white px-5 py-3 text-sm font-bold text-slate-700">심층 분석 둘러보기</Link>
                  <Link href="/special-analysis" className="rounded-2xl border border-[#dce1ef] bg-white px-5 py-3 text-sm font-bold text-slate-700">전문 분석 둘러보기</Link>
                </div>
              </>
            )}
          </section>
        ) : null}

        {!isLoading && portfolio && portfolio.analyses.length > 0 ? (
          <>
            <section data-section="portfolio-conversation" className="relative mt-4 rounded-[1.75rem] border border-[#dce1ef] bg-[#f9faff] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">AI 상담</p>
                  <h2 className="mt-1 text-lg font-black">통합 AI 상담</h2>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-600">{reportEntryUnavailable ? "이전에 보시던 리포트가 현재 상담 범위에 없습니다. 지금 보유한 분석을 기준으로 질문해 주세요." : "주제를 선택할 필요 없이 질문해 주세요. AI가 구매한 분석 중 관련 리포트를 찾아 답변합니다."}</p>
              <a href="#owned-analysis-selector" className="mt-2 inline-flex text-sm font-semibold text-[#5e4bd1] underline underline-offset-4">내가 구매한 분석 보기 ↓</a>
              <form
                  data-ai-composer="portfolio-sticky"
                  onSubmit={submitQuestion}
                  className="mt-4 rounded-[1.5rem] border border-[#d8d3ff] bg-white p-4 shadow-[0_12px_36px_rgba(33,40,83,0.09)]"
                >
                  <label htmlFor="portfolio-question" className="mb-2 block text-sm font-bold text-[#11162d]">무엇이 궁금하세요?</label>
                  <textarea
                    id="portfolio-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value.slice(0, 300))}
                    placeholder="지난 이야기나 지금 궁금한 내용을 편하게 입력해 주세요."
                    rows={3}
                    disabled={isSending}
                    className="w-full resize-none rounded-2xl bg-[#f3f4f9] px-4 py-3 text-[15px] leading-7 text-slate-800 outline-none ring-[#6f5ce7] focus:ring-1 disabled:opacity-60"
                  />
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs leading-5 text-slate-500">
                      {isPreview
                        ? "미리보기에서는 질문이 전송되지 않습니다."
                        : portfolio.questionsRemaining > 0
                          ? `${question.length}/300 · 답변 완료 시 질문권 1회 차감`
                          : `${question.length}/300 · 질문권 0회 · 질문은 이 탭에 임시 보관되며 지금은 전송되지 않아요.`}
                    </span>
                    {portfolio.questionsRemaining > 0 ? (
                      <button
                        type="submit"
                        disabled={isPreview || isSending || question.trim().length < 2}
                        className="rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5f4fd2] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isPreview ? "미리보기" : isSending ? "관련 리포트 확인 중..." : "질문하기"}
                      </button>
                    ) : creditPurchaseHref && !isPreview ? (
                      <Link href={creditPurchaseHref} className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5f4fd2]">
                        {creditCheckoutEnabled ? "질문권 구매 후 상담하기 →" : "질문권 상품 안내 보기 →"}
                      </Link>
                    ) : (
                      <button type="button" disabled className="rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white opacity-40">미리보기 · 전송 불가</button>
                    )}
                  </div>
                </form>

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

              <div className="mt-5 space-y-4 pb-4">
                {hasOlderMessages ? <button type="button" onClick={() => void loadOlderMessages()} disabled={isLoadingOlder} className="w-full rounded-xl border border-[#dce1ef] bg-white px-4 py-3 text-sm font-semibold text-[#5e4bd1] disabled:opacity-50">{isLoadingOlder ? "이전 상담 불러오는 중..." : "이전 상담 더 보기"}</button> : null}
                {visibleChatMessages.length === 0 && (portfolio.questionsRemaining > 0 || hasOlderMessages) ? (
                  <div className="rounded-[1.5rem] border border-dashed border-[#cfd5e6] bg-white p-7 text-center text-sm leading-7 text-slate-600">
                    {hasOlderMessages
                      ? "이전 상담 더 보기에서 오래된 대화를 확인할 수 있어요."
                      : "궁금한 내용을 질문하면 관련 구매 분석을 찾아 상담을 시작합니다."}
                  </div>
                ) : null}

                {visibleChatMessages.map((message) => {
                  const policy = message.role === "user" ? policyMessage(message.scopeDecision) : null;
                  const remembered = message.role === "user" && rememberedSourceMessageIds.has(message.id);
                  const savingMemory = message.role === "user" && savingMemoryMessageId === message.id;

                  return (
                    <div key={message.id} className="space-y-2">
                      <div className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                        <span className="rounded-full bg-[#eef0f6] px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          {message.sourceTitle} · {message.sourceEditionLabel}
                        </span>
                      </div>
                      <div
                        className={message.role === "user"
                          ? "ml-auto max-w-[88%] rounded-3xl rounded-br-lg bg-[#171a3d] px-5 py-4 text-[15px] leading-7 text-white"
                          : "max-w-[94%] whitespace-pre-wrap rounded-3xl rounded-bl-lg border border-[#dce1ef] bg-white px-5 py-4 text-[15px] leading-7 text-slate-800 shadow-sm"}
                      >
                        {message.content}
                      </div>
                      {message.role === "user" ? (
                        <div className="ml-auto flex max-w-[88%] justify-end">
                          {remembered ? (
                            <span className="text-xs font-semibold text-slate-500">✓ AI가 기억 중</span>
                          ) : isPreview ? (
                            <span className="text-xs font-semibold text-slate-400">기억 저장 미리보기</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void saveMemory(message)}
                              disabled={savingMemory}
                              className="text-xs font-semibold text-slate-600 underline underline-offset-4 disabled:opacity-50"
                            >
                              {savingMemory ? "저장 중" : "이 내용 기억하기"}
                            </button>
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
              </div>

            </section>

            {ownedAnalysisLibrary}

            <section className="mt-4 rounded-[1.75rem] border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">내 기억</p>
                  <h2 className="mt-2 text-base font-bold">AI가 기억하는 내 상황</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">상담 중 직접 저장한 내 상황과 목표를 확인하고 관리할 수 있어요.</p>
                </div>
                <button type="button" onClick={() => setShowMemories((value) => !value)} aria-expanded={showMemories} className="shrink-0 rounded-full bg-[#eef0f6] px-4 py-2 text-xs font-semibold text-[#5e4bd1]">{memories.length}개 저장됨 · {showMemories ? "접기" : "내 기억 보기"}</button>
              </div>

              {showMemories ? (memories.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm leading-6 text-slate-600">
                  아직 기억한 내용이 없습니다. 상담 중 내가 작성한 메시지에서 <strong className="font-semibold text-slate-800">이 내용 기억하기</strong>를 눌러 저장할 수 있습니다.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {memories.map((memory) => (
                    <div key={memory.id} className="flex flex-col gap-3 rounded-2xl bg-[#f7f8fc] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                      {editingMemoryId === memory.id ? (
                        <div className="w-full space-y-2">
                          <label className="block text-sm font-bold text-slate-700">기억 수정
                            <textarea value={editingMemoryContent} onChange={(event) => setEditingMemoryContent(event.target.value.slice(0, 300))} rows={3} maxLength={300} className="mt-2 w-full rounded-xl border border-[#d8d3ff] bg-white px-3 py-2 text-sm font-normal leading-6 outline-none focus:border-[#6f5ce7]" />
                          </label>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void saveEditedMemory()} disabled={isSavingMemoryEdit || !editingMemoryContent.trim()} className="rounded-xl bg-[#6f5ce7] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{isSavingMemoryEdit ? "저장 중..." : "수정 저장"}</button>
                            <button type="button" onClick={() => { setEditingMemoryId(null); setEditingMemoryContent(""); }} disabled={isSavingMemoryEdit} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600">취소</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-slate-800">{memory.content}</p>
                          {!isPreview ? (
                            <div className="flex shrink-0 items-center gap-3 self-start">
                              <button type="button" onClick={() => { setEditingMemoryId(memory.id); setEditingMemoryContent(memory.content); }} className="text-xs font-semibold text-[#5e4bd1] underline underline-offset-4">수정</button>
                              <button type="button" onClick={() => void deleteMemory(memory)} disabled={deletingMemoryId === memory.id} className="text-xs font-semibold text-slate-500 underline underline-offset-4 disabled:opacity-50">{deletingMemoryId === memory.id ? "삭제 중" : "기억에서 삭제"}</button>
                            </div>
                          ) : <span className="shrink-0 text-xs font-semibold text-slate-500">미리보기</span>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )) : null}
            </section>

          </>
        ) : null}

        {!isLoading && portfolio?.analyses.length === 0 ? ownedAnalysisLibrary : null}

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
