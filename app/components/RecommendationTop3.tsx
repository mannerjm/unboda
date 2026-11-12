"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PREMIUM_PRODUCT_PHOTOS } from "@/app/lib/premiumProductPhotos";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { getProductPricing } from "@/app/lib/productPricing";
import { getPremiumAnalysisHref, toPremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import { resolveCanonicalRecommendationProduct } from "@/app/lib/analysisProductRecommendations";
import type { AnalysisProductRecommendation } from "@/app/lib/analysisProductRecommendations";
import type { PaidAnalysisSummary } from "@/app/lib/paidReports/server";
import type { AnalysisRecommendationOutput } from "@/app/lib/analysisRecommendationOutput";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";
import { getReadablePaidQuestion } from "@/app/lib/premiumQuestionDisplay";
import { formatTopicExpectedUnderstanding } from "@/app/lib/purchaseDecisionCopy";
import PremiumReportValuePreview from "@/app/components/PremiumReportValuePreview";

type RecommendationTop3Props = {
  recommendations: readonly AnalysisProductRecommendation[];
  profileId: string;
  paidSummaries: readonly PaidAnalysisSummary[];
  explanation?: AnalysisRecommendationOutput | null;
  guestMode?: boolean;
};

type CanonicalRecommendation = {
  recommendation: AnalysisProductRecommendation;
  product: NonNullable<ReturnType<typeof resolveCanonicalRecommendationProduct>>;
};

function getReadableRecommendationReason(
  recommendation: AnalysisProductRecommendation | undefined,
): string {
  const readableReason = recommendation?.reasons.find((reason) =>
    !/^[a-z0-9_-]+:[a-zA-Z0-9_-]+$/.test(reason)
    && !/(fortuneFlowAnalysis|elementAnalysis|elementRelations|health_stress|wealth_risk|relationship_conflict)/.test(reason),
  );
  return readableReason ?? "무료 결과에서 이 주제와 연결되는 흐름을 살펴볼 수 있어요.";
}

function getShortRecommendationReason(
  recommendation: AnalysisProductRecommendation | undefined,
): string {
  const reason = getReadableRecommendationReason(recommendation);
  // Preserve the genuine ranking; do not present raw signal counts or technical
  // jargon as a consumer-facing promise. Full evidence stays in the disclosure.
  if (reason.length <= 75 && !/(연·대운|[가-힣]·[가-힣]운|신호\s*\d|[가-힣]\s*\d+건|기준\s*\d|%|element|fortuneFlow)/i.test(reason)) {
    return reason;
  }
  return "무료 분석에서 확인한 흐름과 연결돼 더 자세히 살펴볼 질문이에요.";
}

function getRecommendationQuestion(productId: string, fallback: string): string {
  return getReadablePaidQuestion(productId, getPaidAnalysisTopicConfig(productId)?.purchaseDecision.decisionQuestion ?? fallback);
}

function getProductSummary(
  paidSummaries: readonly PaidAnalysisSummary[],
  productId: string,
  profileId: string,
) {
  return paidSummaries.find((item) => item.profileId === profileId && item.productId === productId);
}

function RecommendationPhoto({ productId, primary = false }: { productId: string; primary?: boolean }) {
  const photo = PREMIUM_PRODUCT_PHOTOS[productId];
  return (
    <span
      className={primary
        ? "relative block h-32 w-32 shrink-0 overflow-hidden rounded-[1.15rem] bg-[#e6ddf6] sm:h-44 sm:w-44"
        : "relative block h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#e6ddf6] sm:h-28 sm:w-28"}
    >
      {photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={primary ? "(max-width: 640px) 128px, 176px" : "(max-width: 640px) 96px, 112px"}
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#eee5ff_0%,#ceb7ec_100%)] text-sm font-black text-[#7154a0]">
          운보다
        </span>
      )}
    </span>
  );
}

