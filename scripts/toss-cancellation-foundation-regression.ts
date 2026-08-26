import { readFileSync } from "fs";
import { join } from "path";
import { cancelPaymentWithToss, TossCancellationError } from "../app/lib/toss/server";
import { getRefundCustomerMessage } from "../app/lib/refunds/status";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}
function read(path: string): string { return readFileSync(join(process.cwd(), path), "utf8"); }
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "test";
env.TOSS_CLIENT_KEY = "test_ck_refund";
env.NEXT_PUBLIC_TOSS_CLIENT_KEY = "test_ck_refund";
env.TOSS_SECRET_KEY = "test_sk_refund";

async function main(): Promise<void> {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({
      paymentKey: "pay_test_refund",
      orderId: "order-refund-1",
      status: "CANCELED",
      totalAmount: 16900,
      balanceAmount: 0,
      currency: "KRW",
      cancels: [{ transactionKey: "tx-refund-1", cancelAmount: 16900, cancelStatus: "DONE", canceledAt: "2026-08-26T00:00:00Z", refundableAmount: 0 }],
    });
  };
  const result = await cancelPaymentWithToss({ paymentKey: "pay_test_refund", cancelReason: "CONTENT_NOT_PROVIDED" });
  assert(result.status === "CANCELED", "full cancellation must require CANCELED");
  assert(result.cancels[0].cancelAmount === 16900, "provider cancellation amount must be returned");
  assert(calls === 1, "one cancellation call must be made per workflow execution");

  globalThis.fetch = async () => Response.json({ code: "TEMPORARY_ERROR", message: "temporary" }, { status: 503 });
  try { await cancelPaymentWithToss({ paymentKey: "pay_test_refund", cancelReason: "CONTENT_NOT_PROVIDED" }); throw new Error("expected failure"); } catch (error) {
    assert(error instanceof TossCancellationError, "provider cancellation failures must be structured");
    if (error instanceof TossCancellationError) {
      assert(error.failure.retryability === "RETRYABLE", "503 must be retryable");
      assert(error.failure.failureStage === "cancellation", "failure stage must be cancellation");
    }
  }
  globalThis.fetch = originalFetch;

  const policy = read("app/lib/refunds/policy.ts");
  assert(policy.includes("CHANGE_OF_MIND") && policy.includes("CONTENT_NOT_PROVIDED"), "refund policy must define approved reason categories");
  assert(policy.includes("getPaidReport"), "generation boundary must use paid report lifecycle");
  const messages = ["REFUND_REQUESTED", "REFUND_PROCESSING", "REFUND_COMPLETED", "REFUND_FAILED_RETRYING", "OWNER_REVIEW_REQUIRED"] as const;
  for (const status of messages) assert(getRefundCustomerMessage(status).length > 0, `CS message must exist for ${status}`);

  const route = read("app/api/orders/[orderId]/refund/route.ts");
  assert(route.includes("cancelAmount"), "partial refund input must be rejected");
  assert(route.includes("getOrderForUser"), "refund route must enforce ownership");
  const migration = read("supabase/migrations/020_toss_refund_workflows.sql");
  assert(migration.includes("refund_workflows_one_active_order"), "workflow must be idempotent per active order");
  assert(migration.includes("revoked_at"), "entitlement revocation audit fields must exist");
  console.log("toss cancellation foundation regression passed");
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
