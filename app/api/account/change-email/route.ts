import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { createClient as createServerClient } from "@/app/lib/supabase/server";

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

  const { newEmail } = (body as { newEmail?: unknown }) || {};

  if (typeof newEmail !== "string" || !newEmail.trim()) {
    return NextResponse.json({ error: "새 이메일 주소를 입력해 주세요." }, { status: 400 });
  }

  const trimmedEmail = newEmail.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return NextResponse.json({ error: "유효한 이메일 형식이 아닙니다." }, { status: 400 });
  }

  if (trimmedEmail.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json({ error: "현재 사용 중인 이메일 주소와 동일합니다." }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.updateUser({ email: trimmedEmail });

    if (error) {
      console.error("[change-email] Supabase updateUser error", error);
      return NextResponse.json(
        { error: "이메일 변경 요청에 실패했습니다. 이미 사용 중인 이메일이거나 올바르지 않은 주소일 수 있습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "변경할 이메일 주소로 확인 메일을 보냈습니다. 이메일의 확인 링크를 클릭하면 변경이 완료됩니다.",
      newEmail: trimmedEmail,
    });
  } catch (error) {
    console.error("[change-email] unexpected failure", error);
    return NextResponse.json(
      { error: "요청을 처리하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
