import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import {
  getFreeAnalysisResult,
  getProfileFingerprint,
} from "@/app/lib/freeAnalysisResults/server";
import { isProfileId } from "@/app/lib/profiles/types";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

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

    if (cached.status === "generating") {
      return NextResponse.json({ status: "generating" }, { status: 202 });
    }

    if (cached.status !== "completed" || !cached.content) {
      return NextResponse.json({ error: "저장된 무료 분석 결과가 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ analysis: cached.content });
  } catch (error) {
    console.error("[free-analysis-results] get failed", error);
    return NextResponse.json({ error: "무료 분석 결과를 불러오지 못했습니다." }, { status: 500 });
  }
}