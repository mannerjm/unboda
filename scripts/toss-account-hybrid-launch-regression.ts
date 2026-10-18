import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getTossConfigForAccount, isTossCheckoutUserAllowed } from "../app/lib/toss/config";

// Use synthetic account IDs and fake keys. No provider calls or real orders.
const testId = "f131d7ca-4024-4e91-a766-d81722f78c51";
const buyerId = "aeb73ee0-15e1-4f4c-80a7-ce3a5a39a22d";
const keys = [
  "NODE_ENV","TOSS_ENVIRONMENT","TOSS_REVIEW_MODE","TOSS_ALLOW_LIVE",
  "TOSS_REVIEW_ACCOUNT_IDS","TOSS_TEST_ACCOUNT_ID",
  "TOSS_CLIENT_KEY","TOSS_SECRET_KEY",
  "TOSS_LIVE_CLIENT_KEY","TOSS_LIVE_SECRET_KEY",
  "TOSS_HYBRID_ROUTING_ENABLED","TOSS_LIVE_CHECKOUT_ENABLED",
] as const;
const env = process.env as Record<string,string|undefined>;
const original = Object.fromEntries(keys.map(k => [k,env[k]]));
function fails(fn: () => unknown): void {
  assert.throws(fn, "missing provider authorization must fail closed");
}
try {
  env.NODE_ENV = "production";
  env.TOSS_ENVIRONMENT = "sandbox";
  env.TOSS_REVIEW_MODE = "enabled";
  delete env.TOSS_ALLOW_LIVE;
  env.TOSS_REVIEW_ACCOUNT_IDS = testId;
  env.TOSS_TEST_ACCOUNT_ID = testId;
  env.TOSS_CLIENT_KEY = "test_ck_sample";
  env.TOSS_SECRET_KEY = "test_sk_sample";
  delete env.TOSS_LIVE_CLIENT_KEY;
  delete env.TOSS_LIVE_SECRET_KEY;
  delete env.TOSS_LIVE_CHECKOUT_ENABLED;
  delete env.TOSS_HYBRID_ROUTING_ENABLED;

  assert.equal(getTossConfigForAccount(testId).environment, "sandbox");
  fails(() => getTossConfigForAccount(buyerId)); // legacy reviewer-only mode

  env.TOSS_HYBRID_ROUTING_ENABLED = "true";
  assert.equal(getTossConfigForAccount(testId).environment, "sandbox");
  assert.equal(getTossConfigForAccount(testId).clientKey, "test_ck_sample");
  assert.equal(isTossCheckoutUserAllowed(testId), true);
  fails(() => getTossConfigForAccount(buyerId)); // cards not approved

  env.TOSS_LIVE_CHECKOUT_ENABLED = "true";
  fails(() => getTossConfigForAccount(buyerId)); // no live keys installed

  env.TOSS_LIVE_CLIENT_KEY = "live_gck_widget";
  env.TOSS_LIVE_SECRET_KEY = "live_gsk_widget";
  fails(() => getTossConfigForAccount(buyerId)); // widget keys cannot be used with SDK .payment()

  env.TOSS_LIVE_CLIENT_KEY = "live_ck_sample";
  env.TOSS_LIVE_SECRET_KEY = "test_sk_wrong";
  fails(() => getTossConfigForAccount(buyerId)); // never mix live and test

  env.TOSS_LIVE_SECRET_KEY = "live_sk_sample";
  const live = getTossConfigForAccount(buyerId);
  assert.equal(live.environment, "production");
  assert.equal(live.clientKey, "live_ck_sample");
  assert.equal(isTossCheckoutUserAllowed(buyerId), true);
  assert.equal(getTossConfigForAccount(testId).environment, "sandbox",
    "owner is always TEST even when live customers are enabled");

  env.TOSS_LIVE_CHECKOUT_ENABLED = "false";
  fails(() => getTossConfigForAccount(buyerId));
  assert.equal(getTossConfigForAccount(buyerId,"settlement").environment, "production",
    "existing live orders must remain confirmable/refundable after new live sales pause");

  env.TOSS_TEST_ACCOUNT_ID = "";
  fails(() => getTossConfigForAccount(testId));
} finally {
  for (const key of keys) {
    if (original[key] === undefined) delete env[key];
    else env[key] = original[key];
  }
}

const read = (path:string) => readFileSync(path,"utf8");
const provider = read("app/lib/toss/server.ts");
for(const signal of ["input.config ?? getTossConfig()","config: TossSandboxConfig = getTossConfig()"]){
  assert(provider.includes(signal), "provider APIs must accept correct user-key pair: "+signal);
}
for(const p of [
  "app/api/orders/route.ts","app/api/orders/family-extended/route.ts",
  "app/api/ai-consulting/credits/orders/route.ts",
  "app/api/payments/toss/client-config/route.ts",
  "app/ai-consulting/credits/page.tsx",
]) {
  assert(read(p).includes("getTossConfigForAccount("), "missing buyer-selected key: "+p);
}
for (const p of [
  "app/api/orders/[orderId]/confirm-payment/route.ts",
  "app/api/ai-consulting/credits/orders/[orderId]/confirm-payment/route.ts",
  "app/lib/purchases/server.ts","app/lib/refunds/server.ts",
  "app/lib/aiConsulting/creditRefunds.ts",
]) {
  assert(read(p).includes('"settlement"'), "recovery/refund must use an authenticated existing order rail: "+p);
}
assert(!read("app/api/payments/toss/client-config/route.ts").includes("config.secretKey"),
  "secrets never reach the client");
console.log("toss-account-hybrid-launch-regression: PASS (no live charges)");
