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

  const hasPreviousConversation = Boolean(
    session && session.state !== "report_required" && session.messages.length > 0,
  );
  const latestMessageAt = session && session.state !== "report_required"
    ? session.messages[session.messages.length - 1]?.createdAt
    : undefined;

  // A newly purchased report with zero questions used to hide this entire section.
  // Always explain the consulting route and current entitlement instead.
  if (!profileId || !edition || !presentation) return null;

  const href = `/ai-consulting?${new URLSearchParams({ profileId, productId, edition }).toString()}`;
  const reportPending = session?.state === "report_required";
  const depleted = session?.state === "credit_required";
  const lastActivityAt = hasPreviousConversation
    ? formatRecentActivity(latestMessageAt)
    : null;
  const historySummary = hasPreviousConversation && session && session.state !== "report_required"
    ? `이전 상담 ${session.messages.length}개 메시지${lastActivityAt ? ` · 최근 ${lastActivityAt}` : ""}`
    : null;

  return (
    <section className="mx-auto mb-8 mt-5 max-w-4xl px-4 sm:px-8">
      <div className="overflow-hidden rounded-[1.8rem] border border-[#d8d3ff] bg-[linear-gradient(145deg,#ffffff_0%,#f7f6ff_100%)] shadow-[0_16px_45px_rgba(54,45,112,0.07)]">
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#6f5ce7]">AI CONSULTING · 이 리포트를 바탕으로 AI에게 질문하기</p>
            <h2 className="mt-3 text-xl font-black text-[#11162d]">
              {hasPreviousConversation ? "지난 AI 상담을 이어서 질문하기" : "이 리포트로 AI 상담 이어가기"}
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-700">
              <strong className="font-bold text-[#11162d]">{presentation.productTitle}</strong>를 읽다가 이해하기 어려웠던 부분을 AI에게 바로 물어보세요. 이 리포트를 기준으로 상담을 시작하고, 저장된 이전 상담이 있다면 이어서 확인할 수 있습니다.
              질문권은 프로필 공용입니다. 다른 유료 분석을 추가로 보유하면 통합 AI 상담에서 그 분석 범위도 함께 사용할 수 있습니다.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-[#d8d3ff] bg-white px-3 py-2 text-[#5e4bd1]">{presentation.editionLabel}</span>
              <span className="rounded-full border border-[#dce1ef] bg-white px-3 py-2 text-slate-600">
                {session?.state === "ready" ? `남은 질문 ${session.questionsRemaining}회` : depleted ? "남은 질문 0회" : reportPending ? "리포트 준비 중" : "상담 상태 확인 중"}
              </span>
            </div>

            {historySummary ? (
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{historySummary}</p>
            ) : null}
            {reportPending ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">리포트 생성이 끝나면 이 분석을 바탕으로 상담할 수 있습니다.</p>
            ) : depleted ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">남은 질문권이 0회입니다. 이전 상담 기록은 계속 볼 수 있습니다. 새 답변에는 질문권이 필요합니다.</p>
            ) : null}

            {reportPending ? (
              <span className="mt-5 inline-flex rounded-2xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-600">리포트 준비 중</span>
            ) : (
              <Link
                href={href}
                className="mt-5 inline-flex rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5f4fd2]"
              >
                {depleted
                  ? hasPreviousConversation ? "이전 상담 기록 보기" : "AI 상담 이용 안내 확인"
                  : hasPreviousConversation
                    ? "이전 상담 이어보기"
                    : "이 리포트로 AI 상담 시작하기"}
              </Link>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-[#dce1ef] bg-white p-4">
            <p className="text-xs font-bold tracking-[0.13em] text-slate-500">이 리포트에서 시작하기 좋은 질문</p>
            <div className="mt-3 space-y-2">
              {presentation.suggestedQuestions.slice(0, 3).map((question) => (
                <div key={question} className="rounded-2xl bg-[#f7f8fc] px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
                  {question}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              AI 상담에서는 구매한 분석 범위에 맞춰 답변합니다. 질문권이 남아 있는지 상담 화면에서 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
