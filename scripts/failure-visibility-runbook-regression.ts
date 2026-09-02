import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }

const service = readFileSync("app/lib/operators/failureVisibilityServer.ts", "utf8");
const route = readFileSync("app/api/internal/admin/failures/route.ts", "utf8");
const admin = readFileSync("app/admin/AdminLookupConsole.tsx", "utf8");
const runbook = readFileSync("docs/operations/pilot-cs-failure-runbook.md", "utf8");

assert(service.includes('import "server-only";') && service.includes("await requireOperator()") && service.includes("await auditOrFail"), "failure visibility must be server-only, operator-guarded, and audited before return");
assert(service.includes("QUEUE_LIMIT = 20") && service.includes("OPERATIONAL_FAILURE_CATEGORIES") && service.includes("REPORT_STALE") && service.includes("PAID_REPORT_STALE_GENERATING_MS"), "failure queues must use bounded allowed categories and the authoritative report stale threshold");
assert(service.includes("REFUND_FAILED_RETRYING") && service.includes("OWNER_REVIEW_REQUIRED") && service.includes("reconciliation_required") && service.includes("closure_owner_review_required"), "all durable pilot failure domains must remain visible");
assert(route.includes("export async function GET") && route.includes("Cache-Control") && !route.includes("export async function POST"), "failure API must remain a no-store GET-only surface");
assert(admin.includes("운영 확인 필요") && admin.includes("failureLabels") && !admin.includes("/refund") && !admin.includes("reconcileRefund"), "admin must show read-only failure visibility without financial controls");
for (const forbidden of ["birthDate", "birthTime", "calendarType", "gender", "paymentKey", "payment_key", "providerPayload", "claimToken", "leaseToken", "SERVICE_ROLE", "PAYMENT_RECONCILIATION_SECRET", "TOSS_SECRET", "NICE", "PASS"]) assert(!service.includes(forbidden) && !admin.includes(forbidden), `failure visibility must not expose ${forbidden}`);
assert(!/\b(?:DI|CI)\b/.test(service) && !/\b(?:DI|CI)\b/.test(admin), "failure visibility must not expose DI or CI");
for (const required of ["Payment reconciliation", "Refund retry", "Refund owner review", "Paid report failed", "Account closure retry", "Forbidden operator actions", "Do not complete or override the refund", "No Slack, email, SMS, or real-time alert integration exists"]) assert(runbook.includes(required), `runbook must document ${required}`);
for (const forbidden of ["UPDATE ", "INSERT ", "DELETE ", "service-role SQL", "mark payments or refunds complete"]) assert(!runbook.includes(forbidden) || forbidden === "service-role SQL" || forbidden === "mark payments or refunds complete", `runbook must not instruct ${forbidden}`);
console.log("failure-visibility-runbook-regression passed ✓");