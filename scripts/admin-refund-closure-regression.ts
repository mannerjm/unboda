import { readFileSync } from "node:fs";

function read(path: string): string { return readFileSync(path, "utf8"); }
function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }

const migration = read("supabase/migrations/051_admin_refund_closure_history.sql");
const analytics = read("app/lib/analytics/server.ts");
const adminPage = read("app/admin/page.tsx");
const view = read("app/admin/AdminRefundClosureOverview.tsx");

assert(
  migration.includes("closure_requested_at timestamptz") && migration.includes("closure_canceled_at timestamptz"),
  "closure request and cancel timestamps must be explicit",
);
assert(
  migration.includes("old.status = 'ACTIVE' and new.status = 'DELETION_REQUESTED'")
    && migration.includes("new.closure_requested_at := now()")
    && migration.includes("old.status = 'DELETION_REQUESTED' and new.status = 'ACTIVE'")
    && migration.includes("new.closure_canceled_at := now()"),
  "closure timestamps must be stamped from authoritative DB state transitions",
);
assert(
  migration.includes("ACCOUNT_CLOSURE_REQUESTED")
    && migration.includes("ACCOUNT_CLOSURE_CANCELED")
    && migration.includes("record_account_closure_transition_event"),
  "closure request/cancel counts must be transactionally recorded from status transitions",
);
assert(
  !migration.includes("update public.account_lifecycles set closure_requested_at")
    && migration.includes("Historical closure request timestamps are intentionally not fabricated"),
  "historical request timestamps must not be fabricated",
);
assert(
  migration.includes("status = 'REFUND_COMPLETED'") && migration.includes("completed_at is not null"),
  "refund totals must use completed refunds only",
);
assert(
  migration.includes("finalized_at is not null") && migration.includes("status = 'DELETION_REQUESTED' and finalized_at is null"),
  "closure completed and pending counts must use authoritative lifecycle state",
);
assert(
  migration.includes("security invoker")
    && migration.includes("revoke all on function public.get_admin_refund_closure_dashboard(integer) from public, anon, authenticated")
    && migration.includes("grant execute on function public.get_admin_refund_closure_dashboard(integer) to service_role"),
  "refund/closure report RPC must remain service-role only",
);
assert(
  analytics.includes('"ACCOUNT_CLOSURE_REQUESTED"')
    && analytics.includes('"ACCOUNT_CLOSURE_CANCELED"')
    && analytics.includes("getAdminRefundClosureDashboard"),
  "server analytics types must expose closure events and report",
);
assert(
  adminPage.indexOf("await requireOperator()") < adminPage.indexOf("getAdminRefundClosureDashboard(20)"),
  "refund/closure report must remain behind operator authorization",
);
for (const label of [
  "오늘 환불 완료",
  "이번 주 환불 완료",
  "이번 달 환불 완료",
  "누적 환불 완료",
  "오늘 탈퇴 요청",
  "이번 주 탈퇴",
  "이번 달 탈퇴",
  "현재 탈퇴 처리 중",
  "최근 환불 내역",
  "최근 회원 탈퇴 내역",
]) {
  assert(view.includes(label), `admin refund/closure view missing: ${label}`);
}
assert(view.includes("기록 도입 전"), "pre-rollout completed closures must not receive invented request dates");
assert(view.includes("탈퇴 요청 취소") && view.includes("대표 확인 필요"), "closure states must stay distinguishable");

console.log("admin-refund-closure-regression passed ✓");
