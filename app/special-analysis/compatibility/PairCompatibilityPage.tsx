import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import PaidCompatibilityAnalysisClient from "@/app/components/PaidCompatibilityAnalysisClient";
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

  return (
    <AppShell activeProfileId={activeProfile.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mx-auto w-full max-w-3xl">
            <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-slate-600 underline decoration-[#c4c9d9] underline-offset-4">← 궁합 유형 선택</Link>
            <header className="relative mt-7 overflow-hidden rounded-[2rem] border border-[#35375f] bg-[radial-gradient(circle_at_20%_30%,rgba(112,88,229,0.2),transparent_24%),radial-gradient(circle_at_78%_65%,rgba(219,105,161,0.18),transparent_26%),linear-gradient(145deg,#0b1025_0%,#151938_55%,#211b46_100%)] px-6 py-8 text-white shadow-[0_22px_60px_rgba(24,29,67,0.14)] sm:px-8 sm:py-9">
              <p className="text-xs font-semibold tracking-[0.16em] text-[#b9b2f6]">전문 분석 · 궁합</p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{config.title}</h1>
              <p className="mt-4 text-sm leading-7 text-slate-200">{config.cardDescription}</p>
            </header>
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
          />
        </div>
      </main>
    </AppShell>
  );
}
