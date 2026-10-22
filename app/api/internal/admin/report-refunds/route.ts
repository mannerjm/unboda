import { NextRequest, NextResponse } from "next/server";
import { OperatorAuthorizationError, recordOperatorAuditEvent, requireOperator } from "@/app/lib/operators/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getOrderForUser, getTossPaymentRecordForOrder } from "@/app/lib/purchases/server";
import type { OrderRecord } from "@/app/lib/purchases/types";
import { assessFullRefundEligibility, type RefundReasonCategory } from "@/app/lib/refunds/policy";
import { getRefundWorkflowForOrder, requestFullRefund } from "@/app/lib/refunds/server";
import { getPaymentByOrderIdFromToss } from "@/app/lib/toss/server";
import { getTossConfigForAccount } from "@/app/lib/toss/config";
import { isFinancialMfaVerified } from "@/app/lib/operators/financialMfa";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASONS: readonly RefundReasonCategory[] = ["CHANGE_OF_MIND", "CONTENT_NOT_PROVIDED", "MATERIAL_DEFECT", "MATERIALLY_DIFFERENT"];
type Ticket = { id: string; user_id: string; order_id: string | null; category: string; status: string };
type Inspection = { ready: boolean; message: string; amount: number | null; order?: OrderRecord };
const reply = (data: Record<string, unknown>, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

function isApprover(authUserId: string): boolean {
  if (process.env.REPORT_REFUND_ADMIN_ENABLED !== "true") return false;
  const ids = (process.env.REPORT_REFUND_APPROVER_IDS ?? "")
    .split(",").map((x) => x.trim().toLowerCase()).filter((x) => UUID.test(x));
  return ids.includes(authUserId.toLowerCase());
}
function isReason(value: unknown): value is RefundReasonCategory {
  return typeof value === "string" && REASONS.includes(value as RefundReasonCategory);
}
function sameOrigin(request: NextRequest): boolean {
  try {
    const origin = request.headers.get("origin");
    return Boolean(origin && new URL(origin).origin === new URL(request.url).origin);
  } catch { return false; }
}

/** Read-only review. No provider cancellation or state mutation here. */
async function inspect(ticketId: string, reason: RefundReasonCategory, verifyProvider: boolean): Promise<Inspection> {
  const db = createAdminClient();
  const { data: ticket, error } = await db.from("support_requests")
    .select("id,user_id,order_id,category,status").eq("id", ticketId).maybeSingle<Ticket>();
  if (error || !ticket || ticket.category !== "PAYMENT_REFUND" || !ticket.order_id)
    return { ready: false, message: "주문이 연결된 환불 문의를 찾을 수 없습니다.", amount: null };
  const order = await getOrderForUser(ticket.order_id, ticket.user_id);
  if (!order || order.userId !== ticket.user_id || !order.analysisEditionKey)
    return { ready: false, message: "리포트 원주문과 구매자를 확인할 수 없습니다.", amount: null };
  const amount = order.amount;
  if (ticket.status !== "IN_REVIEW")
    return { ready: false, message: "먼저 문의 상태를 '확인 중'으로 저장하세요.", amount };
  const existing = await getRefundWorkflowForOrder(order.id);
  if (existing) return {
    ready: false, amount, message: "이미 환불 처리 기록이 있습니다: " + existing.status + ". 중복 카드 취소를 실행하지 마세요.",
  };
  if (order.status !== "paid" || !Number.isSafeInteger(amount) || amount <= 0)
    return { ready: false, amount, message: "결제 완료 주문과 정확한 금액을 확인하지 못했습니다." };
  const payment = await getTossPaymentRecordForOrder(order.id);
  if (!payment?.paymentKey || payment.providerOrderId !== order.id
    || payment.providerStatus !== "DONE" || payment.currency !== "KRW"
    || payment.confirmedAmount !== amount)
    return { ready: false, amount, message: "내부 원결제 기록이 일치하지 않습니다." };
  const policy = await assessFullRefundEligibility({
    userId: order.userId, profileId: order.profileId, productId: order.productId,
    analysisEditionKey: order.analysisEditionKey, reasonCategory: reason,
  });
  if (!policy.eligible)
    return { ready: false, amount, message: "자동 전액 환불 정책 대상이 아닙니다. 별도 검토가 필요합니다." };
  if (verifyProvider) {
    // Fail closed on provider ambiguity or any previous full/partial cancellation.
    try {
      const provider = await getPaymentByOrderIdFromToss(
        order.id, getTossConfigForAccount(order.userId, "settlement"),
      );
      if (provider.paymentKey !== payment.paymentKey || provider.orderId !== order.id
        || provider.totalAmount !== amount || provider.currency !== "KRW"
        || provider.status !== "DONE" || (provider.cancels?.length ?? 0) > 0
        || !["카드", "CARD"].includes(provider.method ?? ""))
        return { ready: false, amount, message: "토스 원결제가 미확정·취소됨·정보 불일치 상태입니다. 수동 대조가 필요합니다." };
    } catch {
      return { ready: false, amount, message: "토스 원결제 조회에 실패했습니다. 취소 실행을 보류하세요." };
    }
  }
  return { ready: true, amount, order, message: "원결제, 환불 이력, 정책 및 토스 카드 상태를 확인했습니다." };
}

export async function GET(request: NextRequest) {
  let operator;
  try { operator = await requireOperator(); }
  catch (error) { return reply({ error: "운영자 인증이 필요합니다." },
    error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED" ? 401 : 403); }
  if (!isApprover(operator.authUserId)) return reply({
    ready: false, enabled: false,
    message: "리포트 카드 환불이 비활성 상태이거나 승인 계정이 아닙니다.",
  });
  if (!(await isFinancialMfaVerified())) return reply({
    ready: false, enabled: false, mfaRequired: true, mfaHref: "/admin/mfa",
    message: "카드 환불 확인 전에 인증 앱으로 추가 인증(AAL2)을 완료해 주세요.",
  }, 403);
  const ticketId = request.nextUrl.searchParams.get("ticketId");
  const reason = request.nextUrl.searchParams.get("reason");
  if (!ticketId || !UUID.test(ticketId) || !isReason(reason))
    return reply({ error: "환불 문의와 사유를 확인하세요." }, 400);
  try {
    const check = await inspect(ticketId, reason, true);
    return reply({ ready: check.ready, enabled: true, amount: check.amount, message: check.message });
  } catch {
    return reply({ ready: false, enabled: true, message: "사전검사에 실패했습니다. 카드 취소는 실행되지 않았습니다." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "요청 출처를 확인할 수 없습니다." }, 403);
  let operator;
  try { operator = await requireOperator(); }
  catch (error) { return reply({ error: "운영자 인증이 필요합니다." },
    error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED" ? 401 : 403); }
  if (!isApprover(operator.authUserId))
    return reply({ error: "별도로 승인된 환불 담당자만 실행할 수 있습니다." }, 403);
  if (!(await isFinancialMfaVerified())) return reply({
    error: "관리자 인증 앱의 추가 인증(AAL2)이 필요합니다.", mfaRequired: true, mfaHref: "/admin/mfa",
  }, 403);
  const input = await request.json().catch(() => null) as {
    ticketId?: unknown; reason?: unknown; note?: unknown;
    confirmed?: unknown; amountConfirmation?: unknown;
  } | null;
  if (!input || typeof input.ticketId !== "string" || !UUID.test(input.ticketId)
    || !isReason(input.reason) || input.confirmed !== true
    || typeof input.note !== "string" || input.note.trim().length < 10 || input.note.length > 120
    || /\d{7,}/.test(input.note) || !Number.isSafeInteger(input.amountConfirmation))
    return reply({ error: "환불 사유·금액·명시적 승인을 확인하세요. 개인정보는 적지 마세요." }, 400);
  try {
    // Re-run all checks on POST. Never trust a previous GET or a browser-supplied amount.
    const check = await inspect(input.ticketId, input.reason, true);
    if (!check.ready || !check.order || check.amount !== input.amountConfirmation)
      return reply({ error: check.message, ready: false }, 409);
    // Audit is durable and must succeed before any money is affected.
    await recordOperatorAuditEvent({
      action: "SUPPORT_REQUEST_UPDATE", targetType: "SUPPORT_REQUEST",
      targetReference: input.ticketId, outcome: "SUCCESS",
      reason: "REPORT_FULL_CARD_REFUND_APPROVED:" + input.reason,
    });
    const result = await requestFullRefund({
      order: check.order, reasonCategory: input.reason,
      reasonText: "운영 승인 리포트 전액 환불: " + input.note.trim(),
    });
    return reply({ status: result.status, amount: result.requestedAmount,
      message: result.status === "REFUND_COMPLETED"
        ? "토스 카드 취소와 리포트 이용 권한 회수가 완료되었습니다."
        : "환불 진행 상태를 다시 확인해야 합니다. 추가 취소는 실행하지 마세요." });
  } catch {
    return reply({ error: "안전한 취소 결과를 확정하지 못했습니다. 토스 및 운보다 환불 상태를 대조하고 재실행하지 마세요." }, 409);
  }
}
