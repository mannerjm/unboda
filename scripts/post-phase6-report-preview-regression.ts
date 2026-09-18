import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const parentChild = read("app/components/PaidFamilyParentChildAnalysisClient.tsx");
const preview = read("app/admin/report-preview/page.tsx");
const admin = read("app/admin/page.tsx");

assert(
  parentChild.includes('tracking-[-0.02em] text-white'),
  "parent-child compatibility hero title must remain white on the navy hero surface",
);
assert(
  !parentChild.includes('tracking-[-0.02em] text-[#11162d]'),
  "parent-child compatibility hero must not restore dark title text on the dark hero",
);

assert(preview.includes("await requireOperator()"), "report preview must be operator-gated");
assert(preview.includes('redirect("/auth/login?returnTo=/admin/report-preview")'), "unauthenticated preview access must return through operator login");
assert(preview.includes("SAMPLE_REPORT"), "report preview must use local sample data");
assert(preview.includes("<PaidAnalysisV4Report"), "report preview must render the real Phase 6 V4 report component");
assert(preview.includes("실제 구매·주문·entitlement를 만들지 않는 샘플 화면입니다."), "preview must clearly state that no purchase entitlement is created");
assert(!preview.includes("hasActiveEntitlementForProfile"), "preview must not fake or mutate entitlement checks");
assert(!preview.includes("/api/orders"), "preview must not create orders");
assert(!preview.includes("requestPayment"), "preview must not invoke payment");
assert(admin.includes('href="/admin/report-preview"'), "admin dashboard must expose the operator report preview link");

console.log("Post Phase 6 report preview regression passed ✓");
