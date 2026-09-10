import { NextResponse } from "next/server";
import { isAuthorizedSchedulerRequest } from "@/app/lib/internal/schedulerAuth";
import { reconcilePaymentsBatch } from "@/app/lib/purchases/server";
import { reconcileRefundsBatch } from "@/app/lib/refunds/server";
import { reconcileAccountClosureFinalizations } from "@/app/lib/accounts/server";
import { cleanupExpiredGuestFreeAnalyses } from "@/app/lib/guestFreeAnalyses/server";
import { sendOwnerReviewAlertIfNeeded } from "@/app/lib/operators/ownerAlerts";

export const dynamic = "force-dynamic";

type WorkerReport<T> = { ok: true } & T | { ok: false };

/**
 * STEP 57D-46 PHASE 3E-3: Single Vercel Cron entry point.
 *
 * One shared scheduler transport credential authenticates this request, then
 * reconciliation workers are invoked as direct server-side function calls.
 * Each worker is isolated from the others. Owner alert delivery is best-effort:
 * an email transport failure is reported but never rolls back or marks otherwise
 * successful payment/refund/account/guest recovery work as failed.
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

  let refunds: WorkerReport<{
    processed: number;
    scanned: number;
    eligible: number;
    claimed: number;
    converged: number;
    retryPending: number;
    escalation: number;
  }>;
  try {
    const summary = await reconcileRefundsBatch();
    refunds = {
      ok: true,
      processed: summary.processed,
      scanned: summary.scanned,
      eligible: summary.eligible,
      claimed: summary.claimed,
      converged: summary.converged,
      retryPending: summary.retryPending,
      escalation: summary.escalation,
    };
  } catch {
    refunds = { ok: false };
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

  let guestCleanup: WorkerReport<{
    claimed: number;
    deleted: number;
    failed: number;
  }>;
  try {
    const summary = await cleanupExpiredGuestFreeAnalyses();
    guestCleanup = {
      ok: true,
      claimed: summary.claimed,
      deleted: summary.deleted,
      failed: summary.failed,
    };
  } catch {
    guestCleanup = { ok: false };
  }

  let operatorAlerts: WorkerReport<{
    status: string;
    incidentCount: number;
    recipientCount?: number;
    errorCode?: string;
  }>;
  const operatorAlertConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  try {
    const summary = await sendOwnerReviewAlertIfNeeded();
    operatorAlerts = { ok: true, ...summary };
    console.info("[owner-alert]", {
      configured: operatorAlertConfigured,
      status: summary.status,
      incidentCount: summary.incidentCount,
      recipientCount: "recipientCount" in summary ? summary.recipientCount : undefined,
      errorCode: "errorCode" in summary ? summary.errorCode : undefined,
    });
  } catch {
    operatorAlerts = { ok: false };
    console.error("[owner-alert]", { configured: operatorAlertConfigured, status: "worker_failed" });
  }

  const ok = payments.ok && refunds.ok && accountClosures.ok && guestCleanup.ok;

  return NextResponse.json(
    { ok, payments, refunds, accountClosures, guestCleanup, operatorAlerts },
    { status: ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  return dispatch(request);
}

export async function POST(request: Request) {
  return dispatch(request);
}
