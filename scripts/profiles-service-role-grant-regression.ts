import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

/**
 * Whitespace/newline-tolerant check for a single `grant <op>[, <op>...] on table
 * public.<table> to <role>` statement that includes `op` in its operation list.
 */
function hasGrant(sql: string, op: string, table: string, role: string): boolean {
  const statementPattern = new RegExp(
    `grant\\s+([\\s\\S]*?)\\s+on\\s+table\\s+${table.replace(".", "\\.")}\\s+to\\s+${role}`,
    "i",
  );
  const match = statementPattern.exec(sql);

  if (!match) {
    return false;
  }

  const operations = match[1];
  return new RegExp(`\\b${op}\\b`, "i").test(operations);
}

const selectGrant = read("supabase/migrations/014_profiles_service_role_select_grant.sql");
const writeGrant = read("supabase/migrations/015_profiles_service_role_write_grant.sql");
const profilesMigration = read("supabase/migrations/002_profiles.sql");

// --- 014 must still grant SELECT to service_role on public.profiles ---
assert(
  hasGrant(selectGrant, "select", "public.profiles", "service_role"),
  "014 must grant SELECT on public.profiles to service_role",
);

// --- 015 must grant exactly INSERT, UPDATE, DELETE to service_role ---
for (const op of ["insert", "update", "delete"]) {
  assert(
    hasGrant(writeGrant, op, "public.profiles", "service_role"),
    `015 must grant ${op.toUpperCase()} on public.profiles to service_role`,
  );
}

// --- neither file may grant everything at once ---
for (const migration of [selectGrant, writeGrant]) {
  assert(
    !/grant\s+all\b/i.test(migration),
    "profiles service_role grants must never use GRANT ALL",
  );
}

// --- 015 must not widen anon/authenticated write access ---
assert(
  !/to\s+(anon|authenticated)\b/i.test(writeGrant),
  "015 must not grant anything to anon/authenticated",
);
assert(
  !writeGrant.includes("revoke"),
  "015 must only add the service_role write grant, not touch existing revokes",
);

// --- 015 must target public.profiles only, no other table ---
assert(
  !/on\s+table\s+(?!public\.profiles\b)\S+/i.test(writeGrant),
  "015 must only grant on public.profiles",
);

// --- 002's original RLS/revoke contract must still stand untouched ---
for (const clause of [
  "alter table public.profiles enable row level security",
  'create policy "profiles_select_own"',
  "revoke insert, update, delete on public.profiles from anon, authenticated",
]) {
  assert(
    profilesMigration.toLowerCase().includes(clause.toLowerCase()),
    `002 must still contain: ${clause}`,
  );
}

console.log("profiles service_role grant contract verified ✓");
