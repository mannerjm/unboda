import { NextRequest, NextResponse } from "next/server";
import { getAiConsultingCreditBalance } from "@/app/lib/aiConsulting/server";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId || !isProfileId(profileId)) {
    return NextResponse.json({ error: "프로필 정보를 확인해 주세요." }, { status: 400 });
  }

  const profile = await getUserProfile(profileId, user.id).catch(() => null);
  if (!profile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const balance = await getAiConsultingCreditBalance({
      userId: user.id,
      profileId: profile.id,
    });

    return NextResponse.json({ profileId: profile.id, balance });
  } catch (error) {
    console.error("[ai-consulting-credit-balance] read failed", error);
    return NextResponse.json({ error: "AI 질문권 잔액을 불러오지 못했습니다." }, { status: 500 });
  }
}
