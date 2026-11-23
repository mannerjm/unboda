import Image from "next/image";
import Link from "next/link";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { PREMIUM_PRODUCT_PHOTOS } from "@/app/lib/premiumProductPhotos";
import { getProductPricing } from "@/app/lib/productPricing";
import { getReadablePaidQuestion } from "@/app/lib/premiumQuestionDisplay";
import { COMPATIBILITY_ROMANTIC_PRODUCT } from "@/app/lib/specialAnalysisProducts";

/**
 * Compact, mobile-first browsing on desktop and mobile.
 * Presentation only: customer-stage decisions and CTA destinations continue
 * to come exclusively from app/page.tsx (getLandingState/getLandingCopy).
 */
type LandingCopy = {
  eyebrow: string;
  title: string;
  description: string;
  primary: string;
  primaryHref: string;
  secondary: string;
  secondaryHref: string;
};

export const HOME_SALE_CATEGORY_LINKS = [
  { label: "학업성장운", icon: "🎓", href: "/deep-analysis?mode=topic&category=growth" },
  { label: "재물운", icon: "🪙", href: "/deep-analysis?mode=topic&category=money" },
  { label: "사업운", icon: "🏬", href: "/deep-analysis?mode=topic&category=business" },
  { label: "건강운", icon: "💗", href: "/deep-analysis?mode=topic&category=health" },
  { label: "직업운", icon: "💼", href: "/deep-analysis?mode=topic&category=career" },
  { label: "대인관계운", icon: "👥", href: "/deep-analysis?mode=topic&category=social" },
  { label: "연애운", icon: "💞", href: "/deep-analysis?mode=topic&category=relationship" },
  { label: "올해 운", icon: "🗓️", href: "/deep-analysis?mode=period&productId=yearly-current" },
  { label: "다음달 운", icon: "📅", href: "/deep-analysis?mode=period&productId=monthly-next" },
  { label: "두 사람 궁합", icon: "💜", href: "/special-analysis/compatibility" },
] as const;

// Featured examples are curated actual sale products, NOT an unverified
// popularity ranking. The displayed amounts always come from checkout's
// canonical pricing registries. Do not insert fictitious reviews or discounts.
const featuredPremiumIds = [
  "study-learning-strategy",
  "money-shared-finance",
  "yearly-current",
] as const;

