"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

  // Checkout is intentionally not exposed yet. Show the consultation entry only
  // when this profile already has a positive shared credit balance, or when an
  // actual prior conversation exists so the user can still read it after depletion.
  if (
    !profileId ||
    !edition ||
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
    <section className="mx-auto mb-10 mt-6 max-w-3xl px-5 sm:px-8">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">AI CONSULTING</p>
        <h2 className="mt-3 text-xl font-bold text-stone-950">
          {hasPreviousConversation ? "지난 AI 상담을 이어서 질문하기" : "이 분석을 바탕으로 AI에게 질문하기"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          이 프로필의 AI 질문권을 구매한 심층 분석들에서 공통으로 사용할 수 있고, 정상 답변이 완료된 질문만 1회 차감합니다.
        </p>
        <div className="mt-4 rounded-2xl bg-stone-100 px-4 py-3 text-sm leading-6 text-stone-700">
          {historySummary ? <p className="font-semibold text-stone-900">{historySummary}</p> : null}
          <p className={historySummary ? "mt-1" : undefined}>
            {depleted
              ? "남은 질문 0회 · 이전 상담 기록은 계속 볼 수 있습니다."
              : `남은 질문 ${session.questionsRemaining}회`}
          </p>
        </div>
        <Link
          href={href}
          className="mt-5 inline-flex rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          {depleted
            ? "이전 상담 기록 보기"
            : hasPreviousConversation
              ? "이전 상담 이어보기"
              : "AI 상담 시작하기"}
        </Link>
      </div>
    </section>
  );
}
