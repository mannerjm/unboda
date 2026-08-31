import { readFileSync } from "fs";
import { join } from "path";
import { getTossConfig } from "../app/lib/toss/config";
import {
  confirmPaymentWithToss,
  getPaymentByOrderIdFromToss,
} from "../app/lib/toss/server";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "test";
env.TOSS_SECRET_KEY = "test_sk_reconciliation";
env.NEXT_PUBLIC_TOSS_CLIENT_KEY = "test_ck_reconciliation";

const config = getTossConfig();
assert(config.environment === "sandbox", "reconciliation must use sandbox config");
env.TOSS_SECRET_KEY = "";
let missingSecretFailed = false;
try {
  getTossConfig();
} catch {
  missingSecretFailed = true;
}
assert(missingSecretFailed, "missing Toss secret must fail closed");
env.TOSS_SECRET_KEY = "live_sk_forbidden";

let liveKeyFailed = false;
try {
  getTossConfig();
} catch {
  liveKeyFailed = true;
}
assert(liveKeyFailed, "live Toss key must fail closed");
env.TOSS_SECRET_KEY = "test_sk_reconciliation";

const originalFetch = globalThis.fetch;
let lastRequest: Request | null = null;

async function main(): Promise<void> {
  globalThis.fetch = async (input, init) => {
    lastRequest = new Request(input, init);
    return Response.json({
    paymentKey: "pay_test_1",
    orderId: "order-test-1",
    totalAmount: 16900,
    status: "DONE",
    currency: "KRW",
    method: "카드",
    mId: "tosspayments",
    approvedAt: "2026-08-26T00:00:00.000Z",
    });
  };

const confirmed = await confirmPaymentWithToss({
  paymentKey: "pay_test_1",
  orderId: "order-test-1",
  amount: 16900,
});
assert(confirmed.status === "DONE", "mock Toss confirmation must return DONE");
assert(lastRequest?.url.endsWith("/v1/payments/confirm") === true, "confirm endpoint must be official Toss endpoint");
assert(lastRequest?.headers.get("authorization")?.startsWith("Basic ") === true, "Toss request must use Basic auth");
assert(JSON.stringify(await lastRequest!.clone().json()) === JSON.stringify({
  paymentKey: "pay_test_1",
  orderId: "order-test-1",
  amount: 16900,
}), "confirm request must send only required fields");

const lookup = await getPaymentByOrderIdFromToss("order-test-1");
assert(lookup.orderId === "order-test-1", "provider lookup must return order reference");
assert(lookup.totalAmount === 16900, "provider lookup must return confirmed amount");
  globalThis.fetch = originalFetch;

const migration = read("supabase/migrations/016_toss_payment_reconciliation.sql");
for (const field of [
  "payment_key",
  "provider_order_id",
  "expected_amount",
  "confirmed_amount",
  "currency",
  "provider_status",
  "confirmation_started_at",
  "confirmed_at",
  "reconciliation_status",
  "last_reconciliation_result",
]) {
  assert(migration.includes(field), `migration must persist ${field}`);
}

const server = read("app/lib/purchases/server.ts");
assert(server.includes("reconcileTossPayment"), "server must expose automatic reconciliation");
assert(server.includes("reconciliation_required"), "partial persistence must remain retryable");
assert(server.includes("terminal_mismatch"), "provider mismatch must be terminal");
assert(server.includes("createPurchaseFromPaidOrder(order)"), "already-paid reconciliation must replay purchase idempotently");

const reconcileRoute = read("app/api/internal/payments/reconcile/route.ts");
assert(reconcileRoute.includes("PAYMENT_RECONCILIATION_SECRET"), "reconciliation trigger must be server-authenticated");
// STEP 57D-46 PHASE 3E-3: the batch scan now lives in reconcilePaymentsBatch, called by both
// the standalone route and the shared cron dispatcher.
assert(reconcileRoute.includes("reconcilePaymentsBatch"), "reconciliation trigger must delegate to the reusable batch worker");
assert(server.includes("listTossPaymentsForReconciliation"), "reconciliation batch worker must find unresolved records");

const confirmRoute = read("app/api/orders/[orderId]/confirm-payment/route.ts");
assert(confirmRoute.includes("recordTossConfirmationStarted"), "confirmation must persist started state");
assert(confirmRoute.includes("recordTossProviderConfirmation"), "confirmation must persist provider evidence");
assert(confirmRoute.includes("provider.totalAmount !== order.amount"), "amount mismatch must fail closed");
assert(confirmRoute.includes("provider.orderId !== order.id"), "order reference mismatch must fail closed");

const mockRoute = read("app/api/orders/[orderId]/mock-confirm/route.ts");
assert(mockRoute.includes("status: 403"), "mock-confirm must remain unavailable in production");
assert(!server.includes("console.log"), "payment server must not log raw provider payloads");

  console.log("toss payment reconciliation regression passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
