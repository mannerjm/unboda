import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import {
  listUserInterestedAnalysesWithCurrentState,
} from "@/app/lib/interestedAnalyses/server";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import InterestedAnalysesList from "@/app/components/InterestedAnalysesList";

export default async function InterestedAnalysesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?returnTo=/interests");
  }

  const activeProfile = await getActiveProfile(user.id);

  if (!activeProfile) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-4xl">
            <section className="border-y border-stone-200 py-12 text-center">
              <h1 className="text-2xl font-bold text-stone-900">관심 분석</h1>
              <p className="mt-4 text-sm leading-7 text-stone-600">분석할 프로필을 먼저 선택해 주세요.</p>
              <Link href="/mypage" className="mt-5 inline-flex text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4">
                마이페이지에서 프로필 선택
              </Link>
            </section>
          </div>
        </main>
      </AppShell>
    );
  }

  const analyses = await listUserInterestedAnalysesWithCurrentState(user.id);
  const productsWithMetadata = analyses
    .map(({ record, currentState }) => {
      const product = getPremiumProduct(record.productId);
      return product ? { record, product, currentState } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <AppShell activeProfileId={activeProfile.id}>
      <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-4xl">
          <header className="border-b border-stone-200 pb-6">
            <h1 className="text-3xl font-bold text-stone-900 sm:text-4xl">관심 분석</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
              <span>현재 분석 대상 <strong className="font-semibold text-stone-900">{activeProfile.label}</strong></span>
              <Link href="/mypage" className="text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-4">프로필 변경은 마이페이지에서</Link>
            </div>
          </header>
          <InterestedAnalysesList
            analyses={productsWithMetadata}
            profileId={activeProfile.id}
          />
        </div>
      </main>
    </AppShell>
  );
}
