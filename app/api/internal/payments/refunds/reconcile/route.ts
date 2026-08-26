import { NextResponse } from "next/server";
import { emitPaymentEvent } from "@/app/lib/payments/observability";
import { listRefundWorkflowsForReconciliation, reconcileRefundWorkflow } from "@/app/lib/refunds/server";

export const dynamic = "force-dynamic";

async function reconcile(request: Request) {
  const expected = process.env.PAYMENT_RECONCILIATION_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const workflows = await listRefundWorkflowsForReconciliation();
  const results = [];
  for (const workflow of workflows) results.push(await reconcileRefundWorkflow(workflow));
  const converged = results.filter((result) => result.status === "REFUND_COMPLETED").length;
  const retryPending = results.filter((result) => result.status === "REFUND_FAILED_RETRYING").length;
  const escalation = results.filter((result) => result.status === "OWNER_REVIEW_REQUIRED").length;
  emitPaymentEvent("refund_reconciliation_converged", { operationalClass: "NORMAL", attempt: converged });
  return NextResponse.json({
    processed: results.length,
    scanned: results.length,
    eligible: results.length,
    claimed: results.length,
    converged,
    retryPending,
    escalation,
    results: results.map((result) => ({ id: result.id, status: result.status })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) { return reconcile(request); }
export async function POST(request: Request) { return reconcile(request); }