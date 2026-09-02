import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { getRefundCustomerMessage } from "../app/lib/refunds/status";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const mypage = read("app/mypage/page.tsx");
const summaryRoute = read("app/api/mypage/summary/route.ts");
const purchases = read("app/lib/purchases/server.ts");
const paidReports = read("app/lib/paidReports/server.ts");
const reportGate = read("app/paid-analysis/[productId]/report/ReportAccessGate.tsx");
const refunds = read("app/lib/refunds/server.ts");
const purchaseTypes = read("app/lib/purchases/types.ts");
const appShell = read("app/components/AppShell.tsx");

assert(mypage.includes("현재 분석 대상") && mypage.includes("프로필 수정") && mypage.includes("삭제 확인"), "existing profile management UI must remain");
assert(
  mypage.includes("계정 설정에서 확인하기")
    && mypage.indexOf("인원 추가") < mypage.indexOf("{profiles.length}명 등록")
    && mypage.includes("ACCOUNT MANAGEMENT"),
  "My Page must separate account management while preserving add-profile and registration count actions",
);
assert(
  mypage.indexOf("onClick={() => void clearActiveSelection()") < mypage.indexOf("onClick={() => openEditForm(profile)")
    && mypage.indexOf("onClick={() => openEditForm(profile)") < mypage.indexOf("onClick={() => { setMessage(null); setPendingDeleteProfileId(profile.id); }}"),
  "profile actions must render deselect, edit, then delete",
);
assert(mypage.includes("구매한 심층 분석") && mypage.includes("아직 구매한 심층 분석이 없습니다."), "zero-paid-analysis profiles must show a compact library empty state");
assert(mypage.includes("내 프로필 및 이용 가능한 분석") && mypage.includes("결제 내역") && mypage.includes("구매한 분석은 보관함에서"), "My Page must distinguish current analysis content from financial purchase history");
assert(summaryRoute.includes("listUserPurchaseHistory(user.id)") && summaryRoute.includes("purchaseHistory"), "summary must expose historical purchase records");
assert(summaryRoute.includes("listUserPaidAnalysisSummaries(user.id)"), "summary must preserve active entitlement-backed analysis summaries");
assert(purchases.includes("export async function listUserPurchaseHistory") && purchases.includes('.from("purchases")'), "purchase history must derive from purchases, not entitlements");
assert(purchases.includes('.from("orders")') && purchases.includes("amount") && purchases.includes("currency"), "purchase history must include persisted order/payment customer fields");
assert(summaryRoute.includes("refundByOrderId") && summaryRoute.includes("refund"), "purchase history must connect refund state by order");
assert(refunds.includes("export async function listUserRefundSummaries") && refunds.includes("getRefundCustomerMessage"), "refund summaries must use customer-safe status messages");
for (const status of ["REFUND_REQUESTED", "REFUND_PROCESSING", "REFUND_FAILED_RETRYING", "REFUND_COMPLETED", "OWNER_REVIEW_REQUIRED"]) {
  assert(purchaseTypes.includes(status), `refund status ${status} must remain supported`);
}
assert(getRefundCustomerMessage("OWNER_REVIEW_REQUIRED") === "자동 처리가 어려워 담당자가 확인 중입니다.", "OWNER_REVIEW_REQUIRED must use the customer-safe message");
assert(paidReports.includes("listUserEntitlements(userId)") && paidReports.includes("listUserPaidReports(userId)"), "current analysis library must remain entitlement/report based");
assert(reportGate.includes("hasActiveEntitlementForProfile") && reportGate.includes("profile.id"), "report access must continue to require the matching profile entitlement");
assert(mypage.includes("item.productName") && mypage.includes("item.categoryLabel") && mypage.includes("item.amount"), "purchase history must render canonical customer presentation fields");
for (const internalField of ["payment_key", "provider_order_id", "correlation_id", "retry_count", "last_provider_error_code"]) {
  assert(!mypage.includes(internalField), `My Page must not render internal field ${internalField}`);
}
assert(!mypage.includes("recommendedProductIds") && !summaryRoute.includes("recommendation"), "purchase history must not use recommendation state as its source");
assert(mypage.includes("purchaseHistory.length > 0"), "purchase/refund history must remain hidden when there is no history");
const mobileNavigation = appShell.split('aria-label="모바일 네비게이션"')[1] ?? "";
assert(mobileNavigation.includes("key={item.label}") && !mobileNavigation.includes("key={item.href}"), "mobile navigation keys must remain unique when resolved destinations match");
assert(Boolean(getPremiumProduct("money-leak-risk")?.title), "historical product presentation must resolve through the canonical product registry");

console.log("mypage-library-regression: OK");
