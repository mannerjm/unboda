import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { ensureAccountLifecycle } from "@/app/lib/accounts/server";
import { resolvePurchasableProduct } from "@/app/lib/purchases/products";
import {
  createPurchaseFromPaidOrder,
  getOrderForUser,
  grantEntitlement,
  markOrderPaid,
  recordTossConfirmationFailure,
  recordTossConfirmationStarted,
  recordTossProviderConfirmation,
} from "@/app/lib/purchases/server";
import { confirmPaymentWithToss, TossConfirmationError } from "@/app/lib/toss/server";
import { emitPaymentEvent } from "@/app/lib/payments/observability";
import {
  preparePaidReportGeneration,
  runPaidReportGeneration,
} from "@/app/lib/paidReports/generation";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const account = await ensureAccountLifecycle(user.id);
  if (account.status !== "ACTIVE") {
    return NextResponse.json({ error: "계정을 사용할 수 없습니다." }, { status: 403 });
  }

  const { orderId } = await context.params;

  let body: unknown;
  let orderProfileId: string | undefined;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "결제 확인 요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const requestBody = body as {
    paymentKey?: unknown;
    amount?: unknown;
  } | null;

  const paymentKey = typeof requestBody?.paymentKey === "string"
    ? requestBody.paymentKey.trim()
    : "";

  const rawAmount = requestBody?.amount;
  const normalizedAmount =
    typeof rawAmount === "number"
      ? rawAmount
      : typeof rawAmount === "string" && rawAmount.trim().length > 0
        ? Number(rawAmount)
        : NaN;

  if (!paymentKey || !Number.isFinite(normalizedAmount)) {
    return NextResponse.json(
      { error: "결제 식별값과 금액이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const order = await getOrderForUser(orderId, user.id);

    if (!order) {
      return NextResponse.json(
        { error: "주문을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    orderProfileId = order.profileId;

    if (order.status === "paid") {
      const purchase = await createPurchaseFromPaidOrder(order);
      const entitlement = await grantEntitlement({
        userId: order.userId,
        profileId: order.profileId,
        resourceId: order.productId,
        purchaseId: purchase.id,
        analysisEditionKey: purchase.analysisEditionKey!,
        source: "purchase",
      });
      const reportInput = {
        userId: order.userId,
        profileId: order.profileId,
        productId: order.productId,
        purchaseId: purchase.id,
        analysisEditionKey: purchase.analysisEditionKey!,
      };
      const reportClaim = await preparePaidReportGeneration(reportInput);
      if (reportClaim.state === "claimed") {
        after(() => runPaidReportGeneration(reportInput, reportClaim).catch((error) => {
          console.error("[orders/confirm-payment] automatic report generation replay failed", error);
        }));
      }
      return NextResponse.json(
        {
          order,
          status: "paid",
          alreadyProcessed: true,
          purchase,
          entitlement,
          reportStatus: reportClaim.state === "completed" ? "completed" : "preparing",
        },
        { status: 200 },
      );
    }

    if (order.paymentProvider !== "toss") {
      return NextResponse.json(
        { error: "Toss 결제 주문이 아닙니다." },
        { status: 409 },
      );
    }

    const resolved = resolvePurchasableProduct(order.productId);

    if (!resolved.ok) {
      return NextResponse.json(
        { error: "유효하지 않은 상품입니다." },
        { status: 400 },
      );
    }

    if (order.amount !== resolved.amount) {
      return NextResponse.json(
        { error: "서버 가격과 주문 금액이 일치하지 않습니다." },
        { status: 409 },
      );
    }

    if (Math.round(normalizedAmount) !== order.amount) {
      return NextResponse.json(
        { error: "결제 금액이 주문 금액과 일치하지 않습니다." },
        { status: 400 },
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

    if (provider.totalAmount !== order.amount) {
      emitPaymentEvent("amount_mismatch", {
        operationalClass: "OWNER_ESCALATION_REQUIRED",
        orderId: order.id,
        profileId: order.profileId,
        productId: order.productId,
        failureCategory: "provider_amount_mismatch",
      });
      return NextResponse.json(
        { error: "Toss 결제 금액이 서버 주문 금액과 일치하지 않습니다." },
        { status: 400 },
      );
    }

    if (provider.orderId !== order.id) {
      emitPaymentEvent("order_reference_mismatch", {
        operationalClass: "OWNER_ESCALATION_REQUIRED",
        orderId: order.id,
        profileId: order.profileId,
        productId: order.productId,
        providerReference: provider.orderId,
        failureCategory: "provider_order_reference_mismatch",
      });
      return NextResponse.json(
        { error: "Toss 주문 식별값이 내부 주문과 일치하지 않습니다." },
        { status: 400 },
      );
    }

    if (provider.status !== "DONE") {
      return NextResponse.json(
        { error: "결제가 아직 완료되지 않았습니다." },
        { status: 400 },
      );
    }

    await recordTossProviderConfirmation(order, provider);

    const paidOrder = await markOrderPaid(order, provider.paymentKey);
    const purchase = await createPurchaseFromPaidOrder(paidOrder);
    const entitlement = await grantEntitlement({
      userId: paidOrder.userId,
      profileId: paidOrder.profileId,
      resourceId: paidOrder.productId,
      purchaseId: purchase.id,
      analysisEditionKey: purchase.analysisEditionKey!,
      source: "purchase",
    });
    const reportInput = {
      userId: paidOrder.userId,
      profileId: paidOrder.profileId,
      productId: paidOrder.productId,
      purchaseId: purchase.id,
      analysisEditionKey: purchase.analysisEditionKey!,
    };
    const reportClaim = await preparePaidReportGeneration(reportInput);
    if (reportClaim.state === "claimed") {
      after(() => runPaidReportGeneration(reportInput, reportClaim).catch((error) => {
        console.error("[orders/confirm-payment] automatic report generation failed", error);
      }));
    }
    emitPaymentEvent("payment_confirmed", {
      operationalClass: "CONVERGED",
      orderId: paidOrder.id,
      profileId: paidOrder.profileId,
      productId: paidOrder.productId,
      providerReference: provider.paymentKey,
    });
    emitPaymentEvent("entitlement_created", {
      operationalClass: "CONVERGED",
      orderId: paidOrder.id,
      profileId: paidOrder.profileId,
      productId: paidOrder.productId,
    });

    return NextResponse.json(
      {
        order: paidOrder,
        purchase,
        entitlement,
        reportStatus: reportClaim.state === "completed" ? "completed" : "preparing",
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
      await recordTossConfirmationFailure(orderId, error.failure);
      const operationalClass = error.failure.retryability === "OWNER_ESCALATION_REQUIRED"
        ? "OWNER_ESCALATION_REQUIRED"
        : error.failure.retryability === "RETRYABLE"
          ? "RETRY_PENDING"
          : "NORMAL";
      emitPaymentEvent("payment_confirmation_failed", {
        operationalClass,
        orderId,
        profileReference: orderProfileId,
        failureCategory: "provider_confirmation_failure",
        provider: "toss",
        httpStatus: error.failure.httpStatus,
        providerErrorCode: error.failure.providerErrorCode,
        retryability: error.failure.retryability,
        failureStage: "confirmation",
        runId: error.failure.correlationId,
      });

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

    console.error("[orders/confirm-payment] internal confirmation failed");

    return NextResponse.json(
      { error: "결제 확인 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}