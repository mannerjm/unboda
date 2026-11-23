"use client";

import Link from "next/link";
import Image from "next/image";
import { PREMIUM_PRODUCT_PHOTOS } from "@/app/lib/premiumProductPhotos";
import { getReadablePaidQuestion } from "@/app/lib/premiumQuestionDisplay";
import { useEffect, useState } from "react";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";
import { getPremiumAnalysisHref, type PremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { getProductPricing } from "@/app/lib/productPricing";
import { saveAnalysisAction } from "@/app/lib/interestedAnalyses/actions";
import { formatTopicExpectedUnderstanding } from "@/app/lib/purchaseDecisionCopy";
import PremiumReportValuePreview from "@/app/components/PremiumReportValuePreview";
import MoneySharedFinancePilotDetail from "@/app/components/MoneySharedFinancePilotDetail";
import CustomerFirstPremiumDetail from "@/app/components/CustomerFirstPremiumDetail";
import { getLaunchProductIds } from "@/app/lib/paidAnalysisTopicConfig";
import ProductReviewSummary from "@/app/components/ProductReviewSummary";
import TrustPrinciplesCard from "@/app/components/TrustPrinciplesCard";
import WealthTeacherCard from "@/app/components/WealthTeacherCard";

type PremiumProductDetailProps = {
  product: PremiumProductDefinition;
  state: PremiumAnalysisProductState;
  profileId?: string;
  onClear?: () => void;
  isSaved?: boolean;
};

const ACTION_LABELS: Record<PremiumAnalysisProductState, string> = {
  not_purchased: "이 질문 더 깊게 보기",
  none: "리포트 준비 화면 보기",
  generating: "리포트 준비 화면 보기",
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

function getDetailPhoto(product: PremiumProductDefinition) {
  const fallback: Record<string, string> = {
    money: "wealth",
    career: "career",
    relationship: "relationship",
    social: "relationship-friendship",
    health: "health-energy-recovery",
    business: "business-team-management",
    growth: "study-learning-strategy",
    change: "career-job-change",
    life: "relationship-family-role",
    period: "monthly-current",
  };
  return PREMIUM_PRODUCT_PHOTOS[product.id]
    ?? PREMIUM_PRODUCT_PHOTOS[fallback[product.category] ?? "lifetime-overview"];
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

  // The established money-shared-finance page remains untouched. All other
  // launched products get the matching customer-first design with their own data.
  if (product.id === "money-shared-finance") {
    return <>
      <WealthTeacherCard variant="detail" />
      <MoneySharedFinancePilotDetail
        product={product}
        state={state}
        profileId={profileId}
        isSaved={isSaved}
      />
    </>;
  }
  if (getLaunchProductIds().includes(product.id)) {
    return <CustomerFirstPremiumDetail
      product={product}
      state={state}
      profileId={profileId}
      isSaved={isSaved}
    />;
  }

  const isPeriod = product.kind === "PERIOD";
  const displayTitle = getPremiumProductDisplayTitle(product.id, product.title);
  const recommendedFor = getRecommendedFor(product);
  const quickOverviewItems = getQuickOverviewItems(product);
  const expectedUnderstanding = getExpectedUnderstanding(product);
  const outcomeItems = Array.from(new Set([...expectedUnderstanding, ...quickOverviewItems])).slice(0, 4);
  const href = getPremiumAnalysisHref(product.id, state, profileId);
  const photo = getDetailPhoto(product);
  const readableQuestion = getReadablePaidQuestion(product.id, displayTitle);
  const keyPoints = outcomeItems.slice(0, 3);


  return (
    <section
      className="mt-5 overflow-hidden rounded-[1.8rem] border border-[#d9deed] bg-white shadow-[0_18px_55px_rgba(33,40,83,0.08)]"
      aria-labelledby="selected-product-title"
    >
      <div className="grid gap-6 bg-[linear-gradient(140deg,#fff9fd_0%,#f4edff_52%,#ede9ff_100%)] px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1.14fr_0.86fr] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-bold text-[#684fc1]">
              {isPeriod ? "나의 시기 흐름" : "나에게 맞는 사주 심층 분석"}
            </span>
            <span className={`rounded-full border px-3 py-1.5 text-sm font-bold ${STATUS_STYLES[state]}`}>
              {STATUS_LABELS[state]}
            </span>
          </div>
          <p className="mt-6 text-base font-extrabold text-[#7059b3]">PREMIUM ANALYSIS · {displayTitle}</p>
          <h2 id="selected-product-title" className="mt-2 break-keep text-[29px] font-black leading-[1.32] tracking-[-0.045em] text-[#24163d] sm:text-[38px]">
            {readableQuestion}
          </h2>
          <p className="mt-5 break-keep text-[16px] font-medium leading-8 text-[#594a70] sm:text-[17px]">
            {product.description}
          </p>
          <p className="mt-4 break-keep text-sm leading-6 text-[#796b8d]">
            나의 출생 정보를 바탕으로 해석하는 개인화 리포트입니다. 실제 결과는 분석 후 확인할 수 있어요.
          </p>
        </div>
        <div className="relative isolate mx-auto w-full max-w-[420px]">
          <div className="absolute -inset-3 -z-10 rounded-[2.5rem] bg-white/55 blur-sm" />
          <div className="relative aspect-[4/4.15] overflow-hidden rounded-[2rem] border-[6px] border-white bg-[#e9def7] shadow-[0_18px_45px_rgba(82,52,130,0.16)] sm:aspect-[5/4] lg:aspect-[4/4.5]">
            <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 420px, 390px" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#24163d]/80 via-[#24163d]/20 to-transparent px-5 pb-5 pt-16 text-white">
              <p className="text-sm font-bold">나에게 해당하는 이야기를 확인해 보세요</p>
            </div>
          </div>
        </div>
      </div>

      {product.category === "money" ? <div className="px-5 sm:px-8"><WealthTeacherCard variant="detail" /></div> : null}
      <div className="bg-white px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-7 text-center">
          <span className="inline-flex rounded-full bg-[#f4edff] px-4 py-1.5 text-sm font-extrabold text-[#7550c7]">이 분석을 보고 나면</span>
          <h3 className="mt-3 break-keep text-[25px] font-black leading-snug tracking-[-0.035em] text-[#24163d] sm:text-[32px]">
            무엇을 알 수 있을까요?
          </h3>
          <p className="mt-2 text-base leading-7 text-slate-600">핵심만 먼저 확인해 보세요.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {keyPoints.map((point, index) => (
            <article key={`${product.id}-point-${index}`} className="rounded-[1.6rem] border border-[#e9e0f6] bg-[linear-gradient(155deg,#faf7ff_0%,#fffafc_100%)] px-5 py-6 shadow-[0_9px_25px_rgba(115,82,160,0.06)]">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7dbff] text-lg font-black text-[#6f4ad3]">0{index + 1}</span>
              <p className="mt-5 break-keep text-[18px] font-extrabold leading-[1.65] text-[#29203e]">{point}</p>
            </article>
          ))}
        </div>
        {recommendedFor.length ? (
          <div className="mt-8 rounded-[1.6rem] border border-[#e6dbf4] bg-[#fcfaff] px-5 py-6 sm:px-7">
            <p className="text-sm font-extrabold text-[#795aca]">이 분석이 필요한 경우</p>
            <h3 className="mt-2 break-keep text-[23px] font-black text-[#29193f]">이런 고민이 있다면 살펴보세요</h3>
            <ul className="mt-5 space-y-4">
              {recommendedFor.map((item) => (
                <li key={item} className="flex gap-3 break-keep text-[16px] font-medium leading-8 text-[#51425f]">
                  <span aria-hidden="true" className="mt-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ede4ff] text-sm font-bold text-[#734dcc]">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {state === "not_purchased" ? (
          <details className="group mt-6 rounded-[1.4rem] border border-[#e2dceb] bg-white px-5 py-4">
            <summary className="cursor-pointer text-[16px] font-bold text-[#5f47ad] marker:text-[#7c64ca]">
              리포트 구성과 분석 기준 자세히 보기
            </summary>
            <PremiumReportValuePreview product={product} />
          </details>
        ) : null}
        <details className="mt-4 rounded-[1.4rem] border border-[#e7e1ee] bg-[#faf9fc] px-5 py-4">
          <summary className="cursor-pointer text-[16px] font-bold text-[#655587]">
            분석부터 리포트 보관까지 이용 순서
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["1. 분석 대상 확인", profileId ? "선택한 프로필 기준으로 분석합니다." : "구매 전 분석할 프로필을 선택합니다."],
              ["2. 개인화 리포트 생성", "결제가 승인되면 개인화 분석 생성을 바로 시작합니다."],
              ["3. 구매한 분석에 보관", "새 구매 리포트는 결제일부터 12개월 동안 다시 열람할 수 있습니다."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-xl border border-[#e7def4] bg-white px-4 py-4">
                <p className="text-base font-extrabold text-[#342746]">{title}</p>
                <p className="mt-2 text-[15px] leading-7 text-slate-700">{description}</p>
              </div>
            ))}
          </div>
        </details>

        {state === "not_purchased" ? <ProductReviewSummary productId={product.id} /> : null}
        {state === "not_purchased" ? <TrustPrinciplesCard /> : null}

        {state === "not_purchased" ? (
          <section className="mt-5 rounded-[1.5rem] border border-[#d8d3ff] bg-[linear-gradient(135deg,#ffffff_0%,#f4f2ff_100%)] p-5 shadow-sm sm:p-6" aria-label="구매 후 이어지는 가치">
            <p className="text-xs font-bold tracking-[0.13em] text-[#6f5ce7]">리포트에서 끝나지 않습니다</p>
            <h3 className="mt-2 text-lg font-black text-[#11162d]">구매한 분석은 이후 AI 상담에서도 이어집니다.</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "내 결과를 바탕으로 개인화 심층 리포트가 생성됩니다.",
                "새로 구매하는 리포트는 결제일부터 12개월 동안 구매 보관함에서 다시 열람할 수 있습니다.",
                "리포트가 완성되면 AI 상담에서 이 주제를 이어서 물어볼 수 있습니다.",
                "리포트를 읽고 남은 질문도 같은 상담에서 계속 이어갈 수 있습니다.",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-[#e1e5f0] bg-white px-4 py-3 text-sm leading-6 text-slate-700">{item}</div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-5 rounded-[1.5rem] border border-[#d8d3ff] bg-[linear-gradient(135deg,#ffffff_0%,#f3f1ff_100%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.13em] text-slate-600">구매 전 확인</p>
              <p className="mt-2 text-[15px] leading-7 text-slate-700">
                결제 금액과 분석 대상을 확인한 뒤 진행하세요. 결제가 승인되면 개인화 분석 생성이 바로 시작됩니다.
              </p>
              <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-slate-500">결제 금액</p>
              <p className="mt-1 text-lg font-bold text-[#11162d]">{formatPrice(product.id)}</p>
            </div>

            <div className="flex flex-col gap-2 sm:min-w-56">
              {href ? (
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
