import Link from "next/link";
import type { PurchasedAnalysisProductGroup } from "@/app/lib/purchasedAnalysesGrouping";

const statusLabels: Record<string, string> = {
  none: "분석 준비 중",
  generating: "분석 준비 중",
  completed: "분석 완료",
  failed: "분석 준비에 문제가 있어요",
};

const statusClasses: Record<string, string> = {
  none: "border-stone-200 bg-stone-50 text-stone-600",
  generating: "border-stone-200 bg-stone-50 text-stone-600",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-red-200 bg-red-50 text-red-700",
};

const actionLabels: Record<string, string> = {
  none: "분석을 준비하고 있어요",
  generating: "분석을 준비하고 있어요",
  completed: "분석 결과 보기",
  failed: "다시 준비하기",
};

type PurchasedAnalysesListProps = {
  groups: readonly PurchasedAnalysisProductGroup[];
  profileId: string;
};

export default function PurchasedAnalysesList({
  groups,
  profileId,
}: PurchasedAnalysesListProps) {
  if (groups.length === 0) {
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
    <div className="mt-8 space-y-8 border-y border-stone-200">
      {groups.map((group) => (
        <div key={`${group.productId}`} className="py-6 first:pt-0 last:pb-0">
          {/* Product header */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-stone-900">{group.productName}</h2>
          </div>

          {/* Editions list */}
          <div className="space-y-3">
            {group.editions.map((edition) => {
              const href = `/paid-analysis/${group.productId}/report?profileId=${encodeURIComponent(
                profileId,
              )}${edition.analysisEditionKey ? `&edition=${encodeURIComponent(edition.analysisEditionKey)}` : ""}`;
              const isPreparing = edition.reportStatus === "none" || edition.reportStatus === "generating";

              return (
                <div
                  key={edition.analysisEditionKey ?? "legacy"}
                  className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-900">{edition.editionLabel}</p>
                      {edition.isLatest && group.editions.length > 1 && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                          최신
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        statusClasses[edition.reportStatus]
                      }`}
                    >
                      {statusLabels[edition.reportStatus]}
                    </span>
                  </div>
                  {isPreparing ? (
                    <span className="shrink-0 rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500">
                      {actionLabels[edition.reportStatus]}
                    </span>
                  ) : (
                    <Link
                      href={href}
                      className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                    >
                      {actionLabels[edition.reportStatus]}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
