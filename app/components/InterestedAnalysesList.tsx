"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  InterestedAnalysisRecord,
} from "@/app/lib/interestedAnalyses/server";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { removeAnalysisAction } from "@/app/lib/interestedAnalyses/actions";

type InterestedAnalysesListProps = {
  analyses: Array<{
    record: InterestedAnalysisRecord;
    product: PremiumProductDefinition;
  }>;
  profileId: string;
};

export default function InterestedAnalysesList({
  analyses,
  profileId,
}: InterestedAnalysesListProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const displayAnalyses = analyses.filter(
    (item) => !removedIds.has(item.record.id),
  );

  const handleRemove = async (productId: string, recordId: string) => {
    setLoading(productId);
    try {
      await removeAnalysisAction(productId);
      setRemovedIds((prev) => new Set(prev).add(recordId));
    } finally {
      setLoading(null);
    }
  };

  if (displayAnalyses.length === 0) {
    return (
      <section className="mt-10 border-y border-stone-200 py-12 text-center">
        <p className="text-base font-semibold text-stone-800">
          아직 관심 분석에 저장한 항목이 없습니다.
        </p>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          궁금한 심층 분석을 저장해 두고 나중에 다시 확인해 보세요.
        </p>
        <Link
          href="/deep-analysis"
          className="mt-5 inline-flex text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4"
        >
          심층 분석 둘러보기 →
        </Link>
      </section>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
      {displayAnalyses.map(({ record, product }) => (
        <li
          key={record.id}
          className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-stone-900">
              {product.title}
            </p>
            {product.description && (
              <p className="mt-2 text-sm text-stone-600">
                {product.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => handleRemove(record.productId, record.id)}
              disabled={loading === record.productId}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-wait disabled:bg-stone-50 disabled:text-stone-500"
            >
              {loading === record.productId
                ? "제거 중..."
                : "관심 분석에서 제거"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
