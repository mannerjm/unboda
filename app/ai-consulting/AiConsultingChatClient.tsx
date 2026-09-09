"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  scopeDecision: "ALLOW" | "CLARIFY" | "DENY" | "SAFETY_REDIRECT" | null;
  charged: boolean;
  createdAt: string;
};

type Session =
  | { state: "report_required"; productId: string; analysisEditionKey: string }
  | {
      state: "credit_required";
      productId: string;
      analysisEditionKey: string;
      questionsRemaining: 0;
      threadId: string | null;
      messages: Message[];
    }
  | {
      state: "ready";
      productId: string;
      analysisEditionKey: string;
      threadId: string | null;
      questionsRemaining: number;
      messages: Message[];
    };

type UserMemory = {
  id: string;
  content: string;
  sourceMessageId: string | null;
  createdAt: string;
  updatedAt: string;
};

function policyMessage(decision: Message["scopeDecision"]): string | null {
  if (decision === "CLARIFY") return "구매한 분석과 연결되는 부분을 조금 더 구체적으로 질문해 주세요. 이 질문은 횟수에서 차감되지 않았습니다.";
  if (decision === "DENY") return "현재 구매한 심층 분석의 상담 범위를 벗어난 질문입니다. 이 질문은 횟수에서 차감되지 않았습니다.";
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

export default function AiConsultingChatClient({
  profileId,
  productId,
  edition,
}: {
  profileId: string;
  productId: string;
  edition: string;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [isMemoryLoading, setIsMemoryLoading] = useState(true);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [savingMemoryMessageId, setSavingMemoryMessageId] = useState<string | null>(null);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const creditCheckoutEnabled = process.env.NEXT_PUBLIC_AI_CONSULTING_CREDIT_CHECKOUT_ENABLED === "true";

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/ai-consulting/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, productId, edition }),
    });
    const body = (await response.json()) as Session & { error?: string };
    if (!response.ok) throw new Error(body.error ?? "AI 상담을 불러오지 못했습니다.");
    setSession(body);
  }, [edition, productId, profileId]);

  const loadMemories = useCallback(async () => {
    const response = await fetch(`/api/ai-consulting/memories?profileId=${encodeURIComponent(profileId)}`, {
      cache: "no-store",
    });
    const body = (await response.json()) as { memories?: UserMemory[]; error?: string };
    if (!response.ok) throw new Error(body.error ?? "AI 기억을 불러오지 못했습니다.");
    setMemories(body.memories ?? []);
  }, [profileId]);

  useEffect(() => {
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
  }, [loadSession]);

  useEffect(() => {
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
  }, [loadMemories]);

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

  async function saveMemory(message: Message) {
    if (!session || !("threadId" in session) || !session.threadId || message.role !== "user") return;
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

  async function deleteMemory(memory: UserMemory) {
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

  const reportHref = `/paid-analysis/${encodeURIComponent(productId)}/report?${new URLSearchParams({ profileId, edition }).toString()}`;
  const creditCheckoutHref = `/ai-consulting/credits?${new URLSearchParams({ profileId, productId, edition }).toString()}`;

  return (
    <main className="min-h-screen bg-[#f7f2e8] px-5 py-8 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <Link href={reportHref} className="text-sm font-semibold text-stone-600 hover:text-stone-900">
          ← 심층 분석으로 돌아가기
        </Link>

        <header className="mt-7 rounded-[2rem] bg-stone-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">UNBODA AI CONSULTING</p>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">구매한 분석에서 이어지는 AI 상담</h1>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            AI 질문권은 이 프로필에서 구매한 심층 분석들에 공통으로 사용할 수 있고, 정상 답변이 저장된 질문만 1회 차감합니다.
          </p>
        </header>

        {isLoading ? (
          <section className="mt-6 rounded-[2rem] bg-white p-8 text-center shadow-sm">상담 상태를 확인하고 있어요.</section>
        ) : null}

        {!isLoading && session?.state === "report_required" ? (
          <section className="mt-6 rounded-[2rem] bg-white p-8 shadow-sm">
            <h2 className="text-lg font-bold">심층 분석이 먼저 완성되어야 합니다</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">AI 상담은 완료된 구매 분석을 근거로만 답변합니다.</p>
          </section>
        ) : null}

        {!isLoading && session?.state === "credit_required" && !session.threadId ? (
          <section className="mt-6 rounded-[2rem] bg-white p-8 shadow-sm">
            <h2 className="text-lg font-bold">AI 질문권이 필요합니다</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              {creditCheckoutEnabled
                ? "현재 사용 가능한 질문권이 없습니다. 이 프로필의 공통 질문권을 구매하면 상담을 시작할 수 있습니다."
                : "현재 사용 가능한 질문권이 없습니다. AI 질문권 결제는 준비 중입니다."}
            </p>
            <Link href={creditCheckoutHref} className="mt-5 inline-flex rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white">
              {creditCheckoutEnabled ? "AI 질문권 구매·내역" : "질문권 내역 보기"}
            </Link>
          </section>
        ) : null}

        {!isLoading && session && (session.state === "ready" || (session.state === "credit_required" && session.threadId)) ? (
          <>
            <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-semibold">
                  {hasPreviousConversation ? "이전 상담 이어보기" : "상담 기록"}
                </span>
                {hasPreviousConversation ? (
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    이전 대화 {messages.length}개를 불러왔습니다{lastActivityAt ? ` · 최근 상담 ${lastActivityAt}` : ""}.
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-stone-600">남은 질문 {session.questionsRemaining}회</span>
                <Link href={creditCheckoutHref} className="text-sm font-semibold text-stone-900 underline underline-offset-4">
                  질문권 내역
                </Link>
              </div>
            </section>

            <section className="mt-4 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">LONG-TERM MEMORY</p>
                  <h2 className="mt-2 text-base font-bold text-stone-950">AI가 기억하는 내 상황</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                    내가 직접 저장한 내용만 다음 상담의 현재 상황으로 참고합니다. AI가 임의로 내용을 만들거나 자동 저장하지 않습니다.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                  {isMemoryLoading ? "확인 중" : `${memories.length}개 저장됨`}
                </span>
              </div>

              {!isMemoryLoading && memories.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-500">
                  아직 기억한 내용이 없습니다. 상담 중 내가 작성한 메시지에서 <strong className="font-semibold text-stone-700">이 내용 기억하기</strong>를 누르면 그대로 저장됩니다.
                </div>
              ) : null}

              {memories.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {memories.map((memory) => (
                    <div key={memory.id} className="flex flex-col gap-3 rounded-2xl bg-stone-50 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                      <p className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-stone-800">{memory.content}</p>
                      <button
                        type="button"
                        onClick={() => void deleteMemory(memory)}
                        disabled={deletingMemoryId === memory.id}
                        className="shrink-0 self-start text-xs font-semibold text-stone-500 underline underline-offset-4 disabled:opacity-50"
                      >
                        {deletingMemoryId === memory.id ? "삭제 중" : "기억에서 삭제"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <p className="mt-4 text-xs leading-5 text-stone-500">
                다음 답변에는 관련도가 높은 장기 기억을 최대 8개까지만 사용합니다. 주민번호·계좌번호·비밀번호 같은 민감정보는 저장하지 마세요.
              </p>
            </section>

            <div className="mt-4 space-y-4">
              {messages.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-8 text-center text-sm leading-7 text-stone-500">
                  구매한 심층 분석에서 더 확인하고 싶은 점을 질문해 주세요.
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
                        ? "ml-auto max-w-[88%] rounded-3xl rounded-br-lg bg-stone-900 px-5 py-4 text-sm leading-7 text-white"
                        : "max-w-[94%] whitespace-pre-wrap rounded-3xl rounded-bl-lg border border-stone-200 bg-white px-5 py-4 text-sm leading-7 text-stone-800 shadow-sm"}
                    >
                      {message.content}
                    </div>
                    {message.role === "user" ? (
                      <div className="ml-auto flex max-w-[88%] justify-end">
                        {remembered ? (
                          <span className="text-xs font-semibold text-stone-500">✓ AI가 기억 중</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void saveMemory(message)}
                            disabled={savingMemory}
                            className="text-xs font-semibold text-stone-600 underline underline-offset-4 disabled:opacity-50"
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
              <form onSubmit={submitQuestion} className="sticky bottom-4 mt-6 rounded-[2rem] border border-stone-200 bg-white p-4 shadow-xl">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value.slice(0, 300))}
                  placeholder={hasPreviousConversation
                    ? "지난 상담에서 이어서 궁금한 점을 질문해 주세요."
                    : "이 분석에서 더 궁금한 점을 질문해 주세요."}
                  rows={3}
                  disabled={isSending}
                  className="w-full resize-none rounded-2xl bg-stone-100 px-4 py-3 text-sm leading-6 outline-none ring-stone-900 focus:ring-1 disabled:opacity-60"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-stone-500">{question.length}/300 · 범위를 벗어난 질문은 차감되지 않습니다.</span>
                  <button
                    type="submit"
                    disabled={isSending || question.trim().length < 2}
                    className="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSending ? "답변 확인 중..." : "질문하기"}
                  </button>
                </div>
              </form>
            ) : (
              <section className="mt-6 rounded-2xl bg-stone-200 px-5 py-4 text-sm leading-7 text-stone-700">
                <p>질문권을 모두 사용했습니다. 기존 상담 기록과 직접 저장한 AI 기억은 계속 확인하고 관리할 수 있습니다.</p>
                <Link href={creditCheckoutHref} className="mt-3 inline-flex font-semibold text-stone-950 underline underline-offset-4">
                  {creditCheckoutEnabled ? "AI 질문권 추가 구매·내역" : "질문권 내역 보기"}
                </Link>
              </section>
            )}
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
