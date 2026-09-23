import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getOrderForUser } from "@/app/lib/purchases/server";

export const dynamic = "force-dynamic";

/**
 * Public customer requests are intake-only. Never cancel a Toss payment based
 * on a customer-selected reason category or supplied request body. Existing
 * approved refund workflows and their reconciliation remain untouched.
 */
export async function POST(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({
    success: false, code: "UNAUTHENTICATED", message: "로그인이 필요합니다.",
  }, { status: 401 });

  const { orderId } = await context.params;
  const order = await getOrderForUser(orderId, user.id);
  if (!order) return NextResponse.json({
    success: false, code: "ORDER_NOT_FOUND", message: "주문을 찾을 수 없습니다.",
  }, { status: 404 });

  return NextResponse.json({
    success: false,
    code: "REFUND_SUPPORT_REQUIRED",
    message: "환불·취소 문의는 고객지원센터에서 해당 주문을 선택해 접수해 주세요.",
    supportHref: `/support?category=PAYMENT_REFUND&orderId=${encodeURIComponent(order.id)}`,
  }, { status: 409, headers: { "Cache-Control": "no-store" } });
}
