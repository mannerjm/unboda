import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = read("supabase/migrations/048_support_center_foundation.sql");
const server = read("app/lib/support/server.ts");
const operator = read("app/lib/support/operatorServer.ts");
const supportPage = read("app/support/SupportCenterClient.tsx");
const publicRoute = read("app/api/support/requests/route.ts");
const adminRoute = read("app/api/internal/admin/support/requests/[requestId]/route.ts");
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

assert.match(server, /getCurrentUser/);
assert.match(server, /\.eq\("user_id", user\.id\)/);
assert.match(server, /MAX_ACTIVE_REQUESTS = 3/);
assert.match(server, /ORDER_NOT_FOUND/);
assert.match(server, /message\.length/);
assert.match(publicRoute, /createSupportRequest/);
assert.match(publicRoute, /status: 201/);

assert.match(operator, /requireOperator/);
assert.match(operator, /operator_update_support_request/);
assert.match(operator, /createHash\("sha256"\)/);
assert.match(adminRoute, /updateSupportRequestForOperator/);
assert.match(operatorServer, /SUPPORT_REQUEST_VIEW/);
assert.match(operatorServer, /SUPPORT_REQUEST_UPDATE/);
assert.match(adminHome, /getActiveSupportRequestCount/);
assert.match(adminHome, /supportQueueCount/);

for (const category of ["PAYMENT_REFUND", "PAID_ANALYSIS", "ACCOUNT_ACCESS", "PROFILE_DATA", "PRIVACY_ACCOUNT", "OTHER"]) {
  assert.ok(supportPage.includes(category), `support self-service category missing: ${category}`);
}
assert.match(supportPage, /비밀번호 재설정/);
assert.match(supportPage, /진행 중 문의는 최대 3건/);
assert.match(supportPage, /비밀번호, 카드번호, 결제키/);
assert.ok(!supportPage.includes("RESEND_API_KEY"));

for (const legal of [terms, privacy, refund]) assert.match(legal, /\/support/);

console.log("support-center regression passed ✓");