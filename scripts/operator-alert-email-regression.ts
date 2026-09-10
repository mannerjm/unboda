import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = read("supabase/migrations/047_operator_alert_delivery_ledger.sql");
const alerts = read("app/lib/operators/ownerAlerts.ts");
const dispatcher = read("app/api/internal/reconcile/route.ts");
const launchSecurity = read("scripts/launch-security-regression.ts");

assert.match(migration, /create table if not exists public\.operator_alert_deliveries/);
assert.match(migration, /alert_key text not null unique/);
assert.match(migration, /status in \('PENDING','SENDING','FAILED_RETRYING','SENT','FAILED_FINAL'\)/);
assert.match(migration, /alter table public\.operator_alert_deliveries enable row level security/);
assert.match(migration, /revoke all on public\.operator_alert_deliveries from anon, authenticated/);
assert.match(migration, /grant select, insert, update, delete on public\.operator_alert_deliveries to service_role/);
for (const forbidden of ["email", "order_id", "user_id", "content", "payment_key", "provider_payload"]) {
  assert.ok(!migration.includes(`${forbidden} `), `alert ledger must not persist ${forbidden}`);
}

assert.match(alerts, /import "server-only"/);
assert.match(alerts, /process\.env\.RESEND_API_KEY/);
assert.match(alerts, /https:\/\/api\.resend\.com\/emails/);
assert.match(alerts, /Idempotency-Key/);
assert.match(alerts, /noreply@mail\.unboda\.kr/);
assert.match(alerts, /https:\/\/unboda\.kr\/admin/);
assert.match(alerts, /terminal_mismatch/);
assert.match(alerts, /reconciliation_failed/);
assert.match(alerts, /OWNER_REVIEW_REQUIRED/);
assert.match(alerts, /paid_reports/);
assert.match(alerts, /closure_owner_review_required/);
assert.match(alerts, /AI_CHARGE_INTEGRITY/);
assert.match(alerts, /auth\.admin\.getUserById/);
assert.match(alerts, /고객 개인정보/);
assert.match(alerts, /MAX_ALERT_ATTEMPTS = 10/);
assert.match(alerts, /STALE_SENDING_MS = 15 \* 60 \* 1000/);
assert.match(alerts, /OWNER_ALERT_STALE_SENDING_RECOVERED/);
assert.match(alerts, /\.eq\("updated_at", row\.updated_at\)/);
assert.match(alerts, /response\.status !== 400 && response\.status !== 422/);
assert.ok(!alerts.includes("NEXT_PUBLIC_RESEND"), "Resend credential must remain server-only");

assert.match(dispatcher, /sendOwnerReviewAlertIfNeeded/);
assert.match(dispatcher, /operatorAlerts/);
assert.match(dispatcher, /const ok = payments\.ok && refunds\.ok && accountClosures\.ok && guestCleanup\.ok/);
assert.ok(!/const ok =[^;]*operatorAlerts\.ok/.test(dispatcher), "email transport failure must not fail core reconciliation");
assert.match(launchSecurity, /"RESEND_API_KEY"/);

console.log("operator alert email regression passed ✓");
