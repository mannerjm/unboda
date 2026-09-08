"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionPreview =
  | { state: "report_required" | "grant_required" }
  | { state: "ready"; questionsRemaining: number; threadId: string | null }
  | { state: "unavailable"; reason: "revoked" | "expired" | "exhausted"; questionsRemaining: number; threadId: string | null };

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

  // The add-on is intentionally invisible until a real consulting grant exists.
  // Payment/grant issuance is a later commercial phase; no dead CTA is exposed.
  if (!profileId || !edition || !session || !("questionsRemaining" in session)) {
    return null;
  }

  const href = `/ai-consulting?${new URLSearchParams({ profileId, productId, edition }).toString()}`;
  const unavailable = session.state === "unavailable";

  return (
    <section className="mx-auto mb-10 mt-6 max-w-3xl px-5 sm:px-8">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">AI CONSULTING</p>
        <h2 className="mt-3 text-xl font-bold text-stone-950">이 분석을 바탕으로 AI에게 이어서 질문하기</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          구매한 심층 분석의 범위 안에서만 답하고, 답변이 정상 완료된 질문만 이용 횟수에서 차감합니다.
        </p>
        <div className="mt-4 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
          {unavailable
            ? `현재 새 질문은 사용할 수 없습니다. 남은 질문 ${session.questionsRemaining}회`
            : `남은 질문 ${session.questionsRemaining}회`}
        </div>
        <Link
          href={href}
          className="mt-5 inline-flex rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          {unavailable ? "상담 기록 보기" : session.threadId ? "AI 상담 이어가기" : "AI 상담 시작하기"}
        </Link>
      </div>
    </section>
  );
}
