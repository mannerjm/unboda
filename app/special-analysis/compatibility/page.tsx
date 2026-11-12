import Image from "next/image";
import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import { PREMIUM_PRODUCT_PHOTOS } from "@/app/lib/premiumProductPhotos";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import {
  COMPATIBILITY_BUSINESS_PRODUCT,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  COMPATIBILITY_FRIEND_PRODUCT,
  COMPATIBILITY_ROMANTIC_PRODUCT,
  COMPATIBILITY_WORKPLACE_PRODUCT,
} from "@/app/lib/specialAnalysisProducts";
import { buildPublicMetadata } from "@/app/lib/seo";

export const metadata = buildPublicMetadata({
  title: "궁합 분석",
  description: "연인·배우자, 가족, 직장·동료, 친구·지인, 사업·동업 관계를 유형별로 살펴보는 운보다 궁합 분석입니다.",
  path: "/special-analysis/compatibility",
});

// The five canonical products, amounts and entry routes are intentionally unchanged.
// Reuse licensed, self-hosted photographs already used in the deep-analysis storefront.
const compatibilityCards = [
  {
    href: "/special-analysis/compatibility/romantic",
    photoId: "relationship-current",
    photoLabel: "연인 궁합",
    category: "연인 관계",
    title: "연인·배우자 궁합",
    question: "서로 잘 맞는 점과 부딪히는 이유는 무엇일까요?",
    amount: COMPATIBILITY_ROMANTIC_PRODUCT.amount,
  },
  {
    href: "/special-analysis/compatibility/family/parent-child#family-relationship-selector",
    photoId: "relationship-family-role",
    photoLabel: "가족 궁합",
    category: "가족 관계",
    title: "가족 궁합",
    question: "가족의 서로 다른 마음을 어떻게 이해하면 좋을까요?",
    amount: COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT.amount,
  },
  {
    href: "/special-analysis/compatibility/workplace",
    photoId: "career-workplace-relationships",
    photoLabel: "직장 궁합",
    category: "업무 관계",
    title: "직장·동료 궁합",
    question: "함께 일할 때 잘 맞는 점과 갈등은 무엇일까요?",
    amount: COMPATIBILITY_WORKPLACE_PRODUCT.amount,
  },
  {
    href: "/special-analysis/compatibility/friend",
    photoId: "relationship-friendship",
    photoLabel: "친구 궁합",
    category: "사적 관계",
    title: "친구·지인 궁합",
    question: "친구 관계를 오래 편안하게 이어가려면?",
    amount: COMPATIBILITY_FRIEND_PRODUCT.amount,
  },
  {
    href: "/special-analysis/compatibility/business",
    photoId: "business-team-management",
    photoLabel: "동업 궁합",
    category: "사업 관계",
    title: "사업·동업 궁합",
    question: "함께 사업할 때 역할과 결정 방식이 잘 맞을까요?",
    amount: COMPATIBILITY_BUSINESS_PRODUCT.amount,
  },
] as const;

export default async function CompatibilityAnalysisPage() {
  const user = await getCurrentUser();
  const activeProfile = user ? await getActiveProfile(user.id) : null;

  return (
    <AppShell activeProfileId={activeProfile?.id}>
      <main className="min-h-screen bg-[linear-gradient(180deg,#fbf7ff_0%,#f2eaff_100%)] px-5 py-7 text-[#281744] sm:px-8 sm:py-9">
        <div className="mx-auto w-full max-w-5xl">
          <header className="border-b border-[#e4d5f2] pb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold tracking-[0.08em] text-[#8557bf]">전문 분석 · 궁합</p>
                <h1 className="mt-1 text-2xl font-black tracking-[-0.025em] text-[#281744] sm:text-3xl">궁합 분석</h1>
                <p className="mt-2 text-sm leading-6 text-[#6e607e]">
                  어떤 관계가 궁금하세요? 관계별 사진을 보고 나에게 맞는 궁합을 골라보세요.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#7851ae]">5개 상품</span>
            </div>
          </header>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#766786]">
            <Link href="/special-analysis" className="font-bold text-[#7350b0] hover:underline">← 전문 분석</Link>
            <span aria-hidden="true" className="text-[#c4b5d5]">·</span>
            {activeProfile ? (
              <>
                <span>현재 분석 대상</span>
                <strong className="font-bold text-[#3e245e]">{activeProfile.label}</strong>
                <Link href="/mypage" className="font-semibold text-[#7350b0] underline underline-offset-4">프로필 변경</Link>
              </>
            ) : (
              <>
                <span className="font-bold text-[#7651b2]">로그인 없이 둘러보기 가능</span>
                <span>{user ? "실제 분석 시작 전 내 프로필을 선택해 주세요." : "실제 분석을 시작할 때 로그인과 내 프로필이 필요합니다."}</span>
              </>
            )}
          </div>

          <section aria-label="궁합 유형별 분석 상품" className="mt-5 grid gap-3 md:grid-cols-2">
            {compatibilityCards.map((product) => {
              const photo = PREMIUM_PRODUCT_PHOTOS[product.photoId];
              return (
                <Link
                  key={product.href}
                  href={product.href}
                  className="group flex min-h-[144px] items-stretch gap-3 rounded-[1.4rem] border border-[#e7d9f3] bg-white p-3 shadow-[0_9px_22px_rgba(87,59,119,0.06)] transition hover:-translate-y-0.5 hover:border-[#b98aed] hover:shadow-[0_12px_25px_rgba(105,62,171,0.11)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7650ba] sm:gap-4"
                  aria-label={product.title + " 상품 자세히 보기"}
                >
                  <div className="relative min-h-[112px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-[#ece4f8] sm:w-[124px]">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="(max-width: 640px) 112px, 124px"
                      className="object-cover object-center"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-2 pt-7">
                      <span className="text-[15px] font-extrabold leading-5 tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,.75)]">
                        {product.photoLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col py-0.5">
                    <span className="text-[11px] font-extrabold text-[#875ac1]">{product.category} · 궁합 분석</span>
                    <h2 className="mt-1 text-[16px] font-extrabold leading-[1.4] tracking-[-0.02em] text-[#25153c]">
                      {product.title}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#655773]">{product.question}</p>
                    {product.photoId === "relationship-family-role" ? (
                      <p className="mt-1 text-[11px] font-semibold leading-4 text-[#7656aa]">부모·자녀 · 형제·자매 · 기타 가족</p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 border-t border-[#f0e7f5] pt-2">
                      <span className="text-sm font-black text-[#261538]">{product.amount.toLocaleString("ko-KR")}원</span>
                      <span className="text-[11px] font-bold text-[#7750b5] group-hover:underline">상품 상세 보기 →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
          <p className="mt-5 text-xs leading-6 text-[#837491]">
            각 궁합을 선택하면 관계 유형과 분석할 상대를 확인한 뒤 기존 결제·리포트·AI 상담 경로로 연결됩니다.
          </p>
        </div>
      </main>
    </AppShell>
  );
}
