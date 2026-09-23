import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import PurchasedAnalysesAutoRefresh from "@/app/components/PurchasedAnalysesAutoRefresh";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { listUserPaidAnalysisSummaries } from "@/app/lib/paidReports/server";
import { groupPurchasedAnalysesByProduct } from "@/app/lib/purchasedAnalysesGrouping";
import { parseLibraryParams, selectPurchasedLibraryPage } from "@/app/lib/purchasedAnalysesLibrary";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getPhase9NextAnalysisRecommendations } from "@/app/lib/phase9NextAnalysis";

export default async function PurchasedAnalysesPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; kind?: string | string[]; order?: string | string[]; page?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?returnTo=/purchased-analyses");
  }

  const activeProfile = await getActiveProfile(user.id);

  if (!activeProfile) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-slate-900 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-5xl">
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
  const { filters, requestedPage } = parseLibraryParams(await searchParams);
  const libraryPage = selectPurchasedLibraryPage(groups, filters, requestedPage);
  const recentSource = [...analyses]
    .sort((left, right) =>
      (right.reportStatus === "completed" ? 1 : 0) - (left.reportStatus === "completed" ? 1 : 0)
      || right.acquiredAt.localeCompare(left.acquiredAt),
    )[0] ?? null;
  const phase9Recommendations = recentSource
    ? await getPhase9NextAnalysisRecommendations({
        userId: user.id,
        profile: activeProfile,
        source: {
          productId: recentSource.productId,
          analysisEditionKey: recentSource.analysisEditionKey,
        },
      })
    : [];

  return (
    <AppShell activeProfileId={activeProfile.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-slate-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <header className="rounded-[2rem] border border-[#dce1ef] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-[#6f5ce7]">MY LIBRARY</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#11162d] sm:text-4xl">구매한 분석 보관함</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-700">
              구매한 리포트와 연도판, 준비 상태를 한곳에서 확인하고 완료된 분석은 언제든 다시 이어볼 수 있습니다.
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
          <PurchasedAnalysesAutoRefresh groups={groups} profileId={activeProfile.id} libraryPage={libraryPage} phase9Recommendations={phase9Recommendations} />
        </div>
      </main>
    </AppShell>
  );
}
