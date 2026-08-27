import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import PremiumCatalogSection from "@/app/components/PremiumCatalogSection";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export default async function DeepAnalysisPage() {
  const user = await getCurrentUser();
  const activeProfile = user ? await getActiveProfile(user.id) : null;

  return (
    <AppShell activeProfileId={activeProfile?.id}>
      <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-6xl">
          {activeProfile ? (
            <header className="border-b border-stone-200 pb-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                <span className="font-semibold text-stone-900">{activeProfile.label}</span>
                <span>현재 분석 대상</span>
                <Link href={activeProfile ? `/recommendations?profileId=${activeProfile.id}` : "/recommendations"} className="font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4">
                  추천 분석 보기
                </Link>
              </div>
            </header>
          ) : null}

          <PremiumCatalogSection profileId={activeProfile?.id} />
        </div>
      </main>
    </AppShell>
  );
}