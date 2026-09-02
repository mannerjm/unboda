import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const page = readFileSync("app/admin/page.tsx", "utf8");
const consoleUi = readFileSync("app/admin/AdminLookupConsole.tsx", "utf8");
const shell = readFileSync("app/components/AppShell.tsx", "utf8");

assert(page.includes("await requireOperator()") && page.includes('redirect("/auth/login?returnTo=/admin")'), "/admin must authorize server-side and redirect unauthenticated users to login");
assert(page.includes("접근 권한 없음") && !page.includes("AppShell"), "non-operators must receive a minimal denied state without customer navigation");
assert(!shell.includes('href: "/admin"') && !shell.includes("CS CONSOLE"), "/admin must not appear in normal or mobile navigation");
assert(consoleUi.includes('/api/internal/admin/customers?email=${encodeURIComponent(email.trim())}') && consoleUi.includes('/api/internal/admin/orders/${encodeURIComponent(orderId.trim())}'), "admin UI must call only approved exact-match lookup APIs");
assert(consoleUi.includes('credentials: "same-origin"') && consoleUi.includes('cache: "no-store"') && !consoleUi.includes("localStorage") && !consoleUi.includes("sessionStorage"), "admin lookup results must use same-origin no-store fetches without browser persistence");
assert(consoleUi.includes("analysisEditionLabel") && consoleUi.includes("분석 회차"), "order UI must visibly present the exact analysis edition");
for (const forbidden of ["birthDate", "birthTime", "calendarType", "leapMonth", "gender", "paymentKey", "payment_key", "providerPayload", "SERVICE_ROLE", "PAYMENT_RECONCILIATION_SECRET", "TOSS_SECRET", "NICE", "PASS", "claimToken", "leaseToken", "refundAction", "retryReport", "grantEntitlement", "revokeEntitlement", "setPaidEligibility"]) {
  assert(!consoleUi.includes(forbidden), `admin UI must not render or invoke ${forbidden}`);
}
assert(!/\b(?:DI|CI)\b/.test(consoleUi), "admin UI must not render DI or CI identity data");
assert(!consoleUi.includes("method: \"POST\"") && !consoleUi.includes("method: \"PATCH\"") && !consoleUi.includes("method: \"DELETE\""), "admin UI must not send privileged write requests");
console.log("admin-read-only-ui-regression passed ✓");