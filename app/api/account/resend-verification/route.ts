import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { createClient as createServerClient } from "@/app/lib/supabase/server";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();
    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user || !data.user.email) {
      return NextResponse.json({ error: "계정 정보를 확인하지 못했습니다." }, { status: 400 });
    }

    if (data.user.email_confirmed_at) {
      return NextResponse.json({ message: "이미 이메일 인증이 완료되었습니다." });
    }

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: data.user.email,
    });

    if (resendError) {
      console.error("[resend-verification] Supabase resend error", resendError);
      return NextResponse.json(
        { error: "인증 이메일 재발송에 실패했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "인증 이메일을 재발송했습니다. 이메일함을 확인해 주세요.",
    });
  } catch (error) {
    console.error("[resend-verification] unexpected failure", error);
    return NextResponse.json(
      { error: "요청을 처리하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
