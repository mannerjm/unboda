import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";

/**
 * Parent-child compatibility generation is a paid product. The report is
 * generated only after payment confirmation from the frozen purchase snapshot,
 * so an old client cannot bypass checkout by calling this endpoint directly.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "부모·자녀 궁합은 결제 완료 후 자동으로 생성됩니다.",
      code: "FAMILY_PARENT_CHILD_PURCHASE_REQUIRED",
    },
    { status: 402 },
  );
}
