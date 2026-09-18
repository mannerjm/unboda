"use client";

import Link from "next/link";
import { useState } from "react";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { getProductPricing } from "@/app/lib/productPricing";
import { getPremiumAnalysisHref, toPremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import { resolveCanonicalRecommendationProduct } from "@/app/lib/analysisProductRecommendations";
import type { AnalysisProductRecommendation } from "@/app/lib/analysisProductRecommendations";
import type { PaidAnalysisSummary } from "@/app/lib/paidReports/server";
import type { AnalysisRecommendationOutput } from "@/app/lib/analysisRecommendationOutput";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";
import { formatTopicExpectedUnderstanding } from "@/app/lib/purchaseDecisionCopy";
import PremiumReportValuePreview from "@/app/components/PremiumReportValuePreview";

type RecommendationTop3Props = {
  recommendations: readonly AnalysisProductRecommendation[];
  profileId: string;
  paidSummaries: readonly PaidAnalysisSummary[];
  explanation?: AnalysisRecommendationOutput | null;
  guestMode?: boolean;
};

function getReadableRecommendationReason(
  recommendation: AnalysisProductRecommendation | undefined,
): string {
  const readableReason = recommendation?.reasons.find((reason) =>
    !/^[a-z0-9_-]+:[a-zA-Z0-9_-]+$/.test(reason)
    && !/(fortuneFlowAnalysis|elementAnalysis|elementRelations|health_stress|wealth_risk|relationship_conflict)/.test(reason),
  );

  return readableReason ?? "현재 무료 분석에서 확인된 흐름과 연결되는 주제라 우선 추천했어요.";
}

function getRecommendationQuestion(productId: string, fallback: string): string {
  return getPaidAnalysisTopicConfig(productId)?.purchaseDecision.decisionQuestion ?? fallback;
}

export default function RecommendationTop3({
  recommendations,
  profileId,
  paidSummaries,
  explanation,
  guestMode = false,
}: RecommendationTop3Props) {
  const validRecommendations = recommendations
    .slice(0, 3)
    .map((recommendation) => ({
      recommendation,
      product: resolveCanonicalRecommendationProduct(recommendation.productId),
    }))
    .filter((entry): entry is { recommendation: AnalysisProductRecommendation; product: NonNullable<typeof entry.product> } => Boolean(entry.product));

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const effectiveSelectedProductId = selectedProductId ?? validRecommendations[0]?.product.id ?? null;

  const selectedRecommendation = effectiveSelectedProductId
    ? validRecommendations.find((entry) => entry.product.id === effectiveSelectedProductId)
    : undefined;
  const isPrimarySelection = Boolean(
    effectiveSelectedProductId && validRecommendations[0]?.product.id === effectiveSelectedProductId,
  );

  return (
    <section className="mt-8" aria-labelledby="recommendation-top3-title">
      {explanation ? (
        <div className="mb-7 rounded-[1.6rem] border border-[#dfe3ef] bg-[#f9faff] px-5 py-5 sm:px-6">
          <p className="text-xs font-black tracking-[0.14em] text-[#7768c7]">내 무료 결과에서 이어지는 이유</p>
          <p className="mt-3 text-base font-bold leading-7 text-[#11162d]">{explanation.headline}</p>
          <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-700">{explanation.summary}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.14em] text-[#7768c7]">이번 결과에서 이어지는 질문</p>
          <h2 id="recommendation-top3-title" className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#11162d] sm:text-3xl">내 결과에서 이어지는 질문 3가지</h2>
        </div>
        <span className="text-xs font-medium text-slate-500">무료 분석과 같은 계산 근거로 선정</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {validRecommendations.map(({ recommendation, product }, index) => {
          const summary = paidSummaries.find(
            (item) => item.profileId === profileId && item.productId === product.id,
          );
          const state = toPremiumAnalysisProductState(summary?.reportStatus);
          const href = getPremiumAnalysisHref(product.id, state, profileId);
          const displayTitle = getPremiumProductDisplayTitle(product.id, product.title);
          const question = getRecommendationQuestion(product.id, product.description);
          const selected = effectiveSelectedProductId === product.id;

          if (!href) {
            return (
              <div key={product.id} className="rounded-[1.5rem] border border-[#dce1ef] bg-[#f7f8fc] p-5 text-slate-500">
                <p className="text-xs font-black tracking-[0.12em]">0{index + 1} · {displayTitle}</p>
                <p className="mt-3 text-base font-bold leading-7">{question}</p>
                <p className="mt-4 text-xs">분석 생성 중</p>
              </div>
            );
          }

          return (
            <button
              key={product.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setSelectedProductId(product.id)}
              className={`group min-h-56 rounded-[1.55rem] border p-5 text-left transition hover:-translate-y-0.5 hover:border-[#9282df] hover:shadow-[0_16px_34px_rgba(54,45,93,0.08)] ${selected ? "border-[#9282df] bg-[linear-gradient(145deg,#f8f5ff,#f9faff)] shadow-[0_16px_36px_rgba(78,63,137,0.10)]" : "border-[#dce1ef] bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-black tracking-[0.1em] text-[#6f5ce7]">0{index + 1} · {displayTitle}</p>
                <span className="shrink-0 text-xs font-semibold text-slate-600">{getProductPricing(product.id).amount.toLocaleString("ko-KR")}원</span>
              </div>
              <p className="mt-5 text-lg font-black leading-7 tracking-[-0.02em] text-[#11162d]">{question}</p>
              <p className="mt-4 line-clamp-2 text-[15px] leading-7 text-slate-700">{getReadableRecommendationReason(recommendation)}</p>
              <p className="mt-5 text-xs font-bold text-[#7667bc]">{selected ? "아래에서 이 질문을 자세히 보고 있어요" : "이 질문 살펴보기 →"}</p>
            </button>
          );
        })}
      </div>

      {effectiveSelectedProductId ? (
        <RecommendationDetail
          productId={effectiveSelectedProductId}
          profileId={profileId}
          paidSummaries={paidSummaries}
          recommendation={selectedRecommendation?.recommendation}
          isPrimary={isPrimarySelection}
          guestMode={guestMode}
        />
      ) : null}
    </section>
  );
}

function RecommendationDetail({
  productId,
  profileId,
  paidSummaries,
  recommendation,
  isPrimary,
  guestMode,
}: {
  productId: string;
  profileId: string;
  paidSummaries: readonly PaidAnalysisSummary[];
  recommendation?: AnalysisProductRecommendation;
  isPrimary: boolean;
  guestMode: boolean;
}) {
  const [guestIntentPending, setGuestIntentPending] = useState(false);
  const [guestIntentError, setGuestIntentError] = useState<string | null>(null);
  const product = getPremiumProduct(productId);
  const decision = getPaidAnalysisTopicConfig(productId)?.purchaseDecision;
  if (!product || !decision) return null;

  async function continueGuestPurchase() {
    if (!guestMode || guestIntentPending) return;
    setGuestIntentPending(true);
    setGuestIntentError(null);
    try {
      const response = await fetch("/api/guest-free-analysis/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const body = await response.json() as { productId?: string; error?: string };
      if (!response.ok || !body.productId) {
        throw new Error(body.error ?? "선택한 분석을 저장하지 못했습니다.");
      }
      window.location.assign("/auth/login?returnTo=/auth/complete-guest-analysis&origin=guest-result");
    } catch (error) {
      setGuestIntentError(error instanceof Error ? error.message : "선택한 분석을 저장하지 못했습니다.");
      setGuestIntentPending(false);
    }
  }

  const summary = paidSummaries.find((item) => item.profileId === profileId && item.productId === productId);
  const state = toPremiumAnalysisProductState(summary?.reportStatus);
  const href = getPremiumAnalysisHref(product.id, state, profileId);
  const reason = getReadableRecommendationReason(recommendation);
  const displayTitle = getPremiumProductDisplayTitle(product.id, product.title);
  const overviewItems = product.details?.slice(0, 3) ?? decision.whatItAnalyzes.slice(0, 3);
  const expectedUnderstanding = decision.expectedUnderstanding
    .slice(0, 2)
    .map(formatTopicExpectedUnderstanding);

  return (
    <section className="mt-5 overflow-hidden rounded-[1.7rem] border border-[#dfe3ef] bg-white shadow-[0_18px_45px_rgba(41,35,27,0.05)]" aria-labelledby="recommendation-detail-title">
      <div className="bg-[linear-gradient(135deg,#111936,#1c183d_55%,#262041)] px-6 py-6 text-white sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-black tracking-[0.14em] text-[#b7a9ff]">{isPrimary ? "가장 먼저 이어볼 질문" : "선택한 다음 질문"}</p>
          <span className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-[#d9d5ea]">{displayTitle}</span>
        </div>
        <h3 id="recommendation-detail-title" className="mt-3 max-w-3xl text-2xl font-black leading-9 tracking-[-0.03em]">{decision.decisionQuestion}</h3>
      </div>

      <div className="p-6 sm:p-7">
        <p className="text-[15px] font-medium leading-7 text-slate-700">{product.description}</p>
        <div className="mt-5 rounded-2xl bg-[#f4f6fb] px-5 py-4">
          <p className="text-xs font-black text-slate-800">왜 지금 이 질문이 이어졌나요?</p>
          <p className="mt-2 text-[15px] leading-7 text-slate-700">{reason}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <DetailList title="이 분석에서 보는 것" items={overviewItems} />
          <DetailList title="분석 후 알 수 있는 것" items={expectedUnderstanding} />
        </div>

        {state === "not_purchased" ? <PremiumReportValuePreview product={product} /> : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-[#dce1ef] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-base font-black text-[#11162d]">{getProductPricing(productId).amount.toLocaleString("ko-KR")}원</span>
          {guestMode ? (
            <button
              type="button"
              onClick={() => void continueGuestPurchase()}
              disabled={guestIntentPending}
              className="rounded-xl bg-[#171a3d] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#25213d] disabled:cursor-wait disabled:opacity-60"
            >
              {guestIntentPending ? "계속 준비 중..." : "이 질문 더 깊게 보기"}
            </button>
          ) : state === "generating" ? (
            <span className="rounded-xl bg-[#eef0f6] px-4 py-3 text-xs font-semibold text-slate-500">생성 중</span>
          ) : href ? (
            <Link href={href} className="rounded-xl bg-[#171a3d] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#25213d]">
              {state === "not_purchased" ? "이 질문 더 깊게 보기" : "리포트 보기"}
            </Link>
          ) : null}
        </div>
        {guestIntentError ? (
          <p className="mt-3 text-sm font-medium text-red-600">{guestIntentError}</p>
        ) : null}
      </div>
    </section>
  );
}

function DetailList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="mt-5">
      <p className="text-xs font-black text-slate-800">{title}</p>
      <ul className="mt-2 space-y-2 text-[15px] leading-7 text-slate-700">
        {items.map((item) => <li key={item}>· {item}</li>)}
      </ul>
    </div>
  );
}
