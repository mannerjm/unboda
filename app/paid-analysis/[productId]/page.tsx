import Link from "next/link";
import PaidAnalysisAccessPanel from "./PaidAnalysisAccessPanel";
import PremiumProductDetail from "@/app/components/PremiumProductDetail";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { resolveLaunchPurchasableProduct } from "@/app/lib/purchases/products";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { notFound } from "next/navigation";

type PaidAnalysisPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<{ profileId?: string }>;
};


export default async function PaidAnalysisPage({
  params,
  searchParams,
}: PaidAnalysisPageProps) {
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
            존재하지 않는 분석 상품입니다.
          </h1>

          <p className="mt-3 text-sm leading-7 text-stone-600">
            올바른 분석 상품을 선택해 주세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <Link
  href={profileId ? `/deep-analysis?profileId=${encodeURIComponent(profileId)}` : "/deep-analysis"}
  className="inline-flex text-sm font-semibold text-stone-600 transition hover:text-stone-900"
>
  ← 심층 분석으로 돌아가기
</Link>

        {profileId ? (
          <PaidAnalysisAccessPanel productId={product.id} profileId={profileId} />
        ) : (
          <PremiumProductDetail product={product} state="not_purchased" />
        )}
      </div>
    </main>
  );
}