import Link from "next/link";
import type { PaidAnalysisSummary } from "@/app/lib/paidReports/server";

const statusLabels: Record<PaidAnalysisSummary["reportStatus"], string> = {
  none: "분석 준비 중",
  generating: "분석 준비 중",
  completed: "분석 완료",
  failed: "분석 준비에 문제가 있어요",
};

const statusClasses: Record<PaidAnalysisSummary["reportStatus"], string> = {
  none: "border-stone-200 bg-stone-50 text-stone-600",
  generating: "border-stone-200 bg-stone-50 text-stone-600",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-red-200 bg-red-50 text-red-700",
};

const actionLabels: Record<PaidAnalysisSummary["reportStatus"], string> = {
  none: "분석을 준비하고 있어요",
  generating: "분석을 준비하고 있어요",
  completed: "분석 결과 보기",
  failed: "다시 준비하기",
};

type PurchasedAnalysesListProps = {
  analyses: readonly PaidAnalysisSummary[];
  profileId: string;
};

export default function PurchasedAnalysesList({
  analyses,
  profileId,
}: PurchasedAnalysesListProps) {
  if (analyses.length === 0) {
    return (
      <section className="mt-10 border-y border-stone-200 py-12 text-center">
        <p className="text-base font-semibold text-stone-800">아직 구매한 심층 분석이 없습니다.</p>
        <p className="mt-2 text-sm leading-6 text-stone-500">현재 분석 대상에게 필요한 심층 분석을 확인해 보세요.</p>
        <Link href="/deep-analysis" className="mt-5 inline-flex text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4">
          심층 분석 둘러보기 →
        </Link>
      </section>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
      {analyses.map((analysis) => {
        const href = `/paid-analysis/${analysis.productId}/report?profileId=${encodeURIComponent(profileId)}`;
        const isPreparing = analysis.reportStatus === "none" || analysis.reportStatus === "generating";

        return (
          <li key={analysis.productId} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-base font-semibold text-stone-900">{analysis.productName}</p>
              <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[analysis.reportStatus]}`}>
                {statusLabels[analysis.reportStatus]}
              </span>
            </div>
            {isPreparing ? (
              <span className="shrink-0 rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500">{actionLabels[analysis.reportStatus]}</span>
            ) : (
              <Link href={href} className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-700 transition hover:bg-stone-50">
                {actionLabels[analysis.reportStatus]}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
