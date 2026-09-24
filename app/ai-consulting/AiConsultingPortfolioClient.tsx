"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
  | { kind: "outside"; message: string }
  | { kind: "select"; message: string; candidates: AiConsultingPortfolioSource[]; question: string };

function policyMessage(decision: AiConsultingPortfolioMessage["scopeDecision"]): string | null {
  if (decision === "CLARIFY") return "질문이 선택된 리포트와 어떻게 연결되는지 조금 더 구체적으로 적어 주세요. 질문권은 차감되지 않았습니다.";
  if (decision === "DENY") return "선택된 리포트의 상담 범위를 벗어나 AI 답변을 생성하지 않았습니다. 질문권도 차감되지 않았습니다.";
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
  freeAnalysisStatus,
  creditCheckoutAvailable = false,
}: {
  profileId: string;
  focusProductId?: string | null;
  focusEdition?: string | null;
  previewData?: AiConsultingPortfolioPreviewData;
  freeAnalysisStatus?: ProfileFreeAnalysisStatus | null;
  /** Server-confirmed availability for this user, including Toss TEST allowlist. */
  creditCheckoutAvailable?: boolean;
}) {
  const [portfolio, setPortfolio] = useState<AiConsultingPortfolioState | null>(previewData?.state ?? null);
  const [memories, setMemories] = useState<AiConsultingUserMemory[]>(previewData?.memories ?? []);
  const [question, setQuestion] = useState("");
  const [routingNotice, setRoutingNotice] = useState<RoutingNotice | null>(null);
  const [isLoading, setIsLoading] = useState(!previewData);
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
  const [showAllConversation, setShowAllConversation] = useState(false);
  const [sourceMode, setSourceMode] = useState<"automatic" | "chosen">(focusProductId && focusEdition ? "chosen" : "automatic");
  const [chosenSource, setChosenSource] = useState<AiConsultingPortfolioSource | null>(null);
  const [latestAnswerSource, setLatestAnswerSource] = useState<AiConsultingPortfolioSource | null>(null);
  const [olderMessages, setOlderMessages] = useState<AiConsultingPortfolioMessage[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(previewData?.state.hasOlderMessages ?? false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const isPreview = Boolean(previewData);
  const creditCheckoutEnabled = creditCheckoutAvailable;
  const freeAnalysisReady = freeAnalysisStatus === "completed" || freeAnalysisStatus === "needs_retry";

  const loadPortfolio = useCallback(async () => {
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
  }, [loadMemories, loadPortfolio, previewData]);

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
    if (focusAnalysis) return focusAnalysis.suggestedQuestions.slice(0, 3);

    const suggestions: string[] = [];
    for (const analysis of portfolio.analyses.slice(0, 4)) {
      const first = analysis.suggestedQuestions[0];
      if (first && !suggestions.includes(first)) suggestions.push(first);
      if (suggestions.length >= 3) break;
    }
    return suggestions;
  }, [focusAnalysis, portfolio]);

  const filteredAnalyses = useMemo(() => {
    if (!portfolio) return [];
    const search = analysisSearch.trim().toLocaleLowerCase("ko-KR");
    if (!search) return portfolio.analyses;
    return portfolio.analyses.filter((analysis) =>
      `${analysis.productTitle} ${analysis.editionLabel} ${analysis.scopeLabel}`.toLocaleLowerCase("ko-KR").includes(search),
    );
  }, [analysisSearch, portfolio]);

  const visibleAnalyses = useMemo(() => showAllAnalyses
    ? filteredAnalyses.slice(0, visibleAnalysisLimit)
    : portfolio?.analyses.slice(0, 3) ?? [], [filteredAnalyses, portfolio, showAllAnalyses, visibleAnalysisLimit]);
  const hiddenAnalysisCount = Math.max((portfolio?.analyses.length ?? 0) - 3, 0);
  const allLoadedMessages = useMemo(() => [...olderMessages, ...(portfolio?.messages ?? [])], [olderMessages, portfolio]);
  const previousAnswer = useMemo(() => [...(portfolio?.messages ?? [])].reverse().find((message) => message.role === "assistant") ?? null, [portfolio]);
  const automaticSource = latestAnswerSource ?? (previousAnswer ? {
    productId: previousAnswer.sourceProductId,
    analysisEditionKey: previousAnswer.sourceEditionKey,
    productTitle: previousAnswer.sourceTitle,
    editionLabel: previousAnswer.sourceEditionLabel,
  } : null);
  const activeSource = sourceMode === "chosen" ? chosenSource ?? focusAnalysis : automaticSource;
  const activeAnalysis = activeSource && portfolio ? portfolio.analyses.find((analysis) =>
    analysis.productId === activeSource.productId && analysis.analysisEditionKey === activeSource.analysisEditionKey,
  ) ?? null : null;
  const visibleChatMessages = showAllConversation || !activeAnalysis
    ? allLoadedMessages
    : allLoadedMessages.filter((message) => message.sourceProductId === activeAnalysis.productId && message.sourceEditionKey === activeAnalysis.analysisEditionKey);

  const latestActivity = useMemo(
    () => formatRecentActivity(portfolio?.messages[portfolio.messages.length - 1]?.createdAt),
    [portfolio],
  );

  const rememberedSourceMessageIds = useMemo(
    () => new Set(memories.map((memory) => memory.sourceMessageId).filter((value): value is string => Boolean(value))),
    [memories],
  );

  const creditContext = activeAnalysis ?? focusAnalysis ?? portfolio?.analyses[0] ?? null;
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
    try {
      const params = new URLSearchParams({ profileId, before: oldest.createdAt });
      if (focusProductId && focusEdition) {
        params.set("includeProductId", focusProductId);
        params.set("includeEdition", focusEdition);
      }
      const response = await fetch(`/api/ai-consulting/portfolio?${params.toString()}`, { cache: "no-store" });
      const body = await response.json() as AiConsultingPortfolioState & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "이전 상담을 불러오지 못했습니다.");
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

  async function sendQuestion(content: string, preferred?: AiConsultingPortfolioSource) {
    if (isPreview || !content.trim() || content.trim().length < 2 || content.trim().length > 300) return;

    setIsSending(true);
    setError(null);
    setRoutingNotice(null);
    const sourcePreference = preferred ?? activeSource;

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
          preferContinuation: !preferred && sourceMode === "automatic",
        }),
      });

      const body = (await response.json()) as AiConsultingPortfolioQuestionResult & { error?: string };
      if (!response.ok && body.state !== "credit_required") {
        throw new Error(body.error ?? "AI 상담 답변을 완료하지 못했습니다.");
      }

      if (body.state === "answered") {
        setQuestion("");
        setLatestAnswerSource(body.source);
        if (preferred) { setChosenSource(preferred); setSourceMode("chosen"); }
        await loadPortfolio();
        return;
      }

      if (body.state === "clarify_source") {
        setRoutingNotice({
          kind: "select",
          message: body.message,
          candidates: body.candidates,
          question: content.trim(),
        });
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
              이 리포트와 기존 상담 기록은 구매 당시 출생 정보 기준으로 보관됩니다. 현재 프로필의 새 출생정보와 자동으로 합치지 않으며, 이 화면에서는 이 리포트 기준으로만 상담을 이어갑니다.
            </p>
            <p className="mt-2 font-semibold">남아 있는 공용 AI 질문권은 그대로 사용할 수 있습니다.</p>
          </section>
        ) : null}

        {!isLoading && portfolio && (portfolio.previousAnalysesExcluded ?? 0) > 0 && !focusAnalysis ? (
          <section className="mt-4 rounded-2xl border border-[#dce1ef] bg-white px-5 py-4 text-sm leading-6 text-slate-700 shadow-sm">
            <p className="font-bold text-[#11162d]">출생정보 변경 전 리포트 {(portfolio.previousAnalysesExcluded ?? 0)}개는 자동 상담 범위에서 제외되어 있습니다.</p>
            <p className="mt-1">기존 리포트와 상담 기록은 삭제되지 않습니다. 해당 리포트에서 직접 AI 상담으로 들어오면 구매 당시 정보 기준으로 이어갈 수 있습니다.</p>
          </section>
        ) : null}

        <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-[#35375f] bg-[radial-gradient(circle_at_82%_20%,rgba(113,89,233,0.26),transparent_28%),radial-gradient(circle_at_18%_85%,rgba(79,146,224,0.14),transparent_30%),linear-gradient(145deg,#0b1025_0%,#171a3d_58%,#24204d_100%)] p-6 text-white shadow-[0_22px_60px_rgba(24,29,67,0.14)] sm:p-8">
          <p className="text-xs font-black tracking-[0.16em] text-[#b9b2f6]">UNBODA AI CONSULTING</p>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] sm:text-3xl">나를 기억하는 AI 운세 상담</h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-200">
            지난 상담을 이어가거나 새로운 고민을 편하게 질문해 보세요. 새 분석을 구매하면 이 상담에서 답할 수 있는 범위도 함께 넓어집니다.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-4">
              <p className="text-xs font-bold tracking-[0.12em] text-[#c9c3ff]">상담 가능한 분석</p>
              <p className="mt-2 text-xl font-black">
                {portfolio ? `${portfolio.analyses.length}개 분석` : "확인 중"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                {focusAnalysis?.profileInputVersion !== "current" && focusAnalysis
                  ? "이전 출생정보로 구매한 리포트이며, 다른 시기의 분석과 섞지 않습니다."
                  : "현재 출생정보에 맞는 완료 리포트만 상담에 연결됩니다."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.11] px-5 py-4 sm:min-w-56">
              <p className="text-xs font-bold tracking-[0.12em] text-slate-300">공용 질문권</p>
              <p className="mt-1 text-3xl font-black" aria-live="polite">
                {portfolio ? portfolio.questionsRemaining : "—"}
                <span className="ml-1 text-sm font-semibold text-slate-300">회 남음</span>
              </p>
              <p className="mt-1 text-xs text-slate-300">모든 보유 분석에서 함께 사용</p>
              {creditPurchaseHref && !isPreview && portfolio?.analyses.length ? (
                <Link href={creditPurchaseHref} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-[#211b52] transition hover:bg-[#eeeaff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  {creditCheckoutEnabled ? "질문권 구매하기 →" : "질문권 상품 보기 →"}
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
                  <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">CONVERSATION</p>
                  <h2 className="mt-1 text-lg font-black">{activeAnalysis ? `${activeAnalysis.productTitle} 상담` : "새 상담 시작"}</h2>
                </div>
                {portfolio.messages.length > 0 ? (
                  <button type="button" onClick={() => setShowAllConversation((value) => !value)} className="text-xs font-semibold text-[#5e4bd1] underline underline-offset-4">{showAllConversation ? "이 분석의 상담만 보기" : "전체 상담 보기"}</button>
                ) : null}
              </div>
              <p className="text-sm leading-6 text-slate-600">{activeAnalysis ? `${activeAnalysis.productTitle} · ${activeAnalysis.editionLabel}${sourceMode === "chosen" ? " · 선택한 분석 기준" : " · 이전 상담 이어가기"}` : "질문하면 구매한 분석에서 관련 리포트를 찾아 상담을 시작합니다."}</p>
              {activeAnalysis ? <button type="button" onClick={() => { setSourceMode("automatic"); setChosenSource(null); setShowAllConversation(false); }} className="mt-2 text-xs font-semibold text-[#5e4bd1] underline underline-offset-4">새 주제로 질문하기 · 자동 선택</button> : null}

              {portfolio.questionsRemaining > 0 ? (
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
                        : `${question.length}/300 · 보유 분석 범위 밖 질문은 AI 답변을 생성하지 않으며 질문권도 차감되지 않습니다.`}
                    </span>
                    <button
                      type="submit"
                      disabled={isPreview || isSending || question.trim().length < 2}
                      className="rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5f4fd2] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isPreview ? "미리보기" : isSending ? "관련 리포트 확인 중..." : "질문하기"}
                    </button>
                  </div>
                </form>
              ) : (
                <div role="status" className="mt-4 rounded-[1.5rem] border border-[#d8d3ff] bg-white p-4 shadow-[0_12px_35px_rgba(33,40,83,0.10)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-black text-[#11162d]">질문권 0회 · 새 답변에는 질문권이 필요해요.</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">지난 상담 기록은 그대로 볼 수 있어요.</p>
                    </div>
                    {creditPurchaseHref && !isPreview ? (
                      <Link href={creditPurchaseHref} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#6f5ce7] px-5 py-3 text-sm font-black text-white transition hover:bg-[#5f4fd2]">
                        {creditCheckoutEnabled ? "질문권 구매하기 →" : "질문권 상품 보기 →"}
                      </Link>
                    ) : null}
                  </div>
                  {!creditCheckoutEnabled && !isPreview ? (
                    <p className="mt-2 text-xs text-slate-500">질문권 결제는 현재 준비 중이며, 구매 가능해지면 이 화면에서 바로 이동할 수 있어요.</p>
                  ) : null}
                </div>
              )}

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
                  {routingNotice.kind === "select" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {routingNotice.candidates.map((candidate) => (
                        <button
                          key={`${candidate.productId}|${candidate.analysisEditionKey}`}
                          type="button"
                          disabled={isSending}
                          onClick={() => void sendQuestion(routingNotice.question, candidate)}
                          className="rounded-xl border border-[#bdb5fb] bg-white px-3 py-2 text-xs font-bold text-[#5e4bd1]"
                        >
                          {candidate.productTitle} · {candidate.editionLabel}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 space-y-4 pb-4">
                {hasOlderMessages ? <button type="button" onClick={() => void loadOlderMessages()} disabled={isLoadingOlder} className="w-full rounded-xl border border-[#dce1ef] bg-white px-4 py-3 text-sm font-semibold text-[#5e4bd1] disabled:opacity-50">{isLoadingOlder ? "이전 상담 불러오는 중..." : "이전 상담 더 보기"}</button> : null}
                {visibleChatMessages.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-[#cfd5e6] bg-white p-7 text-center text-sm leading-7 text-slate-600">
                    {activeAnalysis ? "이 분석의 이전 상담이 없거나 더 이전에 있습니다. 질문을 시작하거나 이전 상담을 불러오세요." : "궁금한 내용을 질문하면 관련 구매 분석을 찾아 상담을 시작합니다."}
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

            <section className="mt-5 rounded-[1.75rem] border border-[#d8d3ff] bg-[linear-gradient(145deg,#ffffff_0%,#f8f7ff_100%)] p-5 shadow-sm sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">OWNED ANALYSES</p>
                  <h2 className="mt-2 text-xl font-black">내 분석 찾아보기</h2>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">
                    구매한 분석이 상담 범위가 됩니다. 질문권은 상품별로 나뉘지 않습니다. 남은 횟수를 공용으로 사용하고, 질문 내용에 맞는 보유 리포트를 서버에서 자동 선택합니다.
                  </p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold tracking-[0.1em] text-slate-500">
                        {showAllAnalyses ? `전체 보유 분석 ${filteredAnalyses.length}개` : `최근 구매한 분석 ${Math.min(3, portfolio.analyses.length)}개`}
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
                      {visibleAnalyses.map((analysis) => {
                        const focused = activeAnalysis?.productId === analysis.productId
                          && activeAnalysis.analysisEditionKey === analysis.analysisEditionKey;
                        return (
                          <button
                            key={`${analysis.productId}|${analysis.analysisEditionKey}`}
                            type="button"
                            onClick={() => { setChosenSource(analysis); setSourceMode("chosen"); setShowAllConversation(false); document.getElementById("portfolio-question")?.focus(); }}
                            className={focused
                              ? "rounded-full border border-[#aaa0f4] bg-[#f3f1ff] px-3 py-2 text-xs font-bold text-[#5e4bd1]"
                              : "rounded-full border border-[#dce1ef] bg-white px-3 py-2 text-xs font-semibold text-slate-600"}
                          >
                            {analysis.productTitle} · {analysis.editionLabel}
                            {analysis.profileInputVersion !== "current" ? " · 이전 정보 기준" : focused ? " · 시작 기준" : ""}
                          </button>
                        );
                      })}
                    </div>
                    {showAllAnalyses && filteredAnalyses.length === 0 ? <p className="mt-3 text-sm text-slate-500">해당하는 분석이 없습니다.</p> : null}
                    {showAllAnalyses && visibleAnalysisLimit < filteredAnalyses.length ? <button type="button" onClick={() => setVisibleAnalysisLimit((value) => value + 8)} className="mt-3 w-full rounded-xl border border-[#dce1ef] bg-white px-4 py-3 text-sm font-bold text-[#5e4bd1]">분석 8개 더 보기</button> : null}
                  </div>

                  <div className="mt-5 border-t border-[#e4e7f0] pt-4">
                    <p className="text-xs font-bold tracking-[0.1em] text-slate-500">상담 이용 안내</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full border border-[#d8d3ff] bg-white px-3 py-2 text-[#5e4bd1]">질문마다 관련 리포트 자동 선택</span>
                      <span className="rounded-full border border-[#dce1ef] bg-white px-3 py-2 text-slate-600">정상 답변 완료 시 공용 질문권 1회 차감</span>
                      <span className="rounded-full border border-[#dce1ef] bg-white px-3 py-2 text-slate-600">보유 범위 밖 질문은 답변하지 않아요</span>
                    </div>
                  </div>
                </div>

                <div>
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
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-[1.75rem] border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">LONG-TERM MEMORY</p>
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
