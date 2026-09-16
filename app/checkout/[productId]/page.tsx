import Link from "next/link";
import CheckoutAccessPanel from "./CheckoutAccessPanel";
import ProfileSelector from "@/app/components/ProfileSelector";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { notFound } from "next/navigation";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { resolveLaunchPurchasableProduct } from "@/app/lib/purchases/products";
import { resolveAnalysisEditionForOrder } from "@/app/lib/analysisEditionForOrder";
import { formatAnalysisEditionLabel } from "@/app/lib/analysisEditionLabel";
import { getSpecialAnalysisProduct } from "@/app/lib/specialAnalysisProducts";
import Script from "next/script";

type CheckoutPageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ profileId?: string }>;
};

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { productId } = await params;
  const { profileId } = await searchParams;
  const user = await getCurrentUser();

  if (profileId && !isProfileId(profileId)) notFound();

  const profile = user && profileId ? await getUserProfile(profileId, user.id) : null;
  if (user && profileId && !profile) notFound();

  const resolved = resolveLaunchPurchasableProduct(productId);
  if (!resolved.ok) notFound();

  const canonicalProductId = resolved.productId;
  const specialProduct = getSpecialAnalysisProduct(canonicalProductId);
  const premiumProduct = specialProduct ? undefined : getPremiumProduct(canonicalProductId);
  if (!specialProduct && !premiumProduct) notFound();

  const displayTitle = specialProduct
    ? specialProduct.title
    : getPremiumProductDisplayTitle(premiumProduct!.id, premiumProduct!.title);

  const edition = user && profile && premiumProduct
    ? await resolveAnalysisEditionForOrder({
        userId: user.id,
        profileId: profile.id,
        productId: premiumProduct.id,
        profile,
      })
    : null;
  const checkoutEditionLabel = edition
    ? formatAnalysisEditionLabel(edition.editionKey, edition.referenceSnapshot).replace(/ 분석$/, "")
    : undefined;
  const backHref = specialProduct
    ? "/special-analysis/compatibility"
    : `/paid-analysis/${canonicalProductId}${profileId ? `?profileId=${profileId}` : ""}`;

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
      <div className="mx-auto max-w-2xl">
        <Link href={backHref} className="text-sm font-semibold text-stone-600 transition hover:text-stone-900">
          ← 상품 설명으로 돌아가기
        </Link>

        <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-stone-500">CHECKOUT</p>
        <h1 className="mt-3 text-3xl font-bold">{displayTitle}</h1>
        <p className="mt-5 text-sm leading-7 text-stone-600">
          구매를 진행하기 전에 계정 인증, 분석 대상과 결제 내용을 확인합니다.
        </p>

        {profile ? (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">결제 대상</p>
            <p className="mt-2 font-semibold text-stone-900">{profile.label}</p>
          </div>
        ) : null}

        <CheckoutAccessPanel
          productId={canonicalProductId}
          profileId={profileId}
          productTitle={displayTitle}
          profileLabel={profile?.label}
          priceLabel={`${resolved.amount.toLocaleString("ko-KR")}원`}
          editionLabel={checkoutEditionLabel}
        />

        {user && !profileId && premiumProduct ? (
          <ProfileSelector productId={premiumProduct.id} destination="checkout" />
        ) : null}
        {user && !profileId && specialProduct ? (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-7 text-stone-600">
            궁합 분석은 현재 선택된 내 프로필을 기준으로 진행합니다. <Link href="/mypage" className="font-semibold text-stone-900 underline underline-offset-4">마이페이지에서 프로필을 선택해 주세요.</Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
