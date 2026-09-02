import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const route = readFileSync("app/api/orders/route.ts", "utf8");
const checkout = readFileSync("app/checkout/[productId]/CheckoutAccessPanel.tsx", "utf8");
const createOrderTry = route.slice(
  route.indexOf("const order = await createPendingOrder({"),
);
const mappingIndex = createOrderTry.indexOf("error instanceof PaidPurchaseEligibilityError");
const fallbackIndex = createOrderTry.indexOf('"주문을 생성하지 못했습니다."');

assert(mappingIndex >= 0 && fallbackIndex > mappingIndex, "eligibility errors must map in the createPendingOrder catch before generic fallback");
assert(createOrderTry.includes('EMAIL_NOT_VERIFIED: "이메일 인증이 필요합니다."'), "email verification must have a safe customer message");
assert(createOrderTry.includes('PAID_ELIGIBILITY_UNVERIFIED: "결제 전에 성인 인증을 완료해 주세요."'), "unverified adult eligibility must have a safe customer message");
assert(createOrderTry.includes('PAID_ELIGIBILITY_REVOKED: "현재 성인 인증 상태로는 결제를 진행할 수 없습니다."'), "revoked adult eligibility must have a safe customer message");
assert(createOrderTry.includes('ACCOUNT_NOT_ACTIVE: "현재 계정에서는 결제를 진행할 수 없습니다."'), "inactive account must have a safe customer message");
assert(createOrderTry.includes('UNKNOWN_ERROR: "계정 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."'), "unknown eligibility must have a safe customer message");
assert(createOrderTry.includes('code: error.reason') && createOrderTry.includes('const status = error.reason === "AUTHENTICATION_REQUIRED" ? 401 : 403') && createOrderTry.includes('{ status }'), "route must return safe structured code and deny status");
assert(checkout.includes("body?.error ?? `주문 생성에 실패했습니다. (${orderResponse.status})`"), "checkout must display the server safe error message without client-side eligibility inference");
assert(!checkout.includes("PAID_ELIGIBILITY_UNVERIFIED") && !checkout.includes("email_confirmed_at"), "checkout must not duplicate eligibility policy or auth truth");

console.log("checkout-eligibility-error-mapping-regression passed ✓");