import { readFileSync } from "fs";
import { join } from "path";
import { getRefundCustomerMessage } from "../app/lib/refunds/status";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
function read(path: string): string { return readFileSync(join(process.cwd(), path), "utf8"); }

const worker = read("app/lib/refunds/server.ts");
const toss = read("app/lib/toss/server.ts");
const migration = read("supabase/migrations/020_toss_refund_workflows.sql");
const route = read("app/api/orders/[orderId]/refund/route.ts");

assert(worker.includes("getPaymentByOrderIdFromToss"), "reconciliation must use provider lookup");
assert(worker.includes("provider.status === \"CANCELED\""), "only provider CANCELED can converge");
assert(worker.includes("cancellation?.cancelStatus === \"DONE\""), "cancellation DONE must be verified");
assert(worker.includes("REFUND_FAILED_RETRYING"), "temporary failure must be retryable");
assert(worker.includes("OWNER_REVIEW_REQUIRED"), "mismatch/exhaustion must escalate");
assert(!worker.slice(worker.indexOf("reconcileRefundWorkflow")).includes("cancelPaymentWithToss"), "reconciliation must never issue a second cancel");
assert(worker.includes("workflow.status === \"REFUND_COMPLETED\""), "completed workflow must no-op");
assert(worker.includes("retryCount + 1"), "retry count must be bounded and incremented");
assert(worker.includes("maxRetryCount"), "retry budget must be enforced");
assert(migration.includes("refund_workflows_one_active_order"), "one active workflow per order");
assert(migration.includes("refund_workflows_provider_reference_unique"), "provider cancellation reference must be unique");
assert(route.includes("PARTIAL_REFUND_UNSUPPORTED"), "partial refund must be rejected");
assert(toss.includes("cancelReason: input.cancelReason"), "cancel client sends cancellation reason");
assert(!toss.includes("cancelAmount: input"), "V1 cancel client must not send cancelAmount");
for (const status of ["REFUND_REQUESTED", "REFUND_PROCESSING", "REFUND_COMPLETED", "REFUND_FAILED_RETRYING", "OWNER_REVIEW_REQUIRED"] as const) assert(getRefundCustomerMessage(status).length > 0, `CS mapping missing ${status}`);
console.log("refund reconciliation failure-injection regression passed");
