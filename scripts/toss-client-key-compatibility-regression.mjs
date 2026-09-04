import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const checkout = await readFile("app/checkout/[productId]/CheckoutAccessPanel.tsx", "utf8");
const config = await readFile("app/lib/toss/config.ts", "utf8");
const confirmation = await readFile("app/api/orders/[orderId]/confirm-payment/route.ts", "utf8");
const orders = await readFile("app/api/orders/route.ts", "utf8");

const keyPattern = /\^\(\?:test\|live\)_ck_\[A-Za-z0-9_-\]\+\$/;
assert.match(checkout, keyPattern, "client accepts test and live Toss client-key formats");
assert.match(checkout, /typeof clientKey === "string"/);
assert.match(checkout, /!isCheckoutCompatibleTossClientKey\(clientKey\)/);
assert.doesNotMatch(checkout, /startsWith\("test_ck_"\)/, "client is not test-only");
assert.doesNotMatch(checkout, /TOSS_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|TOSS_ALLOW_LIVE|TOSS_ENVIRONMENT/);
assert.match(checkout, /NEXT_PUBLIC_TOSS_CLIENT_KEY/);
assert.match(config, /NODE_ENV === "production"/);
assert.match(config, /TOSS_ENVIRONMENT/);
assert.match(config, /TOSS_ALLOW_LIVE === "true"/);
assert.match(config, /live_ck_.*live_sk_|clientKey\.startsWith\("live_ck_"\).*secretKey\.startsWith\("live_sk_"\)/s);
assert.match(config, /Production Toss requires a matching live_ck_ and live_sk_ pair/);
assert.match(confirmation, /provider\.totalAmount !== order\.amount/);
assert.match(confirmation, /provider\.orderId !== order\.id/);
assert.match(confirmation, /order\.amount !== resolved\.amount/);
assert.match(orders, /paymentProvider: "toss"/);
assert.match(orders, /amount comes from the server-side pricing source/);

console.log("Toss client-key compatibility regression: PASS");
