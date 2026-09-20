import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { isProfileId } from "@/app/lib/profiles/types";
import { getActiveEntitlementForProfileEdition } from "@/app/lib/purchases/server";
import { getPaidReport } from "@/app/lib/paidReports/server";
import { preparePaidReportGeneration, runPaidReportGeneration } from "@/app/lib/paidReports/generation";
import {
  isCompatibilityPairProductId,
  isCompatibilityFamilyParentChildProductId,
  isCompatibilityFamilySiblingProductId,
  isCompatibilityFamilyOtherProductId,
} from "@/app/lib/specialAnalysisProducts";

/** Explicit retry of an already paid, failed compatibility report. Never creates an order. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  let payload: { productId?: unknown; profileId?: unknown; edition?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 });
  }
  const productId = typeof payload.productId === "string" ? payload.productId : "";
  const profileId = typeof payload.profileId === "string" ? payload.profileId : "";
  const edition = typeof payload.edition === "string" ? payload.edition : "";
  const validProduct = isCompatibilityPairProductId(productId)
    || isCompatibilityFamilyParentChildProductId(productId)
    || isCompatibilityFamilySiblingProductId(productId)
    || isCompatibilityFamilyOtherProductId(productId);
  if (!validProduct || !isProfileId(profileId) || !edition) {
    return NextResponse.json({ error: "구매 리포트 정보를 확인해 주세요." }, { status: 400 });
  }

  try {
    const [profile, active] = await Promise.all([
      getUserProfile(profileId, user.id),
      getActiveProfile(user.id),
    ]);
    if (!profile || active?.id !== profile.id) {
      return NextResponse.json({ error: "현재 선택한 분석 대상만 재확인할 수 있습니다." }, { status: 403 });
    }
    const entitlement = await getActiveEntitlementForProfileEdition(user.id, profile.id, productId, edition);
    if (!entitlement) {
      return NextResponse.json({ error: "해당 리포트의 구매 권한이 없습니다." }, { status: 403 });
    }
    const report = await getPaidReport(user.id, profile.id, productId, edition);
    if (!report || report.status !== "failed") {
      return NextResponse.json({ status: report?.status ?? "preparing" });
    }
    if (!entitlement.purchaseId) {
      return NextResponse.json({ error: "이 리포트는 자동 재생성을 시작할 수 없습니다. 고객지원으로 문의해 주세요." }, { status: 409 });
    }

    const input = {
      userId: user.id,
      profileId: profile.id,
      productId,
      purchaseId: entitlement.purchaseId,
      analysisEditionKey: edition,
    };
    const claim = await preparePaidReportGeneration(input);
    if (claim.state === "claimed") {
      after(() => runPaidReportGeneration(input, claim).catch((error) => {
        console.error("[paid-report-retry] generation failed", error);
      }));
    }
    return NextResponse.json({ status: claim.state === "completed" ? "completed" : "generating" });
  } catch (error) {
    console.error("[paid-report-retry] failed", error);
    return NextResponse.json({ error: "기존 구매 리포트의 재생성을 시작하지 못했습니다. 고객지원으로 문의해 주세요." }, { status: 500 });
  }
}
