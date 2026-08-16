import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import {
  clearActiveProfile,
  getActiveProfile,
  setActiveProfile,
} from "@/app/lib/profiles/activeServer";
import { isProfileId } from "@/app/lib/profiles/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    return NextResponse.json({ profile: await getActiveProfile(user.id) });
  } catch (error) {
    console.error("[active-profile] get failed", error);
    return NextResponse.json({ error: "활성 프로필을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: { profileId?: unknown };
  try { body = await request.json() as { profileId?: unknown }; } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  if (!isProfileId(body.profileId)) {
    return NextResponse.json({ error: "유효한 프로필을 선택해 주세요." }, { status: 400 });
  }

  try {
    const profile = await setActiveProfile(user.id, body.profileId);
    if (!profile) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[active-profile] set failed", error);
    return NextResponse.json({ error: "활성 프로필을 변경하지 못했습니다." }, { status: 500 });
  }
}

// Idempotent: clearing an already empty selection is still a success.
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    await clearActiveProfile(user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[active-profile] clear failed", error);
    return NextResponse.json({ error: "분석 대상 선택을 해제하지 못했습니다." }, { status: 500 });
  }
}
