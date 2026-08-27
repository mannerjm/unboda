import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import RecommendationTop3 from "@/app/components/RecommendationTop3";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { getFreeAnalysisResult } from "@/app/lib/freeAnalysisResults/server";
import { resolveCanonicalRecommendationProduct } from "@/app/lib/analysisProductRecommendations";
import { listUserPaidAnalysisSummaries } from "@/app/lib/paidReports/server";
import { isProfileId } from "@/app/lib/profiles/types";

type RecommendationsPageProps = {
  searchParams: Promise<{ profileId?: string }>;
};

export default async function RecommendationsPage({ searchParams }: RecommendationsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?returnTo=/recommendations");

  const { profileId } = await searchParams;
  if (profileId && !isProfileId(profileId)) notFound();

  const explicitProfile = profileId ? await getUserProfile(profileId, user.id) : null;
  if (profileId && !explicitProfile) notFound();

  const profile = explicitProfile ?? await getActiveProfile(user.id);
  if (!profile) redirect("/mypage");

  const analysisRecord = await getFreeAnalysisResult(user.id, profile.id);
  const recommendations = (analysisRecord?.content?.productRecommendations?.recommendations ?? []).filter((recommendation) => resolveCanonicalRecommendationProduct(recommendation.productId));
  const recommendationExplanation = analysisRecord?.content?.recommendationExplanation ?? null;
  const paidSummaries = await listUserPaidAnalysisSummaries(user.id);

  return (
    <AppShell activeProfileId={profile.id}>
      <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <header className="border-b border-stone-200 pb-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-stone-500">PERSONAL RECOMMENDATION</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">지금 나에게 추천된 분석</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">현재 분석 결과와 흐름을 기준으로 먼저 살펴보면 좋은 심층 분석 3가지를 보여드려요.</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
              <span className="font-semibold text-stone-900">{profile.label}</span>
              <span>현재 분석 대상</span>
              <Link href={`/deep-analysis?profileId=${profile.id}`} className="font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4">직접 분석 찾기</Link>
            </div>
          </header>

          {recommendations.length > 0 ? (
            <RecommendationTop3 recommendations={recommendations} profileId={profile.id} paidSummaries={paidSummaries} explanation={recommendationExplanation} />
          ) : (
            <section className="mt-8 rounded-xl border border-stone-200 bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-stone-700">저장된 추천 분석이 없습니다.</p>
              <Link href={`/saju?profileId=${profile.id}`} className="mt-4 inline-block text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4">무료 분석 이어가기</Link>
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}