import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import PurchasedAnalysesAutoRefresh from "@/app/components/PurchasedAnalysesAutoRefresh";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { listUserPaidAnalysisSummaries } from "@/app/lib/paidReports/server";
import { groupPurchasedAnalysesByProduct } from "@/app/lib/purchasedAnalysesGrouping";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export default async function PurchasedAnalysesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?returnTo=/purchased-analyses");
  }

  const activeProfile = await getActiveProfile(user.id);

  if (!activeProfile) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-slate-900 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-4xl">
            <section className="rounded-3xl border border-[#dce1ef] bg-white/90 px-6 py-12 text-center shadow-sm">
              <h1 className="text-2xl font-bold text-slate-900">구매한 분석</h1>
              <p className="mt-4 text-sm leading-7 text-slate-600">분석할 프로필을 먼저 선택해 주세요.</p>
              <Link href="/mypage" className="mt-5 inline-flex text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4">
                마이페이지에서 프로필 선택
              </Link>
            </section>
          </div>
        </main>
      </AppShell>
    );
  }

  const analyses = (await listUserPaidAnalysisSummaries(user.id))
    .filter((analysis) => analysis.profileId === activeProfile.id);
  const groups = groupPurchasedAnalysesByProduct(analyses);

  return (
    <AppShell activeProfileId={activeProfile.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-slate-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-4xl">
          <header className="border-b border-[#dce1ef] pb-6">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#6f5ce7]">MY LIBRARY</p>
            <h1 className="mt-2 text-3xl font-bold text-[#11162d] sm:text-4xl">구매한 분석</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              <span>현재 분석 대상 <strong className="font-semibold text-slate-900">{activeProfile.label}</strong></span>
              <Link href="/mypage" className="text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4">프로필 변경은 마이페이지에서</Link>
            </div>
          </header>
          <PurchasedAnalysesAutoRefresh groups={groups} profileId={activeProfile.id} />
        </div>
      </main>
    </AppShell>
  );
}
