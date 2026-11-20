"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PREMIUM_PRODUCT_PHOTOS } from "@/app/lib/premiumProductPhotos";
import { getPremiumAnalysisHref, type PremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getProductPricing } from "@/app/lib/productPricing";
import { saveAnalysisAction } from "@/app/lib/interestedAnalyses/actions";
import PremiumReportValuePreview from "@/app/components/PremiumReportValuePreview";
import ProductReviewSummary from "@/app/components/ProductReviewSummary";
import TrustPrinciplesCard from "@/app/components/TrustPrinciplesCard";

type Props = {
  product: PremiumProductDefinition;
  state: PremiumAnalysisProductState;
  profileId?: string;
  isSaved?: boolean;
};

const STATUS_LABELS: Record<PremiumAnalysisProductState, string> = {
  not_purchased: "구매 전",
  none: "구매 완료 · 리포트 준비",
  generating: "리포트 생성 중",
  completed: "리포트 완료",
  failed: "리포트 재시도 필요",
};

const ACTION_LABELS: Record<PremiumAnalysisProductState, string> = {
  not_purchased: "내 사주로 분석 시작하기",
  none: "리포트 준비 화면 보기",
  generating: "리포트 준비 화면 보기",
  completed: "내 리포트 보기",
  failed: "리포트 다시 생성하기",
};

const WORRIES = [
  {
    number: "01",
    title: "함께 쓰는데, 계산은 늘 내 몫인가요?",
    copy: "생활비와 공동 지출을 누가 얼마나 부담하는지 애매할 때",
  },
  {
    number: "02",
    title: "큰돈을 쓰기 전에 서로 의논하고 있나요?",
    copy: "결정하는 사람과 실제 비용을 내는 사람이 다를 때",
  },
  {
    number: "03",
    title: "상황이 바뀌어도 예전 방식 그대로인가요?",
    copy: "수입이나 역할이 달라졌는데 부담을 다시 정하지 못했을 때",
  },
] as const;

const INSIGHTS = [
  {
    number: "01",
    title: "누가 결정할까요?",
    copy: "함께 쓰는 돈을 결정할 때 서로 확인해야 할 기준을 살펴봐요.",
    detail: "결정과 승인",
  },
  {
    number: "02",
    title: "언제, 누가 부담할까요?",
    copy: "정산 시점과 최종 부담을 분명히 할 질문을 정리해요.",
    detail: "정산과 책임",
  },
  {
    number: "03",
    title: "달라진 상황은 어떻게 맞출까요?",
    copy: "수입·역할·비용이 달라질 때 다시 이야기할 기준을 살펴봐요.",
    detail: "변경과 재검토",
  },
] as const;

/**
 * Visual/storytelling pilot for one registered product only.
 * No new checkout or entitlement logic: all destinations come from
 * getPremiumAnalysisHref, identical to the shared detail view.
 */
