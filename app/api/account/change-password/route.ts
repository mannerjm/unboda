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

  const { password, confirmPassword } = (body as { password?: unknown; confirmPassword?: unknown }) || {};

  if (typeof password !== "string" || !password.trim()) {
    return NextResponse.json({ error: "새 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "비밀번호 확인이 일치하지 않습니다." }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("[change-password] Supabase updateUser error", error);
      return NextResponse.json(
        { error: "비밀번호 변경에 실패했습니다. 기존 비밀번호와 동일하거나 안전하지 않은 비밀번호일 수 있습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (error) {
    console.error("[change-password] unexpected failure", error);
    return NextResponse.json(
      { error: "요청을 처리하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
