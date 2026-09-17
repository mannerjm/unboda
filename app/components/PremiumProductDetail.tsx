"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";
import { getPremiumAnalysisHref, type PremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { getProductPricing } from "@/app/lib/productPricing";
import { saveAnalysisAction } from "@/app/lib/interestedAnalyses/actions";
import { formatTopicExpectedUnderstanding } from "@/app/lib/purchaseDecisionCopy";
import PremiumReportValuePreview from "@/app/components/PremiumReportValuePreview";

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

function DetailList({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-5">
      <p className="text-xs font-semibold text-stone-700">{title}</p>
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

function withSubjectParticle(value: string): string {
  const trimmed = value.trim();
  const last = trimmed.at(-1);
  if (!last) return trimmed;

  const code = last.charCodeAt(0);
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3
    ? (code - 0xac00) % 28 !== 0
    : false;

  return `${trimmed}${hasBatchim ? "이" : "가"}`;
}

function getTopicRelevanceItems(product: PremiumProductDefinition): readonly string[] {
  const subject = getPremiumProductDisplayTitle(product.id, product.title)
    .replace(/\s*심층\s*분석$/, "")
    .replace(/\s*분석$/, "")
    .trim();

  return [
    `${withSubjectParticle(subject)} 지금 내 상황에서 어떻게 나타나는지 궁금할 때`,
    "무엇을 유지하고 무엇을 조정해야 할지 판단 기준이 필요할 때",
  ];
}

function getRecommendedFor(product: PremiumProductDefinition): readonly string[] {
  if (product.kind === "PERIOD") {
    return product.purchaseDecision?.recommendedFor.slice(0, 2) ?? [];
  }

  return getTopicRelevanceItems(product);
}

function getExpectedUnderstanding(product: PremiumProductDefinition): readonly string[] {
  if (product.kind === "PERIOD") {
    return product.purchaseDecision?.expectedUnderstanding.slice(0, 2) ?? [];
  }

  return getPaidAnalysisTopicConfig(product.id)?.purchaseDecision?.expectedUnderstanding
    .slice(0, 2)
    .map(formatTopicExpectedUnderstanding) ?? [];
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

  useEffect(() => {
    setSavedState(isSaved);
  }, [isSaved]);

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
  const recommendedFor = getRecommendedFor(product);
  const quickOverviewItems = getQuickOverviewItems(product);
  const expectedUnderstanding = getExpectedUnderstanding(product);
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

      <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-stone-800">{product.description}</p>
      <DetailList title={isPeriod ? "이런 때 살펴보세요" : "이런 고민이 있다면"} items={recommendedFor} />
      <DetailList title="이 분석에서 보는 것" items={quickOverviewItems} />
      <DetailList title="분석 후 알 수 있는 것" items={expectedUnderstanding} />

      {state === "not_purchased" ? <PremiumReportValuePreview product={product} /> : null}

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