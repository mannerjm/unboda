import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import {
  getFreeAnalysisResult,
  getProfileFingerprint,
  claimMainAnalysisRetry,
  completeMainAnalysisRetry,
} from "@/app/lib/freeAnalysisResults/server";
import { regenerateMainAnalysis } from "@/app/lib/freeAnalysisPipeline/server";
import { isProfileId } from "@/app/lib/profiles/types";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
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

    if (cached.content?.generationMeta?.mainAnalysisStatus !== "failed") {
      return NextResponse.json({ error: "다시 생성할 수 있는 상태가 아닙니다." }, { status: 409 });
    }

    const claimResult = await claimMainAnalysisRetry(cached);
    if (claimResult.state === "limit_exceeded") {
      return NextResponse.json(
        { error: "AI 해석 재시도 가능 횟수를 초과했습니다.", code: "RETRY_LIMIT_EXCEEDED" },
        { status: 429 },
      );
    }
    if (claimResult.state === "in_progress") {
      return NextResponse.json(
        { error: "이미 AI 해석을 다시 생성하는 중입니다.", code: "RETRY_IN_PROGRESS" },
        { status: 409 },
      );
    }
    const claimed = claimResult.record;

    let generation: { text: string; status: "completed" | "failed" };
    try {
      generation = await regenerateMainAnalysis({
        profile: claimed.content!.profile,
        freeAnalysis: claimed.content!.freeAnalysis,
      });
    } catch (error) {
      console.error("[retry-main-analysis] generation failed", error);
      generation = { text: claimed.content!.result, status: "failed" };
    }

    const content = await completeMainAnalysisRetry({
      record: claimed,
      result: generation.text,
      mainAnalysisStatus: generation.status,
    });

    return NextResponse.json({ result: content.result, generationMeta: content.generationMeta });
  } catch (error) {
    console.error("[retry-main-analysis] failed", error);
    return NextResponse.json({ error: "AI 해석을 다시 생성하지 못했습니다." }, { status: 500 });
  }
}
