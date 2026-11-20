"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PREMIUM_PRODUCT_PHOTOS } from "@/app/lib/premiumProductPhotos";
import { getPremiumAnalysisHref, type PremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getProductPricing } from "@/app/lib/productPricing";
import { getReadablePaidQuestion } from "@/app/lib/premiumQuestionDisplay";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";
import { buildPaidAnalysisV4PreviewModel } from "@/app/lib/paidAnalysisV4PreviewModel";
import { saveAnalysisAction } from "@/app/lib/interestedAnalyses/actions";
import ProductReviewSummary from "@/app/components/ProductReviewSummary";

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

/**
 * Customer-facing summaries are derived from each launched product's own
 * purchase-decision, period strategy and paid-report contracts. Do not use a
 * finance template's text for health, relationship, career or time products.
 * These are areas to explore, never a preview of a person's actual outcome.
 */
function getCustomerStory(product: PremiumProductDefinition) {
  const config = product.kind === "TOPIC" ? getPaidAnalysisTopicConfig(product.id) : undefined;
  const topic = config?.purchaseDecision;
  const period = product.purchaseDecision;
  const focus = (product.kind === "PERIOD" ? period?.analysisScope : topic?.whatItAnalyzes)
    ?? product.details ?? [];
  const outcomes = (product.kind === "PERIOD" ? period?.expectedUnderstanding : topic?.expectedUnderstanding)
    ?? product.details ?? [];
  const situations = (product.kind === "PERIOD" ? period?.recommendedFor : topic?.recommendedFor)
    ?? product.recommendedFor ?? [];
  const concerns = [0, 1, 2].map((index) => ({
    icon: ["🔎", "💬", "🧭"][index],
    question: situations[index] ?? focus[index] ?? product.description,
    context: focus[index] ?? outcomes[index] ?? product.description,
  }));
  const insights = [0, 1, 2].map((index) => ({
    title: focus[index] ?? product.description,
    detail: outcomes[index] ?? focus[index] ?? product.description,
  }));
  const reportPoints = Array.from(new Set([
    ...focus, ...(config?.actionFocus ?? []), ...outcomes, ...(product.details ?? []),
  ].map((line) => line.trim()).filter(Boolean)));
  const headings = [
    "무엇부터 살펴볼까요?",
    "어떤 상황에서 차이가 생길까요?",
    "내 사주에서 무엇을 참고할까요?",
    "지금 어떤 변화를 점검할까요?",
    "현실에서 무엇을 확인할까요?",
    "추가로 확인할 점은 무엇일까요?",
  ];
  const reportSteps = headings.map((title, index) => ({
    title,
    description: reportPoints[index] ?? product.description,
  }));
  const disclaimer = product.kind === "PERIOD"
    ? "사주 흐름은 참고할 관점과 점검 기준을 제시하며, 특정 사건이나 결과를 확정하지 않습니다."
    : product.category === "health"
      ? "생활 흐름을 살펴보는 사주 해석이며 의학적 진단·치료나 전문 의료 상담을 대신하지 않습니다."
      : product.category === "money" || product.category === "business"
        ? "재정·사업상 결과를 단정하지 않으며 금융·법률 등 전문 자문을 대신하지 않습니다."
        : product.category === "relationship" || product.category === "social"
          ? "상대방의 마음이나 행동, 관계의 결말을 확정하거나 대신 판단하지 않습니다."
          : "사주 해석은 선택을 돕는 참고 자료이며 현실의 결과를 확정하지 않습니다.";
  return { concerns, insights, reportSteps, disclaimer, focus };
}

/**
 * The 56 remaining launch products share the pilot's visual journey.
 * Purchase state, price, save, reviews and report navigation remain owned by
 * the existing authoritative systems, never duplicated inside this component.
 */
