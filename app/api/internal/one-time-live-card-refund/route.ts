import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getOrderForUser, getTossPaymentRecordForOrder } from "@/app/lib/purchases/server";
import { getRefundWorkflowForOrder, isScopedOneTimeLivePilotRefund, requestFullRefund } from "@/app/lib/refunds/server";
import { getPaymentByOrderIdFromToss } from "@/app/lib/toss/server";
import { getTossConfigForAccount } from "@/app/lib/toss/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" };
const reply = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers });

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

/** Authenticated owner's one exact order. No caller-supplied IDs, amounts or user identifiers. */
async function inspectLiveCard() {
  const user = await getCurrentUser();
  if (!user) return { ready: false as const, status: 401, message: "LIVE 실결제 계정 로그인이 필요합니다." };
  const id = process.env.TOSS_ONE_TIME_LIVE_REFUND_ORDER_ID?.trim();
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
    return { ready: false as const, status: 404, message: "일회성 취소 기능이 비활성 상태입니다." };
  }
  const order = await getOrderForUser(id, user.id);
  if (!order || !isScopedOneTimeLivePilotRefund(order)) {
    return { ready: false as const, status: 404, message: "승인된 LIVE 취소 대상이 아닙니다." };
  }
  const existing = await getRefundWorkflowForOrder(order.id);
  if (existing) return {
    ready: false as const, status: 409,
    state: existing.status,
    message: existing.status === "REFUND_COMPLETED"
      ? "이미 실제 카드 취소가 완료됐습니다."
      : "환불 처리 기록이 존재합니다. 재시도하지 말고 상태를 확인해 주세요.",
  };
  const payment = await getTossPaymentRecordForOrder(order.id);
  if (!payment?.paymentKey || payment.providerOrderId !== order.id ||
    payment.providerStatus !== "DONE" || payment.currency !== "KRW" ||
    payment.confirmedAmount !== 9900) {
    return { ready: false as const, status: 409, message: "LIVE 원결제 금액·상태 대조에 실패했습니다." };
  }
  const config = getTossConfigForAccount(user.id, "checkout");
  if (config.environment !== "production" || !config.isProduction) {
    return { ready: false as const, status: 409, message: "LIVE 결제 키가 아닙니다. 취소하지 않습니다." };
  }
  // Provider read-only lookup. No cancellation occurs during GET.
  const provider = await getPaymentByOrderIdFromToss(order.id, config);
  if (provider.paymentKey !== payment.paymentKey || provider.orderId !== order.id ||
    provider.totalAmount !== order.amount || provider.currency !== "KRW" ||
    provider.status !== "DONE" || (provider.cancels?.length ?? 0) !== 0 ||
    provider.balanceAmount !== order.amount ||
    !["카드", "CARD"].includes(provider.method ?? "") || !provider.mId) {
    return { ready: false as const, status: 409, message: "토스 LIVE 카드 원결제의 승인·잔액·취소 이력이 일치하지 않습니다." };
  }
  return { ready: true as const, status: 200, order, message: "토스 LIVE 카드 원결제 9,900원 확인 완료 · 취소 가능" };
}

export async function GET() {
  try {
    const result = await inspectLiveCard();
    return reply({
      ready: result.ready,
      amount: result.ready ? result.order.amount : null,
      message: result.message,
      state: "state" in result ? result.state : undefined,
    }, result.status);
  } catch {
    return reply({ ready: false, message: "토스 LIVE 원결제 조회에 실패했습니다. 카드 취소는 실행되지 않았습니다." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "요청 출처 확인 실패" }, 403);
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json"))
    return reply({ error: "요청 형식 확인 실패" }, 415);
  const input = await request.json().catch(() => null) as {
    confirmed?: unknown; amount?: unknown; livePaymentAcknowledged?: unknown;
  } | null;
  if (!input || input.confirmed !== true || input.amount !== 9900 ||
    input.livePaymentAcknowledged !== true)
    return reply({ error: "실제 카드 취소 금액 및 명시적 동의를 확인해 주세요." }, 400);
  try {
    // Complete all preflight checks again immediately before the only financial mutation.
    const check = await inspectLiveCard();
    if (!check.ready)
      return reply({ error: check.message, state: "state" in check ? check.state : undefined }, check.status);
    const refunded = await requestFullRefund({
      order: check.order,
      reasonCategory: "OWNER_OVERRIDE",
      reasonText: "계정 소유자가 승인한 일회성 LIVE 카드 결제·취소 E2E 시험",
      oneTimeLivePilotRefundOverride: true,
    });
    return reply({
      status: refunded.status,
      message: refunded.status === "REFUND_COMPLETED"
        ? "LIVE 카드 9,900원 취소 및 구매 이용권 회수가 완료됐습니다."
        : "카드 취소 상태를 추가 확인해야 합니다. 다시 누르지 마세요.",
    });
  } catch {
    // Provider cancellation might already have succeeded even if app persistence fails.
    return reply({
      error: "LIVE 취소 상태를 확정하지 못했습니다. 다시 실행하지 말고 결제·환불 내역을 확인해 주세요.",
    }, 409);
  }
}
