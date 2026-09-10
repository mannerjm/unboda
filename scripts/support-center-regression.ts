import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = read("supabase/migrations/048_support_center_foundation.sql");
const notificationMigration = read("supabase/migrations/049_support_notification_delivery.sql");
const server = read("app/lib/support/server.ts");
const operator = read("app/lib/support/operatorServer.ts");
const notifications = read("app/lib/support/notifications.ts");
const supportPage = read("app/support/SupportCenterClient.tsx");
const appShell = read("app/components/AppShell.tsx");
const homeExperience = read("app/components/HomeExperience.tsx");
const publicRoute = read("app/api/support/requests/route.ts");
const adminRoute = read("app/api/internal/admin/support/requests/[requestId]/route.ts");
const dispatcher = read("app/api/internal/reconcile/route.ts");
const operatorServer = read("app/lib/operators/server.ts");
const adminHome = read("app/admin/page.tsx");
const terms = read("app/terms/page.tsx");
const privacy = read("app/privacy/page.tsx");
const refund = read("app/refund/page.tsx");

assert.match(migration, /create table if not exists public\.support_requests/);
assert.match(migration, /alter table public\.support_requests enable row level security/);
assert.match(migration, /revoke all on public\.support_requests from anon, authenticated/);
assert.match(migration, /grant select, insert, update, delete on public\.support_requests to service_role/);
assert.match(migration, /security invoker/);
assert.match(migration, /SUPPORT_REQUEST_UPDATE/);
assert.match(migration, /grant execute on function public\.operator_update_support_request/);
assert.ok(!migration.includes("grant select, insert, update, delete on public.support_requests to authenticated"));

assert.match(notificationMigration, /alter function public\.set_operator_alert_deliveries_updated_at\(\)/);
assert.match(notificationMigration, /create table if not exists public\.support_notification_deliveries/);
assert.match(notificationMigration, /OWNER_NEW_REQUEST/);
assert.match(notificationMigration, /CUSTOMER_RESPONSE/);
assert.match(notificationMigration, /after insert or update of operator_response/);
assert.match(notificationMigration, /alter table public\.support_notification_deliveries enable row level security/);
assert.match(notificationMigration, /revoke all on public\.support_notification_deliveries from anon, authenticated/);

assert.match(server, /getCurrentUser/);
assert.match(server, /\.eq\("user_id", user\.id\)/);
assert.match(server, /MAX_ACTIVE_REQUESTS = 3/);
assert.match(server, /ORDER_NOT_FOUND/);
assert.match(server, /message\.length/);
assert.match(publicRoute, /createSupportRequest/);
assert.match(publicRoute, /dispatchSupportNotificationDeliveries/);
assert.match(publicRoute, /status: 201/);

assert.match(operator, /requireOperator/);
assert.match(operator, /operator_update_support_request/);
assert.match(operator, /createHash\("sha256"\)/);
assert.match(adminRoute, /updateSupportRequestForOperator/);
assert.match(adminRoute, /dispatchSupportNotificationDeliveries/);
assert.match(operatorServer, /SUPPORT_REQUEST_VIEW/);
assert.match(operatorServer, /SUPPORT_REQUEST_UPDATE/);
assert.match(adminHome, /getActiveSupportRequestCount/);
assert.match(adminHome, /supportQueueCount/);

assert.match(notifications, /RESEND_API_KEY/);
assert.match(notifications, /운보다 고객지원 <noreply@mail\.unboda\.kr>/);
assert.match(notifications, /고객 이메일, 주문번호, 문의 본문은 이메일에 포함하지 않았습니다/);
assert.match(notifications, /답변 내용은 이메일에 포함하지 않았습니다/);
assert.match(notifications, /support_notification_deliveries/);
assert.match(notifications, /FAILED_RETRYING/);
assert.match(dispatcher, /supportNotifications/);
assert.match(dispatcher, /scheduled_retry/);
assert.ok(!supportPage.includes("RESEND_API_KEY"));

for (const category of ["PAYMENT_REFUND", "PAID_ANALYSIS", "ACCOUNT_ACCESS", "PROFILE_DATA", "PRIVACY_ACCOUNT", "OTHER"]) {
  assert.ok(supportPage.includes(category), `support self-service category missing: ${category}`);
}
assert.match(supportPage, /비밀번호 재설정/);
assert.match(supportPage, /진행 중 문의는 최대 3건/);
assert.match(supportPage, /비밀번호, 카드번호, 결제키/);

assert.match(appShell, /href: "\/support", label: "고객지원 센터"/);
assert.match(appShell, /isGuest && item\.href === "\/mypage"/);
assert.match(homeExperience, /href="\/support"/);
assert.match(homeExperience, />고객지원<\/Link>/);

for (const legal of [terms, privacy, refund]) assert.match(legal, /\/support/);

console.log("support-center regression passed ✓");
