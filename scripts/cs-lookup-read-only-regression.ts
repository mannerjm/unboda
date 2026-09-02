import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const migration = readFileSync("supabase/migrations/034_cs_lookup_auth_email_rpc.sql", "utf8");
const operators = readFileSync("app/lib/operators/server.ts", "utf8");
const lookup = readFileSync("app/lib/operators/csLookupServer.ts", "utf8");
const customersRoute = readFileSync("app/api/internal/admin/customers/route.ts", "utf8");
const ordersRoute = readFileSync("app/api/internal/admin/orders/[orderId]/route.ts", "utf8");

assert(migration.includes("lookup_auth_user_by_exact_email") && migration.includes("limit 2") && migration.includes("lower(email) = lower(btrim(lookup_email))"), "email lookup must be exact, normalized, and bounded");
assert(migration.includes("revoke all on function public.lookup_auth_user_by_exact_email(text) from public, anon, authenticated") && migration.includes("grant execute on function public.lookup_auth_user_by_exact_email(text) to service_role"), "auth email lookup must remain service-role-only");
assert(operators.includes('"SUCCESS", "NOT_FOUND", "INVALID_INPUT", "ERROR"'), "audit outcomes must distinguish lookup result classes");
assert(lookup.includes('import "server-only";') && lookup.includes("await requireOperator()") && lookup.includes("await auditOrFail"), "privileged lookup must be server-only, operator-guarded, and audited before return");
assert(lookup.includes("MAX_EMAIL_LENGTH") && lookup.includes("normalizeExactEmail") && lookup.includes("normalizeExactOrderId") && lookup.includes("EXACT_UUID_PATTERN"), "email and order lookup inputs must be strictly bounded and validated");
assert(lookup.includes("matches.length !== 1") && lookup.includes('new CsLookupError("INTEGRITY_ERROR")'), "unexpected multiple exact-email matches must fail closed");
assert(lookup.includes("paymentResult.error") && lookup.includes("refundResult.error") && lookup.includes("lifecycleResult.error") && lookup.includes('new CsLookupError(authResult.error || !authResult.data.user ? "INTEGRITY_ERROR" : "LOOKUP_FAILED")'), "any privileged order lookup dependency failure must be audited and fail closed rather than return a partial DTO");
assert(lookup.includes("analysis_edition_key") && lookup.includes(".eq(\"analysis_edition_key\", order.analysis_edition_key)"), "order lookup must preserve exact-edition entitlement and report joins");
assert(lookup.includes('status: "none"') && lookup.includes("ownerReviewRequired"), "report absence and operational escalation states must be represented safely");
for (const forbidden of ["birth_date", "birthDate", "birth_time", "birthTime", "calendar_type", "calendarType", "is_leap_month", "gender", "payment_key", "provider_order_id", "analysis_input_snapshot", "claim_token", "lease_token"]) {
  assert(!lookup.includes(forbidden), `CS DTO must not expose ${forbidden}`);
}
assert(!/\b(?:DI|CI)\b/.test(lookup), "CS DTO must not expose DI or CI identity fields");
assert(customersRoute.includes("lookupCustomerByExactEmail") && ordersRoute.includes("lookupOrderByExactId") && customersRoute.includes("Cache-Control") && ordersRoute.includes("Cache-Control"), "internal routes must expose only guarded no-store lookup DTOs");
assert(!customersRoute.includes("POST") && !ordersRoute.includes("POST") && !lookup.includes(".insert(") && !lookup.includes(".update(") && !lookup.includes(".delete("), "CS lookup service and routes must remain read-only");
console.log("cs-lookup-read-only-regression passed ✓");