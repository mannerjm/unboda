import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Safe read-only launch contract: no email, AI request, payment or database mutations.
const read = (path: string) => readFileSync(path, "utf8");
const ops = read("app/lib/operators/soloOperations.ts");
const alerts = read("app/lib/operators/ownerAlerts.ts");
const scheduler = read("app/api/internal/reconcile/route.ts");
const migration = read("supabase/migrations/20261015195000_solo_ai_full_integrity_metrics.sql");

assert(ops.includes("AI_COST_ALERT_24H_USD"), "24h AI cost threshold configurable");
assert(ops.includes("Number.isFinite(value) && value > 0 && value <= 10000 ? value : 5"), "invalid budget settings must fail safely");
assert(ops.includes("cost >= getAiCostAlertThresholdUsd()"), "estimated AI costs checked against threshold");
assert(ops.includes('attempts >= 20 && failed / attempts >= 0.25'), "AI failure rate guard");
assert(ops.includes('metrics.unknown_cost_count >= 20'), "unknown-cost telemetry guard");
assert(migration.includes('get_ai_solo_operations_metrics_24h'), "database aggregates precise 24h telemetry");
assert(migration.includes('estimated_cost_usd'), "database records estimated USD metric");
assert(alerts.includes('"AI_OPERATIONS_ANOMALY"') && alerts.includes("sendOwnerReviewAlertIfNeeded"), "AI anomalies enter owner alert pipeline");
assert(alerts.includes('"Idempotency-Key": alertKey'), "owner alert transport must be idempotent");
assert(alerts.includes("status: \"no_recipients\"") || alerts.includes('status: "no_recipients"'), "missing recipients must be reported");
assert(scheduler.includes("isAuthorizedSchedulerRequest(request)"), "scheduled alert endpoint authenticates");
assert(scheduler.includes("sendOwnerReviewAlertIfNeeded()"), "scheduled alert delivery remains connected");
console.log("ai-cost-owner-alert-readiness-regression: PASS (static/read-only)");
