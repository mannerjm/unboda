import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const myPage = await readFile("app/mypage/page.tsx", "utf8");
const summary = await readFile("app/api/mypage/summary/route.ts", "utf8");
const refundRoute = await readFile("app/api/orders/[orderId]/refund/route.ts", "utf8");
const refunds = await readFile("app/lib/refunds/server.ts", "utf8");
const supportPage = await readFile("app/support/page.tsx", "utf8");
const supportClient = await readFile("app/support/SupportCenterClient.tsx", "utf8");
const supportServer = await readFile("app/lib/support/server.ts", "utf8");

assert.match(myPage, /item\.paymentStatus === "paid"/, "payment history remains account-wide");
assert.match(myPage, /item\.refund\.customerMessage/, "historical refund status must remain visible");
assert.match(myPage, /\/support\?category=PAYMENT_REFUND&orderId=\$\{encodeURIComponent\(item\.orderId\)\}/, "refund inquiry links to exact order");
assert.doesNotMatch(myPage, /openRefundForm|refundFormOrderId|refundReasonOptions|\/api\/orders\/\$\{encodeURIComponent\(item\.orderId\)\}\/refund/, "mypage must not submit customer-selected automatic refunds");
assert.match(supportPage, /getOrderForUser\(orderId, user\.id\)/, "server verifies order ownership");
assert.match(supportPage, /listUserProfiles\(user\.id\)/, "prefill profile label from owned data");
assert.match(supportClient, /initialRefundOrder\.productName/);
assert.match(supportClient, /initialRefundOrder\.amount/);
assert.match(supportClient, /category === "PAYMENT_REFUND"/);
for (const label of ["중복 결제 또는 결제 오류", "리포트 미제공 또는 생성 오류", "구매한 내용과 다른 리포트 제공", "리포트 제공 전 구매 취소", "기타 환불·결제 문의"]) {
  assert(supportClient.includes(label), `refund inquiry choice missing: ${label}`);
}
assert.match(supportClient, /\/api\/support\/requests/, "refund inquiry is just a support request");
assert.doesNotMatch(supportClient, /\/api\/orders\/.*\/refund|requestFullRefund\(/, "support intake never cancels payments");
assert.match(supportServer, /\.eq\("user_id", user\.id\)/, "support requests restricted to current user");
assert.match(supportServer, /\.eq\("order_id", orderId\)/, "active duplicates for the same order are deduplicated");
assert.match(refundRoute, /getOrderForUser\(orderId, user\.id\)/);
assert.match(refundRoute, /REFUND_SUPPORT_REQUIRED/);
assert.doesNotMatch(refundRoute, /requestFullRefund|cancelPaymentWithToss/, "legacy public refund route must fail closed");
assert.match(refunds, /export async function requestFullRefund/, "existing guarded refund workflow stays available");
assert.match(refunds, /if \(existing\) return existing/, "existing refunds must stay idempotent");
assert.match(refunds, /cancelPaymentWithToss/, "approved refund processing retained");
assert.match(summary, /purchaseHistoryWithRefunds/, "mypage refund status remains authoritative");
for (const field of ["orderId", "productName", "profileId", "purchasedAt", "amount", "currency", "paymentStatus", "refund"]) {
  assert.match(myPage, new RegExp(field));
}
console.log("mypage-refund-request-regression: PASS");
