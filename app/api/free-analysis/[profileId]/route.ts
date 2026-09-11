import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import {
  getFreeAnalysisResult,
  getProfileFingerprint,
} from "@/app/lib/freeAnalysisResults/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { createEvaluationContext } from "@/app/lib/evaluationContext";
import { hasCurrentEvaluationPeriod } from "@/app/lib/freeAnalysisResults/server";
import type { AnalyzeSuccessResponse } from "@/app/lib/analyzeApiTypes";
import type { ProfileDto } from "@/app/lib/profiles/types";
import { enrichSupplementalPillarStars } from "@/app/lib/sajuSupplementalStars";
import { enrichSajuRelationStars } from "@/app/lib/sajuRelationStars";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

function withCurrentProfile(
  analysis: AnalyzeSuccessResponse,
  profile: ProfileDto,
): AnalyzeSuccessResponse {
  const enrichedSaju = enrichSajuRelationStars(enrichSupplementalPillarStars(analysis.saju));
  const enrichedFreeAnalysis = analysis.freeAnalysis
    ? enrichSajuRelationStars(enrichSupplementalPillarStars(analysis.freeAnalysis))
    : undefined;

  return {
    ...analysis,
    saju: enrichedSaju,
    ...(enrichedFreeAnalysis ? { freeAnalysis: enrichedFreeAnalysis } : {}),
    profile: {
      id: profile.id,
      label: profile.label,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      gender: profile.gender,
      calendarType: profile.calendarType,
      isLeapMonth: profile.isLeapMonth,
    },
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { profileId } = await context.params;
  if (!isProfileId(profileId)) {
    return NextResponse.json({ error: "유효한 프로필을 선택해 주세요." }, { status: 400 });
  }

  try {
    const profile = await getUserProfile(profileId, user.id);
    if (!profile) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

    const cached = await getFreeAnalysisResult(user.id, profile.id);
    if (!cached || cached.profileFingerprint !== getProfileFingerprint(profile)) {
      return NextResponse.json({ error: "저장된 무료 분석 결과가 없습니다." }, { status: 404 });
    }

    if (!cached.content) {
      if (cached.status === "generating") return NextResponse.json({ status: "generating" }, { status: 202 });
      return NextResponse.json({ error: "저장된 무료 분석 결과가 없습니다." }, { status: 404 });
    }

    const analysis = withCurrentProfile(cached.content, profile);
    const currentContext = createEvaluationContext();
    if (!hasCurrentEvaluationPeriod(analysis, currentContext)) {
      return NextResponse.json({
        analysis,
        status: cached.status === "generating" ? "generating" : "stale",
        freshness: "STALE",
        storedEvaluationContext: analysis.saju.evaluationContext ?? null,
        currentEvaluationContext: currentContext,
        refreshAvailable: cached.status !== "generating",
      }, { status: 200 });
    }

    if (cached.status === "generating") {
      return NextResponse.json({ analysis, status: "generating", freshness: "CURRENT", refreshAvailable: false }, { status: 200 });
    }

    if (cached.status !== "completed") {
      return NextResponse.json({ analysis, status: cached.status, freshness: "CURRENT", refreshAvailable: true }, { status: 200 });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("[free-analysis-results] get failed", error);
    return NextResponse.json({ error: "무료 분석 결과를 불러오지 못했습니다." }, { status: 500 });
  }
}
