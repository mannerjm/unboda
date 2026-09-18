"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getAiConsultingPresentation } from "@/app/lib/aiConsultingPresentation";
import {
  isCompatibilityFamilyOtherProductId,
  isCompatibilityFamilyParentChildProductId,
  isCompatibilityFamilySiblingProductId,
  isCompatibilityRomanticProductId,
} from "@/app/lib/specialAnalysisProducts";

export type AiConsultingMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  scopeDecision: "ALLOW" | "CLARIFY" | "DENY" | "SAFETY_REDIRECT" | null;
  charged: boolean;
  createdAt: string;
};

export type AiConsultingSession =
  | { state: "report_required"; productId: string; analysisEditionKey: string }
  | {
      state: "credit_required";
      productId: string;
      analysisEditionKey: string;
      questionsRemaining: 0;
      threadId: string | null;
      messages: AiConsultingMessage[];
    }
  | {
      state: "ready";
      productId: string;
      analysisEditionKey: string;
      threadId: string | null;
      questionsRemaining: number;
      messages: AiConsultingMessage[];
    };

export type AiConsultingUserMemory = {
  id: string;
  content: string;
  sourceMessageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiConsultingPreviewData = {
  session: AiConsultingSession;
  memories: AiConsultingUserMemory[];
  backHref?: string;
};

function policyMessage(decision: AiConsultingMessage["scopeDecision"]): string | null {
  if (decision === "CLARIFY") return "구매한 분석과 연결되는 부분을 조금 더 구체적으로 질문해 주세요. 이 질문은 횟수에서 차감되지 않았습니다.";
  if (decision === "DENY") return "현재 구매한 분석의 상담 범위를 벗어난 질문입니다. 이 질문은 횟수에서 차감되지 않았습니다.";
  if (decision === "SAFETY_REDIRECT") return "이 질문은 실제 전문가의 확인이 필요한 안전 민감 영역입니다. 운보다 AI는 진단·처방·법률 판단·구체 투자 실행을 대신하지 않으며, 질문 횟수도 차감하지 않았습니다.";
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

function reportHrefFor(productId: string, profileId: string, edition: string): string {
  const query = new URLSearchParams({ profileId, edition }).toString();

  if (isCompatibilityRomanticProductId(productId)) {
    return `/special-analysis/compatibility/report?${query}`;
  }
  if (isCompatibilityFamilyParentChildProductId(productId)) {
    return `/special-analysis/compatibility/family/parent-child/report?${query}`;
  }
  if (isCompatibilityFamilySiblingProductId(productId)) {
    return `/special-analysis/compatibility/family/siblings/report?${query}`;
  }
  if (isCompatibilityFamilyOtherProductId(productId)) {
    return `/special-analysis/compatibility/family/other/report?${query}`;
  }
  return `/paid-analysis/${encodeURIComponent(productId)}/report?${query}`;
}

export default function AiConsultingChatClient({
  profileId,
  productId,
  edition,
  previewData,
}: {
  profileId: string;
  productId: string;
  edition: string;
  previewData?: AiConsultingPreviewData;
}) {
  const [session, setSession] = useState<AiConsultingSession | null>(previewData?.session ?? null);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(!previewData);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memories, setMemories] = useState<AiConsultingUserMemory[]>(previewData?.memories ?? []);
  const [isMemoryLoading, setIsMemoryLoading] = useState(!previewData);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [savingMemoryMessageId, setSavingMemoryMessageId] = useState<string | null>(null);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const creditCheckoutEnabled = process.env.NEXT_PUBLIC_AI_CONSULTING_CREDIT_CHECKOUT_ENABLED === "true";
  const isPreview = Boolean(previewData);

  const presentation = useMemo(
    () => getAiConsultingPresentation(productId, edition),
    [edition, productId],
  );

  const loadSession = useCallback(async () => {
    if (previewData) {
      setSession(previewData.session);
      return;
    }
    const response = await fetch("/api/ai-consulting/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, productId, edition }),
    });
    const body = (await response.json()) as AiConsultingSession & { error?: string };
    if (!response.ok) throw new Error(body.error ?? "AI 상담을 불러오지 못했습니다.");
    setSession(body);
  }, [edition, previewData, productId, profileId]);

  const loadMemories = useCallback(async () => {
    if (previewData) {
      setMemories(previewData.memories);
      return;
    }
    const response = await fetch(`/api/ai-consulting/memories?profileId=${encodeURIComponent(profileId)}`, {
      cache: "no-store",
    });
    const body = (await response.json()) as { memories?: AiConsultingUserMemory[]; error?: string };
    if (!response.ok) throw new Error(body.error ?? "AI 기억을 불러오지 못했습니다.");
    setMemories(body.memories ?? []);
  }, [previewData, profileId]);

  useEffect(() => {
    if (previewData) {
      setSession(previewData.session);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    void loadSession()
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "AI 상담을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadSession, previewData]);

  useEffect(() => {
    if (previewData) {
      setMemories(previewData.memories);
      setIsMemoryLoading(false);
      return;
    }
    let cancelled = false;
    setIsMemoryLoading(true);
    setMemoryError(null);
    void loadMemories()
      .catch((reason) => {
        if (!cancelled) setMemoryError(reason instanceof Error ? reason.message : "AI 기억을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsMemoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadMemories, previewData]);

  const messages = useMemo(() => {
    if (!session || !("messages" in session)) return [];
    return session.messages;
  }, [session]);
  const hasPreviousConversation = messages.length > 0;
  const lastActivityAt = useMemo(
    () => formatRecentActivity(messages[messages.length - 1]?.createdAt),
    [messages],
  );
  const rememberedSourceMessageIds = useMemo(
    () => new Set(memories.map((memory) => memory.sourceMessageId).filter((value): value is string => Boolean(value))),
    [memories],
  );

  async function submitQuestion(event: FormEvent) {
    event.preventDefault();
    if (isPreview) return;
    const content = question.trim();
    if (!content || content.length < 2 || content.length > 300 || session?.state !== "ready" || !session.threadId) return;

    setIsSending(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-consulting/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          threadId: session.threadId,
          requestId: crypto.randomUUID(),
          question: content,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "AI 상담 답변을 완료하지 못했습니다.");
      setQuestion("");
      await loadSession();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI 상담 답변을 완료하지 못했습니다.");
    } finally {
      setIsSending(false);
    }
  }

  async function saveMemory(message: AiConsultingMessage) {
    if (isPreview || !session || !("threadId" in session) || !session.threadId || message.role !== "user") return;
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
          threadId: session.threadId,
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

  const reportHref = previewData?.backHref ?? reportHrefFor(productId, profileId, edition);
  const creditCheckoutHref = `/ai-consulting/credits?${new URLSearchParams({ profileId, productId, edition }).toString()}`;

  return (
    <main className="min-h-screen bg-[#f5f7fc] px-4 py-7 text-[#11162d] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        {!isPreview ? (
          <Link
            href={reportHref}
            className="inline-flex items-center rounded-full border border-[#dce1ef] bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#b9b2f6] hover:text-[#5e4bd1]"
          >
            ← 리포트로 돌아가기
          </Link>
        ) : null}

        {isPreview ? (
          <div className="mt-4 rounded-2xl border border-[#d8d3ff] bg-[#f3f1ff] px-4 py-3 text-sm leading-6 text-[#5e4bd1]">
            운영자 디자인 미리보기입니다. 질문 전송·질문권 차감·AI 기억 저장은 동작하지 않습니다.
          </div>
        ) : null}

        <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-[#35375f] bg-[radial-gradient(circle_at_82%_20%,rgba(113,89,233,0.26),transparent_28%),radial-gradient(circle_at_18%_85%,rgba(79,146,224,0.14),transparent_30%),linear-gradient(145deg,#0b1025_0%,#171a3d_58%,#24204d_100%)] p-6 text-white shadow-[0_22px_60px_rgba(24,29,67,0.14)] sm:p-8">
          <p className="text-xs font-black tracking-[0.16em] text-[#b9b2f6]">UNBODA AI CONSULTING</p>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] sm:text-3xl">리포트에서 이어지는 AI 상담</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-200">
            아무 질문이나 받는 일반 챗봇이 아니라, 이미 구매한 리포트의 계산 결과와 해석 범위를 바탕으로 남은 질문을 이어갑니다.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-4">
              <p className="text-xs font-bold tracking-[0.12em] text-[#c9c3ff]">상담 기준 리포트</p>
              <p className="mt-2 text-base font-bold text-white">{presentation.productTitle}</p>
              <p className="mt-1 text-sm text-slate-300">{presentation.editionLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-5 py-4 sm:min-w-36">
              <p className="text-xs font-bold tracking-[0.12em] text-slate-300">남은 질문</p>
              <p className="mt-1 text-2xl font-black text-white">
                {session && "questionsRemaining" in session ? session.questionsRemaining : "—"}
                <span className="ml-1 text-sm font-semibold text-slate-300">회</span>
              </p>
            </div>
          </div>
        </header>

        {isLoading ? (
          <section className="mt-5 rounded-[1.75rem] border border-[#dce1ef] bg-white p-7 text-center shadow-sm">
            상담 상태를 확인하고 있어요.
          </section>
        ) : null}

        {!isLoading && session?.state === "report_required" ? (
          <section className="mt-5 rounded-[1.75rem] border border-[#dce1ef] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">유료 리포트가 먼저 완성되어야 합니다</h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-700">AI 상담은 완료된 구매 분석을 근거로만 답변합니다.</p>
          </section>
        ) : null}

        {!isLoading && session?.state === "credit_required" && !session.threadId ? (
          <section className="mt-5 rounded-[1.75rem] border border-[#dce1ef] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">AI 질문권이 필요합니다</h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-700">
              {creditCheckoutEnabled
                ? "현재 사용 가능한 질문권이 없습니다. 이 프로필의 공통 질문권을 구매하면 상담을 시작할 수 있습니다."
                : "현재 사용 가능한 질문권이 없습니다. AI 질문권 결제는 준비 중입니다."}
            </p>
            <Link href={creditCheckoutHref} className="mt-5 inline-flex rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white">
              {creditCheckoutEnabled ? "AI 질문권 구매·내역" : "질문권 내역 보기"}
            </Link>
          </section>
        ) : null}

        {!isLoading && session && (session.state === "ready" || (session.state === "credit_required" && session.threadId)) ? (
          <>
            <section className="mt-5 rounded-[1.75rem] border border-[#d8d3ff] bg-[linear-gradient(145deg,#ffffff_0%,#f8f7ff_100%)] p-5 shadow-sm sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">CONSULTING SCOPE</p>
                  <h2 className="mt-2 text-xl font-black">이 상담에서 이어서 물어볼 수 있어요</h2>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">{presentation.scopeLabel}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-[#d8d3ff] bg-white px-3 py-2 text-[#5e4bd1]">리포트 근거 기반</span>
                    <span className="rounded-full border border-[#dce1ef] bg-white px-3 py-2 text-slate-600">정상 답변 완료 시 1회 차감</span>
                    <span className="rounded-full border border-[#dce1ef] bg-white px-3 py-2 text-slate-600">범위 밖 질문은 미차감</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-slate-500">추천 질문</p>
                  <div className="mt-3 space-y-2">
                    {presentation.suggestedQuestions.map((suggestion) => (
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

            <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#dce1ef] bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-bold">
                  {hasPreviousConversation ? "이전 상담 이어보기" : "새 상담"}
                </span>
                {hasPreviousConversation ? (
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    이전 대화 {messages.length}개를 불러왔습니다{lastActivityAt ? ` · 최근 상담 ${lastActivityAt}` : ""}.
                  </p>
                ) : (
                  <p className="mt-1 text-sm leading-6 text-slate-600">추천 질문을 눌러 시작하거나 직접 질문해 주세요.</p>
                )}
              </div>
              {!isPreview ? (
                <Link href={creditCheckoutHref} className="self-start text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 sm:self-auto">
                  질문권 내역
                </Link>
              ) : null}
            </section>

            <section className="mt-4 rounded-[1.75rem] border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">LONG-TERM MEMORY</p>
                  <h2 className="mt-2 text-base font-bold">AI가 기억하는 내 상황</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                    내가 직접 저장한 내용만 다음 상담의 현재 상황으로 참고합니다. AI가 임의로 내용을 만들거나 자동 저장하지 않습니다.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#eef0f6] px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {isMemoryLoading ? "확인 중" : `${memories.length}개 저장됨`}
                </span>
              </div>

              {!isMemoryLoading && memories.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm leading-6 text-slate-600">
                  아직 기억한 내용이 없습니다. 상담 중 내가 작성한 메시지에서 <strong className="font-semibold text-slate-800">이 내용 기억하기</strong>를 누르면 그대로 저장됩니다.
                </div>
              ) : null}

              {memories.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {memories.map((memory) => (
                    <div key={memory.id} className="flex flex-col gap-3 rounded-2xl bg-[#f7f8fc] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                      <p className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-slate-800">{memory.content}</p>
                      {!isPreview ? (
                        <button
                          type="button"
                          onClick={() => void deleteMemory(memory)}
                          disabled={deletingMemoryId === memory.id}
                          className="shrink-0 self-start text-xs font-semibold text-slate-500 underline underline-offset-4 disabled:opacity-50"
                        >
                          {deletingMemoryId === memory.id ? "삭제 중" : "기억에서 삭제"}
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs font-semibold text-slate-500">미리보기</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                다음 답변에는 관련도가 높은 장기 기억을 최대 8개까지만 사용합니다. 주민번호·계좌번호·비밀번호 같은 민감정보는 저장하지 마세요.
              </p>
            </section>

            <section data-section="conversation" className="relative mt-4 rounded-[1.75rem] border border-[#dce1ef] bg-[#f9faff] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">CONVERSATION</p>
                  <h2 className="mt-1 text-lg font-black">리포트에서 이어지는 대화</h2>
                </div>
                {hasPreviousConversation ? <span className="text-xs font-semibold text-slate-500">{messages.length}개 메시지</span> : null}
              </div>

              <div className="space-y-4 pb-44 sm:pb-40">
                {messages.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-[#cfd5e6] bg-white p-7 text-center text-sm leading-7 text-slate-600">
                    구매한 분석에서 더 확인하고 싶은 점을 질문해 주세요.
                  </div>
                ) : null}

                {messages.map((message) => {
                  const policy = message.role === "user" ? policyMessage(message.scopeDecision) : null;
                  const remembered = message.role === "user" && rememberedSourceMessageIds.has(message.id);
                  const savingMemory = message.role === "user" && savingMemoryMessageId === message.id;
                  return (
                    <div key={message.id} className="space-y-2">
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
              {session.state === "ready" ? (
                <form onSubmit={submitQuestion} data-ai-composer="conversation-sticky" className="sticky bottom-4 z-10 -mt-36 rounded-[1.75rem] border border-[#d8d3ff] bg-white/95 p-4 shadow-[0_18px_50px_rgba(33,40,83,0.14)] backdrop-blur">
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value.slice(0, 300))}
                    placeholder={hasPreviousConversation
                      ? "지난 상담에서 이어서 궁금한 점을 질문해 주세요."
                      : "이 분석에서 더 궁금한 점을 질문해 주세요."}
                    rows={3}
                    disabled={isSending}
                    className="w-full resize-none rounded-2xl bg-[#f3f4f9] px-4 py-3 text-[15px] leading-7 text-slate-800 outline-none ring-[#6f5ce7] focus:ring-1 disabled:opacity-60"
                  />
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs leading-5 text-slate-500">
                      {isPreview ? "미리보기에서는 질문이 전송되지 않습니다." : `${question.length}/300 · 범위를 벗어난 질문은 차감되지 않습니다.`}
                    </span>
                    <button
                      type="submit"
                      disabled={isPreview || isSending || question.trim().length < 2}
                      className="rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5f4fd2] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isPreview ? "미리보기" : isSending ? "답변 확인 중..." : "질문하기"}
                    </button>
                  </div>
                </form>
              ) : (
                <section className="mt-5 rounded-2xl bg-[#eef0f6] px-5 py-4 text-sm leading-7 text-slate-700">
                  <p>질문권을 모두 사용했습니다. 기존 상담 기록과 직접 저장한 AI 기억은 계속 확인하고 관리할 수 있습니다.</p>
                  {!isPreview ? (
                    <Link href={creditCheckoutHref} className="mt-3 inline-flex font-semibold text-[#5e4bd1] underline underline-offset-4">
                      {creditCheckoutEnabled ? "AI 질문권 추가 구매·내역" : "질문권 내역 보기"}
                    </Link>
                  ) : null}
                </section>
              )}
  
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
