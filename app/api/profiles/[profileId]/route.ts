import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { AccountAccessError, requireVerifiedEmailAccount } from "@/app/lib/accounts/server";
import {
  deleteUserProfile,
  getProfileDeletability,
  getUserProfile,
  isProfilesSelfConflict,
  ProfileInUseError,
  updateUserProfile,
} from "@/app/lib/profiles/server";
import {
  isProfileId,
  mergeProfileInput,
  profileDeleteBlockMessages,
} from "@/app/lib/profiles/types";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  let user;
  try {
    user = await requireVerifiedEmailAccount();
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json(
        { error: error.code === "EMAIL_NOT_VERIFIED" ? "이메일 인증이 필요합니다." : "계정을 사용할 수 없습니다." },
        { status: error.code === "AUTHENTICATION_REQUIRED" ? 401 : 403 },
      );
    }
    throw error;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { profileId } = await context.params;
  let currentProfile;

  try {
    currentProfile = await getUserProfile(profileId, user.id);
  } catch (error) {
    console.error("[profiles] ownership lookup failed", error);
    return NextResponse.json({ error: "프로필을 조회하지 못했습니다." }, { status: 500 });
  }

  if (!currentProfile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  const validation = mergeProfileInput(currentProfile, body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const profile = await updateUserProfile(profileId, validation.value, user.id);

    if (!profile) {
      return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    if (isProfilesSelfConflict(error as { code?: string; message?: string })) {
      return NextResponse.json({ error: "본인 프로필은 계정당 하나만 만들 수 있습니다." }, { status: 409 });
    }

    console.error("[profiles] update failed", error);
    return NextResponse.json({ error: "프로필을 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { profileId } = await context.params;

  if (!isProfileId(profileId)) {
    return NextResponse.json(
      { error: "유효한 프로필을 선택해 주세요.", code: "INVALID_PROFILE_ID" },
      { status: 400 },
    );
  }

  try {
    // A missing profile and another user's profile are both 404: ownership is
    // never disclosed. The preflight then re-checks the same rules the mypage
    // summary showed, because that hint may be stale by now.
    const profile = await getUserProfile(profileId, user.id);

    if (!profile) {
      return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
    }

    const deletability = await getProfileDeletability(profileId, user.id);

    if (!deletability.deletable) {
      return NextResponse.json(
        { error: profileDeleteBlockMessages[deletability.reason], code: deletability.reason },
        { status: 409 },
      );
    }

    const deleted = await deleteUserProfile(profileId, user.id);

    if (!deleted) {
      return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ProfileInUseError) {
      return NextResponse.json(
        { error: profileDeleteBlockMessages.PROFILE_IN_USE, code: "PROFILE_IN_USE" },
        { status: 409 },
      );
    }

    console.error("[profiles] delete failed", error);
    return NextResponse.json({ error: "프로필을 삭제하지 못했습니다." }, { status: 500 });
  }
}
