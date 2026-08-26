import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getOrderForUser } from "@/app/lib/purchases/server";
import { requestFullRefund } from "@/app/lib/refunds/server";
import type { RefundReasonCategory } from "@/app/lib/refunds/policy";
import { getRefundCustomerMessage } from "@/app/lib/refunds/status";

export const dynamic = "force-dynamic";

const REASONS = new Set<RefundReasonCategory>([
  "CHANGE_OF_MIND", "CONTENT_NOT_PROVIDED", "MATERIAL_DEFECT", "MATERIALLY_DIFFERENT",
]);

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, code: "UNAUTHENTICATED", message: "로그인이 필요합니다." }, { status: 401 });
  const { orderId } = await context.params;
  const order = await getOrderForUser(orderId, user.id);
  if (!order) return NextResponse.json({ success: false, code: "ORDER_NOT_FOUND", message: "주문을 찾을 수 없습니다." }, { status: 404 });
  const body = await request.json().catch(() => null) as { reasonCategory?: unknown; reasonText?: unknown; cancelAmount?: unknown } | null;
  if (body?.cancelAmount !== undefined) return NextResponse.json({ success: false, code: "PARTIAL_REFUND_UNSUPPORTED", message: getRefundCustomerMessage("OWNER_REVIEW_REQUIRED") }, { status: 400 });
  const reasonCategory = typeof body?.reasonCategory === "string" ? body.reasonCategory as RefundReasonCategory : null;
  if (!reasonCategory || !REASONS.has(reasonCategory)) return NextResponse.json({ success: false, code: "INVALID_REFUND_REASON", message: "환불 사유를 확인해 주세요." }, { status: 400 });
  try {
    const workflow = await requestFullRefund({ order, reasonCategory, reasonText: typeof body?.reasonText === "string" ? body.reasonText.slice(0, 200) : null });
    return NextResponse.json({ success: true, status: workflow.status, message: getRefundCustomerMessage(workflow.status), refundId: workflow.id });
  } catch {
    return NextResponse.json({ success: false, code: "REFUND_OWNER_REVIEW_REQUIRED", status: "OWNER_REVIEW_REQUIRED", message: getRefundCustomerMessage("OWNER_REVIEW_REQUIRED") }, { status: 409 });
  }
}