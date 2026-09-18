import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import RecommendationTop3 from "@/app/components/RecommendationTop3";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import {
  getFreeAnalysisResult,
  hasCurrentEvaluationPeriod,
} from "@/app/lib/freeAnalysisResults/server";
import {
  getProfileFreeAnalysisFoundationStatus,
  isFreeAnalysisFoundationReady,
} from "@/app/lib/freeAnalysisEligibility";
import {
  GUEST_ANALYSIS_COOKIE_NAME,
  hashGuestAnalysisSecret,
  parseGuestAnalysisCredential,
} from "@/app/lib/guestFreeAnalyses/cookie";
import {
  getGuestFreeAnalysis,
  isUsableGuestFreeAnalysis,
} from "@/app/lib/guestFreeAnalyses/server";
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

function RecommendationPrerequisite({
  mode,
  profileId,
}: {
  mode: "guest" | "member-none" | "member-stale" | "member-generating";
  profileId?: string;
}) {
  const isGuest = mode === "guest";
  const isStale = mode === "member-stale";
  const isGenerating = mode === "member-generating";
  const href = isGuest ? "/guest-saju" : "/saju";
  const title = isGuest
    ? "무료 사주를 먼저 보면 내 추천 분석이 열립니다"
    : isStale
      ? "출생 정보가 바뀌어 추천 기준을 다시 확인해야 합니다"
      : isGenerating
        ? "무료 사주 분석이 끝나면 추천 분석이 열립니다"
        : "현재 프로필의 무료 사주를 먼저 확인해 주세요";
  const description = isGuest
    ? "추천 분석은 로그인 여부가 아니라 무료 사주 결과를 기준으로 열립니다. 먼저 무료 사주를 확인하면 지금 더 깊게 볼 질문 3가지를 바로 추천해 드립니다."
    : isStale
      ? "기존 추천은 변경 전 출생정보 기준이라 현재 프로필에 그대로 사용할 수 없습니다. 무료 사주를 다시 확인하면 새 기준으로 추천을 다시 보여드립니다."
      : isGenerating
        ? "현재 분석이 진행 중입니다. 완료된 무료 사주 결과가 준비되면 같은 계산 근거로 추천 질문이 이어집니다."
        : "추천 분석은 현재 프로필의 무료 사주 결과를 기준으로 선정됩니다. 무료 사주를 한 번 확인하면 추천 질문과 연결 분석을 바로 볼 수 있습니다.";

  return (
    <AppShell activeProfileId={profileId ?? null}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-10 text-[#11162d] sm:px-8 sm:py-14">
        <div className="mx-auto w-full max-w-4xl">
          <section className="overflow-hidden rounded-[2rem] border border-[#d8d3ff] bg-white shadow-[0_24px_70px_rgba(42,36,90,0.10)]">
            <div className="bg-[linear-gradient(135deg,#0a1128_0%,#17173b_60%,#30204c_100%)] px-6 py-8 text-white sm:px-9 sm:py-10">
              <p className="text-xs font-black tracking-[0.16em] text-[#b8adff]">추천 분석</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c1c5d8] sm:text-base">{description}</p>
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#f7f8fc] p-4">
                  <p className="text-xs font-black text-[#6f5ce7]">1</p>
                  <p className="mt-2 text-sm font-bold">무료 사주 확인</p>
                </div>
                <div className="rounded-2xl bg-[#f7f8fc] p-4">
                  <p className="text-xs font-black text-[#6f5ce7]">2</p>
                  <p className="mt-2 text-sm font-bold">추천 질문 3가지 확인</p>
                </div>
                <div className="rounded-2xl bg-[#f7f8fc] p-4">
                  <p className="text-xs font-black text-[#6f5ce7]">3</p>
                  <p className="mt-2 text-sm font-bold">원하는 분석 선택</p>
                </div>
              </div>
              <Link
                href={href}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#6f5ce7] px-6 py-4 text-sm font-black text-white shadow-[0_12px_30px_rgba(111,92,231,0.20)] transition hover:bg-[#5f4fd2] sm:w-auto"
              >
                {isGuest ? "무료 사주 보고 추천받기" : isStale ? "무료 사주 다시 분석하기" : "무료 사주 확인하기"}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function RecommendationsContent({
  profileLabel,
  profileId,
  recommendations,
  explanation,
  paidSummaries,
  guestMode = false,
}: {
  profileLabel: string;
  profileId: string;
  recommendations: readonly AnalysisProductRecommendation[];
  explanation: Parameters<typeof RecommendationTop3>[0]["explanation"];
  paidSummaries: Parameters<typeof RecommendationTop3>[0]["paidSummaries"];
  guestMode?: boolean;
}) {
  return (
    <AppShell activeProfileId={guestMode ? null : profileId}>
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
                  분석 대상 · {profileLabel}
                </span>
                {!guestMode ? (
                  <Link href={`/deep-analysis?profileId=${profileId}`} className="rounded-full border border-white/14 bg-white/[0.05] px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10">
                    원하는 주제로 직접 찾기 →
                  </Link>
                ) : (
                  <Link href="/deep-analysis" className="rounded-full border border-white/14 bg-white/[0.05] px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10">
                    원하는 주제로 직접 찾기 →
                  </Link>
                )}
              </div>
            </div>
          </header>

          {recommendations.length > 0 ? (
            <RecommendationTop3
              recommendations={recommendations}
              profileId={profileId}
              paidSummaries={paidSummaries}
              explanation={explanation}
              guestMode={guestMode}
            />
          ) : (
            <section className="mt-8 rounded-[1.6rem] border border-stone-200 bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-stone-700">현재 결과에서 이어지는 추천 질문을 준비하지 못했습니다.</p>
              <Link href={guestMode ? "/guest-saju" : "/saju"} className="mt-4 inline-block text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4">
                무료 분석 다시 확인하기
              </Link>
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}

export default async function RecommendationsPage({ searchParams }: RecommendationsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    const cookieStore = await cookies();
    const credential = parseGuestAnalysisCredential(
      cookieStore.get(GUEST_ANALYSIS_COOKIE_NAME)?.value,
    );
    if (!credential) {
      return <RecommendationPrerequisite mode="guest" />;
    }

    try {
      const record = await getGuestFreeAnalysis(
        credential.analysisId,
        hashGuestAnalysisSecret(credential.secret),
      );
      if (
        !record
        || !isUsableGuestFreeAnalysis(record)
        || record.status !== "completed"
        || !record.content
        || !hasCurrentEvaluationPeriod(record.content, createEvaluationContext())
      ) {
        return <RecommendationPrerequisite mode="guest" />;
      }

      const guestRecommendations = (record.content.productRecommendations?.recommendations ?? [])
        .filter((recommendation) => resolveCanonicalRecommendationProduct(recommendation.productId))
        .slice(0, 3);

      return (
        <RecommendationsContent
          profileLabel={record.content.profile.label?.trim() || "나"}
          profileId={record.id}
          recommendations={guestRecommendations}
          explanation={record.content.recommendationExplanation ?? null}
          paidSummaries={[]}
          guestMode
        />
      );
    } catch (error) {
      console.error("[recommendations] failed to restore guest recommendation result", error);
      return <RecommendationPrerequisite mode="guest" />;
    }
  }

  const { profileId } = await searchParams;
  if (profileId && !isProfileId(profileId)) notFound();

  const explicitProfile = profileId ? await getUserProfile(profileId, user.id) : null;
  if (profileId && !explicitProfile) notFound();

  const profile = explicitProfile ?? await getActiveProfile(user.id);
  if (!profile) redirect("/mypage");

  const foundationStatus = await getProfileFreeAnalysisFoundationStatus(user.id, profile);
  if (!isFreeAnalysisFoundationReady(foundationStatus)) {
    return (
      <RecommendationPrerequisite
        mode={
          foundationStatus === "stale"
            ? "member-stale"
            : foundationStatus === "generating"
              ? "member-generating"
              : "member-none"
        }
        profileId={profile.id}
      />
    );
  }

  const analysisRecord = await getFreeAnalysisResult(user.id, profile.id);
  if (!analysisRecord?.content) {
    return <RecommendationPrerequisite mode="member-none" profileId={profile.id} />;
  }

  const storedRecommendations = (analysisRecord.content.productRecommendations?.recommendations ?? [])
    .filter((recommendation) => resolveCanonicalRecommendationProduct(recommendation.productId));

  let recommendations = storedRecommendations;
  try {
    const refreshedRecommendations = buildCurrentRecommendations(profile);
    recommendations = mergeRecommendationStoryline(storedRecommendations, refreshedRecommendations);
  } catch (error) {
    console.error("[recommendations] failed to refresh deterministic recommendation storyline", error);
  }

  const recommendationExplanation = analysisRecord.content.recommendationExplanation ?? null;
  const paidSummaries = await listUserPaidAnalysisSummaries(user.id);

  return (
    <RecommendationsContent
      profileLabel={profile.label}
      profileId={profile.id}
      recommendations={recommendations}
      explanation={recommendationExplanation}
      paidSummaries={paidSummaries}
    />
  );
}