function RecommendationCard({
  entry,
  index,
  selected,
  onSelect,
  profileId,
  paidSummaries,
  primary = false,
}: {
  entry: CanonicalRecommendation;
  index: number;
  selected: boolean;
  onSelect: () => void;
  profileId: string;
  paidSummaries: readonly PaidAnalysisSummary[];
  primary?: boolean;
}) {
  const { recommendation, product } = entry;
  const state = toPremiumAnalysisProductState(
    getProductSummary(paidSummaries, product.id, profileId)?.reportStatus,
  );
  const href = getPremiumAnalysisHref(product.id, state, profileId);
  const displayTitle = getPremiumProductDisplayTitle(product.id, product.title);
  const question = getRecommendationQuestion(product.id, product.description);
  const price = getProductPricing(product.id).amount.toLocaleString("ko-KR") + "원";
  const selectedStyle = selected
    ? "border-[#a789e9] bg-[#fcfaff] shadow-[0_12px_30px_rgba(112,76,163,0.10)]"
    : "border-[#e5daf2] bg-white shadow-[0_10px_28px_rgba(90,60,125,0.055)]";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-controls="recommendation-selected-detail"
      className={"group w-full rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#a789e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8060ca] " + selectedStyle + (primary ? " sm:p-5" : "")}
    >
      <div className="flex items-start gap-4">
        <RecommendationPhoto productId={product.id} primary={primary} />
        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <p className="text-[11px] font-extrabold tracking-[0.03em] text-[#7654b5]">
            {primary ? "01 · 가장 먼저 추천해요" : "0" + (index + 1) + " · 함께 살펴볼 분석"}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#7b718b]">{displayTitle}</p>
          <h3 className={"mt-2 font-black tracking-[-0.025em] text-[#211737] " + (primary ? "text-lg leading-7 sm:text-xl sm:leading-8" : "text-[15px] leading-6 sm:text-base")}>
            {question}
          </h3>
          <p className={"mt-2 text-xs leading-5 text-[#655a75] " + (primary ? "line-clamp-2 sm:text-sm sm:leading-6" : "line-clamp-2")}>
            {primary ? product.description : getShortRecommendationReason(recommendation)}
          </p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
            <span className="text-base font-extrabold text-[#211737]">{price}</span>
            <span className="text-xs font-black text-[#7552b1]">
              {!href ? "분석 준비 중" : selected ? "선택한 분석 보기 ↓" : "상품 자세히 보기 ↓"}
            </span>
          </div>
        </div>
      </div>
      {primary ? (
        <div className="mt-4 rounded-xl bg-[#f4eefb] px-4 py-3 text-xs leading-5 text-[#594a73] sm:text-sm sm:leading-6">
          <span className="font-black text-[#6a4ca8]">추천 이유 </span>
          {getShortRecommendationReason(recommendation)}
        </div>
      ) : null}
    </button>
  );
}

