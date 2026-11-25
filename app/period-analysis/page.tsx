import AppShell from "@/app/components/AppShell";
import PremiumCatalogSection from "@/app/components/PremiumCatalogSection";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { notFound, redirect } from "next/navigation";
import { buildPublicMetadata } from "@/app/lib/seo";

export const metadata=buildPublicMetadata({title:"기간별 사주 분석",description:"이번 달, 다음 달, 올해, 내년부터 평생까지 내 사주의 흐름을 살펴보세요.",path:"/period-analysis"});
export default async function PeriodAnalysisPage({searchParams}:{searchParams:Promise<{profileId?:string;productId?:string}>}) {
  const {profileId,productId}=await searchParams;
  const user=await getCurrentUser();
  if (profileId && !isProfileId(profileId)) notFound();
  const profile=user ? (profileId ? await getUserProfile(profileId,user.id) : await getActiveProfile(user.id)) : null;
  if (user && profileId && !profile) notFound();
  if (productId==="new-year-fortune") redirect("/paid-analysis/new-year-fortune"+(profile ? `?profileId=${encodeURIComponent(profile.id)}` : ""));
  return <AppShell activeProfileId={profile?.id}>
    <main data-period-analysis-page className="min-h-screen bg-[radial-gradient(ellipse_at_50%_0%,#ffffff_0%,#faf5ff_55%,#efe6ff_100%)] px-5 py-6 text-[#281744] sm:px-8 sm:py-7">
      <div className="mx-auto w-full max-w-6xl">
        <PremiumCatalogSection key={`period:${profile?.id??""}:${productId??""}`} profileId={profile?.id} initialMode="period" initialProductId={productId} separateCatalog />
      </div>
    </main>
  </AppShell>;
}
