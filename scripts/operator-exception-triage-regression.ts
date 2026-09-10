import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const failureService = read("app/lib/operators/failureVisibilityServer.ts");
const adminConsole = read("app/admin/AdminLookupConsole.tsx");
const guide = read("app/admin/guide/page.tsx");
const runbook = read("docs/operations/pilot-cs-failure-runbook.md");
const failureRoute = read("app/api/internal/admin/failures/route.ts");

assert.match(failureService, /referenceType: "ORDER" \| "REPORT" \| "ACCOUNT"/);
assert.match(failureService, /orderId: string \| null/);
assert.match(failureService, /accountEmail: string \| null/);
assert.match(failureService, /purchase_id/);
assert.match(failureService, /purchaseOrderById/);
assert.match(failureService, /closure_retry_count/);
assert.match(failureService, /closure_next_retry_at/);
assert.match(failureService, /auth\.admin\.getUserById/);
assert.match(failureService, /accountEmailByUserId/);

assert.match(adminConsole, /failureGuides/);
assert.match(adminConsole, /decisionForFailure/);
assert.match(adminConsole, /연결 주문 상세 확인/);
assert.match(adminConsole, /연결 계정 상세 확인/);
assert.match(adminConsole, /failure-queue:/);
assert.match(adminConsole, /동일 구매의 유료 분석 화면을 다시 열도록 안내/);
assert.match(adminConsole, /terminal_mismatch/);
assert.ok(!adminConsole.includes('method: "POST"'), "operator triage console must remain read-only");

assert.match(guide, /대표가 예외를 판단하는 순서/);
assert.match(guide, /연결 주문 상세 확인/);
assert.match(guide, /연결 계정 상세 확인/);
assert.match(guide, /동일 구매의 유료 분석 화면을 다시 열도록 안내/);

assert.match(runbook, /exception-only email alerts notify active operators/);
assert.match(runbook, /linked-order action/);
assert.match(runbook, /linked-account action/);
assert.ok(!runbook.includes("No Slack, email, SMS, or real-time alert integration exists"), "runbook must not claim email alerts are absent");

assert.match(failureRoute, /export async function GET/);
assert.ok(!/export async function (POST|PATCH|PUT|DELETE)/.test(failureRoute), "failure queue route must remain read-only");

console.log("operator exception triage regression passed ✓");
