import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const refund = read("app/lib/refunds/server.ts");
const route = read("app/api/internal/one-time-live-card-refund/route.ts");
const page = read("app/internal/one-time-live-card-refund/page.tsx");
const ui = read("app/internal/one-time-live-card-refund/OneTimeLiveCardRefundAction.tsx");
const config = read("app/lib/toss/config.ts");

for (const key of [
  "TOSS_ONE_TIME_LIVE_REFUND_ENABLED",
  "TOSS_ONE_TIME_LIVE_REFUND_ORDER_ID",
  "TOSS_ONE_TIME_LIVE_REFUND_ACCOUNT_ID",
  "TOSS_ONE_TIME_LIVE_REFUND_PROFILE_ID",
  "TOSS_ONE_TIME_LIVE_REFUND_EXPIRES_AT",
  "TOSS_LIVE_PILOT_ENABLED",
  "TOSS_LIVE_CHECKOUT_ENABLED",
  "TOSS_HYBRID_ROUTING_ENABLED",
]) assert.ok(refund.includes(key), "missing exact guard " + key);
assert.match(refund, /process\.env\.TOSS_LIVE_CHECKOUT_ENABLED !== "false"/);
assert.match(refund, /process\.env\.TOSS_LIVE_PILOT_ENABLED !== "true"/);
assert.match(refund, /process\.env\.VERCEL_ENV !== "production"/);
assert.match(refund, /order\.amount !== 9900/);
assert.match(refund, /order\.analysisEditionKey !== "MONTH:2026-10"/);
assert.match(refund, /expectedAccountId === testAccountId/);
assert.match(refund, /getTossConfigForAccount\(order\.userId, "checkout"\)/);
assert.match(refund, /config\.environment === "production" && config\.isProduction/);
assert.match(refund, /config\.clientKey\.startsWith\("live_ck_"\)/);
assert.match(refund, /config\.secretKey\.startsWith\("live_sk_"\)/);
assert.match(refund, /input\.reasonCategory !== "OWNER_OVERRIDE" \|\| !isScopedOneTimeLivePilotRefund\(input\.order\)/);
assert.match(refund, /livePilotOverride \? \{ eligible: true \} : await assessFullRefundEligibility\(/);
assert.match(refund, /idempotencyKey: workflow\.id/);
assert.match(refund, /if \(existing\) return existing/);
assert.match(refund, /REFUND_WORKFLOW_LOOKUP_FAILED/);
assert.match(config, /if \(purpose === "checkout" && process\.env\.TOSS_LIVE_CHECKOUT_ENABLED !== "true" && !isTossLivePilotAccount\(userId\)\)/);

assert.match(route, /getCurrentUser\(\)/);
assert.match(route, /getOrderForUser\(id, user\.id\)/);
assert.match(route, /getRefundWorkflowForOrder\(order\.id\)/);
assert.match(route, /getPaymentByOrderIdFromToss\(order\.id, config\)/);
assert.match(route, /provider\.status !== "DONE"/);
assert.match(route, /provider\.cancels\?\.length \?\? 0/);
assert.match(route, /provider\.balanceAmount !== order\.amount/);
assert.match(route, /provider\.mId/);
assert.match(route, /sameOrigin\(request\)/);
assert.match(route, /input\.livePaymentAcknowledged !== true/);
assert.match(route, /const check = await inspectLiveCard\(\)/);
assert.match(route, /oneTimeLivePilotRefundOverride: true/);
assert.doesNotMatch(route, /process\.env\.TOSS_LIVE_SECRET_KEY/);
assert.doesNotMatch(route, /process\.env\.REPORT_REFUND_ADMIN_ENABLED/);
assert.match(page, /notFound\(\)/);
assert.match(ui, /window\.confirm/);
assert.match(ui, /setSubmitted\(true\)/);
assert.doesNotMatch(ui, /setSubmitted\(false\)/);
assert.doesNotMatch(ui, /setTimeout|setInterval|retry/);

console.log("one-time LIVE refund regression PASS (static safety assertions, no financial calls)");
