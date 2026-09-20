import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { resolvePurchasableProduct } from "@/app/lib/purchases/products";
import { getActiveEntitlementForProfile, getActiveEntitlementForProfileEdition } from "@/app/lib/purchases/server";
import { getUserProfile } from "@/app/lib/profiles/server";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { isProfileId } from "@/app/lib/profiles/types";
import { getPaidReport } from "@/app/lib/paidReports/server";

/**
 * Read-only polling endpoint. Never starts, claims, or retries report generation.
 * Restrict status to the same user, active profile, product and paid edition.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const resolved = resolvePurchasableProduct(params.get("productId"));
  const profileId = params.get("profileId");
  const edition = params.get("edition");
  if (!resolved.ok || !isProfileId(profileId) || (edition !== null && !edition)) {
    return NextResponse.json({ error: "분석 대상 또는 상품을 확인해 주세요." }, { status: 400 });
  }

  try {
    const [profile, activeProfile] = await Promise.all([
      getUserProfile(profileId, user.id),
      getActiveProfile(user.id),
    ]);
    if (!profile || activeProfile?.id !== profile.id) {
      return NextResponse.json({ error: "현재 선택한 분석 대상만 확인할 수 있습니다." }, { status: 403 });
    }

    const entitlement = edition
      ? await getActiveEntitlementForProfileEdition(user.id, profile.id, resolved.productId, edition)
      : await getActiveEntitlementForProfile(user.id, profile.id, resolved.productId);
    if (!entitlement?.analysisEditionKey) {
      return NextResponse.json({ error: "구매한 리포트의 권한을 확인할 수 없습니다." }, { status: 403 });
    }

    const report = await getPaidReport(user.id, profile.id, resolved.productId, entitlement.analysisEditionKey);
    return NextResponse.json(
      { status: report?.status ?? "preparing" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[paid-report-status] lookup failed", error);
    return NextResponse.json({ error: "리포트 생성 상태를 확인하지 못했습니다." }, { status: 500 });
  }
}
