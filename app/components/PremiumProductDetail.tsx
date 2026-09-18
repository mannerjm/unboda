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

const STATUS_LABELS: Record<PremiumAnalysisProductState, string> = {
  not_purchased: "구매 전",
  none: "구매 완료 · 생성 준비",
  generating: "리포트 생성 중",
  completed: "리포트 완료",
  failed: "생성 재시도 필요",
};

const STATUS_STYLES: Record<PremiumAnalysisProductState, string> = {
  not_purchased: "border-[#d8d3ff] bg-[#f1efff] text-[#5e4bd1]",
  none: "border-sky-200 bg-sky-50 text-sky-700",
  generating: "border-sky-200 bg-sky-50 text-sky-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

function formatPrice(productId: string): string {
  return `${getProductPricing(productId).amount.toLocaleString("ko-KR")}원`;
}

function DetailList({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null;

  return (
    <article className="rounded-2xl border border-[#dce1ef] bg-white p-5 shadow-sm">
      <p className="text-xs font-bold tracking-[0.08em] text-[#6f5ce7]">{title}</p>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b7cf0]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
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
    <section
      className="mt-6 overflow-hidden rounded-[2rem] border border-[#d9deed] bg-white shadow-[0_18px_55px_rgba(33,40,83,0.08)]"
      aria-labelledby="selected-product-title"
    >
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(132,111,241,0.16),transparent_34%),linear-gradient(145deg,#11162d_0%,#171a3d_60%,#242957_100%)] px-6 py-7 text-white sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#b9b2f6]">PREMIUM ANALYSIS</p>
            <p className="mt-2 text-xs font-semibold text-slate-300">
              {isPeriod ? "선택한 기간 분석" : "선택한 분석"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${STATUS_STYLES[state]}`}>
              {STATUS_LABELS[state]}
            </span>
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                {isPeriod ? "다른 기간 선택" : "다른 분석 선택"}
              </button>
            ) : null}
          </div>
        </div>

        <h2 id="selected-product-title" className="mt-5 max-w-2xl text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl">
          {displayTitle}
        </h2>
        <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-200 sm:text-base">
          {product.description}
        </p>

        <div className="mt-6 grid gap-2 text-xs text-slate-200 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <p className="font-bold text-white">1. 분석 대상 확인</p>
            <p className="mt-1 leading-5">{profileId ? "선택한 프로필 기준" : "결제 전에 프로필 선택"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <p className="font-bold text-white">2. 개인화 리포트 생성</p>
            <p className="mt-1 leading-5">결제 승인 후 즉시 시작</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <p className="font-bold text-white">3. 구매한 분석에 보관</p>
            <p className="mt-1 leading-5">완료 후 다시 확인 가능</p>
          </div>
        </div>
      </div>

      <div className="bg-[#f7f8fc] px-5 py-6 sm:px-7 sm:py-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <DetailList title={isPeriod ? "이런 때 살펴보세요" : "이런 고민이 있다면"} items={recommendedFor} />
          <DetailList title="이 분석에서 보는 것" items={quickOverviewItems} />
          <DetailList title="분석 후 알 수 있는 것" items={expectedUnderstanding} />
        </div>

        {state === "not_purchased" ? <PremiumReportValuePreview product={product} /> : null}

        <div className="mt-6 rounded-[1.6rem] border border-[#d8d3ff] bg-[linear-gradient(135deg,#ffffff_0%,#f3f1ff_100%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-500">구매 전 확인</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                결제 금액과 분석 대상을 확인한 뒤 진행하세요. 결제가 승인되면 개인화 분석 생성이 바로 시작됩니다.
              </p>
              <p className="mt-4 text-[10px] font-semibold tracking-[0.14em] text-slate-400">결제 금액</p>
              <p className="mt-1 text-lg font-bold text-stone-950">{formatPrice(product.id)}</p>
            </div>

            <div className="flex flex-col gap-2 sm:min-w-56">
              {state === "none" || state === "generating" ? (
                <span className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sm font-bold text-sky-700">
                  {ACTION_LABELS[state]}
                </span>
              ) : href ? (
                <Link
                  href={href}
                  className="rounded-xl bg-[#6f5ce7] px-5 py-3.5 text-center text-sm font-bold text-white shadow-[0_10px_24px_rgba(93,76,209,0.2)] transition hover:bg-[#5f4fd2]"
                >
                  {ACTION_LABELS[state]}
                </Link>
              ) : null}
              <button
                onClick={handleSave}
                disabled={isSaving || savedState}
                className="rounded-xl border border-[#cfd5e6] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#aaa0f4] hover:bg-[#faf9ff] disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-500"
              >
                {isSaving
                  ? "저장 중..."
                  : savedState
                    ? "관심 분석에 저장됨"
                    : "관심 분석에 저장"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
