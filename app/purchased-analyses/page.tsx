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
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getSpecialAnalysisProduct } from "@/app/lib/specialAnalysisProducts";

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

  // Purchase summaries and expired-entitlement display are independent, read-only
  // lookups for the *same verified user/profile*. Keep all existing filters and
  // failure behavior; only remove unnecessary serial network waiting.
  const [paidSummaries, expiredReportsResult] = await Promise.all([
    listUserPaidAnalysisSummaries(user.id),
    createAdminClient().from("entitlements")
      .select("id,resource_id,service_expires_at")
      .eq("user_id", user.id).eq("profile_id", activeProfile.id)
      .eq("resource_type", "paid_analysis").eq("is_active", true)
      .lte("service_expires_at", new Date().toISOString())
      .order("service_expires_at", { ascending: false }).limit(50),
  ]);
  const analyses = paidSummaries.filter((analysis) => analysis.profileId === activeProfile.id);
  const groups = groupPurchasedAnalysesByProduct(analyses);
  const { data: expiredReports, error: expiredReportsError } = expiredReportsResult;
  if (expiredReportsError) throw new Error("EXPIRED_REPORT_LIBRARY_READ_FAILED");
  const { filters, requestedPage } = parseLibraryParams(await searchParams);
  const libraryPage = selectPurchasedLibraryPage(groups, filters, requestedPage);
  // Preserve the original full-library calculations on the authenticated server.
  // Only the recent card, small counters and the 20 visible editions are sent
  // through the existing client auto-refresh boundary.
  const mostRecent = groups
    .flatMap((group) => group.editions.map((edition) => ({ group, edition })))
    .sort((a, b) => b.edition.acquiredAt.localeCompare(a.edition.acquiredAt))[0] ?? null;
  const recentGroups = mostRecent
    ? [{ ...mostRecent.group, editions: [mostRecent.edition] }]
    : [];
  const libraryOverview = {
    total: analyses.length,
    completedCount: analyses.filter((analysis) => analysis.reportStatus === "completed").length,
    preparingCount: analyses.filter((analysis) => analysis.reportStatus === "none" || analysis.reportStatus === "generating").length,
    editionCounts: Object.fromEntries(libraryPage.groups.map((visible) => [
      visible.productId,
      groups.find((full) => full.productId === visible.productId)?.editions.length ?? visible.editions.length,
    ])),
  };
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
              구매한 리포트와 연도판, 준비 상태를 한곳에서 확인합니다. 신규 구매 리포트는 결제일부터 12개월 동안 다시 열람할 수 있습니다.
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
          <PurchasedAnalysesAutoRefresh groups={recentGroups} profileId={activeProfile.id} libraryPage={libraryPage} libraryOverview={libraryOverview} phase9Recommendations={phase9Recommendations} />
          {(expiredReports?.length ?? 0) > 0 ? (
            <section className="mt-6 rounded-3xl border border-[#dce1ef] bg-white p-5 sm:p-7" aria-label="열람기간 만료된 구매 리포트">
              <h2 className="text-lg font-bold text-[#11162d]">열람기간이 끝난 구매 리포트</h2>
              <p className="mt-1 text-sm text-slate-600">구매내역은 보존되며, 해당 리포트의 온라인 열람과 새 AI 상담은 종료되었습니다.</p>
              <ul className="mt-4 divide-y divide-slate-100">{(expiredReports??[]).map(item => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <strong>{getSpecialAnalysisProduct(item.resource_id)?.title ?? getPremiumProduct(item.resource_id)?.title ?? "구매한 분석"}</strong>
                  <span className="text-slate-500">열람 종료 · {new Intl.DateTimeFormat("ko-KR", { timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date(item.service_expires_at!))}</span>
                </li>
              ))}</ul>
            </section>
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}
