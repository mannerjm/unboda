"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string;
  rating: number;
  body: string;
  aiConsultingUsed: boolean;
  createdAt: string;
};

type Summary = {
  count: number;
  averageRating: number | null;
  reviews: Review[];
};

function stars(rating: number): string {
  const rounded = Math.max(1, Math.min(5, Math.round(rating)));
  return "★".repeat(rounded) + "☆".repeat(Math.max(0, 5 - rounded));
}

function formatMonth(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

export default function ProductReviewSummary({ productId }: { productId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/reviews?productId=" + encodeURIComponent(productId), { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ summary: Summary }>;
      })
      .then((data) => {
        if (active && data?.summary) setSummary(data.summary);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [productId]);

  if (!summary) return null;

  return (
    <section className="mt-5 rounded-[1.5rem] border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-6" aria-label="구매 인증 후기">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.13em] text-[#6f5ce7]">구매 인증 후기</p>
          <h3 className="mt-2 text-lg font-black text-[#11162d]">실제로 이 분석을 구매한 고객의 후기</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">완료된 구매 리포트가 확인된 계정만 후기를 작성할 수 있습니다.</p>
        </div>
        {summary.count > 0 && summary.averageRating !== null ? (
          <div className="text-right">
            <p className="text-lg font-black text-[#11162d]">{summary.averageRating.toFixed(1)} / 5</p>
            <p className="text-xs font-semibold text-slate-500">공개 후기 {summary.count}개</p>
          </div>
        ) : null}
      </div>

      {summary.count === 0 ? (
        <div className="mt-4 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm leading-6 text-slate-600">
          아직 공개된 구매 인증 후기가 없습니다. 후기 수를 부풀리지 않고 실제 구매 고객의 후기만 표시합니다.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {summary.reviews.slice(0, 4).map((review) => (
            <article key={review.id} className="rounded-2xl border border-[#e3e6ef] bg-[#fafbff] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-[#6f5ce7]" aria-label={String(review.rating) + "점"}>
                  {stars(review.rating)}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[#eef0f6] px-2.5 py-1 text-[11px] font-bold text-slate-600">구매 인증</span>
                  {review.aiConsultingUsed ? <span className="rounded-full bg-[#eeecff] px-2.5 py-1 text-[11px] font-bold text-[#5e4bd1]">AI 상담 이용</span> : null}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{review.body}</p>
              <p className="mt-2 text-[11px] text-slate-400">{formatMonth(review.createdAt)} 작성</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
