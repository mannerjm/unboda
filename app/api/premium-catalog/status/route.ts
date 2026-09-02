import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { listUserPaidAnalysisSummaries } from "@/app/lib/paidReports/server";
import { listUserInterestedAnalyses } from "@/app/lib/interestedAnalyses/server";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentEditionEntitlementForProfile } from "@/app/lib/purchases/server";

/**
 * Read-only catalog status for the signed-in user. Guests get an empty list so
 * the catalog renders every product as not-purchased without extra requests.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ paidAnalysis: [], savedProductIds: [] });
  }

  try {
    const [paidAnalysis, interestedAnalyses, activeProfile] = await Promise.all([
      listUserPaidAnalysisSummaries(user.id),
      listUserInterestedAnalyses(user.id),
      getActiveProfile(user.id),
    ]);
    const savedProductIds = interestedAnalyses.map((record) => record.productId);
    const activePaidProductIds = [...new Set(paidAnalysis
      .filter((summary) => summary.profileId === activeProfile?.id)
      .map((summary) => summary.productId))];
    const currentOwnedProductIds = activeProfile
      ? (await Promise.all(activePaidProductIds.map(async (productId) => {
        const ownership = await getCurrentEditionEntitlementForProfile({
          userId: user.id,
          profile: activeProfile,
          productId,
        });
        return ownership ? productId : null;
      }))).filter((productId): productId is string => productId !== null)
      : [];

    return NextResponse.json({ paidAnalysis, savedProductIds, currentOwnedProductIds });
  } catch (error) {
    console.error("[premium-catalog-status] list failed", error);

    return NextResponse.json(
      { error: "보유 분석 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
