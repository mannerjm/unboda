import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import RecommendationTop3 from "@/app/components/RecommendationTop3";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { getFreeAnalysisResult } from "@/app/lib/freeAnalysisResults/server";
import {
  buildAnalysisProductRecommendations,
  resolveCanonicalRecommendationProduct,
  type AnalysisProductRecommendation,
} from "@/app/lib/analysisProductRecommendations";
import { listUserPaidAnalysisSummaries } from "@/app/lib/paidReports/server";
import { isProfileId, type ProfileDto } from "@/app/lib/profiles/types";
import { getSaju } from "@/app/lib/manse";
import { buildPremiumAnalysis } from "@/app/lib/buildPremiumAnalysis";
import { createEvaluationContext } from "@/app/lib/evaluationContext";

type RecommendationsPageProps = {
  searchParams: Promise<{ profileId?: string }>;
};

function mergeRecommendationStoryline(
  storedRecommendations: readonly AnalysisProductRecommendation[],
  refreshedRecommendations: readonly AnalysisProductRecommendation[],
): AnalysisProductRecommendation[] {
  const selected: AnalysisProductRecommendation[] = [];
  const selectedProductIds = new Set<string>();
  const selectedCategories = new Set<string>();

  const tryAdd = (recommendation: AnalysisProductRecommendation, requireNewCategory: boolean) => {
    const product = resolveCanonicalRecommendationProduct(recommendation.productId);
    if (!product || selectedProductIds.has(product.id)) return;
    if (requireNewCategory && selectedCategories.has(product.category)) return;

    selected.push({ ...recommendation, productId: product.id });
    selectedProductIds.add(product.id);
    selectedCategories.add(product.category);
  };

  const storedPrimary = storedRecommendations[0];
  if (storedPrimary) tryAdd(storedPrimary, false);

  for (const recommendation of refreshedRecommendations) {
    if (selected.length >= 3) break;
    tryAdd(recommendation, true);
  }

  for (const recommendation of storedRecommendations.slice(1)) {
    if (selected.length >= 3) break;
    tryAdd(recommendation, true);
  }

  for (const recommendation of refreshedRecommendations) {
    if (selected.length >= 3) break;
    tryAdd(recommendation, false);
  }

  for (const recommendation of storedRecommendations.slice(1)) {
    if (selected.length >= 3) break;
    tryAdd(recommendation, false);
  }

  return selected.slice(0, 3);
}

function buildCurrentRecommendations(profile: ProfileDto): AnalysisProductRecommendation[] {
  const evaluationContext = createEvaluationContext();
  const isLeapMonth = profile.isLeapMonth ? "윤달" : "평달";
  const saju = getSaju(
    profile.birthDate,
    profile.birthTime,
    profile.calendarType,
    isLeapMonth,
    profile.gender,
    evaluationContext.evaluationDate,
  );
  const recommendationAnalysis = buildPremiumAnalysis(saju);

  return buildAnalysisProductRecommendations({
    fortuneBrain: recommendationAnalysis.fortuneBrain,
    strengthAnalysis: recommendationAnalysis.strengthAnalysis,
    elementRelations: recommendationAnalysis.elementRelations,
    fortuneFlow: recommendationAnalysis.fortuneFlowAnalysis,
    elementAnalysis: recommendationAnalysis.elementAnalysis,
    evaluationContext,
  }).recommendations;
}

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
  const storedRecommendations = (analysisRecord?.content?.productRecommendations?.recommendations ?? [])
    .filter((recommendation) => resolveCanonicalRecommendationProduct(recommendation.productId));

  let recommendations = storedRecommendations;
  try {
    const refreshedRecommendations = buildCurrentRecommendations(profile);
    recommendations = mergeRecommendationStoryline(storedRecommendations, refreshedRecommendations);
  } catch (error) {
    console.error("[recommendations] failed to refresh deterministic recommendation storyline", error);
  }

  const primaryProduct = recommendations[0]
    ? resolveCanonicalRecommendationProduct(recommendations[0].productId)
    : null;
  const recommendationExplanation = analysisRecord?.content?.recommendationExplanation ?? null;
  const paidSummaries = await listUserPaidAnalysisSummaries(user.id);

  return (
    <AppShell activeProfileId={profile.id}>
      <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <header className="border-b border-stone-200 pb-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-stone-500">PERSONAL RECOMMENDATION</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">무료 분석에서 이어서 확인할 분석</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              {primaryProduct
                ? `무료 분석에서 가장 크게 드러난 문제는 ${primaryProduct.title}에서 먼저 이어서 확인하고, 나머지는 실제 계산 근거가 있는 다른 분야를 우선해 함께 보여드려요. 필요하면 같은 분야의 다른 문제도 추천될 수 있어요.`
                : "무료 분석에서 드러난 핵심 문제와 같은 계산 근거를 따라, 이어서 확인하면 좋은 심층 분석을 보여드려요."}
            </p>
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