export default function RecommendationTop3({
  recommendations,
  profileId,
  paidSummaries,
  explanation,
  guestMode = false,
}: RecommendationTop3Props) {
  // Ranking, evidence, canonical IDs and purchased-report states are unchanged.
  const validRecommendations = recommendations
    .slice(0, 3)
    .map((recommendation) => ({
      recommendation,
      product: resolveCanonicalRecommendationProduct(recommendation.productId),
    }))
    .filter((entry): entry is CanonicalRecommendation => Boolean(entry.product));

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const effectiveSelectedProductId = selectedProductId ?? validRecommendations[0]?.product.id ?? null;
  const selectedRecommendation = effectiveSelectedProductId
    ? validRecommendations.find((entry) => entry.product.id === effectiveSelectedProductId)
    : undefined;
  const isPrimarySelection = Boolean(
    effectiveSelectedProductId && validRecommendations[0]?.product.id === effectiveSelectedProductId,
  );

  return (
    <section className="mt-7" aria-labelledby="recommendation-top3-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.10em] text-[#7552b1]">무료 분석 결과에서 이어보기</p>
          <h2 id="recommendation-top3-title" className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#201634] sm:text-3xl">내 결과에서 이어지는 질문 3가지</h2>
        </div>
        <p className="text-xs font-medium text-[#766d85]">무료 분석과 같은 계산 근거로 선정</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#766d85]">
        추천은 매월 실제 계산 근거로 다시 평가하며, 비슷한 흐름이면 다른 사람과 같은 질문이 나올 수도 있어요.
      </p>

      {validRecommendations[0] ? (
        <div className="mt-5">
          <RecommendationCard
            entry={validRecommendations[0]}
            index={0}
            primary
            selected={effectiveSelectedProductId === validRecommendations[0].product.id}
            onSelect={() => setSelectedProductId(validRecommendations[0].product.id)}
            profileId={profileId}
            paidSummaries={paidSummaries}
          />
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {validRecommendations.slice(1).map((entry, offset) => (
          <RecommendationCard
            key={entry.product.id}
            entry={entry}
            index={offset + 1}
            selected={effectiveSelectedProductId === entry.product.id}
            onSelect={() => setSelectedProductId(entry.product.id)}
            profileId={profileId}
            paidSummaries={paidSummaries}
          />
        ))}
      </div>
      {explanation ? (
        <details className="mt-4 rounded-xl border border-[#e5daf2] bg-white/70 px-4 py-3 text-xs leading-6 text-[#625676]">
          <summary className="cursor-pointer font-bold text-[#7652ad]">무료 결과에서 추천한 기준 더 보기</summary>
          <p className="mt-2 font-semibold text-[#241936]">{explanation.headline}</p>
          <p className="mt-1">{explanation.summary}</p>
        </details>
      ) : null}

      {effectiveSelectedProductId ? (
        <RecommendationDetail
          key={effectiveSelectedProductId}
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

  const state = toPremiumAnalysisProductState(
    getProductSummary(paidSummaries, productId, profileId)?.reportStatus,
  );
  const href = getPremiumAnalysisHref(product.id, state, profileId);
  const reason = getReadableRecommendationReason(recommendation);
  const displayTitle = getPremiumProductDisplayTitle(product.id, product.title);
  const overviewItems = product.details?.slice(0, 3) ?? decision.whatItAnalyzes.slice(0, 3);
  const expectedUnderstanding = decision.expectedUnderstanding
    .slice(0, 2)
    .map(formatTopicExpectedUnderstanding);

  return (
    <section
      id="recommendation-selected-detail"
      className="mt-5 scroll-mt-6 overflow-hidden rounded-[1.5rem] border border-[#e2d7f3] bg-white shadow-[0_15px_35px_rgba(82,61,116,0.07)]"
      aria-labelledby="recommendation-detail-title"
    >
      <div className="bg-[linear-gradient(110deg,#f0e7ff,#faf7ff)] px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#7652b1]">{isPrimary ? "가장 먼저 이어볼 질문" : "선택한 다음 질문"}</p>
          <span className="text-xs font-semibold text-[#746886]">{displayTitle}</span>
        </div>
        <h3 id="recommendation-detail-title" className="mt-2 text-xl font-black leading-8 tracking-[-0.035em] text-[#211737] sm:text-2xl">
          {getReadablePaidQuestion(product.id, decision.decisionQuestion)}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#665b75]">{product.description}</p>
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="rounded-xl bg-[#f8f4fd] px-4 py-3">
          <p className="text-xs font-black text-[#6e4eab]">왜 지금 추천됐나요?</p>
          <p className="mt-1 text-sm leading-6 text-[#554864]">{getShortRecommendationReason(recommendation)}</p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailList title="이 분석에서 보는 것" items={overviewItems} />
          <DetailList title="분석 후 알 수 있는 것" items={expectedUnderstanding} />
        </div>

        {state === "not_purchased" ? (
          <details className="mt-5 rounded-xl border border-[#e4dcf0] bg-[#fcfaff] px-4 py-3">
            <summary className="cursor-pointer text-sm font-black text-[#6e4eab]">리포트 구성 자세히 보기</summary>
            <p className="mt-3 text-xs leading-5 text-[#746886]">아래는 리포트 구성 안내이며, 실제 분석 결과는 구매 후 생성됩니다.</p>
            <PremiumReportValuePreview product={product} />
            <p className="mt-4 text-xs leading-6 text-[#766887]">추천 근거 참고: {reason}</p>
          </details>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-[#e7ddf2] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-[#211737]">{getProductPricing(productId).amount.toLocaleString("ko-KR")}원</p>
            {state === "not_purchased" ? (
              <p className="mt-1 text-xs leading-5 text-[#746886]">구매 후 개인화 리포트가 보관되고, 완성되면 AI 상담으로 이어갈 수 있어요.</p>
            ) : (
              <p className="mt-1 text-xs leading-5 text-[#746886]">구매한 분석의 현재 진행 상태로 연결됩니다.</p>
            )}
          </div>
          {guestMode ? (
            <button
              type="button"
              onClick={() => void continueGuestPurchase()}
              disabled={guestIntentPending}
              className="shrink-0 rounded-xl bg-[#7350b6] px-6 py-3 text-center text-sm font-black text-white transition hover:bg-[#60409f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7350b6] disabled:cursor-wait disabled:opacity-60"
            >
              {guestIntentPending ? "계속 준비 중..." : "이 분석 자세히 보기 →"}
            </button>
          ) : href ? (
            <Link href={href} className="shrink-0 rounded-xl bg-[#7350b6] px-6 py-3 text-center text-sm font-black text-white transition hover:bg-[#60409f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7350b6]">
              {state === "not_purchased" ? "이 분석 자세히 보기 →" : state === "none" || state === "generating" ? "리포트 준비 화면 보기 →" : "구매한 리포트 보기 →"}
            </Link>
          ) : null}
        </div>
        {guestIntentError ? <p className="mt-3 text-sm font-medium text-red-600">{guestIntentError}</p> : null}
      </div>
    </section>
  );
}

function DetailList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <p className="text-xs font-black text-[#6e4eab]">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#625771]">
        {items.map((item) => <li key={item}>· {item}</li>)}
      </ul>
    </div>
  );
}

