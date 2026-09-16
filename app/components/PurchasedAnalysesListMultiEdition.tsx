import Link from "next/link";
import type { PurchasedAnalysisProductGroup } from "@/app/lib/purchasedAnalysesGrouping";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import {
  getSpecialAnalysisProduct,
  isCompatibilityFamilyOtherProductId,
  isCompatibilityFamilyParentChildProductId,
  isCompatibilityFamilySiblingProductId,
  isCompatibilityRomanticProductId,
} from "@/app/lib/specialAnalysisProducts";

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

function compatibilityEditionLabel(productId: string, editionKey: string | null): string {
  const romantic = editionKey?.match(/^PAIR_YEAR:(\d{4}):[a-f0-9]{16}$/);
  if (romantic) return `${romantic[1]}년 궁합 분석`;
  const parentChild = editionKey?.match(/^FAMILY_PARENT_CHILD_YEAR:(\d{4}):[a-f0-9]{16}$/);
  if (parentChild) return `${parentChild[1]}년 부모·자녀 궁합`;
  const siblings = editionKey?.match(/^FAMILY_SIBLINGS_YEAR:(\d{4}):[a-f0-9]{16}$/);
  if (siblings) return `${siblings[1]}년 형제·자매 궁합`;
  const other = editionKey?.match(/^FAMILY_OTHER_YEAR:(\d{4}):[a-f0-9]{16}$/);
  if (other) return `${other[1]}년 기타 가족 궁합`;
  if (isCompatibilityFamilyParentChildProductId(productId)) return "부모·자녀 궁합";
  if (isCompatibilityFamilySiblingProductId(productId)) return "형제·자매 궁합";
  if (isCompatibilityFamilyOtherProductId(productId)) return "기타 가족 궁합";
  return "궁합 분석";
}

export default function PurchasedAnalysesList({ groups, profileId }: PurchasedAnalysesListProps) {
  if (groups.length === 0) {
    return (
      <section className="mt-10 border-y border-stone-200 py-12 text-center">
        <p className="text-base font-semibold text-stone-800">아직 구매한 분석이 없습니다.</p>
        <p className="mt-2 text-sm leading-6 text-stone-500">심층 분석과 전문 분석에서 필요한 분석을 확인해 보세요.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-4">
          <Link href="/deep-analysis" className="text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4">심층 분석 둘러보기 →</Link>
          <Link href="/special-analysis" className="text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4">전문 분석 둘러보기 →</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="mt-8 space-y-8 border-y border-stone-200">
      {groups.map((group) => {
        const specialProduct = getSpecialAnalysisProduct(group.productId);
        const isRomanticCompatibility = isCompatibilityRomanticProductId(group.productId);
        const isFamilyParentChild = isCompatibilityFamilyParentChildProductId(group.productId);
        const isFamilySibling = isCompatibilityFamilySiblingProductId(group.productId);
        const isFamilyOther = isCompatibilityFamilyOtherProductId(group.productId);
        const isCompatibility = isRomanticCompatibility || isFamilyParentChild || isFamilySibling || isFamilyOther;
        const displayTitle = specialProduct?.title ?? getPremiumProductDisplayTitle(group.productId, group.productName);

        return (
          <div key={group.productId} className="py-6 first:pt-0 last:pb-0">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-stone-900">{displayTitle}</h2>
              {specialProduct ? <p className="mt-1 text-xs text-stone-500">{specialProduct.categoryLabel}</p> : null}
            </div>

            <div className="space-y-3">
              {group.editions.map((edition) => {
                const editionQuery = edition.analysisEditionKey ? `&edition=${encodeURIComponent(edition.analysisEditionKey)}` : "";
                const href = isRomanticCompatibility
                  ? `/special-analysis/compatibility/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`
                  : isFamilyParentChild
                    ? `/special-analysis/compatibility/family/parent-child/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`
                    : isFamilySibling
                      ? `/special-analysis/compatibility/family/siblings/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`
                      : isFamilyOther
                        ? `/special-analysis/compatibility/family/other/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`
                        : `/paid-analysis/${group.productId}/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`;
                const isPreparing = edition.reportStatus === "none" || edition.reportStatus === "generating";
                const displayEditionLabel = isCompatibility
                  ? compatibilityEditionLabel(group.productId, edition.analysisEditionKey)
                  : edition.editionLabel;

                return (
                  <div key={edition.analysisEditionKey ?? "legacy"} className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-900">{displayEditionLabel}</p>
                        {!isCompatibility && edition.isLatest && group.editions.length > 1 ? (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">최신</span>
                        ) : null}
                      </div>
                      <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[edition.reportStatus]}`}>
                        {statusLabels[edition.reportStatus]}
                      </span>
                    </div>
                    {isPreparing ? (
                      <span className="shrink-0 rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500">{actionLabels[edition.reportStatus]}</span>
                    ) : (
                      <Link href={href} className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-700 transition hover:bg-stone-50">{actionLabels[edition.reportStatus]}</Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
