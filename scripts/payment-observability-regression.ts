import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const source = read("app/lib/payments/observability.ts");
for (const event of [
  "checkout_started", "order_created", "payment_attempted", "payment_confirmed",
  "payment_confirmation_failed", "amount_mismatch", "order_reference_mismatch",
  "reconciliation_scheduled", "reconciliation_retry", "reconciliation_converged",
  "reconciliation_exhausted", "entitlement_created", "report_access_granted",
]) {
  assert(source.includes(`"${event}"`), `event model must define ${event}`);
}
for (const operationalClass of ["NORMAL", "RECOVERING", "RETRY_PENDING", "CONVERGED", "OWNER_ESCALATION_REQUIRED"]) {
  assert(source.includes(`"${operationalClass}"`), `event model must define ${operationalClass}`);
}
assert(source.includes('createHash("sha256")'), "provider references must be redacted");
assert(!source.includes("secretKey") && !source.includes("authorization"), "event model must not log secrets or auth headers");

// STEP 57D-46 PHASE 3E-3: reconciliation batch logic was extracted from the route
// into a reusable server-side function so the shared cron dispatcher can call it directly.
const purchasesServer = read("app/lib/purchases/server.ts");
assert(purchasesServer.includes("runId") && purchasesServer.includes("durationMs"), "reconciliation result must remain correlated and timed");
assert(purchasesServer.includes("reconciliation_retry"), "reconciliation retry event must be emitted");

const checkout = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
assert(checkout.includes("NEXT_PUBLIC_TOSS_CLIENT_KEY"), "checkout must use the public Toss client key only");
assert(checkout.includes("order.amount"), "checkout amount must come from the server-created order");
assert(checkout.includes("successUrl") && checkout.includes("failUrl"), "checkout must define Toss callbacks");
assert(checkout.includes('currency: "KRW"') && checkout.includes("value: order.amount"), "checkout must use current Toss amount shape");
assert(!checkout.includes("mock-confirm"), "real checkout must not call mock-confirm");

const success = read("app/checkout/success/page.tsx");
assert(success.includes("confirm-payment"), "success callback must call server confirmation");
assert(!success.includes("mock-confirm"), "success callback must not use mock confirmation");

console.log("payment observability regression passed");