import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { confirmMockPayment } from "@/app/lib/purchases/server";
import { runPaidReportGeneration } from "@/app/lib/paidReports/generation";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "mock 결제 확인은 프로덕션에서 사용할 수 없습니다." },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { orderId } = await context.params;

  try {
    // ownership is enforced inside: the order must belong to the session user
    const confirmation = await confirmMockPayment(orderId, user.id);

    if (!confirmation) {
      return NextResponse.json(
        { error: "주문을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const reportClaim = confirmation.reportClaim;
    if (reportClaim?.state === "claimed") {
      after(() => runPaidReportGeneration({
        userId: confirmation.order.userId,
        profileId: confirmation.order.profileId,
        productId: confirmation.order.productId,
        purchaseId: confirmation.purchase.id,
        analysisEditionKey: confirmation.purchase.analysisEditionKey!,
      }, reportClaim).catch((error) => {
        console.error("[orders/mock-confirm] automatic report generation failed", error);
      }));
    }

    return NextResponse.json({
      order: confirmation.order,
      purchase: confirmation.purchase,
      entitlement: confirmation.entitlement,
      reportStatus: reportClaim?.state === "completed" ? "completed" : "preparing",
    }, { status: 200 });
  } catch (error) {
    console.error("[orders/mock-confirm] failed");

    return NextResponse.json(
      { error: "결제 확인 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
