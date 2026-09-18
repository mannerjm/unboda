"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAiConsultingPresentation } from "@/app/lib/aiConsultingPresentation";

type SessionPreviewMessage = {
  createdAt: string;
};

type SessionPreview =
  | { state: "report_required" }
  | {
      state: "credit_required";
      questionsRemaining: 0;
      threadId: string | null;
      messages: SessionPreviewMessage[];
    }
  | {
      state: "ready";
      questionsRemaining: number;
      threadId: string | null;
      messages: SessionPreviewMessage[];
    };

function formatRecentActivity(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function AiConsultingEntryCard({
  productId,
  profileId,
  edition,
}: {
  productId: string;
  profileId?: string;
  edition?: string;
}) {
  const [session, setSession] = useState<SessionPreview | null>(null);
  const presentation = useMemo(
    () => edition ? getAiConsultingPresentation(productId, edition) : null,
    [edition, productId],
  );

  useEffect(() => {
    if (!profileId || !edition) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ profileId, productId, edition });

    void fetch(`/api/ai-consulting/session?${query.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as SessionPreview;
      })
      .then((value) => setSession(value))
      .catch(() => undefined);

    return () => controller.abort();
  }, [edition, productId, profileId]);

  const hasPreviousConversation =
    session && session.state !== "report_required" && session.messages.length > 0;

  if (
    !profileId ||
    !edition ||
    !presentation ||
    !session ||
    session.state === "report_required" ||
    (session.state === "credit_required" && !hasPreviousConversation)
  ) {
    return null;
  }

  const href = `/ai-consulting?${new URLSearchParams({ profileId, productId, edition }).toString()}`;
  const depleted = session.state === "credit_required";
  const lastActivityAt = hasPreviousConversation
    ? formatRecentActivity(session.messages[session.messages.length - 1]?.createdAt)
    : null;
  const historySummary = hasPreviousConversation
    ? `이전 상담 ${session.messages.length}개 메시지${lastActivityAt ? ` · 최근 ${lastActivityAt}` : ""}`
    : null;

  return (
    <section className="mx-auto mb-8 mt-5 max-w-4xl px-4 sm:px-8">
      <div className="overflow-hidden rounded-[1.8rem] border border-[#d8d3ff] bg-[linear-gradient(145deg,#ffffff_0%,#f7f6ff_100%)] shadow-[0_16px_45px_rgba(54,45,112,0.07)]">
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#6f5ce7]">AI CONSULTING</p>
            <h2 className="mt-3 text-xl font-black text-[#11162d]">
              {hasPreviousConversation ? "지난 AI 상담을 이어서 질문하기" : "이 리포트를 바탕으로 AI에게 질문하기"}
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-700">
              일반 챗봇이 아니라 <strong className="font-bold text-[#11162d]">{presentation.productTitle}</strong> 리포트의 계산 결과와 해석 범위 안에서 이어서 답변합니다.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-[#d8d3ff] bg-white px-3 py-2 text-[#5e4bd1]">{presentation.editionLabel}</span>
              <span className="rounded-full border border-[#dce1ef] bg-white px-3 py-2 text-slate-600">
                {depleted ? "남은 질문 0회" : `남은 질문 ${session.questionsRemaining}회`}
              </span>
            </div>

            {historySummary ? (
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{historySummary}</p>
            ) : null}
            {depleted ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">남은 질문 0회 · 이전 상담 기록은 계속 볼 수 있습니다.</p>
            ) : null}

            <Link
              href={href}
              className="mt-5 inline-flex rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5f4fd2]"
            >
              {depleted
                ? "이전 상담 기록 보기"
                : hasPreviousConversation
                  ? "이전 상담 이어보기"
                  : "AI 상담 시작하기"}
            </Link>
          </div>

          <div className="rounded-[1.5rem] border border-[#dce1ef] bg-white p-4">
            <p className="text-xs font-bold tracking-[0.13em] text-slate-500">이어서 물어볼 수 있는 질문</p>
            <div className="mt-3 space-y-2">
              {presentation.suggestedQuestions.slice(0, 3).map((question) => (
                <div key={question} className="rounded-2xl bg-[#f7f8fc] px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
                  {question}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              범위를 벗어난 질문은 AI 답변을 생성하지 않으며 질문권도 차감되지 않습니다. 확인 요청·안전 안내도 미차감입니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
