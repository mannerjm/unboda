"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PREMIUM_PRODUCT_PHOTOS } from "@/app/lib/premiumProductPhotos";
import { getPremiumAnalysisHref, type PremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getProductPricing } from "@/app/lib/productPricing";
import { getReadablePaidQuestion } from "@/app/lib/premiumQuestionDisplay";
import { saveAnalysisAction } from "@/app/lib/interestedAnalyses/actions";
import { buildPaidAnalysisV4PreviewModel } from "@/app/lib/paidAnalysisV4PreviewModel";
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
  not_purchased: "심층분석 구매하기",
  none: "리포트 준비 화면 보기",
  generating: "리포트 준비 화면 보기",
  completed: "구매한 리포트 보기",
  failed: "리포트 다시 생성하기",
};

const WORRIES = [
  { icon: "🧾", question: "생활비를 함께 쓰는데, 부담은 한쪽으로 쏠리나요?", context: "누가 무엇을 내기로 했는지 애매할 때" },
  { icon: "💬", question: "큰 지출을 결정할 때, 서로의 의견이 엇갈리나요?", context: "결정하는 사람과 비용을 내는 사람이 다를 때" },
  { icon: "🔄", question: "수입이 달라졌는데도 예전 약속 그대로인가요?", context: "상황이 바뀐 뒤에도 분담을 다시 정하지 못할 때" },
] as const;

const INSIGHTS = [
  { title: "누가 결정하나요?", detail: "함께 쓰는 비용의 결정과 승인 기준" },
  { title: "언제, 누가 부담하나요?", detail: "정산 시점과 실제 비용을 책임지는 기준" },
  { title: "상황이 달라지면 어떻게 하나요?", detail: "수입·역할 변화에 맞춰 다시 합의할 기준" },
] as const;

/** These are customer-facing labels for the EXISTING six-step report contract,
 * not an example of a generated or guaranteed personal result. */
const FRIENDLY_REPORT_STEPS = [
  { title: "함께 쓰는 돈, 무엇부터 정리할까요?", description: "함께 쓰는 돈의 기준을 어디서부터 정리할지 살펴봐요." },
  { title: "돈 문제로 부담이 생기는 상황은 무엇일까요?", description: "결정하는 사람과 실제 비용을 내는 사람이 다른 상황을 구분해요." },
  { title: "내 사주에서 어떤 성향을 살펴볼까요?", description: "나의 돈 관리 성향을 어떤 근거로 해석하는지 살펴봐요." },
  { title: "지금 다시 확인하면 좋은 부분은 무엇일까요?", description: "책임·역할·정산 기준을 점검할 상황을 살펴봐요." },
  { title: "서로 어떤 약속을 정하면 좋을까요?", description: "누가 결정하고 언제 정산할지 확인할 질문을 정리해요." },
  { title: "실제 생활에서 추가로 확인할 것은 무엇일까요?", description: "사주 해석으로 알 수 없는 사실과 직접 확인해야 할 내용을 구분해요." },
] as const;

/** One-product storytelling pilot. Purchase/report links use the existing
 * profile-scoped state-aware navigation; payment and AI code are untouched. */
