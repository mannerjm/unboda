"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAiConsultingPresentation } from "@/app/lib/aiConsultingPresentation";

type SessionPreview =
  | { state: "report_required" }
  | {
      state: "credit_required";
      questionsRemaining: 0;
      threadId: string | null;
      messages: { createdAt: string }[];
    }
  | {
      state: "ready";
      questionsRemaining: number;
      threadId: string | null;
      messages: { createdAt: string }[];
    };

export default function AiConsultingEntryCard({
  productId,
  profileId,
  edition,
  reportCompleted = false,
}: {
  productId: string;
  profileId?: string;
  edition?: string;
  /** An authenticated server read has verified the persisted report is completed. */
  reportCompleted?: boolean;
}) {
  const [session, setSession] = useState<SessionPreview | null>(null);
  const [reportDisplayed, setReportDisplayed] = useState(reportCompleted);
  const presentation = useMemo(
    () => edition ? getAiConsultingPresentation(productId, edition) : null,
    [edition, productId],
  );

  useEffect(() => {
    if (reportCompleted) setReportDisplayed(true);
  }, [reportCompleted]);

  useEffect(() => {
    if (!profileId || !edition) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ profileId, productId, edition });
    let inFlight = false;
    let lastState: SessionPreview["state"] | null = null;

    const refreshSession = async () => {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/ai-consulting/session?${query.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const result = (await response.json()) as SessionPreview;
        if (controller.signal.aborted) return;
        lastState = result.state;
        setSession(result);
      } catch {
        // Keep the last known state; a subsequent completed-report signal or
        // bounded status retry may restore the read-only session preview.
      } finally {
        inFlight = false;
      }
    };

    // This card can read report_required while the report body is still being
    // generated. A one-shot lookup left that value on screen after completion.
    const onReportReady = (event: Event) => {
      const detail = (event as CustomEvent<{
        productId: string; profileId: string; edition?: string;
      }>).detail;
      if (
        detail?.profileId !== profileId ||
        detail.productId !== productId ||
        (detail.edition && detail.edition !== edition)
      ) return;
      setReportDisplayed(true);
      void refreshSession();
    };

    window.addEventListener("unboda:paid-report-ready", onReportReady);
    void refreshSession();
    // Retry only while the report was not yet saved (or the initial read
    // failed); stop once credit status is known. No report-generation writes.
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - startedAt < 10 * 60 * 1000 &&
        (lastState === null || lastState === "report_required")
      ) void refreshSession();
    }, 8_000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("unboda:paid-report-ready", onReportReady);
    };
  }, [edition, productId, profileId]);

  if (!profileId || !edition || !presentation) return null;

  const href = `/ai-consulting?${new URLSearchParams({ profileId, productId, edition }).toString()}`;
  // Never show a misleading "report in preparation" badge while an already
  // persisted report is visible. Session status may precede report completion.
  const reportPending = session?.state === "report_required" && !reportDisplayed;
  const reportAvailable = reportDisplayed
    || session?.state === "ready"
    || session?.state === "credit_required";
  const depleted = session?.state === "credit_required";
  const hasPreviousConversation = Boolean(
    session && session.state !== "report_required" && session.messages.length > 0,
  );

  // A real generating report has no follow-up CTA yet.
  if (!reportAvailable) return null;

  const balanceLabel = session?.state === "ready"
    ? `남은 질문 ${session.questionsRemaining}회`
    : depleted
      ? "남은 질문 0회"
      : "상담 상태 확인 중";

  const actionLabel = depleted
    ? hasPreviousConversation
      ? "지난 상담 보기"
      : "AI 상담 화면 보기"
    : hasPreviousConversation
      ? "지난 상담 이어가기"
      : session?.state === "ready"
        ? "이 리포트로 AI에게 질문하기"
        : "AI 상담 화면 보기";

  return (
    <section aria-labelledby="report-ai-consulting-title" className="mx-auto mb-8 mt-5 max-w-4xl px-4 sm:px-8">
      <div className="rounded-[1.75rem] border border-[#d8d3ff] bg-white p-5 shadow-[0_12px_36px_rgba(54,45,112,0.06)] sm:p-7">
        <p className="text-xs font-bold tracking-[0.08em] text-[#5e4bd1]">리포트 다음 단계 · AI 상담</p>
        <h2 id="report-ai-consulting-title" className="mt-2 text-xl font-black leading-snug text-[#11162d] sm:text-2xl">
          이 분석, 궁금한 점을 바로 물어보세요
        </h2>
        <p className="mt-2 text-[15px] leading-7 text-slate-700">
          <strong className="font-bold text-[#11162d]">{presentation.productTitle}</strong> 내용을 바탕으로 어려운 부분을 쉽게 풀어 설명해 드려요.
        </p>

        <div className="mt-4 rounded-2xl bg-[#f7f8ff] px-4 py-4 sm:px-5">
          <p className="text-xs font-bold text-[#5e4bd1]">이렇게 물어볼 수 있어요</p>
          <ul className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-3">
            {presentation.suggestedQuestions.slice(0, 2).map((question) => (
              <li key={question} className="flex-1 rounded-xl border border-[#e4e6f4] bg-white px-3 py-2 text-sm font-medium leading-6 text-[#252c46]">
                “{question}”
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-[#d8d3ff] bg-[#f7f6ff] px-3 py-1.5 font-bold text-[#5e4bd1]">
              {balanceLabel}
            </span>
            {depleted ? (
              <span className="text-sm leading-6 text-slate-600">새 답변을 받으려면 질문권이 필요해요.</span>
            ) : reportPending ? (
              <span className="text-sm leading-6 text-slate-600">상담 연결 상태를 다시 확인하고 있어요.</span>
            ) : null}
          </div>
          {reportPending ? (
            <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-600">
              상담 연결 확인 중
            </span>
          ) : (
            <Link
              href={href}
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5f4fd2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5ce7]"
            >
              {actionLabel} <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          질문권은 보유 분석에서 함께 사용해요. 정상 답변 1회에 질문권 1회가 차감됩니다.
        </p>
      </div>
    </section>
  );
}