export default function CustomerFirstPremiumDetail({
  product, state, profileId, isSaved = false,
}: Props) {
  const [savedState, setSavedState] = useState(isSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [photoFallback, setPhotoFallback] = useState(false);
  useEffect(() => { setSavedState(isSaved); }, [isSaved]);
  useEffect(() => { setPhotoFallback(false); }, [product.id]);

  const href = getPremiumAnalysisHref(product.id, state, profileId);
  const price = getProductPricing(product.id).amount.toLocaleString("ko-KR") + "원";
  const headline = getReadablePaidQuestion(product.id, product.title);
  const commaIndex = headline.indexOf(",");
  const headlineLead = commaIndex >= 0 ? headline.slice(0, commaIndex + 1) : headline;
  const headlineRest = commaIndex >= 0 ? headline.slice(commaIndex + 1).trim() : "";
  const photo = PREMIUM_PRODUCT_PHOTOS[product.id];
  // Every topic photo uses a high-resolution, 4:3 CENTER CROP of its original
  // licensed Pexels source. The curated list thumbnail was also center-cropped:
  // reusing that composition prevents portrait originals from looking tiny in
  // the uniform landscape detail frame. Locally generated period art is 4:3.
  // The first-party thumbnail is retained only as a network-error fallback.
  const pexelsId = photo.sourcePage.startsWith("https://www.pexels.com/photo/")
    ? photo.sourcePage.match(/-(\d+)\/?$/)?.[1] : undefined;
  const originalPhotoUrl = pexelsId
    ? "https://images.pexels.com/photos/" + pexelsId + "/pexels-photo-" + pexelsId + ".jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=900"
    : null;
  const photoSource = originalPhotoUrl && !photoFallback ? originalPhotoUrl : photo.src;
  const preview = buildPaidAnalysisV4PreviewModel(product);
  const story = getCustomerStory(product);

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
    <section data-customer-first-product={product.id} aria-labelledby="selected-product-title" className="mt-0 overflow-hidden bg-white">
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
            <h2 id="selected-product-title" className="mt-5 break-keep text-[clamp(1.7rem,5.7vw,2.7rem)] font-black leading-[1.28] tracking-[-0.05em] text-[#301b4c]">
              {headlineLead}{headlineRest ? <span className="block text-[#7050bf]">{headlineRest}</span> : null}
            </h2>
            <p className="mt-4 max-w-[37rem] break-keep text-[15px] font-medium leading-7 text-[#584968] sm:text-base sm:leading-8">
              {product.description} <span className="font-bold text-[#3a2951]">내 사주를 바탕으로 이 주제의 흐름을 살펴보고,</span> 일상에서 확인할 기준을 정리해 보세요.
            </p>
            <p className="mt-6 text-sm font-bold text-[#6c5687]">
              개인화 사주 심층 분석 <span aria-hidden="true">·</span> <strong className="text-lg font-black text-[#39224f]">{price}</strong>
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-[390px]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border-[5px] border-white bg-[#f8f1ff] shadow-[0_16px_38px_rgba(83,54,124,0.14)]">
              <Image src={photoSource} alt={photo.alt} fill unoptimized priority
                onError={() => setPhotoFallback(true)}
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 390px, 390px" className="object-cover object-center" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#261831]/85 via-[#261831]/20 to-transparent px-5 pb-4 pt-14 text-white">
                <p className="break-keep text-sm font-extrabold leading-6">{product.title} · 내 사주에서 살펴볼 기준</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-9">
        <section className="py-11 sm:py-14" aria-labelledby="customer-concerns">
          <p className="text-center text-xs font-extrabold tracking-widest text-[#926bc8]">내 이야기처럼 느껴지는 순간</p>
          <h3 id="customer-concerns" className="mt-3 break-keep text-center text-[25px] font-black tracking-tight text-[#2f1a48] sm:text-[30px]">
            혹시 이런 고민을 해본 적 있으신가요?
          </h3>
          <div className="mx-auto mt-7 max-w-[760px] divide-y divide-[#e7def1] border-y border-[#e7def1]">
            {story.concerns.map((item, index) => (
              <div key={index} className="flex min-w-0 items-start gap-3 py-5 sm:gap-6 sm:py-6">
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

        <section className="rounded-[1.6rem] bg-[#35224f] px-5 py-9 text-white sm:px-8 sm:py-11" aria-labelledby="customer-value">
          <p className="text-xs font-bold tracking-widest text-[#d9c1ff]">이 분석에서 살펴볼 이야기</p>
          <h3 id="customer-value" className="mt-3 break-keep text-[25px] font-black leading-snug tracking-tight sm:text-[30px]">
            {product.title}에서<br />
            <span className="text-[#e4d0ff]">무엇을 살펴볼지</span> 확인해 보세요.
          </h3>
          <p className="mt-3 max-w-[42rem] break-keep text-sm leading-7 text-[#e7dbee]">
            {product.description} 개인별 결과를 미리 확정하지 않고 이 상품의 고유한 분석 범위를 기준으로 안내합니다.
          </p>
          <div className="mt-7 grid gap-5 border-t border-white/25 pt-7 md:grid-cols-3 md:gap-0">
            {story.insights.map((item, index) => (
              <div key={index} className={index === 0 ? "md:pr-5" : "md:border-l md:border-white/25 md:px-5"}>
                <span className="text-xl font-black text-[#e0c5ff]">0{index + 1}</span>
                <h4 className="mt-2 break-keep text-lg font-extrabold">{item.title}</h4>
                <p className="mt-2 break-keep text-sm leading-6 text-[#e9dcf5]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-11 sm:py-14" aria-labelledby="customer-ai">
          <div className="mx-auto max-w-[740px] text-center">
            <p className="text-xs font-extrabold tracking-widest text-[#926bc8]">운보다에서는 여기서 끝나지 않아요</p>
            <h3 id="customer-ai" className="mt-3 break-keep text-center text-[25px] font-black leading-snug tracking-tight text-[#302048] sm:text-[30px]">
              분석을 보고도 궁금한 게 남았다면?
            </h3>
            <p className="mt-3 break-keep text-[15px] leading-8 text-[#6a5b79]">
              나만의 리포트를 확인한 뒤 같은 주제로 AI 상담을 이어갈 수 있어요. 내 사주 분석에서 시작한 이야기를 조금 더 자세히 물어보세요.
            </p>
          </div>
          <ol className="mx-auto mt-7 flex max-w-[820px] flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-4">
            {["내 사주 분석", "개인화 리포트", "AI 상담에서 이어가기"].map((title, index) => (
              <li key={title} className="flex-1">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e9dafa] text-sm font-black text-[#7050bc]">{index + 1}</span>
                <p className="mt-2 font-extrabold text-[#38274d]">{title}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 break-keep text-center text-xs leading-6 text-[#83758e]">
            AI 상담은 보유한 리포트 범위와 질문권 등 별도 이용 조건에 따라 제공됩니다.
          </p>
        </section>

        <section className="mb-6 border-t border-[#ece5f4] pt-8" aria-labelledby="customer-purchase-note">
          <h3 id="customer-purchase-note" className="text-xl font-black text-[#302048]">구매 전 확인할 내용</h3>
          <p className="mt-2 break-keep text-sm leading-7 text-[#6e607b]">
            이 리포트는 내 사주와 {product.title}의 고유한 분석 질문을 바탕으로 해석합니다. {story.disclaimer}
          </p>
          <div className="mt-5 space-y-3">
            {state === "not_purchased" ? (
              <details className="rounded-xl border border-[#e5dcef] bg-[#fcfaff] px-4 py-4">
                <summary className="cursor-pointer text-sm font-extrabold text-[#644696]">
                  구매 후 리포트에서 확인할 내용
                </summary>
                <div className="mt-4 space-y-2 text-sm leading-7 text-[#5f5371]">
                  {story.focus.slice(0, 3).map((item, index) => (
                    <p key={index}>{index + 1}. {item}</p>
                  ))}
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
                        const step = story.reportSteps[index];
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
          </div>
        </section>

        {state === "not_purchased" ? <ProductReviewSummary productId={product.id} compactWhenEmpty /> : null}
        <section id="customer-purchase-action" aria-label={product.title + " 구매 및 리포트 확인"} className="mb-8 mt-7 rounded-[1.7rem] border border-[#e3d5f4] bg-[linear-gradient(145deg,#fcf8ff_0%,#eee5ff_100%)] p-5 shadow-[0_12px_35px_rgba(75,46,125,0.08)] sm:p-7">
          <p className="text-xs font-extrabold tracking-wide text-[#865dbe]">
            {state === "not_purchased" ? "나를 위한 사주 심층 분석" : STATUS_LABELS[state]}
          </p>
          <h3 className="mt-2 break-keep text-xl font-black leading-snug text-[#332047] sm:text-2xl">
            {state === "not_purchased" ? "이제 내 사주로 이 주제를 자세히 살펴볼까요?" : "내 심층 분석 이어보기"}
          </h3>
          <div className="mt-5 grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
            <div>
              <p className="text-xs font-semibold text-[#77678a]">{product.title}</p>
              <p className="mt-1 text-2xl font-black text-[#39234f]">{price}</p>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2">
              {href ? (
                <Link href={href} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#704ad0] px-4 py-3 text-center text-base font-extrabold text-white transition hover:bg-[#5e38bd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#704ad0]">
                {ACTION_LABELS[state]}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-[#6d5983]">분석할 프로필을 선택한 뒤 리포트를 확인해 주세요.</p>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={savedState || isSaving}
                className="flex min-h-12 w-full items-center justify-center rounded-xl border border-[#d9cbea] bg-white px-4 py-3 text-center text-sm font-bold text-[#654789] transition hover:bg-[#f7f1ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#704ad0] disabled:cursor-default disabled:opacity-60"
              >
                {isSaving ? "저장 중..." : savedState ? "관심 분석에 저장됨" : "관심 분석에 저장"}
              </button>
            </div>
          </div>
          {state === "not_purchased" ? (
            <p className="mt-3 break-keep text-xs leading-6 text-[#77698a]">버튼을 누르면 결제 내용을 확인하는 화면으로 이동합니다.</p>
          ) : null}
        </section>
      </div>
    </section>
  );
}
