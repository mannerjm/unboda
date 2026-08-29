import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { cancelAccountClosureRequest } from "@/app/lib/accounts/server";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const account = await cancelAccountClosureRequest(user.id);
    return NextResponse.json({
      message: "회원탈퇴 요청이 취소되었습니다. 계정이 다시 사용 중 상태로 전환되었습니다.",
      account,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "탈퇴 요청 취소 중 오류가 발생했습니다.";
    console.error("[cancel-closure] failed", error);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
