import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const dispatcher = readFileSync("app/api/internal/reconcile/route.ts", "utf8");
const standaloneRoute = readFileSync("app/api/internal/payments/refunds/reconcile/route.ts", "utf8");
const refunds = readFileSync("app/lib/refunds/server.ts", "utf8");
const refundClaimMigration = readFileSync("supabase/migrations/021_refund_reconciliation_claim_lease.sql", "utf8");
const schedulerAuth = readFileSync("app/lib/internal/schedulerAuth.ts", "utf8");
const adminUi = readFileSync("app/admin/AdminLookupConsole.tsx", "utf8");
const vercel = readFileSync("vercel.json", "utf8");

assert(dispatcher.includes("reconcilePaymentsBatch") && dispatcher.includes("reconcileRefundsBatch") && dispatcher.includes("reconcileAccountClosureFinalizations"), "shared dispatcher must invoke payment, refund, and closure workers directly");
assert(!dispatcher.includes("fetch(") && (dispatcher.match(/try\s*{/g) ?? []).length === 3, "each scheduler worker must remain isolated without internal HTTP calls");
assert(dispatcher.includes("refunds = { ok: false }") && dispatcher.includes("payments.ok && refunds.ok && accountClosures.ok"), "refund worker failure must remain visible in the aggregate scheduler result");
assert(standaloneRoute.includes("reconcileRefundsBatch") && !standaloneRoute.includes("listRefundWorkflowsForReconciliation"), "standalone refund reconciliation must reuse the same canonical batch worker");
assert(refunds.includes("requested_limit: 50") && refunds.includes("lease_seconds: 300") && refundClaimMigration.includes("for update skip locked") && refundClaimMigration.includes("reconciliation_claim_expires_at"), "refund claiming must remain bounded and lease-safe under repeated or concurrent cron delivery");
assert(refunds.includes("REFUND_COMPLETED") && refunds.includes("OWNER_REVIEW_REQUIRED") && refunds.includes("provider.status === \"CANCELED\"") && refunds.includes("revokeEntitlementForRefund"), "refund completion must retain provider evidence, owner-review, and exact refund revocation safeguards");
assert(schedulerAuth.includes("PAYMENT_RECONCILIATION_SECRET") && !schedulerAuth.includes("NEXT_PUBLIC"), "existing server-only scheduler authentication must remain the sole scheduler credential");
assert(vercel.includes('"path": "/api/internal/reconcile"') && !vercel.includes("refunds/reconcile"), "existing shared hourly cron must remain the only configured scheduler entry");
assert(!adminUi.includes("/refund") && !adminUi.includes("reconcileRefund"), "read-only admin UI must not add refund or retry actions");

console.log("refund-shared-dispatcher-regression passed ✓");