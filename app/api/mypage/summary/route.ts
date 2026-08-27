import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import {
  listUserFreeAnalysisResults,
  resolveProfileFreeAnalysisStatus,
} from "@/app/lib/freeAnalysisResults/server";
import { listProfileDeleteBlockers, listUserProfiles } from "@/app/lib/profiles/server";
import { listUserPaidAnalysisSummaries } from "@/app/lib/paidReports/server";
import { listUserPurchaseHistory } from "@/app/lib/purchases/server";
import { listUserRefundSummaries } from "@/app/lib/refunds/server";
import { createEvaluationContext } from "@/app/lib/evaluationContext";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const evaluationContext = createEvaluationContext();
    const [profiles, summaries, deleteBlockers, paidAnalysis, purchaseHistory, refunds] = await Promise.all([
      listUserProfiles(user.id),
      listUserFreeAnalysisResults(user.id),
      listProfileDeleteBlockers(user.id),
      listUserPaidAnalysisSummaries(user.id),
      listUserPurchaseHistory(user.id),
      listUserRefundSummaries(user.id),
    ]);
    const freeAnalysisResults = profiles.map((profile) => ({
      profileId: profile.id,
      status: resolveProfileFreeAnalysisStatus(profile, summaries, evaluationContext),
    }));
    // UX hint only: DELETE /api/profiles/[profileId] re-checks the same rules.
    const profileDeletability = profiles.map((profile) => {
      const reason = deleteBlockers.get(profile.id);
      return reason
        ? { profileId: profile.id, deletable: false, reason }
        : { profileId: profile.id, deletable: true };
    });

    const refundByOrderId = new Map(refunds.map((refund) => [refund.orderId, refund]));
    const purchaseHistoryWithRefunds = purchaseHistory.map((purchase) => ({
      ...purchase,
      refund: refundByOrderId.get(purchase.orderId) ?? null,
    }));

    return NextResponse.json({ freeAnalysisResults, profileDeletability, paidAnalysis, purchaseHistory: purchaseHistoryWithRefunds });
  } catch (error) {
    console.error("[mypage-summary] list failed", error);
    return NextResponse.json({ error: "요약 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