export default function MoneySharedFinancePilotDetail({
  product,
  state,
  profileId,
  isSaved = false,
}: Props) {
  const [savedState, setSavedState] = useState(isSaved);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { setSavedState(isSaved); }, [isSaved]);

  const href = getPremiumAnalysisHref(product.id, state, profileId);
  const price = getProductPricing(product.id).amount.toLocaleString("ko-KR") + "원";
  const photo = PREMIUM_PRODUCT_PHOTOS["money-shared-finance"];

  const handleSave = async () => {
    if (savedState || isSaving) return;
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

  return (
    <section
      aria-labelledby="selected-product-title"
      className="relative mt-5 overflow-hidden rounded-[1.9rem] border border-[#e6ddf4] bg-white pb-32 shadow-[0_20px_65px_rgba(54,35,92,0.08)]"
    >
      <div className="relative overflow-hidden bg-[linear-gradient(140deg,#fffaf9_0%,#f6eeff_58%,#eae1ff_100%)] px-5 pb-9 pt-8 sm:px-9 sm:pb-12 sm:pt-11">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#e2c7ff]/50 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#e6d8f8] bg-white/80 px-3 py-1.5 text-xs font-extrabold text-[#6f4bbc]">
                함께 쓰는 돈 · 나의 사주 분석
              </span>
              <span className="rounded-full bg-[#e9dffe] px-3 py-1.5 text-xs font-bold text-[#5e43a6]">
                {STATUS_LABELS[state]}
              </span>
            </div>
            <h2
              id="selected-product-title"
              className="mt-6 break-keep text-[clamp(1.95rem,4.1vw,3.15rem)] font-black leading-[1.26] tracking-[-0.055em] text-[#291744]"
            >
              함께 쓰는 돈,<span className="block text-[#7150c5]">왜 나만 더 부담하는 것 같을까요?</span>
            </h2>
            <p className="mt-5 max-w-[35rem] break-keep text-base font-medium leading-8 text-[#544765] sm:text-[17px]">
              같이 쓰는 생활비인데, 결정은 따로 하고 계산은 한쪽이 더 하게 될 때가 있죠.
              <strong className="font-extrabold text-[#35204e]"> 내 사주에서 살펴볼 수 있는 돈 관리 성향</strong>을 출발점으로
              함께 쓰는 돈의 결정과 부담을 어떻게 정리할지 알아보세요.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["생활비 부담", "공동 지출 결정", "정산과 역할 조정"].map((tag) => (
                <span key={tag} className="rounded-full border border-white bg-white/75 px-3 py-1.5 text-sm font-bold text-[#6c5687] shadow-sm">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm font-semibold text-[#715a87]">
              개인화 사주 심층 리포트 <span aria-hidden="true">·</span> <strong className="text-[#43225f]">{price}</strong>
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-[440px]">
            <div className="absolute -inset-3 rounded-[2rem] border border-white/70 bg-white/40" aria-hidden="true" />
            <div className="relative aspect-[5/4] overflow-hidden rounded-[1.5rem] border-[5px] border-white shadow-[0_20px_45px_rgba(73,52,103,0.16)] lg:aspect-[4/4.25]">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                priority
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 440px, 420px"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#251733]/85 via-[#251733]/35 to-transparent px-5 pb-5 pt-16 text-white">
                <p className="break-keep text-base font-extrabold leading-7">같이 쓰는 돈, 서로의 기준부터 살펴보세요.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-9">
        <div className="py-10 sm:py-14">
          <p className="text-center text-xs font-black tracking-[0.18em] text-[#9b73d6]">MY STORY</p>
          <h3 className="mt-3 break-keep text-center text-[25px] font-black leading-[1.4] tracking-[-0.04em] text-[#291744] sm:text-[32px]">
            혹시 이런 순간이 익숙한가요?
          </h3>
          <p className="mt-2 text-center text-sm leading-7 text-[#786a8c]">꼭 심한 갈등이 아니어도, 마음에 걸리는 작은 순간부터요.</p>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {WORRIES.map((item) => (
              <div key={item.number} className="rounded-[1.4rem] border border-[#eee5f5] bg-[#fdf9ff] px-5 py-6">
                <span className="text-sm font-black text-[#aa83da]">{item.number}</span>
                <p className="mt-3 break-keep text-lg font-extrabold leading-7 text-[#37244c]">{item.title}</p>
                <p className="mt-3 break-keep text-sm leading-6 text-[#72647d]">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.6rem] bg-[#34204f] px-5 py-9 text-white sm:px-9 sm:py-11">
          <p className="text-xs font-bold tracking-[0.14em] text-[#d5baff]">WHAT YOU WILL EXPLORE</p>
          <h3 className="mt-3 break-keep text-[25px] font-black leading-[1.35] tracking-[-0.04em] sm:text-[32px]">
            누가 맞는지보다,<br />
            <span className="text-[#e5ceff]">무엇을 함께 정해야 할지</span> 살펴봐요.
          </h3>
          <p className="mt-4 max-w-[43rem] break-keep text-sm leading-7 text-[#e7dff0] sm:text-base">
            사주를 바탕으로 나의 성향을 해석하고, 현실에서 확인해 볼 공동 지출의 기준을 세 가지로 정리합니다.
          </p>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {INSIGHTS.map((item) => (
              <div key={item.number} className="rounded-[1.2rem] border border-white/20 bg-white/10 px-5 py-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-3xl font-black text-[#dbc0ff]">{item.number}</span>
                  <span className="text-xs font-bold text-[#e5d6f5]">{item.detail}</span>
                </div>
                <h4 className="mt-4 break-keep text-lg font-extrabold leading-7">{item.title}</h4>
                <p className="mt-3 break-keep text-sm leading-6 text-[#e9e2f1]">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="py-11 sm:py-14">
          <p className="text-center text-xs font-black tracking-[0.18em] text-[#9b73d6]">AFTER YOUR REPORT</p>
          <h3 className="mt-3 break-keep text-center text-[25px] font-black tracking-[-0.035em] text-[#291744] sm:text-[31px]">
            리포트를 읽은 뒤에도 질문은 이어질 수 있어요.
          </h3>
          <p className="mx-auto mt-3 max-w-[40rem] break-keep text-center text-base leading-8 text-[#6b6078]">
            분석 결과가 궁금하거나 내 상황에 더 맞춰 물어보고 싶다면,
            구매한 리포트의 내용을 바탕으로 AI 상담에서도 이어서 살펴볼 수 있어요.
          </p>
          <div className="mt-7 grid items-stretch gap-3 md:grid-cols-3">
            {[
              ["STEP 01", "내 사주 분석", "선택한 프로필을 기준으로 나의 성향을 해석해요."],
              ["STEP 02", "개인화 리포트", "공동 지출의 결정·정산·변경 기준을 살펴봐요."],
              ["STEP 03", "AI 상담으로 이어가기", "완성된 리포트를 바탕으로 추가 질문을 해요."],
            ].map(([step, title, copy]) => (
              <div key={step} className="rounded-[1.3rem] border border-[#e8ddf5] bg-[linear-gradient(140deg,#fff_0%,#f9f4ff_100%)] p-5">
                <span className="text-xs font-extrabold text-[#8b62c9]">{step}</span>
                <h4 className="mt-3 break-keep text-lg font-black text-[#332047]">{title}</h4>
                <p className="mt-2 break-keep text-sm leading-6 text-[#716480]">{copy}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 break-keep text-center text-xs leading-6 text-[#82758d]">
            AI 상담은 보유한 리포트 범위와 질문권 등 별도 이용 조건에 따라 제공됩니다.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[#e9e1f2] bg-[#fcfaff] px-5 py-7 sm:px-7">
          <h3 className="break-keep text-xl font-black text-[#2f1b46]">구매 전에 이것만 확인해 주세요</h3>
          <p className="mt-3 break-keep text-sm leading-7 text-[#695b77]">
            이 분석은 내 사주와 공동 지출을 점검할 질문을 바탕으로 기준을 정리하는 개인화 리포트입니다.
            상대방의 재산·속마음이나 관계의 결과를 단정하지 않으며 금융·법률 자문을 대신하지 않습니다.
          </p>
          <div className="mt-5 space-y-3">
            {state === "not_purchased" ? (
              <details className="rounded-xl border border-[#e6dcf0] bg-white px-4 py-4">
                <summary className="cursor-pointer text-sm font-bold text-[#604390]">리포트에서 어떤 내용을 확인하나요?</summary>
                <PremiumReportValuePreview product={product} />
              </details>
            ) : null}
            <details className="rounded-xl border border-[#e6dcf0] bg-white px-4 py-4">
              <summary className="cursor-pointer text-sm font-bold text-[#604390]">구매 후 이용 순서와 보관 기간 보기</summary>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-[#5f536a]">
                <li>분석할 프로필과 결제 금액을 확인합니다.</li>
                <li>결제가 승인되면 개인화 리포트 생성이 시작됩니다.</li>
                <li>새로 구매한 리포트는 결제일부터 12개월 동안 구매한 분석에서 다시 열람할 수 있습니다.</li>
              </ol>
            </details>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-bold text-[#49345d]">
              {state === "not_purchased" ? "개인화 심층 분석" : STATUS_LABELS[state]} <span className="ml-2 text-lg font-black">{price}</span>
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={savedState || isSaving}
              className="rounded-xl border border-[#d9cbea] bg-white px-4 py-3 text-sm font-bold text-[#6a4a91] transition hover:bg-[#f6efff] disabled:cursor-default disabled:opacity-60"
            >
              {isSaving ? "저장 중..." : savedState ? "관심 분석에 저장됨" : "관심 분석에 저장"}
            </button>
          </div>
        </div>

        {state === "not_purchased" ? (
          <div className="mt-5">
            <ProductReviewSummary productId={product.id} />
            <TrustPrinciplesCard compact />
          </div>
        ) : null}
      </div>

      {/* One state-aware CTA only; intentionally fixed for quick access at any scroll position. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 sm:bottom-5">
        <div className="pointer-events-auto flex w-full max-w-[460px] items-center gap-3 rounded-[1.3rem] border border-[#e5dcef] bg-white/95 p-2.5 shadow-[0_10px_40px_rgba(33,17,59,0.22)] backdrop-blur-lg">
          <div className="min-w-0 shrink-0 pl-2">
            <p className="text-[10px] font-bold text-[#79698d]">{state === "not_purchased" ? "개인화 분석" : STATUS_LABELS[state]}</p>
            <p className="text-base font-black text-[#35204d]">{price}</p>
          </div>
          {href ? (
            <Link
              href={href}
              className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#6f4ad3] px-3 py-3 text-center text-sm font-extrabold text-white transition hover:bg-[#5635b3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f4ad3]"
            >
              {ACTION_LABELS[state]} <span aria-hidden="true" className="ml-1">→</span>
            </Link>
          ) : (
            <p className="flex-1 px-2 text-center text-sm font-semibold text-[#765f8c]">분석할 프로필을 먼저 선택해 주세요.</p>
          )}
        </div>
      </div>
    </section>
  );
}