export default function MoneySharedFinancePilotDetail({
  product,
  state,
  profileId,
  isSaved = false,
}: Props) {
  const [savedState, setSavedState] = useState(isSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [photoFallback, setPhotoFallback] = useState(false);

  useEffect(() => { setSavedState(isSaved); }, [isSaved]);

  const href = getPremiumAnalysisHref(product.id, state, profileId);
  const price = getProductPricing(product.id).amount.toLocaleString("ko-KR") + "원";
  const headline = getReadablePaidQuestion(product.id, product.title);
  const commaIndex = headline.indexOf(",");
  const headlineLead = commaIndex >= 0 ? headline.slice(0, commaIndex + 1) : headline;
  const headlineRest = commaIndex >= 0 ? headline.slice(commaIndex + 1).trim() : "";
  const photo = PREMIUM_PRODUCT_PHOTOS["money-shared-finance"];
  // Pexels original 3817×2736; local 330×265 stays as fallback only.
  const originalPhotoUrl = "https://images.pexels.com/photos/6964105/pexels-photo-6964105.jpeg?auto=compress&cs=tinysrgb&w=1200";
  const preview = buildPaidAnalysisV4PreviewModel(product);

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
      data-pilot-product="money-shared-finance"
      aria-labelledby="selected-product-title"
      className="mt-0 overflow-hidden bg-white"
    >
      {/* The only checkout/report CTA lives in the normal page flow.
          Unlike the old fixed footer, it never covers the reading content. */}
      <div className="relative overflow-hidden bg-[linear-gradient(140deg,#fff9fb_0%,#f8f1ff_55%,#ebe3ff_100%)] px-4 py-7 sm:px-9 sm:py-10">
        <div className="relative grid items-center gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-9">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#7354bd]">
                {product.title} · 사주 심층 분석
              </span>
              <span className="rounded-full border border-[#e3d5fa] bg-[#f0e8ff] px-3 py-1.5 text-xs font-bold text-[#6748a4]">
                {STATUS_LABELS[state]}
              </span>
            </div>
            <h2
              id="selected-product-title"
              className="mt-5 break-keep text-[clamp(1.7rem,5.7vw,2.7rem)] font-black leading-[1.28] tracking-[-0.05em] text-[#301b4c]"
            >
              {headlineLead}{headlineRest ? <span className="block text-[#7050bf]">{headlineRest}</span> : null}
            </h2>
            <p className="mt-4 max-w-[37rem] break-keep text-[15px] font-medium leading-7 text-[#584968] sm:text-base sm:leading-8">
              생활비를 같이 쓰는데도 자꾸 서운한 마음이 드나요?
              <span className="font-bold text-[#3a2951]"> 내 사주를 바탕으로 돈을 대하는 성향을 살펴보고,</span>
              함께 쓰는 돈의 기준을 어떻게 정할지 알아보세요.
            </p>
            <p className="mt-6 text-sm font-bold text-[#6c5687]">
              개인화 사주 심층 분석 <span aria-hidden="true">·</span> <strong className="text-lg font-black text-[#39224f]">{price}</strong>
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-[390px]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border-[5px] border-white bg-[#f8f1ff] shadow-[0_16px_38px_rgba(83,54,124,0.14)]">
              <Image
                src={photoFallback ? photo.src : originalPhotoUrl}
                alt={photo.alt}
                fill
                unoptimized
                priority
                onError={() => setPhotoFallback(true)}
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 390px, 390px"
                className="object-contain"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#261831]/85 via-[#261831]/20 to-transparent px-5 pb-4 pt-14 text-white">
                <p className="break-keep text-sm font-extrabold leading-6">함께 쓰는 돈, 서로의 기준부터 살펴보세요.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-9">
        {/* Narrative beats rather than three more repeated card boxes. */}
        <section className="py-11 sm:py-14" aria-labelledby="finance-concerns">
          <p className="text-center text-xs font-extrabold tracking-widest text-[#926bc8]">내 이야기처럼 느껴지는 순간</p>
          <h3 id="finance-concerns" className="mt-3 break-keep text-center text-[25px] font-black tracking-tight text-[#2f1a48] sm:text-[30px]">
            혹시 이런 고민을 해본 적 있으신가요?
          </h3>
          <div className="mx-auto mt-7 max-w-[760px] divide-y divide-[#e7def1] border-y border-[#e7def1]">
            {WORRIES.map((item, index) => (
              <div key={item.question} className="flex min-w-0 items-start gap-3 py-5 sm:gap-6 sm:py-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e6daf4] bg-[#f7f0ff] text-xl" aria-hidden="true">{item.icon}</div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold tracking-wide text-[#956fc9]">0{index + 1} · 나의 일상</span>
                  <h4 className="break-keep text-lg font-extrabold leading-7 text-[#302044] sm:text-xl">{item.question}</h4>
                  <p className="mt-1.5 break-keep text-sm leading-6 text-[#746581]">{item.context}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.6rem] bg-[#35224f] px-5 py-9 text-white sm:px-8 sm:py-11" aria-labelledby="finance-value">
          <p className="text-xs font-bold tracking-widest text-[#d9c1ff]">이 분석에서 살펴볼 이야기</p>
          <h3 id="finance-value" className="mt-3 break-keep text-[25px] font-black leading-snug tracking-tight sm:text-[30px]">
            누가 맞는지보다,<br />
            <span className="text-[#e4d0ff]">무엇을 함께 정하면 좋을지</span> 살펴봐요.
          </h3>
          <p className="mt-3 max-w-[42rem] break-keep text-sm leading-7 text-[#e7dbee]">
            내 사주를 해석한 뒤 현실에서 확인해 볼 공동 지출의 기준을 정리합니다.
            상대방의 행동이나 재정 상태를 미리 단정하는 분석은 아닙니다.
          </p>
          <div className="mt-7 grid gap-5 border-t border-white/25 pt-7 md:grid-cols-3 md:gap-0">
            {INSIGHTS.map((item, index) => (
              <div key={item.title} className={index === 0 ? "md:pr-5" : "md:border-l md:border-white/25 md:px-5"}>
                <span className="text-xl font-black text-[#e0c5ff]">0{index + 1}</span>
                <h4 className="mt-2 break-keep text-lg font-extrabold">{item.title}</h4>
                <p className="mt-2 break-keep text-sm leading-6 text-[#e9dcf5]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-11 sm:py-14" aria-labelledby="finance-ai">
          <div className="mx-auto max-w-[740px] text-center">
            <p className="text-xs font-extrabold tracking-widest text-[#926bc8]">운보다에서는 여기서 끝나지 않아요</p>
            <h3 id="finance-ai" className="mt-3 break-keep text-[25px] font-black leading-snug tracking-tight text-[#302048] sm:text-[30px]">
              분석을 보고도 궁금한 게 남았다면?
            </h3>
            <p className="mt-3 break-keep text-[15px] leading-8 text-[#6a5b79]">
              나만의 리포트를 확인한 뒤 같은 주제로 AI 상담을 이어갈 수 있어요.
              내 사주 분석에서 시작한 이야기를 조금 더 자세히 물어보세요.
            </p>
          </div>
          <ol className="mx-auto mt-7 flex max-w-[820px] flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-4">
            <li className="flex-1">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e9dafa] text-sm font-black text-[#7050bc]">1</span>
              <p className="mt-2 font-extrabold text-[#38274d]">내 사주 분석</p>
            </li>
            <li aria-hidden="true" className="text-2xl font-light text-[#b198d1]"><span className="sm:hidden">↓</span><span className="hidden sm:inline">→</span></li>
            <li className="flex-1">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e9dafa] text-sm font-black text-[#7050bc]">2</span>
              <p className="mt-2 font-extrabold text-[#38274d]">개인화 리포트</p>
            </li>
            <li aria-hidden="true" className="text-2xl font-light text-[#b198d1]"><span className="sm:hidden">↓</span><span className="hidden sm:inline">→</span></li>
            <li className="flex-1">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e9dafa] text-sm font-black text-[#7050bc]">3</span>
              <p className="mt-2 font-extrabold text-[#38274d]">AI 상담에서 이어가기</p>
            </li>
          </ol>
          <p className="mt-5 break-keep text-center text-xs leading-6 text-[#83758e]">
            AI 상담은 보유한 리포트 범위와 질문권 등 별도 이용 조건에 따라 제공됩니다.
          </p>
        </section>

        <section className="mb-6 border-t border-[#ece5f4] pt-8" aria-labelledby="finance-purchase-note">
          <h3 id="finance-purchase-note" className="text-xl font-black text-[#302048]">구매 전 확인할 내용</h3>
          <p className="mt-2 break-keep text-sm leading-7 text-[#6e607b]">
            이 리포트는 나의 사주와 공동 지출을 살펴보는 질문을 바탕으로 해석합니다.
            상대방의 재산·속마음이나 관계 결과를 단정하지 않으며, 금융·법률 자문을 대신하지 않습니다.
          </p>
          <div className="mt-5 space-y-3">
            {state === "not_purchased" ? (
              <details className="rounded-xl border border-[#e5dcef] bg-[#fcfaff] px-4 py-4">
                <summary className="cursor-pointer text-sm font-extrabold text-[#644696]">
                  구매 후 리포트에서 확인할 내용
                </summary>
                <div className="mt-4 space-y-2 text-sm leading-7 text-[#5f5371]">
                  <p>① 내 사주에서 살펴볼 수 있는 돈 관리 성향</p>
                  <p>② 공동 비용의 결정·정산·분담을 확인할 질문</p>
                  <p>③ 상황이 바뀔 때 다시 합의할 기준과 점검 순서</p>
                </div>
                <details className="mt-4 rounded-lg border border-[#e7e0ef] bg-white px-4 py-3">
                  <summary className="cursor-pointer text-sm font-bold text-[#7658a7]">
                    이 분석에서는 무엇을 알아볼까요?
                  </summary>
                  <p className="mt-4 text-sm leading-7 text-[#645573]">
                    구매 후 받을 리포트의 주요 내용을 미리 살펴보세요.
                  </p>
                  {preview ? (
                    <ol className="mt-3 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                      {preview.cards.map((card, index) => {
                        const step = FRIENDLY_REPORT_STEPS[index];
                        return (
                          <li key={card.step} className="min-w-0 border-b border-[#eee5f5] pb-3">
                            <p className="text-xs font-black text-[#9069c0]">{card.step} · {step?.title ?? card.eyebrow}</p>
                            <p className="mt-1 break-keep text-sm leading-6 text-[#625471]">{step?.description ?? card.title}</p>
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                  <p className="mt-4 break-keep text-xs leading-6 text-[#81728e]">
                    개인별 분석 결과는 결제 후 생성되는 리포트에서 확인할 수 있습니다.
                  </p>
                </details>
              </details>
            ) : null}
            <details className="rounded-xl border border-[#e5dcef] bg-white px-4 py-4">
              <summary className="cursor-pointer text-sm font-extrabold text-[#644696]">결제 후 이용 순서와 보관 기간</summary>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-7 text-[#645673]">
                <li>분석 대상 프로필과 결제 금액을 확인해요.</li>
                <li>결제가 승인되면 개인화 리포트 생성이 시작돼요.</li>
                <li>새로 구매한 리포트는 결제일부터 12개월 동안 구매한 분석에서 다시 볼 수 있어요.</li>
              </ol>
            </details>
            {state === "not_purchased" ? (
              <details className="group rounded-xl border border-[#e5dcef] bg-white px-3 py-2">
                <summary className="cursor-pointer rounded-lg px-2 py-2 text-sm font-extrabold text-[#644696] transition-colors hover:bg-[#f7f1ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#704ad0]">
                  운보다 이용 원칙 자세히 보기
                </summary>
                <TrustPrinciplesCard compact inlineDetails />
              </details>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={savedState || isSaving}
            className="mt-5 rounded-xl border border-[#d9cbea] bg-white px-4 py-3 text-sm font-bold text-[#654789] transition hover:bg-[#f7f1ff] disabled:cursor-default disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : savedState ? "관심 분석에 저장됨" : "관심 분석에 저장"}
          </button>
        </section>

        {state === "not_purchased" ? <ProductReviewSummary productId={product.id} compactWhenEmpty /> : null}
        {/* Exactly one state-aware purchase/report entry, after all descriptions and reviews. */}
        <section id="finance-purchase-action" aria-label="공동 재정 경계 분석 구매 및 리포트 확인" className="mb-8 mt-7 rounded-[1.7rem] border border-[#e3d5f4] bg-[linear-gradient(145deg,#fcf8ff_0%,#eee5ff_100%)] p-5 shadow-[0_12px_35px_rgba(75,46,125,0.08)] sm:p-7">
          <p className="text-xs font-extrabold tracking-wide text-[#865dbe]">
            {state === "not_purchased" ? "나를 위한 사주 심층 분석" : STATUS_LABELS[state]}
          </p>
          <h3 className="mt-2 break-keep text-xl font-black leading-snug text-[#332047] sm:text-2xl">
            {state === "not_purchased" ? "이제 내 사주로 함께 쓰는 돈의 기준을 살펴볼까요?" : "내 공동 재정 분석 이어보기"}
          </h3>
          <div className="mt-5 grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
            <div>
              <p className="text-xs font-semibold text-[#77678a]">공동 재정 경계 분석</p>
              <p className="mt-1 text-2xl font-black text-[#39234f]">{price}</p>
            </div>
            {href ? (
              <Link href={href} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#704ad0] px-4 py-3 text-center text-base font-extrabold text-white transition hover:bg-[#5e38bd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#704ad0]">
                {ACTION_LABELS[state]}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-[#6d5983]">분석할 프로필을 선택한 뒤 리포트를 확인해 주세요.</p>
            )}
          </div>
          {state === "not_purchased" ? (
            <p className="mt-3 break-keep text-xs leading-6 text-[#77698a]">버튼을 누르면 결제 내용을 확인하는 화면으로 이동합니다.</p>
          ) : null}
        </section>
      </div>
    </section>
  );
}
