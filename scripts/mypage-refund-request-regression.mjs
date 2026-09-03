import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const myPage = await readFile("app/mypage/page.tsx", "utf8");
const summary = await readFile("app/api/mypage/summary/route.ts", "utf8");
const refundRoute = await readFile("app/api/orders/[orderId]/refund/route.ts", "utf8");
const refunds = await readFile("app/lib/refunds/server.ts", "utf8");

assert.match(myPage, /item\.paymentStatus === "paid" && !item\.refund && !feedback/, "request action is conservatively limited to paid orders without a workflow");
assert.match(myPage, /\/api\/orders\/\$\{encodeURIComponent\(item\.orderId\)\}\/refund/, "request uses the exact orderId endpoint");
assert.doesNotMatch(myPage, /purchaseId.*refund|profileId.*refund|cancelAmount|OWNER_OVERRIDE/, "client does not substitute identifiers or expose forbidden refund controls");
assert.match(myPage, /reasonCategory: refundReasonCategory/);
assert.match(myPage, /reasonText: refundReasonText/);
assert.match(myPage, /slice\(0, 200\)/, "reason text is bounded client-side");
assert.match(myPage, /maxLength=\{200\}/);
assert.match(myPage, /변심 또는 취소 요청/);
assert.match(myPage, /분석이 제공되지 않음/);
assert.match(myPage, /내용 또는 서비스에 결함이 있음/);
assert.match(myPage, /상품 설명·주문 내용과 다름/);
assert.match(myPage, /refundConfirmation/);
assert.match(myPage, /disabled=\{isSubmittingRefund \|\| !refundReasonCategory \|\| !refundConfirmation\}/);
assert.match(myPage, /실제 처리 여부와 상태는 서버 환불 정책 및 처리 결과에 따라 결정됩니다/);
assert.match(myPage, /response\.status === 409 && body\?\.code === "REFUND_OWNER_REVIEW_REQUIRED"/);
assert.match(myPage, /status: "OWNER_REVIEW_REQUIRED"/);
assert.doesNotMatch(myPage, /TossPayments|createClient\(\).*refund|refund_workflows/);
assert.match(myPage, /await reloadMypageData\(\)/, "request status is refreshed from the authoritative summary");
assert.match(myPage, /요청 상태를 확인하지 못했습니다\. 마이페이지를 새로고침한 뒤 다시 확인해 주세요/);

for (const field of ["orderId", "productName", "profileId", "purchasedAt", "amount", "currency", "paymentStatus", "refund"]) {
  assert.match(myPage, new RegExp(field), `existing history field remains: ${field}`);
}
assert.match(summary, /purchaseHistoryWithRefunds/);
assert.match(refundRoute, /export async function POST/);
assert.match(refundRoute, /getOrderForUser\(orderId, user\.id\)/);
assert.match(refundRoute, /reasonCategory/);
assert.match(refundRoute, /PARTIAL_REFUND_UNSUPPORTED/);
assert.match(refundRoute, /REFUND_OWNER_REVIEW_REQUIRED/);
assert.match(refunds, /if \(existing\) return existing/);
assert.match(refunds, /if \(input\.order\.status !== "paid"\)/);
assert.match(refunds, /cancelPaymentWithToss/);

console.log("My Page refund request regression: PASS");
