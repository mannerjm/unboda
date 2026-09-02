import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { listUserPaidAnalysisSummaries } from "@/app/lib/paidReports/server";
import { listUserInterestedAnalyses } from "@/app/lib/interestedAnalyses/server";

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
    const [paidAnalysis, interestedAnalyses] = await Promise.all([
      listUserPaidAnalysisSummaries(user.id),
      listUserInterestedAnalyses(user.id),
    ]);
    const savedProductIds = interestedAnalyses.map((record) => record.productId);

    return NextResponse.json({ paidAnalysis, savedProductIds });
  } catch (error) {
    console.error("[premium-catalog-status] list failed", error);

    return NextResponse.json(
      { error: "보유 분석 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
