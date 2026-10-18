import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Static and synthetic safety contract: never call Toss or change customer data.
const service=readFileSync("app/lib/aiConsulting/creditRefunds.ts","utf8");
const migration=readFileSync("supabase/migrations/20261014195000_credit_expiry_refund_state_machine.sql","utf8");
const config=readFileSync("app/lib/toss/config.ts","utf8");
const scheduler=readFileSync("app/api/internal/reconcile/route.ts","utf8");
assert(service.includes('query = query.in("user_id", pilotIds)') && service.indexOf('query = query.in("user_id", pilotIds)') < service.indexOf('.limit(limit)'), "pilot retry filtering must precede batch limit");
assert(service.includes('if (!globalEnabled && pilotIds.length === 0) return'), "empty pilot allowlist must fail closed");
assert(service.includes('isAiCreditRefundAllowedForUser(req.user_id)'), "retry processor checks eligibility again");
assert(service.includes('getTossConfigForAccount(refund.user_id, "settlement")'), "refund must follow original account payment rail");
assert(service.includes("prior.cancels??[]") && service.includes("cancelReason===reason"), "provider state is inspected before cancellation");
assert(service.includes("idempotencyKey:refund.idempotency_key"), "cancellation must be idempotent");
assert(service.includes('retry_count>=6') && service.includes('"REVIEW_REQUIRED"'), "bounded retry escalation");
assert(migration.includes('where purchase_id=p_purchase_id for update') && migration.includes('if found then'), "same purchase refund request must be reused");
assert(migration.includes('held_quantity=held_quantity+v_qty') && migration.includes('complete_ai_credit_refund'), "refund holds and completion remain transactional");
assert(scheduler.includes('AI_CREDIT_REFUND_RETRY_WORKER_ENABLED === "true"'), "worker must remain opt-in");
assert(config.includes('TOSS_LIVE_CHECKOUT_ENABLED !== "true"'), "customer LIVE checkout remains gated");
console.log("ai-credit-refund-recovery-safety-regression: PASS (static; no payment)");
