"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPremiumAnalysisHref, type PremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { getProductPricing } from "@/app/lib/productPricing";
import { saveAnalysisAction } from "@/app/lib/interestedAnalyses/actions";

type PremiumProductDetailProps = {
  product: PremiumProductDefinition;
  state: PremiumAnalysisProductState;
  profileId?: string;
  onClear?: () => void;
  isSaved?: boolean;
};

const ACTION_LABELS: Record<PremiumAnalysisProductState, string> = {
  not_purchased: "이 분석 시작하기",
  none: "분석 준비 중",
  generating: "분석 준비 중",
  completed: "리포트 보기",
  failed: "다시 생성하기",
};

function formatPrice(productId: string): string {
  return `${getProductPricing(productId).amount.toLocaleString("ko-KR")}원`;
}

function DetailList({ items }: { items: readonly string[] }) {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold text-stone-700">이 분석에서 보는 것</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-stone-600">
        {items.map((item) => <li key={item}>· {item}</li>)}
      </ul>
    </div>
  );
}

function getQuickOverviewItems(product: PremiumProductDefinition): readonly string[] {
  if (product.details?.length) {
    return product.details.slice(0, 3);
  }

  return product.purchaseDecision?.analysisScope.slice(0, 3) ?? [];
}

export default function PremiumProductDetail({
  product,
  state,
  profileId,
  onClear,
  isSaved = false,
}: PremiumProductDetailProps) {
  const [savedState, setSavedState] = useState(isSaved);
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync with authoritative persisted state whenever it changes (e.g. async fetch resolves after mount).
  useEffect(() => {
    setSavedState(isSaved);
  }, [isSaved]);

  // Product detail only saves; removal is handled exclusively on /interests.
  const handleSave = async () => {
    if (savedState) return;
    try {
      setIsSaving(true);
      await saveAnalysisAction(product.id);
      setSavedState(true);
    } catch (error) {
      console.error("Failed to save interest:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isPeriod = product.kind === "PERIOD";
  const displayTitle = getPremiumProductDisplayTitle(product.id, product.title);
  const quickOverviewItems = getQuickOverviewItems(product);
  const href = getPremiumAnalysisHref(product.id, state, profileId);

  return (
    <section className="mt-6 rounded-xl border border-[#cdbb98] bg-[#fffdf8] p-5 sm:p-6" aria-labelledby="selected-product-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-stone-500">
            {isPeriod ? "선택한 기간 분석" : "선택한 분석"}
          </p>
          <h3 id="selected-product-title" className="mt-2 text-xl font-bold text-stone-900">{displayTitle}</h3>
        </div>
        {onClear ? (
          <button type="button" onClick={onClear} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
            {isPeriod ? "다른 기간 선택" : "다른 분석 선택"}
          </button>
        ) : null}
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">{product.description}</p>
      {quickOverviewItems.length > 0 ? <DetailList items={quickOverviewItems} /> : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
        <span className="text-sm font-medium text-stone-500">{formatPrice(product.id)}</span>
        <div className="flex flex-wrap gap-2">
          {state === "none" || state === "generating" ? (
            <span className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500">{ACTION_LABELS[state]}</span>
          ) : href ? (
            <Link href={href} className="rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800">
              {ACTION_LABELS[state]}
            </Link>
          ) : null}
          <button
            onClick={handleSave}
            disabled={isSaving || savedState}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-default disabled:bg-stone-50 disabled:text-stone-500"
          >
            {isSaving
              ? "저장 중..."
              : savedState
                ? "관심 분석에 저장됨"
                : "관심 분석에 저장"}
          </button>
        </div>
      </div>
    </section>
  );
}
