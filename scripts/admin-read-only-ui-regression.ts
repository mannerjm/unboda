import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const page = readFileSync("app/admin/page.tsx", "utf8");
const consoleUi = readFileSync("app/admin/AdminLookupConsole.tsx", "utf8");
const overview = readFileSync("app/admin/AdminOperationsOverview.tsx", "utf8");
const guide = readFileSync("app/admin/guide/page.tsx", "utf8");
const shell = readFileSync("app/components/AppShell.tsx", "utf8");

assert(page.includes("await requireOperator()") && page.includes('redirect("/auth/login?returnTo=/admin")'), "/admin must authorize server-side and redirect unauthenticated users to login");
assert(page.includes("접근 권한 없음") && !page.includes("AppShell"), "non-operators must receive a minimal denied state without customer navigation");
assert(page.includes("getOperationalFailureSummary") && page.includes("getAiConsultingOperationsReport") && page.includes("getAiConsultingQualityCostReport"), "admin home must aggregate CS, AI operations, and AI quality/cost health");
assert(page.includes("Promise.allSettled"), "admin home must degrade safely when one operational data source is unavailable");
assert(!shell.includes('href: "/admin"') && !shell.includes("CS CONSOLE"), "/admin must not appear in normal or mobile navigation");
assert(
  consoleUi.includes('/api/internal/admin/customers?email=${encodeURIComponent(exactEmail.trim())}') &&
    consoleUi.includes('/api/internal/admin/orders/${encodeURIComponent(exactOrderId.trim())}'),
  "admin UI must call only approved exact-match lookup APIs",
);
assert(consoleUi.includes('credentials: "same-origin"') && consoleUi.includes('cache: "no-store"') && !consoleUi.includes("localStorage") && !consoleUi.includes("sessionStorage"), "admin lookup results must use same-origin no-store fetches without browser persistence");
assert(consoleUi.includes("initialFailureSummary") && consoleUi.includes("analysisEditionLabel") && consoleUi.includes("분석 회차"), "admin console must show the initial health summary and exact analysis edition");
assert(overview.includes('href="/admin/guide"') && overview.includes('href="/admin/ai-consulting/operations"') && overview.includes('href="/admin/ai-consulting"'), "operator dashboard must link to the guide and AI operations surfaces");
assert(overview.includes("대표 직접 확인 우선") && overview.includes("AI 질문권 무결성"), "operator dashboard must distinguish owner attention and AI charge integrity");
assert(guide.includes("await requireOperator()") && guide.includes("절대 하지 않는 것") && guide.includes("Production DB"), "owner guide must be operator-gated and state forbidden direct-production actions");
for (const forbidden of ["birthDate", "birthTime", "calendarType", "leapMonth", "gender", "paymentKey", "payment_key", "providerPayload", "SERVICE_ROLE", "PAYMENT_RECONCILIATION_SECRET", "CRON_SECRET", "TOSS_SECRET", "NICE", "PASS", "claimToken", "leaseToken", "refundAction", "retryReport", "grantEntitlement", "revokeEntitlement", "setPaidEligibility"]) {
  assert(!consoleUi.includes(forbidden), `admin UI must not render or invoke ${forbidden}`);
  assert(!overview.includes(forbidden), `admin overview must not render or invoke ${forbidden}`);
}
assert(!/\b(?:DI|CI)\b/.test(consoleUi), "admin UI must not render DI or CI identity data");
assert(!consoleUi.includes("method: \"POST\"") && !consoleUi.includes("method: \"PATCH\"") && !consoleUi.includes("method: \"DELETE\""), "admin UI must not send privileged write requests");
assert(!overview.includes("fetch(") && !guide.includes("fetch("), "overview and guide must remain read-only server-rendered surfaces");
console.log("admin-read-only-ui-regression passed ✓");
