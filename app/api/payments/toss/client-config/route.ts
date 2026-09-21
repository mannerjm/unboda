import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getTossConfig, isTossCheckoutUserAllowed } from "@/app/lib/toss/config";

export const dynamic = "force-dynamic";

/**
 * Only the public client key is returned. Resolve it on the server at request time so
 * Vercel's build-time NEXT_PUBLIC_ inlining cannot silently remove a configured key.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const config = getTossConfig();
    if (!isTossCheckoutUserAllowed(user.id)) {
      return NextResponse.json(
        { error: "현재 토스 테스트 결제는 승인된 심사용 계정에서만 이용할 수 있습니다.", code: "TOSS_REVIEW_ACCOUNT_REQUIRED" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { clientKey: config.clientKey, environment: config.environment },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "토스 결제 환경이 아직 설정되지 않았습니다. 테스트 키와 심사 설정을 확인해 주세요.", code: "TOSS_CHECKOUT_NOT_CONFIGURED" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
