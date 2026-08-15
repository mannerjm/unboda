import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { listUserFreeAnalysisResults } from "@/app/lib/freeAnalysisResults/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const freeAnalysisResults = await listUserFreeAnalysisResults(user.id);
    return NextResponse.json({ freeAnalysisResults });
  } catch (error) {
    console.error("[mypage-summary] list failed", error);
    return NextResponse.json({ error: "요약 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
