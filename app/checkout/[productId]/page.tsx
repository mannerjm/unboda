import Link from "next/link";
import CheckoutAccessPanel from "./CheckoutAccessPanel";
import ProfileSelector from "@/app/components/ProfileSelector";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { notFound } from "next/navigation";
import {
  getPremiumProduct,
} from "@/app/lib/premiumProductRegistry";
import { resolveLaunchPurchasableProduct } from "@/app/lib/purchases/products";
import { resolveAnalysisEditionForOrder } from "@/app/lib/analysisEditionForOrder";
import { formatAnalysisEditionLabel } from "@/app/lib/analysisEditionLabel";
import { getProductPricing } from "@/app/lib/productPricing";
import Script from "next/script";

type CheckoutPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<{ profileId?: string }>;
};



export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
 const { productId } = await params;
 const { profileId } = await searchParams;
 const user = await getCurrentUser();

 if (profileId && !isProfileId(profileId)) {
   notFound();
 }

 const profile = user && profileId
   ? await getUserProfile(profileId, user.id)
   : null;

 if (user && profileId && !profile) {
   notFound();
 }
const resolved = resolveLaunchPurchasableProduct(productId);
const canonicalProductId = resolved.ok ? resolved.productId : null;
const product = canonicalProductId ? getPremiumProduct(canonicalProductId) : undefined;

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-stone-900">
            구매할 수 없는 분석 상품입니다.
          </h1>

          <Link
            href="/result"
            className="mt-5 inline-flex text-sm font-semibold text-stone-700 underline"
          >
            결과로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const pricing = getProductPricing(product.id);
  const edition = user && profile
    ? await resolveAnalysisEditionForOrder({
        userId: user.id,
        profileId: profile.id,
        productId: product.id,
        profile,
      })
    : null;
  const checkoutEditionLabel = edition
    ? formatAnalysisEditionLabel(edition.editionKey, edition.referenceSnapshot).replace(/ 분석$/, "")
    : undefined;

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/paid-analysis/${canonicalProductId}${profileId ? `?profileId=${profileId}` : ""}`}
          className="text-sm font-semibold text-stone-600 transition hover:text-stone-900"
        >
          ← 상품 설명으로 돌아가기
        </Link>

        <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-stone-500">
          CHECKOUT
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          {product.title}
        </h1>

        <p className="mt-5 text-sm leading-7 text-stone-600">
          구매를 진행하기 전에 계정 연결과 결제 단계를 확인합니다.
        </p>
       
       {profile ? (
         <div className="mt-6 border border-stone-200 bg-white p-5">
           <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">결제 대상</p>
           <p className="mt-2 font-semibold text-stone-900">{profile.label}</p>
         </div>
       ) : null}
      <CheckoutAccessPanel
        productId={product.id}
        profileId={profileId}
        productTitle={product.title}
        profileLabel={profile?.label}
        priceLabel={`${pricing?.amount.toLocaleString("ko-KR")}원`}
        editionLabel={checkoutEditionLabel}
      />
      {user && !profileId ? (
        <ProfileSelector productId={product.id} destination="checkout" />
      ) : null}
      </div>
    </main>
  );
}