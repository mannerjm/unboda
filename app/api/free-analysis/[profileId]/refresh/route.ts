import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import {
  claimFreeAnalysisResult,
  completeFreeAnalysisResult,
  failFreeAnalysisResult,
} from "@/app/lib/freeAnalysisResults/server";
import { buildFreeAnalysisResponse } from "@/app/lib/freeAnalysisPipeline/server";
import { createEvaluationContext } from "@/app/lib/evaluationContext";
import { isProfileId } from "@/app/lib/profiles/types";

export async function POST(_request: Request, context: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { profileId } = await context.params;
  if (!isProfileId(profileId)) return NextResponse.json({ error: "유효한 프로필을 선택해 주세요." }, { status: 400 });

  try {
    const profile = await getUserProfile(profileId, user.id);
    if (!profile) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
    const evaluationContext = createEvaluationContext();
    const claim = await claimFreeAnalysisResult({ userId: user.id, profile, evaluationContext, allowPeriodRefresh: true });
    if (claim.state === "completed") return NextResponse.json({ status: "current", analysis: claim.record.content, refreshAvailable: false });
    if (claim.state === "generating" || claim.state === "stale") return NextResponse.json({ status: "generating", refreshAvailable: true }, { status: 202 });

    try {
      const analysis = await buildFreeAnalysisResponse({
        profile: { id: profile.id, label: profile.label, birthDate: profile.birthDate, birthTime: profile.birthTime, gender: profile.gender, calendarType: profile.calendarType, isLeapMonth: profile.isLeapMonth },
        evaluationDate: evaluationContext.evaluationDate,
      });
      await completeFreeAnalysisResult({ record: claim.record, content: analysis });
      return NextResponse.json({ status: "current", analysis, refreshAvailable: false });
    } catch (error) {
      try { await failFreeAnalysisResult({ record: claim.record, errorCode: "period-refresh-failed" }); } catch (persistError) { console.error("[free-analysis-refresh] failure state update failed", persistError); }
      console.error("[free-analysis-refresh] generation failed", error);
      return NextResponse.json({ status: "failed", error: "현재 기준 분석을 갱신하지 못했습니다. 다시 시도해 주세요.", refreshAvailable: true }, { status: 500 });
    }
  } catch (error) {
    console.error("[free-analysis-refresh] request failed", error);
    return NextResponse.json({ error: "현재 기준 분석을 갱신하지 못했습니다." }, { status: 500 });
  }
}
