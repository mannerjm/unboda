"use client";

import Link from "next/link";
import { useState } from "react";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getProductPricing } from "@/app/lib/productPricing";
import { getPremiumAnalysisHref, toPremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import { resolveCanonicalRecommendationProduct } from "@/app/lib/analysisProductRecommendations";
import type { AnalysisProductRecommendation } from "@/app/lib/analysisProductRecommendations";
import type { PaidAnalysisSummary } from "@/app/lib/paidReports/server";
import type { AnalysisRecommendationOutput } from "@/app/lib/analysisRecommendationOutput";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";

type RecommendationTop3Props = {
  recommendations: readonly AnalysisProductRecommendation[];
  profileId: string;
  paidSummaries: readonly PaidAnalysisSummary[];
  explanation?: AnalysisRecommendationOutput | null;
};

export default function RecommendationTop3({
  recommendations,
  profileId,
  paidSummaries,
  explanation,
}: RecommendationTop3Props) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const validRecommendations = recommendations
    .slice(0, 3)
    .map((recommendation) => ({
      recommendation,
      product: resolveCanonicalRecommendationProduct(recommendation.productId),
    }))
    .filter((entry): entry is { recommendation: AnalysisProductRecommendation; product: NonNullable<typeof entry.product> } => Boolean(entry.product));

  function getReason(recommendation: AnalysisProductRecommendation, productId: string): string {
    const readableReason = recommendation.reasons.find((reason) =>
      !/^[a-z0-9_-]+:[a-zA-Z0-9_-]+$/.test(reason)
      && !/(fortuneFlowAnalysis|elementAnalysis|elementRelations|health_stress|wealth_risk|relationship_conflict)/.test(reason),
    );

    return readableReason ?? getPaidAnalysisTopicConfig(productId)?.purchaseDecision?.recommendedFor[0] ?? "현재 분석 결과와 관련된 주제를 기준으로 추천되었습니다.";
  }

  return (
    <section className="mt-8" aria-labelledby="recommendation-top3-title">
      {explanation ? (
        <div className="mb-6 max-w-3xl border-l-2 border-[#cdbb98] pl-4">
          <p className="text-sm font-semibold leading-6 text-stone-900">{explanation.headline}</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">{explanation.summary}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-stone-500">PERSONAL RECOMMENDATION</p>
          <h2 id="recommendation-top3-title" className="mt-2 text-xl font-bold text-stone-900">지금 나에게 추천된 분석 TOP 3</h2>
        </div>
        <span className="text-xs text-stone-500">사주와 현재 흐름을 기준으로 선정</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {validRecommendations.map(({ recommendation, product }, index) => {

          const summary = paidSummaries.find(
            (item) => item.profileId === profileId && item.productId === product.id,
          );
          const state = toPremiumAnalysisProductState(summary?.reportStatus);
          const href = getPremiumAnalysisHref(product.id, state, profileId);

          if (!href) {
            return (
              <div key={product.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 text-stone-500">
                <Rank index={index} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{product.title}</span>
                <span className="shrink-0 text-xs">생성 중</span>
              </div>
            );
          }

          const selected = selectedProductId === product.id;

          return (
            <button key={product.id} type="button" aria-pressed={selected} onClick={() => setSelectedProductId(product.id)} className={`flex min-w-0 items-center gap-3 rounded-xl border px-4 py-4 text-left transition hover:border-[#cdbb98] hover:bg-[#fbf7ef] ${selected ? "border-[#cdbb98] bg-[#fbf7ef]" : "border-stone-200 bg-white"}`}>
              <Rank index={index} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-stone-900">{product.title}</span>
                <span className="mt-1 block truncate text-xs text-stone-500">{getReason(recommendation, product.id)}</span>
              </span>
              <span className="shrink-0 text-[11px] font-medium text-stone-500">{getProductPricing(product.id).amount.toLocaleString("ko-KR")}원</span>
            </button>
          );
        })}
      </div>
      {selectedProductId ? <RecommendationDetail productId={selectedProductId} profileId={profileId} paidSummaries={paidSummaries} recommendation={validRecommendations.find((entry) => entry.product.id === selectedProductId)?.recommendation} /> : null}
    </section>
  );
}

function Rank({ index }: { index: number }) {
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f3eee4] text-xs font-bold text-[#9a8050]">{index + 1}</span>;
}

function RecommendationDetail({ productId, profileId, paidSummaries, recommendation }: { productId: string; profileId: string; paidSummaries: readonly PaidAnalysisSummary[]; recommendation?: AnalysisProductRecommendation }) {
  const product = getPremiumProduct(productId);
  const decision = getPaidAnalysisTopicConfig(productId)?.purchaseDecision;
  if (!product || !decision) return null;

  const summary = paidSummaries.find((item) => item.profileId === profileId && item.productId === productId);
  const state = toPremiumAnalysisProductState(summary?.reportStatus);
  const href = getPremiumAnalysisHref(productId, state, profileId);
  const reason = recommendation?.reasons.find((item) => !/^[a-z0-9_-]+:[a-zA-Z0-9_-]+$/.test(item)) ?? decision.recommendedFor[0];

  return (
    <section className="mt-5 rounded-xl border border-[#cdbb98] bg-[#fffdf8] p-5" aria-labelledby="recommendation-detail-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-stone-500">선택한 추천 분석</p>
          <h3 id="recommendation-detail-title" className="mt-2 text-xl font-bold text-stone-900">{product.title}</h3>
        </div>
        <span className="text-xs text-stone-500">왜 지금 추천하나요?</span>
      </div>
      <p className="mt-4 text-sm leading-6 text-stone-700">{reason}</p>
      <DetailList title="이 분석에서 확인하는 것" items={decision.whatItAnalyzes.slice(0, 3)} />
      <DetailList title="분석을 받고 나면" items={decision.expectedUnderstanding.slice(0, 2)} />
      <p className="mt-4 border-t border-stone-200 pt-4 text-sm leading-6 text-stone-600">{decision.distinction}</p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-200 pt-4">
        <span className="text-sm font-medium text-stone-500">{getProductPricing(productId).amount.toLocaleString("ko-KR")}원</span>
        {state === "generating" ? <span className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500">생성 중</span> : href ? <Link href={href} className="rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800">{state === "not_purchased" ? "이 분석 자세히 보기" : "리포트 보기"}</Link> : null}
      </div>
    </section>
  );
}

function DetailList({ title, items }: { title: string; items: readonly string[] }) {
  return <div className="mt-4"><p className="text-xs font-semibold text-stone-700">{title}</p><ul className="mt-2 space-y-1 text-sm leading-6 text-stone-600">{items.map((item) => <li key={item}>· {item}</li>)}</ul></div>;
}