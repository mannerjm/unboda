import { NextResponse } from "next/server";
import { isAuthorizedSchedulerRequest } from "@/app/lib/internal/schedulerAuth";
import { reconcilePaymentsBatch } from "@/app/lib/purchases/server";
import { reconcileAccountClosureFinalizations } from "@/app/lib/accounts/server";

export const dynamic = "force-dynamic";

type WorkerReport<T> = { ok: true } & T | { ok: false };

/**
 * STEP 57D-46 PHASE 3E-3: Single Vercel Cron entry point.
 *
 * One shared scheduler transport credential authenticates this request, then
 * both reconciliation workers are invoked as direct server-side function calls
 * (no internal HTTP hop, no client-selected job name). Each worker's failure is
 * isolated from the other — neither runs inside a shared DB transaction, and a
 * failure in one never blocks or hides the result of the other.
 */
async function dispatch(request: Request) {
  if (!isAuthorizedSchedulerRequest(request)) {
    return NextResponse.json(
      { error: "인증되지 않은 요청입니다." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payments: WorkerReport<{
    processed: number;
    scanned: number;
    eligible: number;
    converged: number;
    retryPending: number;
    failed: number;
    escalation: number;
  }>;
  try {
    const summary = await reconcilePaymentsBatch();
    payments = {
      ok: true,
      processed: summary.attempted,
      scanned: summary.scanned,
      eligible: summary.eligible,
      converged: summary.converged,
      retryPending: summary.retryPending,
      failed: summary.failed,
      escalation: summary.escalation,
    };
  } catch {
    payments = { ok: false };
  }

  let accountClosures: WorkerReport<{
    claimed: number;
    finalized: number;
    alreadyClosed: number;
    retryScheduled: number;
    waitingFinancial: number;
    ownerReview: number;
    claimLost: number;
    failed: number;
  }>;
  try {
    const result = await reconcileAccountClosureFinalizations({
      batchLimit: 10,
      leaseSeconds: 300,
    });
    accountClosures = {
      ok: true,
      claimed: result.claimed,
      finalized: result.finalized,
      alreadyClosed: result.alreadyClosed,
      retryScheduled: result.retryScheduled,
      waitingFinancial: result.waitingFinancial,
      ownerReview: result.ownerReview,
      claimLost: result.claimLost,
      failed: result.failed,
    };
  } catch {
    accountClosures = { ok: false };
  }

  const ok = payments.ok && accountClosures.ok;

  return NextResponse.json(
    { ok, payments, accountClosures },
    { status: ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  return dispatch(request);
}

export async function POST(request: Request) {
  return dispatch(request);
}
