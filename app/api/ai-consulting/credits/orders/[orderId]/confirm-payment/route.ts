import { NextResponse } from "next/server";
import { ensureAccountLifecycle } from "@/app/lib/accounts/server";
import {
  AI_CONSULTING_CREDIT_PAYMENT_PROVIDER,
  finalizeAiConsultingCreditPurchase,
} from "@/app/lib/aiConsulting/creditCheckout";
import { getAiConsultingCreditBundle } from "@/app/lib/aiConsulting/commercialPolicy";
import { emitPaymentEvent } from "@/app/lib/payments/observability";
import {
  getOrderForUser,
  markOrderPaid,
  markTossPaymentReconciliationResult,
  recordTossConfirmationFailure,
  recordTossConfirmationStarted,
  recordTossProviderConfirmation,
} from "@/app/lib/purchases/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getTossConfig } from "@/app/lib/toss/config";
import { confirmPaymentWithToss, TossConfirmationError } from "@/app/lib/toss/server";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const account = await ensureAccountLifecycle(user.id);
  if (account.status !== "ACTIVE") {
    return NextResponse.json({ error: "계정을 사용할 수 없습니다." }, { status: 403 });
  }

  const { orderId } = await context.params;
  const body = await request.json().catch(() => null) as {
    paymentKey?: unknown;
    amount?: unknown;
  } | null;
  const paymentKey = typeof body?.paymentKey === "string" ? body.paymentKey.trim() : "";
  const rawAmount = body?.amount;
  const normalizedAmount = typeof rawAmount === "number"
    ? rawAmount
    : typeof rawAmount === "string" && rawAmount.trim().length > 0
      ? Number(rawAmount)
      : NaN;

  try {
    const order = await getOrderForUser(orderId, user.id);
    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }
    if (order.paymentProvider !== AI_CONSULTING_CREDIT_PAYMENT_PROVIDER) {
      return NextResponse.json({ error: "AI 질문권 결제 주문이 아닙니다." }, { status: 409 });
    }

    const bundle = getAiConsultingCreditBundle(order.productId);
    if (!bundle || order.amount !== bundle.priceKrw) {
      return NextResponse.json({ error: "AI 질문권 주문 정보가 올바르지 않습니다." }, { status: 409 });
    }

    if (order.status === "paid") {
      const result = await finalizeAiConsultingCreditPurchase(order);
      await markTossPaymentReconciliationResult(
        order.id,
        "paid",
        "AI consulting credit paid-order replay converged",
      ).catch(() => undefined);
      return NextResponse.json({ ...result, alreadyProcessed: true }, { status: 200 });
    }

    if (!paymentKey || !Number.isFinite(normalizedAmount)) {
      return NextResponse.json({ error: "결제 식별값과 금액이 필요합니다." }, { status: 400 });
    }
    if (Math.round(normalizedAmount) !== order.amount) {
      return NextResponse.json({ error: "결제 금액이 주문 금액과 일치하지 않습니다." }, { status: 400 });
    }

    try {
      getTossConfig();
    } catch {
      return NextResponse.json(
        { error: "결제 확인 기능이 아직 준비되지 않았습니다.", code: "PAYMENT_PROVIDER_NOT_READY" },
        { status: 503 },
      );
    }

    await recordTossConfirmationStarted(order);
    emitPaymentEvent("payment_attempted", {
      operationalClass: "RECOVERING",
      orderId: order.id,
      profileId: order.profileId,
      productId: order.productId,
    });

    const provider = await confirmPaymentWithToss({
      paymentKey,
      orderId: order.id,
      amount: order.amount,
    });

    if (
      provider.orderId !== order.id ||
      provider.totalAmount !== order.amount ||
      provider.currency !== "KRW"
    ) {
      await markTossPaymentReconciliationResult(
        order.id,
        "terminal_mismatch",
        "AI consulting credit provider boundary mismatch",
      ).catch(() => undefined);
      emitPaymentEvent("amount_mismatch", {
        operationalClass: "OWNER_ESCALATION_REQUIRED",
        orderId: order.id,
        profileId: order.profileId,
        productId: order.productId,
        failureCategory: "ai_credit_provider_boundary_mismatch",
      });
      return NextResponse.json({ error: "결제 정보가 서버 주문과 일치하지 않습니다." }, { status: 400 });
    }

    if (provider.status !== "DONE") {
      return NextResponse.json({ error: "결제가 아직 완료되지 않았습니다." }, { status: 400 });
    }

    await recordTossProviderConfirmation(order, provider, "externally_confirmed");
    const paidOrder = await markOrderPaid(order, provider.paymentKey);

    let result;
    try {
      result = await finalizeAiConsultingCreditPurchase(paidOrder);
    } catch (error) {
      await markTossPaymentReconciliationResult(
        paidOrder.id,
        "reconciliation_required",
        "AI consulting credit payment confirmed; ledger persistence must be retried",
      ).catch(() => undefined);
      throw error;
    }

    await markTossPaymentReconciliationResult(
      paidOrder.id,
      "paid",
      "AI consulting credit payment and ledger credit converged",
    ).catch(() => undefined);

    emitPaymentEvent("payment_confirmed", {
      operationalClass: "CONVERGED",
      orderId: paidOrder.id,
      profileId: paidOrder.profileId,
      productId: paidOrder.productId,
      providerReference: provider.paymentKey,
    });

    return NextResponse.json(
      {
        ...result,
        payment: {
          provider: "toss",
          status: provider.status,
          paymentKey: provider.paymentKey,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof TossConfirmationError) {
      await recordTossConfirmationFailure(orderId, error.failure).catch(() => undefined);
      return NextResponse.json(
        {
          success: false,
          code: error.failure.providerErrorCode,
          message: error.failure.safeMessage,
          retryable: error.failure.retryability === "RETRYABLE",
        },
        { status: error.failure.httpStatus >= 500 ? 502 : 400 },
      );
    }

    console.error("[ai-consulting-credit-confirm] failed", error);
    return NextResponse.json(
      { error: "AI 질문권 결제를 최종 처리하지 못했습니다. 결제 상태를 자동으로 다시 확인합니다." },
      { status: 500 },
    );
  }
}
