import { NextResponse } from "next/server";
import { getAiConsultingPortfolioState } from "@/app/lib/aiConsulting/portfolio";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCurrentUser } from "@/app/lib/supabase/auth";

async function resolvePortfolioBoundary(profileId: unknown) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) } as const;
  }

  if (!isProfileId(profileId)) {
    return { error: NextResponse.json({ error: "유효한 프로필이 필요합니다." }, { status: 400 }) } as const;
  }

  const [profile, activeProfile] = await Promise.all([
    getUserProfile(profileId, user.id),
    getActiveProfile(user.id),
  ]);

  if (!profile || !activeProfile || activeProfile.id !== profile.id) {
    return { error: NextResponse.json({ error: "현재 선택한 분석 대상만 상담할 수 있습니다." }, { status: 403 }) } as const;
  }

  return { user, profile } as const;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const boundary = await resolvePortfolioBoundary(url.searchParams.get("profileId"));
  if ("error" in boundary) return boundary.error;

  const messageBefore = url.searchParams.get("before");
  if (messageBefore && (messageBefore.length > 48 || !/^\d{4}-\d{2}-\d{2}T/.test(messageBefore) || Number.isNaN(Date.parse(messageBefore)))) {
    return NextResponse.json({ error: "상담 기록 조회 기준이 올바르지 않습니다." }, { status: 400 });
  }

  const includeProductId = url.searchParams.get("includeProductId");
  const includeEdition = url.searchParams.get("includeEdition");
  const includePreviousSource = includeProductId && includeEdition
    ? { productId: includeProductId, analysisEditionKey: includeEdition }
    : null;

  try {
    const state = await getAiConsultingPortfolioState({
      userId: boundary.user.id,
      profileId: boundary.profile.id,
      profile: boundary.profile,
      includePreviousSource,
      messageBefore: messageBefore ?? undefined,
    });
    return NextResponse.json(state);
  } catch (error) {
    console.error("[ai-consulting-portfolio] read failed", error);
    return NextResponse.json({ error: "통합 AI 상담 상태를 불러오지 못했습니다." }, { status: 500 });
  }
}
