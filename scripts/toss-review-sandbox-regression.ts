import assert from "node:assert/strict";
import { getTossConfig, isTossCheckoutUserAllowed } from "../app/lib/toss/config";
import { isAiConsultingCreditCheckoutEnabled } from "../app/lib/aiConsulting/creditCheckout";
import { readFileSync } from "node:fs";

const env = process.env as Record<string, string | undefined>;
const keys = ["NODE_ENV","TOSS_ENVIRONMENT","TOSS_REVIEW_MODE","TOSS_ALLOW_LIVE",
  "TOSS_CLIENT_KEY","NEXT_PUBLIC_TOSS_CLIENT_KEY","TOSS_SECRET_KEY","TOSS_REVIEW_ACCOUNT_IDS","NEXT_PUBLIC_AI_CONSULTING_CREDIT_CHECKOUT_ENABLED"] as const;
const saved = Object.fromEntries(keys.map((key) => [key, env[key]])) as Record<string,string|undefined>;
const reviewer = "f131d7ca-4024-4e91-a766-d81722f78c51";
const other = "aeb73ee0-15e1-4f4c-80a7-ce3a5a39a22d";
function configure(client: string, secret: string, review: boolean) {
  env.NODE_ENV = "production";
  env.TOSS_ENVIRONMENT = "sandbox";
  env.TOSS_REVIEW_MODE = review ? "enabled" : "";
  delete env.TOSS_ALLOW_LIVE;
  env.TOSS_CLIENT_KEY = client;
  delete env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  env.TOSS_SECRET_KEY = secret;
  env.TOSS_REVIEW_ACCOUNT_IDS = reviewer;
  delete env.NEXT_PUBLIC_AI_CONSULTING_CREDIT_CHECKOUT_ENABLED;
}
function expectFailure(reason: string) {
  let failed = false;
  try { getTossConfig(); } catch { failed = true; }
  assert.equal(failed, true, reason);
}
try {
  configure("test_ck_review", "test_sk_review", false);
  expectFailure("TEST keys must fail closed in production without explicit review mode");
  assert(!isAiConsultingCreditCheckoutEnabled(), "credit checkout must remain closed without review mode or explicit commercial launch");
  configure("test_ck_review", "test_sk_review", true);
  const config = getTossConfig();
  assert.equal(config.environment,"sandbox");
  assert.equal(config.isProduction,false);
  assert.equal(config.clientKey,"test_ck_review");
  assert(isTossCheckoutUserAllowed(reviewer), "allowlisted reviewer can open TEST checkout");
  assert(!isTossCheckoutUserAllowed(other), "ordinary accounts cannot mint TEST purchases");
  assert(isAiConsultingCreditCheckoutEnabled(), "valid production-hosted TEST review mode must allow the review checkout without enabling commercial launch");
  assert(!isTossCheckoutUserAllowed(other), "credit review gate must not authorize ordinary accounts");

  env.TOSS_REVIEW_ACCOUNT_IDS = "";
  expectFailure("review mode without a reviewer allowlist must fail closed");
  assert(!isAiConsultingCreditCheckoutEnabled(), "credit review checkout must fail closed with an empty reviewer allowlist");
  env.TOSS_REVIEW_ACCOUNT_IDS = reviewer;
  env.TOSS_ALLOW_LIVE = "true";
  expectFailure("live flag must prevent TEST mode even if review mode is enabled");
  assert(!isAiConsultingCreditCheckoutEnabled(), "credit review checkout must not activate when live payment flag is set");
  delete env.TOSS_ALLOW_LIVE;
  configure("live_ck_mismatched", "test_sk_review", true);
  expectFailure("live client and test secret may never be mixed");
  assert(!isAiConsultingCreditCheckoutEnabled(), "credit review checkout must reject mismatched Toss keys");

  configure("live_ck_live", "live_sk_live", false);
  env.TOSS_ENVIRONMENT = "production";
  const live = getTossConfig();
  assert.equal(live.environment,"production");
  assert(isTossCheckoutUserAllowed(other), "live-mode commercial accounts are not restricted by sandbox allowlist");
  assert(!isAiConsultingCreditCheckoutEnabled(), "commercial credit checkout must remain off until explicitly launched");

  const read = (path: string) => readFileSync(path,"utf8");
  const configRoute = read("app/api/payments/toss/client-config/route.ts");
  const client = read("app/lib/toss/checkoutClient.ts");
  for(const route of ["app/api/orders/route.ts","app/api/orders/family-extended/route.ts",
    "app/api/ai-consulting/credits/orders/route.ts",
    "app/api/orders/[orderId]/confirm-payment/route.ts",
    "app/api/ai-consulting/credits/orders/[orderId]/confirm-payment/route.ts"]) {
    assert(read(route).includes("isTossCheckoutUserAllowed(user.id)"), "review guard missing in "+route);
  }
  assert(configRoute.includes("getCurrentUser()") && configRoute.includes("isTossCheckoutUserAllowed(user.id)"),
    "client key route requires session and reviewer allowlist");
  assert(!configRoute.includes("config.secretKey"), "server secret cannot be returned to browser");
  assert(client.includes('fetch("/api/payments/toss/client-config"'), "checkout must use runtime public key");
  for(const path of ["app/checkout/[productId]/CheckoutAccessPanel.tsx",
    "app/checkout/[productId]/FamilyExtendedCheckoutAccessPanel.tsx",
    "app/ai-consulting/credits/CreditCheckoutClient.tsx"]) {
    const source=read(path);
    assert(source.includes("getTossCheckoutClientKey()"),"runtime public key missing in "+path);
    assert(!source.includes("process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY"),"bundled key must not gate "+path);
  }
  console.log("[toss-review-sandbox] PASS production TEST isolation, reviewer allowlist, live-key separation, runtime key route, and 3 checkout clients");
} finally {
  for(const key of keys) {
    if(saved[key] === undefined) delete env[key];
    else env[key] = saved[key];
  }
}
