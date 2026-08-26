import { NextResponse } from "next/server";
import {
  listTossPaymentsForReconciliation,
  reconcileTossPayment,
} from "@/app/lib/purchases/server";
import { emitPaymentEvent } from "@/app/lib/payments/observability";

export const dynamic = "force-dynamic";

async function reconcile(request: Request) {
  const expectedSecret = process.env.PAYMENT_RECONCILIATION_SECRET;
  const suppliedSecret = request.headers.get("x-reconciliation-secret");
  const cronSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expectedSecret || (suppliedSecret !== expectedSecret && cronSecret !== expectedSecret)) {
    return NextResponse.json(
      { error: "인증되지 않은 요청입니다." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const startedAt = Date.now();
    const records = await listTossPaymentsForReconciliation();
    emitPaymentEvent("reconciliation_scheduled", {
      operationalClass: "RECOVERING",
    });
    let recovered = 0;
    let failed = 0;
    let retryPending = 0;
    let escalation = 0;

    for (const record of records) {
      try {
        await reconcileTossPayment(record);
        recovered += 1;
        emitPaymentEvent("reconciliation_converged", {
          operationalClass: "CONVERGED",
          orderId: record.orderId,
          profileId: undefined,
          productId: undefined,
          providerReference: record.paymentKey ?? undefined,
        });
      } catch {
        failed += 1;
        retryPending += 1;
        emitPaymentEvent("reconciliation_retry", {
          operationalClass: "RETRY_PENDING",
          orderId: record.orderId,
          attempt: record.retryCount + 1,
          nextRetryAt: record.nextRetryAt,
        });
      }
    }

    return NextResponse.json({
      runId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      attempted: records.length,
      scanned: records.length,
      eligible: records.length,
      converged: recovered,
      retryPending,
      failed,
      escalation,
      durationMs: Date.now() - startedAt,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "결제 reconciliation을 실행하지 못했습니다." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: Request) {
  return reconcile(request);
}

export async function POST(request: Request) {
  return reconcile(request);
}