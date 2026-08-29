import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { requestAccountClosure } from "@/app/lib/accounts/server";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const account = await requestAccountClosure(user.id);
    return NextResponse.json({
      message: "회원탈퇴 요청이 접수되었습니다. 계정이 탈퇴 처리 중 상태로 전환되었으며 새 유료 결제가 제한됩니다.",
      account,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "회원탈퇴 요청 처리 중 오류가 발생했습니다.";
    console.error("[request-closure] failed", error);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