function SaleCategories() {
  return (
    <nav className="mx-auto mt-7 w-full" aria-label="실제 판매하는 사주 분석 주제">
      <h2 className="sr-only">궁금한 분석 주제를 선택하세요</h2>
      <div className="grid grid-cols-4 gap-x-2.5 gap-y-3 sm:gap-x-3.5 sm:gap-y-4">
        {HOME_SALE_CATEGORY_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex min-h-[94px] flex-col items-center justify-center gap-2 rounded-[1.15rem] sm:min-h-[100px] border border-[#f0e8fa] bg-[linear-gradient(160deg,#ffffff_0%,#faf5ff_100%)] px-1 py-2 text-center shadow-[0_3px_12px_rgba(94,58,137,.045)] transition hover:-translate-y-0.5 hover:border-[#d0b5f8] hover:shadow-[0_10px_20px_rgba(109,69,160,.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8755da] focus-visible:ring-offset-2"
          >
            <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f7efff] text-[28px] leading-none transition group-hover:scale-105 sm:h-12 sm:w-12 sm:text-[30px]">{item.icon}</span>
            <span className="break-keep text-xs font-extrabold leading-[1.4] tracking-[-.045em] text-[#2d194c] sm:text-[13px]">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function FeaturedProducts() {
  return (
    <section className="mt-8 pb-6" aria-label="추천 판매 분석 상품">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black tracking-[-.045em] text-[#291747]">
        <span aria-hidden="true">✨</span> 지금 살펴볼 분석
      </h2>
      <div className="space-y-2">
        {featuredPremiumIds.map((productId) => {
          const product = getPremiumProduct(productId);
          const photo = PREMIUM_PRODUCT_PHOTOS[productId];
          if (!product || !photo) return null;
          const pricing = getProductPricing(productId);
          const href = product.kind === "PERIOD"
            ? "/deep-analysis?mode=period&productId=" + encodeURIComponent(product.id)
            : "/deep-analysis?mode=topic&category=" + encodeURIComponent(product.category) + "&productId=" + encodeURIComponent(product.id);
          return (
            <Link
              key={productId}
              href={href}
              className="group flex min-h-[104px] items-center gap-3 rounded-[1.15rem] border border-[#ebe1f8] bg-white p-2.5 sm:p-3 shadow-[0_3px_14px_rgba(65,40,110,.06)] transition hover:border-[#c9aff5] hover:bg-[#fdfaff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8755da]"
            >
              <span className="relative h-[82px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-[#f3edfc] sm:h-[92px] sm:w-[116px]">
                <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 640px) 100px, 116px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block line-clamp-2 break-keep text-[13px] font-black leading-[1.45] tracking-[-.04em] text-[#2b184b] sm:text-[15px]">{getReadablePaidQuestion(productId, product.description)}</span>
                <span className="mt-1 block text-[11px] font-semibold leading-[1.4] text-[#766584] sm:text-xs">{product.title}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5 text-right">
                <strong className="whitespace-nowrap text-[12px] font-black text-[#6530b2] sm:text-sm">{pricing.amount.toLocaleString("ko-KR")}원</strong>
                <span aria-hidden="true" className="text-base font-bold text-[#8561bd] transition group-hover:translate-x-0.5">›</span>
              </span>
            </Link>
          );
        })}
        <Link
          href="/special-analysis/compatibility/romantic"
          className="group flex min-h-[104px] items-center gap-3 rounded-[1.15rem] border border-[#ebe1f8] bg-white p-2.5 sm:p-3 shadow-[0_3px_14px_rgba(65,40,110,.06)] transition hover:border-[#c9aff5] hover:bg-[#fdfaff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8755da]"
        >
          <span className="relative h-[82px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-[#f3edfc] sm:h-[92px] sm:w-[116px]">
            <Image src={PREMIUM_PRODUCT_PHOTOS["relationship-current"].src} alt={PREMIUM_PRODUCT_PHOTOS["relationship-current"].alt} fill sizes="(max-width: 640px) 100px, 116px" className="object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block line-clamp-2 break-keep text-[13px] font-black leading-[1.45] tracking-[-.04em] text-[#2b184b] sm:text-[15px]">두 사람은 어떤 부분에서 잘 맞을까요?</span>
            <span className="mt-1 block text-[11px] font-semibold leading-[1.4] text-[#766584] sm:text-xs">{COMPATIBILITY_ROMANTIC_PRODUCT.title}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1.5 text-right">
            <strong className="whitespace-nowrap text-[12px] font-black text-[#6530b2] sm:text-sm">{COMPATIBILITY_ROMANTIC_PRODUCT.amount.toLocaleString("ko-KR")}원</strong>
            <span aria-hidden="true" className="text-base font-bold text-[#8561bd] transition group-hover:translate-x-0.5">›</span>
          </span>
        </Link>
      </div>
    </section>
  );
}

function CalendarArt() {
  return (
    <div aria-hidden="true" className="relative grid h-24 w-24 shrink-0 place-items-center sm:h-28 sm:w-28">
      <div className="absolute inset-3 rounded-full bg-[#dab7ff]/50 blur-xl" />
      <div className="relative w-[82px] -rotate-6 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-[0_9px_22px_rgba(109,60,185,.2)] sm:w-[96px]">
        <div className="relative h-6 bg-[linear-gradient(110deg,#c18afa,#8561df)]">
          <i className="absolute -top-1 left-4 h-3 w-2 rounded-full bg-[#6e51af]" />
          <i className="absolute -top-1 right-4 h-3 w-2 rounded-full bg-[#6e51af]" />
        </div>
        <div className="grid h-[65px] place-items-center bg-[#fefbff] text-center text-[16px] font-black leading-tight text-[#8045d1] sm:h-[74px]">
          오늘의<br/>운
        </div>
      </div>
      <span className="absolute -bottom-1 right-2 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#8d53e4] text-xs font-black text-white shadow-lg">✓</span>
    </div>
  );
}

export default function HomeMarketplaceContent({ copy, profileLabel, statusLabel }: {
  copy: LandingCopy;
  profileLabel?: string;
  statusLabel?: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-[35rem] lg:max-w-[40rem]">
      <section className="relative mt-5 overflow-hidden rounded-[1.5rem] border border-[#e6d6fa] bg-[linear-gradient(125deg,#faf4ff_0%,#f3e8ff_65%,#f1e5ff_100%)] px-5 py-6 shadow-[0_10px_32px_rgba(105,63,163,.10)] sm:px-8 sm:py-8" aria-label="로그인 상태에 맞는 운보다 분석 시작">
        <div className="relative z-10 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {profileLabel ? (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#7046a5]">
                <span className="rounded-full bg-white/80 px-2.5 py-1">{profileLabel}</span>
                {statusLabel ? <span className="rounded-full bg-[#e5d1fc] px-2.5 py-1">{statusLabel}</span> : null}
              </div>
            ) : null}
            <p className="text-[11px] font-black tracking-[-.025em] text-[#8b4bd3]">{copy.eyebrow}</p>
            <h1 className="mt-2 break-keep text-[clamp(1.45rem,3.5vw,2rem)] font-black leading-[1.28] tracking-[-.052em] text-[#2d174d]">{copy.title}</h1>
            <p className="mt-2 line-clamp-3 text-xs leading-[1.65] text-[#675779] sm:text-[13px]">{copy.description}</p>
            <Link href={copy.primaryHref} className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(110deg,#9c62f4,#7539d4)] px-5 py-2.5 text-[13px] font-black text-white shadow-[0_7px_18px_rgba(107,57,195,.24)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d36ba] focus-visible:ring-offset-2 sm:px-6">
              {copy.primary}
            </Link>
            <div><Link href={copy.secondaryHref} className="mt-2 inline-block text-[11px] font-semibold text-[#765b92] underline underline-offset-2 hover:text-[#6a35c2]">{copy.secondary}</Link></div>
          </div>
          <CalendarArt />
        </div>
      </section>
      <SaleCategories />
      <FeaturedProducts />
      <div className="mb-4 flex justify-center gap-4 text-xs font-bold text-[#776289]">
        <Link href="/purchased-analyses" className="rounded-full px-2 py-2 hover:bg-[#f4edff] hover:text-[#703cbb]">구매한 분석</Link>
        <Link href="/ai-consulting" className="rounded-full px-2 py-2 hover:bg-[#f4edff] hover:text-[#703cbb]">AI 상담 이어가기</Link>
      </div>
    </div>
  );
}
