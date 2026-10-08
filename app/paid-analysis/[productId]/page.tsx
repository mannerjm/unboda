import type { Metadata } from "next";
import Link from "next/link";
import PaidAnalysisAccessPanel from "./PaidAnalysisAccessPanel";
import PremiumProductDetail from "@/app/components/PremiumProductDetail";
import PaidProductSeoIntro from "@/app/components/PaidProductSeoIntro";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { getPaidProductSeoGuide } from "@/app/lib/paidProductSeo";
import { resolveLaunchPurchasableProduct } from "@/app/lib/purchases/products";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { isProductSaved } from "@/app/lib/interestedAnalyses/server";
import { notFound } from "next/navigation";
import { buildPublicMetadata, NOINDEX_METADATA } from "@/app/lib/seo";

type PaidAnalysisPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<{ profileId?: string }>;
};

export async function generateMetadata({
  params,
}: Pick<PaidAnalysisPageProps, "params">): Promise<Metadata> {
  const { productId } = await params;
  const resolved = resolveLaunchPurchasableProduct(productId);
  const canonicalProductId = resolved.ok ? resolved.productId : null;
  const product = canonicalProductId ? getPremiumProduct(canonicalProductId) : undefined;

  if (!product) {
    return NOINDEX_METADATA;
  }

  const displayTitle = getPremiumProductDisplayTitle(product.id, product.title);
  const seoGuide = getPaidProductSeoGuide(product);

  return buildPublicMetadata({
    title: seoGuide.searchTitle,
    description: `${displayTitle}: ${product.description}`,
    path: `/paid-analysis/${product.id}`,
  });
}

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
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f5f7fc] px-5 py-10 text-[#11162d] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <Link
          href={profileId ? `/deep-analysis?profileId=${encodeURIComponent(profileId)}` : "/deep-analysis"}
          className="inline-flex items-center rounded-full border border-[#dce1ef] bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#b9b2f6] hover:text-[#5e4bd1]"
        >
          ← 심층 분석으로 돌아가기
        </Link>

        {!profileId ? <PaidProductSeoIntro product={product} /> : null}

        {profileId ? (
          <PaidAnalysisAccessPanel productId={product.id} profileId={profileId} />
        ) : (
          <PremiumProductDetail
            product={product}
            state="not_purchased"
            isSaved={user ? await isProductSaved(user.id, product.id) : false}
          />
        )}
      </div>
    </main>
  );
}
