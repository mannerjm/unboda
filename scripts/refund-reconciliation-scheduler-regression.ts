import { readFileSync } from "fs";
import { join } from "path";
function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
function read(path: string): string { return readFileSync(join(process.cwd(), path), "utf8"); }
const route = read("app/api/internal/payments/refunds/reconcile/route.ts");
const worker = read("app/lib/refunds/server.ts");
assert(route.includes("authorization") && route.includes("PAYMENT_RECONCILIATION_SECRET"), "scheduler must require server auth");
assert(route.includes("status: 401"), "scheduler must reject unauthorized requests");
assert(route.includes("Cache-Control") && route.includes("no-store"), "scheduler must disable caching");
assert(route.includes("export async function GET") && route.includes("export async function POST"), "GET and POST must share implementation");
assert(worker.includes("requested_limit: 50"), "refund worker batch must be bounded to 50");
assert(worker.includes("next_retry_at"), "refund worker must select due work");
assert(route.includes("reconcileRefundsBatch") && worker.includes("refund_reconciliation_converged"), "scheduler route must reuse the canonical worker that emits the safe reconciliation event");
console.log("refund reconciliation scheduler regression passed");
