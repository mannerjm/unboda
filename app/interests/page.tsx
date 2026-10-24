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
        <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-slate-900 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-5xl">
            <section className="rounded-[2rem] border border-[#dce1ef] bg-white px-6 py-10 text-center shadow-sm sm:px-8 sm:py-14">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f1ff] text-[#6f5ce7]" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5V21l-7-4-7 4V5.5Z"/></svg>
              </span>
              <p className="mt-6 text-xs font-bold tracking-[0.18em] text-[#6f5ce7]">MY LIBRARY</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-[#11162d] sm:text-3xl">관심 분석</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">분석할 프로필을 선택하면 관심 분석을 확인할 수 있어요.</p>
              <Link href="/mypage" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#13183d] px-6 text-sm font-bold text-white transition hover:bg-[#292455] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5ce7]">
                프로필 선택하기 →
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
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-slate-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <header className="rounded-[2rem] border border-[#dce1ef] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-[#6f5ce7]">MY LIBRARY</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#11162d] sm:text-4xl">관심 분석</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-700">
              궁금한 심층 분석을 저장하고, 필요할 때 여기서 다시 살펴보세요.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#d8d3ff] bg-[#f3f1ff] px-3 py-2 text-sm font-bold text-[#5e4bd1]">
                현재 분석 대상 · {activeProfile.label}
              </span>
              <Link href="/mypage" className="rounded-full border border-[#dce1ef] bg-[#f7f8fc] px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white">
                프로필 변경
              </Link>
            </div>
          </header>
          <InterestedAnalysesList
            key={activeProfile.id}
            analyses={productsWithMetadata}
            profileId={activeProfile.id}
          />
        </div>
      </main>
    </AppShell>
  );
}
