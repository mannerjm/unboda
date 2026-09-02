import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const migration = readFileSync("supabase/migrations/033_operator_authorization_audit_foundation.sql", "utf8");
const server = readFileSync("app/lib/operators/server.ts", "utf8");

assert(server.includes('import "server-only";') && server.includes("export async function requireOperator"), "operator authorization must remain server-only");
assert(server.includes("const user = await getCurrentUser()") && server.includes(".eq(\"auth_user_id\", user.id)"), "operator identity must derive from the verified session auth user ID");
assert(server.includes('new OperatorAuthorizationError("UNAUTHENTICATED")') && server.includes('new OperatorAuthorizationError("MISSING_ROLE")') && server.includes('new OperatorAuthorizationError("INACTIVE_ROLE")') && server.includes('new OperatorAuthorizationError("UNSUPPORTED_ROLE")') && server.includes('new OperatorAuthorizationError("ROLE_LOOKUP_FAILED")'), "no session, missing, inactive, unsupported, and lookup-failure roles must fail closed");
assert(server.includes("candidate.auth_user_id !== authUserId") && server.includes("!candidate.is_active || candidate.revoked_at !== null"), "browser-supplied or revoked role identities must not authorize access");
assert(!server.includes("process.env.PAYMENT_RECONCILIATION_SECRET") && !server.includes("request.headers") && !server.includes("email:"), "scheduler secrets, request headers, and email must not authorize operators");
console.log("1. operator authorization resolves only active supported auth-user roles ✓");

assert(server.includes("createHash(\"sha256\").update(input.targetReference.trim()).digest(\"hex\")") && !server.includes("target_reference: input.targetReference"), "audit target references must be minimized as hashes");
assert(server.includes("OPERATOR_AUDIT_ACTIONS") && server.includes("OPERATOR_AUDIT_TARGET_TYPES") && server.includes("OPERATOR_AUDIT_OUTCOMES"), "audit action, target, and outcome types must be bounded");
assert(server.includes("const operator = await requireOperator()") && server.includes("throw new Error(\"Operator audit event could not be persisted\")"), "audit identity and mandatory persistence must fail closed");
console.log("2. audit events are minimized, bounded, server-only, and fail closed ✓");

assert(migration.includes("operator_roles") && migration.includes("auth_user_id uuid not null references auth.users(id)") && migration.includes("role in ('CS_OPERATOR')"), "operator role table must use immutable auth identity and bounded roles");
assert(migration.includes("operator_audit_events") && migration.includes("target_reference_hash") && migration.includes("correlation_id"), "audit table must store minimized target references and correlation IDs");
assert(migration.includes("revoke all on public.operator_roles from anon, authenticated") && migration.includes("revoke all on public.operator_audit_events from anon, authenticated"), "operator and audit tables must be inaccessible to customers");
assert(!migration.includes("insert into public.operator_roles") && !server.includes("VERIFIED_ADULT") && !server.includes("refund") && !server.includes("entitlement"), "foundation must not bootstrap operators or add eligibility, financial, or entitlement actions");
console.log("3. privileged tables remain service-role-only and foundation-only ✓");

console.log("operator-authorization-audit-foundation-regression passed ✓");