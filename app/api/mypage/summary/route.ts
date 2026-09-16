import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import {
  getProfileFingerprint,
  listUserFreeAnalysisResults,
  resolveProfileFreeAnalysisStatus,
} from "@/app/lib/freeAnalysisResults/server";
import { listProfileDeleteBlockers, listUserProfiles } from "@/app/lib/profiles/server";
import { listUserPaidAnalysisSummaries } from "@/app/lib/paidReports/server";
import { listUserPurchaseHistory } from "@/app/lib/purchases/server";
import { listUserSpecialAnalysisPurchaseHistory } from "@/app/lib/specialAnalysisPurchaseHistory";
import { getSpecialAnalysisProduct } from "@/app/lib/specialAnalysisProducts";
import { listUserRefundSummaries } from "@/app/lib/refunds/server";
import { createEvaluationContext } from "@/app/lib/evaluationContext";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const evaluationContext = createEvaluationContext();
    const [profiles, summaries, deleteBlockers, rawPaidAnalysis, standardPurchaseHistory, specialPurchaseHistory, refunds] = await Promise.all([
      listUserProfiles(user.id),
      listUserFreeAnalysisResults(user.id),
      listProfileDeleteBlockers(user.id),
      listUserPaidAnalysisSummaries(user.id),
      listUserPurchaseHistory(user.id),
      listUserSpecialAnalysisPurchaseHistory(user.id),
      listUserRefundSummaries(user.id),
    ]);
    const freeAnalysisResults = profiles.map((profile) => {
      const summary = summaries.find((item) => item.profileId === profile.id);
      const status = resolveProfileFreeAnalysisStatus(profile, summaries, evaluationContext);
      const periodRefreshAvailable = Boolean(
        status === "stale"
          && summary?.status === "completed"
          && summary.profileFingerprint === getProfileFingerprint(profile)
          && (
            summary.evaluationYear !== evaluationContext.evaluationYear
            || summary.evaluationMonth !== evaluationContext.evaluationMonth
          ),
      );

      return {
        profileId: profile.id,
        status: periodRefreshAvailable ? "completed" : status,
        periodRefreshAvailable,
        currentEvaluationYear: evaluationContext.evaluationYear,
        currentEvaluationMonth: evaluationContext.evaluationMonth,
      };
    });

    const profileDeletability = profiles.map((profile) => {
      const reason = deleteBlockers.get(profile.id);
      return reason
        ? { profileId: profile.id, deletable: false, reason }
        : { profileId: profile.id, deletable: true };
    });

    const paidAnalysis = rawPaidAnalysis.map((item) => {
      const specialProduct = getSpecialAnalysisProduct(item.productId);
      return specialProduct ? { ...item, productName: specialProduct.title } : item;
    });

    const purchaseHistory = [...standardPurchaseHistory, ...specialPurchaseHistory]
      .sort((left, right) => right.purchasedAt.localeCompare(left.purchasedAt));
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
