import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ACCOUNT_PAYMENT_PAGE_SIZE,
  parsePaymentHistoryParams,
  paymentHistoryHref,
  selectPaymentHistoryPage,
  type PaymentHistoryFilters,
} from "../app/lib/accountPaymentHistoryFilters";
import type { AccountPaymentHistoryItem } from "../app/lib/accountPaymentHistory";

const empty: PaymentHistoryFilters = { query: "", period: "all", from: "", to: "", status: "all" };
const sample = Array.from({ length: 101 }, (_, i): AccountPaymentHistoryItem => ({
  purchaseId: `purchase-${i}`, orderId: `order-${i}`,
  profileId: i % 2 ? "profile-A" : "profile-B",
  productId: i % 2 ? "wealth" : "compatibility-workplace",
  productName: i % 2 ? "재물운 심층 분석" : "직장·동료 궁합 분석",
  categoryLabel: i % 2 ? "재물운" : "전문 분석 · 궁합 · 직장",
  purchasedAt: new Date(Date.UTC(2026, 8, 23, 12, 0, 0) - i * 86_400_000).toISOString(),
  amount: 9900, currency: "KRW", paymentStatus: "paid",
  refund: i === 0 ? { orderId: "order-0", status: "REFUND_COMPLETED", customerMessage: "환불 완료", requestedAt: "2026-09-23", completedAt: "2026-09-23" }
    : i === 1 ? { orderId: "order-1", status: "OWNER_REVIEW_REQUIRED", customerMessage: "검토 중", requestedAt: "2026-09-23", completedAt: null } : null,
}));

for (const size of [0, 2, 5, 20, 21, 100, 101]) {
  const rows = sample.slice(0, size);
  const pages = Array.from({ length: Math.max(1, Math.ceil(size / 20)) }, (_, i) =>
    selectPaymentHistoryPage(rows, empty, i + 1, new Date("2026-09-23T15:00:00Z")),
  );
  assert.equal(pages[0].total, size, "all-profile total must be correct");
  assert.equal(pages[0].items.length, Math.min(size, 20));
  assert.equal(pages.at(-1)!.items.length, size === 0 ? 0 : size % 20 || 20);
  assert.deepEqual(pages.flatMap((page) => page.items.map((item) => item.purchaseId)), rows.map((item) => item.purchaseId));
  assert.equal(new Set(pages.flatMap((page) => page.items.map((item) => item.orderId))).size, size);
}
assert.equal(ACCOUNT_PAYMENT_PAGE_SIZE, 20);
assert.equal(selectPaymentHistoryPage(sample.slice(0, 21), empty, 2).items.length, 1, "21st purchase must appear on page 2");
assert.equal(selectPaymentHistoryPage(sample.slice(0, 21), empty, 500).page, 2, "out-of-range page clamps");
assert.equal(selectPaymentHistoryPage(sample, { ...empty, query: "궁합" }, 1).total, 51);
assert.equal(selectPaymentHistoryPage(sample, { ...empty, query: "재물운" }, 1).total, 50);
assert.equal(selectPaymentHistoryPage(sample, { ...empty, status: "refunded" }, 1).items[0].orderId, "order-0");
assert.equal(selectPaymentHistoryPage(sample, { ...empty, status: "refund_pending" }, 1).items[0].orderId, "order-1");
assert.equal(selectPaymentHistoryPage(sample, { ...empty, status: "paid" }, 1).total, 99);
assert.equal(selectPaymentHistoryPage(sample, { ...empty, from: "2026-09-23", to: "2026-09-23" }, 1).total, 1);
assert.equal(selectPaymentHistoryPage(sample, { ...empty, period: "3m" }, 1, new Date("2026-09-23T15:00:00Z")).total, 92);
assert.equal(selectPaymentHistoryPage(sample, { ...empty, from: "2026-09-25", to: "2026-09-01" }, 1).total, 0);
assert.deepEqual(parsePaymentHistoryParams({ q: " 재물운 ", period: "3m", status: "refunded", from: "2026-09-01", to: "2026-09-23", page: "3" }), {
  filters: { query: "재물운", period: "3m", status: "refunded", from: "2026-09-01", to: "2026-09-23" },
  requestedPage: 3,
});
assert.deepEqual(parsePaymentHistoryParams({ from: "2026-02-30", to: "nope", page: "-2", status: "bogus" }), { filters: empty, requestedPage: 1 });
assert.equal(paymentHistoryHref(empty, 1), "/mypage/payments");
assert.equal(paymentHistoryHref({ ...empty, query: "궁합", status: "refunded" }, 2), "/mypage/payments?q=%EA%B6%81%ED%95%A9&status=refunded&page=2");

const read = (file: string) => readFileSync(file, "utf8");
const summary = read("app/api/mypage/summary/route.ts");
const mypage = read("app/mypage/page.tsx");
const archive = read("app/mypage/payments/page.tsx");
const ledger = read("app/lib/accountPaymentHistory.ts");
const specialty = read("app/lib/specialAnalysisPurchaseHistory.ts");
assert(summary.includes("getAccountPaymentHistory(user.id)") && summary.includes("purchaseHistory: purchaseHistory.slice(0, 5)"), "mypage response contains only five recent purchases");
assert(summary.includes("paymentHistoryTotal: purchaseHistory.length") && summary.includes("paidProfileIds"), "account-wide count and per-profile purchase hints survive preview limit");
assert(mypage.includes("paidProfileIds.includes(editingProfileId)") && !mypage.includes("purchaseHistory.some("), "profile birth-data warning must use all historical purchases");
assert(mypage.includes("purchaseHistory.map((item)") && mypage.includes('href="/mypage/payments"'), "five-preview UI retains refund links and full history navigation");
assert(archive.includes("getCurrentUser()") && archive.includes("getAccountPaymentHistory(user.id)") && !archive.includes("getAccountPaymentHistory(activeProfile"), "full history is authenticated and never limited to selected profile");
assert(archive.includes("history.items.map((item)") && archive.includes("selectPaymentHistoryPage(allItems, filters, requestedPage)"), "only twenty filtered items render");
assert(archive.includes('name="q"') && archive.includes('name="period"') && archive.includes('name="status"') && archive.includes('name="from"') && archive.includes('name="to"'), "all search controls are wired");
assert(archive.includes("encodeURIComponent(item.orderId)") && archive.includes("item.refund.customerMessage"), "exact order inquiry and previous refund state preserved");
assert(ledger.includes("listUserPurchaseHistory(userId)") && ledger.includes("listUserSpecialAnalysisPurchaseHistory(userId)") && ledger.includes("listUserRefundSummaries(userId)"), "combined financial ledger includes all profile purchases and refund records");
assert(ledger.includes("refundByOrderId.get(item.orderId)"), "refund linked by original order");
for (const product of ["COMPATIBILITY_WORKPLACE_PRODUCT_ID", "COMPATIBILITY_FRIEND_PRODUCT_ID", "COMPATIBILITY_BUSINESS_PRODUCT_ID"]) assert(specialty.includes(product), `special purchase history omitted: ${product}`);
console.log("account-payment-history-archive-regression: PASS");
