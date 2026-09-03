import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panel = await readFile("app/checkout/[productId]/CheckoutAccessPanel.tsx", "utf8");
const page = await readFile("app/checkout/[productId]/page.tsx", "utf8");
const orders = await readFile("app/api/orders/route.ts", "utf8");
const confirmation = await readFile("app/api/orders/[orderId]/confirm-payment/route.ts", "utf8");

assert.match(panel, /useState\(false\)/, "acknowledgement defaults unchecked");
assert.match(panel, /disabled=\{isPaying \|\| !immediateGenerationAcknowledged\}/, "unchecked UI disables payment");
assert.match(panel, /immediateGenerationAcknowledged: true/, "checked UI sends acknowledgement");
assert.match(panel, /결제 및 분석 생성 안내/);
assert.match(panel, /결제가 승인되면 선택한 프로필의 개인화 분석 생성이 즉시 시작됩니다\./);
assert.match(panel, /href="\/refund"/);
assert.match(panel, /결제 승인 후 개인화 분석 생성이 즉시 시작된다는 내용을 확인했습니다\./);
assert.doesNotMatch(panel, /termsAccepted|age14OrOlderConfirmed|privacy|VERIFIED_ADULT/);
assert.doesNotMatch(panel, /결제 후 환불 불가|디지털 상품이므로 환불 불가|청약철회권을 포기합니다|환불받을 수 없습니다/);

assert.match(page, /getProductPricing/);
assert.match(page, /formatAnalysisEditionLabel/);
assert.match(page, /profileLabel=\{profile\?\.label\}/);

const acknowledgementCheck = orders.indexOf("requestBody?.immediateGenerationAcknowledged !== true");
const pendingOrderCall = orders.indexOf("const order = await createPendingOrder");
assert.notEqual(acknowledgementCheck, -1, "server rejects missing or invalid acknowledgement");
assert.ok(acknowledgementCheck < pendingOrderCall, "rejection precedes pending-order creation");
assert.match(orders, /status: 400/);
assert.match(orders, /amount comes from the server-side pricing source|createPendingOrder/);

assert.match(confirmation, /preparePaidReportGeneration/);
assert.match(confirmation, /runPaidReportGeneration/);
assert.match(confirmation, /after\(\(\) => runPaidReportGeneration/);

console.log("checkout immediate-generation acknowledgement regression: PASS");
