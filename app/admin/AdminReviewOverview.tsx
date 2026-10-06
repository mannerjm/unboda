import Link from "next/link";
import type { AdminReviewDashboard } from "@/app/lib/reviews/server";

function rate(value: number | null): string {
  return value === null ? "—" : (value * 100).toFixed(1) + "%";
}

export default function AdminReviewOverview({ report }: { report: AdminReviewDashboard | null }) {
  return (
    <section className="border-b border-slate-200 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">TRUST & VERIFIED REVIEWS</p>
          <h2 className="mt-3 text-2xl font-bold">구매 인증 후기</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">실제 구매 완료 리포트에서 작성된 후기의 검수·작성률·만족도를 확인합니다.</p>
        </div>
        <Link href="/admin/reviews" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">후기 검수 열기 →</Link>
      </div>

      {report ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">검토 대기</p><p className="mt-2 text-2xl font-bold">{report.pending}개</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">공개 후기</p><p className="mt-2 text-2xl font-bold">{report.published}개</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">리뷰 작성률</p><p className="mt-2 text-2xl font-bold">{rate(report.reviewWriteRate)}</p><p className="mt-1 text-xs text-slate-500">완료 구매 리포트 기준</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">공개 평균 만족도</p><p className="mt-2 text-2xl font-bold">{report.averagePublishedRating === null ? "—" : report.averagePublishedRating.toFixed(2) + " / 5"}</p></div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">후기 지표를 불러오지 못했습니다.</div>
      )}
    </section>
  );
}
