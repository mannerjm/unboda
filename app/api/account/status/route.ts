import { NextResponse } from "next/server";
import { ensureAccountLifecycle } from "@/app/lib/accounts/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { createClient as createServerClient } from "@/app/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const account = await ensureAccountLifecycle(user.id);
    const { data: authData } = await (await createServerClient()).auth.getUser();
    return NextResponse.json({
      email: user.email,
      emailVerified: Boolean(authData.user?.email_confirmed_at),
      account: {
        generation: account.generation,
        status: account.status,
        paidEligibilityStatus: account.paidEligibilityStatus,
      },
    });
  } catch (error) {
    console.error("[account-status] lookup failed", error);
    return NextResponse.json({ error: "계정 상태를 불러오지 못했습니다." }, { status: 500 });
  }
}
