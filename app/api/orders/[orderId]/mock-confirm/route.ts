import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { confirmMockPayment } from "@/app/lib/purchases/server";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
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

    return NextResponse.json(confirmation, { status: 200 });
  } catch (error) {
    console.error("[orders/mock-confirm] failed", error);

    return NextResponse.json(
      { error: "결제 확인 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
