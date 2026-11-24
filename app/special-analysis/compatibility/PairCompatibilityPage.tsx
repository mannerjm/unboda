import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import PaidCompatibilityAnalysisClient from "@/app/components/PaidCompatibilityAnalysisClient";
import CompatibilityDetailHero from "@/app/components/CompatibilityDetailHero";
import HwadamCompatibilityTeacherCard from "@/app/components/HwadamCompatibilityTeacherCard";
import { isProductSaved } from "@/app/lib/interestedAnalyses/server";
import { getPairCompatibilityConfig } from "@/app/lib/pairCompatibilityConfig";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import type { CompatibilityPairProductId } from "@/app/lib/specialAnalysisProducts";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export default async function PairCompatibilityPage({
  productId,
}: {
  productId: CompatibilityPairProductId;
}) {
  const config = getPairCompatibilityConfig(productId);
  const user = await getCurrentUser();
  const entryPath = `/special-analysis/compatibility/${config.slug}`;
  if (!user) {
    redirect(`/auth/login?returnTo=${entryPath}`);
  }

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-3xl">
            <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-slate-600 underline decoration-[#c4c9d9] underline-offset-4">← 궁합 유형 선택</Link>
            <section className="mt-8 rounded-3xl border border-[#dce1ef] bg-white p-8 text-center">
              <h1 className="text-2xl font-bold text-[#11162d]">{config.title}</h1>
              <p className="mt-4 text-sm leading-7 text-slate-600">분석할 내 프로필을 먼저 선택해 주세요.</p>
              <Link href="/mypage" className="mt-5 inline-flex rounded-2xl bg-[#171a3d] px-5 py-3 text-sm font-bold text-white">마이페이지에서 프로필 선택</Link>
            </section>
          </div>
        </main>
      </AppShell>
    );
  }

  const saved = await isProductSaved(user.id, productId);

  return (
    <AppShell activeProfileId={activeProfile.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mx-auto w-full max-w-3xl">
            <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-slate-600 underline decoration-[#c4c9d9] underline-offset-4">← 궁합 유형 선택</Link>
            <CompatibilityDetailHero mode={config.previewMode} title={config.title} description={config.cardDescription} />
            <HwadamCompatibilityTeacherCard placement="detail" relationship={config.label} />
          </div>
          <PaidCompatibilityAnalysisClient
            myProfileLabel={activeProfile.label}
            profileId={activeProfile.id}
            productId={productId}
            relationshipLabel={config.label}
            partnerNoun={config.partnerNoun}
            partnerPlaceholder={config.partnerPlaceholder}
            relationshipDescription={config.introDescription}
            previewMode={config.previewMode}
            initialInterestSaved={saved}
          />
        </div>
      </main>
    </AppShell>
  );
}
