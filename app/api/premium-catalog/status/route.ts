import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { listUserPaidAnalysisSummaries } from "@/app/lib/paidReports/server";

/**
 * Read-only catalog status for the signed-in user. Guests get an empty list so
 * the catalog renders every product as not-purchased without extra requests.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ paidAnalysis: [] });
  }

  try {
    const paidAnalysis = await listUserPaidAnalysisSummaries(user.id);

    return NextResponse.json({ paidAnalysis });
  } catch (error) {
    console.error("[premium-catalog-status] list failed", error);

    return NextResponse.json(
      { error: "보유 분석 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
