import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getOrderForUser, getTossPaymentRecordForOrder } from "@/app/lib/purchases/server";
import { getRefundWorkflowForOrder, isScopedSandboxTestRefundOrder, requestFullRefund } from "@/app/lib/refunds/server";
import { getPaymentByOrderIdFromToss } from "@/app/lib/toss/server";
import { getTossConfigForAccount } from "@/app/lib/toss/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
const reply = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers });

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

/** No arbitrary orderId or accountId is ever accepted from the browser. */
async function inspect() {
  const user = await getCurrentUser();
  if (!user) return { ready: false as const, status: 401, message: "시험 계정 로그인이 필요합니다." };
  const orderId = process.env.TOSS_ONE_TIME_TEST_REFUND_ORDER_ID?.trim();
  if (!orderId || !/^[a-f0-9-]{36}$/i.test(orderId)) {
    return { ready: false as const, status: 404, message: "시험 취소 경로가 비활성 상태입니다." };
  }
  const order = await getOrderForUser(orderId, user.id);
  if (!order || !isScopedSandboxTestRefundOrder(order)) {
    return { ready: false as const, status: 404, message: "시험 취소 대상이 아닙니다." };
  }
  const existing = await getRefundWorkflowForOrder(order.id);
  if (existing) {
    return { ready: false as const, status: 409,
      message: existing.status === "REFUND_COMPLETED" ? "이미 시험 취소가 완료됐습니다." : "이미 취소 처리가 시작됐습니다. 재시도하지 마세요.",
      state: existing.status };
  }
  const payment = await getTossPaymentRecordForOrder(order.id);
  if (!payment?.paymentKey || payment.providerOrderId !== order.id ||
    payment.providerStatus !== "DONE" || payment.currency !== "KRW" ||
    payment.confirmedAmount !== 9900) {
    return { ready: false as const, status: 409, message: "내부 결제 원본 확인에 실패했습니다." };
  }
  const cfg = getTossConfigForAccount(user.id, "settlement");
  if (cfg.environment !== "sandbox" || cfg.isProduction) {
    return { ready: false as const, status: 409, message: "TEST 결제 환경이 아닙니다. 취소하지 않습니다." };
  }
  // Read-only Toss lookup; enforce exact provider order, amount, currency and zero prior cancels.
  const provider = await getPaymentByOrderIdFromToss(order.id, cfg);
  if (provider.orderId !== order.id || provider.paymentKey !== payment.paymentKey ||
    provider.status !== "DONE" || provider.totalAmount !== order.amount ||
    provider.currency !== "KRW" || (provider.cancels?.length ?? 0) !== 0 ||
    !["카드", "CARD"].includes(provider.method ?? "")) {
    return { ready: false as const, status: 409, message: "토스 승인·취소 내역이 기대 상태와 다릅니다. 취소하지 않습니다." };
  }
  return { ready: true as const, status: 200, order, message: "토스 TEST 카드 원결제와 금액 확인 완료" };
}

export async function GET() {
  try {
    const result = await inspect();
    return reply({
      ready: result.ready, amount: result.ready ? result.order.amount : null,
      message: result.message, state: "state" in result ? result.state : undefined,
    }, result.status);
  } catch {
    return reply({ ready: false, message: "원결제 조회에 실패했습니다. 취소는 실행하지 않았습니다." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "요청 출처 확인 실패" }, 403);
  const input = await request.json().catch(() => null) as { confirmed?: unknown; amount?: unknown } | null;
  if (!input || input.confirmed !== true || input.amount !== 9900)
    return reply({ error: "TEST 취소 금액과 명시적 동의를 확인해 주세요." }, 400);
  try {
    // Re-run the provider-side read-only preflight immediately before mutation.
    const check = await inspect();
    if (!check.ready) return reply({ error: check.message, state: "state" in check ? check.state : undefined }, check.status);
    const refunded = await requestFullRefund({
      order: check.order,
      reasonCategory: "OWNER_OVERRIDE",
      reasonText: "승인된 일회성 Toss TEST 거래 취소 E2E 검증",
      sandboxTestOverride: true,
    });
    return reply({
      status: refunded.status,
      message: refunded.status === "REFUND_COMPLETED"
        ? "TEST 카드 취소 및 구매 이용권 회수 처리가 완료됐습니다."
        : "취소 상태를 추가 확인해야 합니다. 다시 누르지 마세요.",
    });
  } catch {
    // The provider may have canceled while the DB update failed. Never suggest a retry.
    return reply({
      error: "환불의 최종 상태를 확정하지 못했습니다. 다시 취소하지 말고 담당자 확인을 요청하세요.",
    }, 409);
  }
}
