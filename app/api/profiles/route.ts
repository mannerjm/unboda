import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { createUserProfile, isProfilesSelfConflict, listUserProfiles } from "@/app/lib/profiles/server";
import { validateProfileInput } from "@/app/lib/profiles/types";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const profiles = await listUserProfiles(user.id);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("[profiles] list failed", error);
    return NextResponse.json({ error: "프로필 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const validation = validateProfileInput(body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const profile = await createUserProfile(validation.value, user.id);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    if (isProfilesSelfConflict(error as { code?: string; message?: string })) {
      return NextResponse.json({ error: "본인 프로필은 계정당 하나만 만들 수 있습니다." }, { status: 409 });
    }

    console.error("[profiles] create failed", error);
    return NextResponse.json({ error: "프로필을 생성하지 못했습니다." }, { status: 500 });
  }
}
