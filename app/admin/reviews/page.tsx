import Link from "next/link";
import { redirect } from "next/navigation";
import AdminReviewModerationClient from "./AdminReviewModerationClient";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";
import { getAdminReviewDashboard } from "@/app/lib/reviews/server";

export const dynamic = "force-dynamic";

function rate(value: number | null): string {
  return value === null ? "—" : (value * 100).toFixed(1) + "%";
}

export default async function AdminReviewsPage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/reviews");
    }
    return (
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-14 text-slate-900">
        <div className="mx-auto max-w-xl">
          <h1 className="text-3xl font-bold">접근 권한 없음</h1>
          <p className="mt-4 text-sm text-slate-600">승인된 운영자만 사용할 수 있습니다.</p>
        </div>
      </main>
    );
  }

  const report = await getAdminReviewDashboard();

  return (
    <main className="min-h-screen bg-[#f5f7fc] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <Link href="/admin" className="text-sm font-semibold text-slate-600 underline underline-offset-4">← ADMIN</Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-slate-500">VERIFIED REVIEWS</p>
        <h1 className="mt-3 text-3xl font-bold">구매 인증 후기 운영</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          실제 완료 구매만 후기 작성이 가능합니다. 개인정보·욕설·스팸 등 공개 기준만 검수하고,
          낮은 평점이나 서비스 불만 자체는 숨기지 않습니다.
        </p>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">전체 후기</p><p className="mt-2 text-2xl font-bold">{report.total}개</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">검토 대기</p><p className="mt-2 text-2xl font-bold">{report.pending}개</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">작성률</p><p className="mt-2 text-2xl font-bold">{rate(report.reviewWriteRate)}</p><p className="mt-1 text-xs text-slate-500">완료 리포트 {report.completedPurchases}건 기준</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">공개 평균 평점</p><p className="mt-2 text-2xl font-bold">{report.averagePublishedRating === null ? "—" : report.averagePublishedRating.toFixed(2)}</p></div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">공개</p><p className="mt-1 text-lg font-bold">{report.published}개</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">숨김</p><p className="mt-1 text-lg font-bold">{report.hidden}개</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">AI 상담 이용 후기</p><p className="mt-1 text-lg font-bold">{report.aiConsultingReviewCount}개</p><p className="mt-1 text-xs text-slate-500">최근 30일 새 후기 {report.recent30}개</p></div>
        </section>

        <AdminReviewModerationClient items={report.items} />
      </div>
    </main>
  );
}
