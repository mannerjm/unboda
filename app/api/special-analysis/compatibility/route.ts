import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";

/**
 * Customer compatibility generation moved behind the paid order boundary.
 * The actual report is generated automatically from the frozen, server-derived
 * pair snapshot after Toss payment confirmation. Keeping this endpoint explicit
 * prevents old clients from silently receiving a free report.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "궁합 분석은 결제 완료 후 자동으로 생성됩니다.",
      code: "COMPATIBILITY_PURCHASE_REQUIRED",
    },
    { status: 402 },
  );
}
