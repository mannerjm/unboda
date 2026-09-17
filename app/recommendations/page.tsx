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

  const recommendationExplanation = analysisRecord?.content?.recommendationExplanation ?? null;
  const paidSummaries = await listUserPaidAnalysisSummaries(user.id);

  return (
    <AppShell activeProfileId={profile.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-7 text-stone-900 sm:px-8 sm:py-9">
        <div className="mx-auto w-full max-w-6xl">
          <header className="relative overflow-hidden rounded-[2rem] border border-[#6f65ba]/20 bg-[linear-gradient(135deg,#0a1128_0%,#111735_52%,#21183d_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(23,24,55,0.16)] sm:px-9 sm:py-10">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#7759db]/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-7rem] left-[15%] h-52 w-52 rounded-full bg-[#d36e9c]/10 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-black tracking-[0.16em] text-[#aa9cff]">무료 결과에서 이어보기</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-[-0.05em] sm:text-4xl lg:text-[2.8rem]">
                이번 결과를 보고,<br className="hidden sm:block" /> 무엇이 더 궁금해졌나요?
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#b7bdd1] sm:text-base">
                무료 분석에서 확인한 흐름을 같은 계산 근거로 이어가되, 상품 이름보다 지금 궁금한 질문을 먼저 보여드려요.
                세 가지 중 하나를 골라 더 깊게 보거나, 원하는 주제를 직접 찾을 수 있습니다.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-xs font-bold text-[#ddd9ee]">
                  현재 분석 대상 · {profile.label}
                </span>
                <Link href={`/deep-analysis?profileId=${profile.id}`} className="rounded-full border border-white/14 bg-white/[0.05] px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10">
                  원하는 주제로 직접 찾기 →
                </Link>
              </div>
            </div>
          </header>

          {recommendations.length > 0 ? (
            <RecommendationTop3 recommendations={recommendations} profileId={profile.id} paidSummaries={paidSummaries} explanation={recommendationExplanation} />
          ) : (
            <section className="mt-8 rounded-[1.6rem] border border-stone-200 bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-stone-700">저장된 추천 질문이 없습니다.</p>
              <Link href={`/saju?profileId=${profile.id}`} className="mt-4 inline-block text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4">무료 분석 이어가기</Link>
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}
