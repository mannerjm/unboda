/**
 * Static-only regression for scripts/paid-generation-staging-integration.ts.
 *
 * This intentionally reads the target script as text and never imports it —
 * that script performs real Supabase writes at its top level (`void main()`),
 * so importing it would execute it. No network calls happen here.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const script = read("scripts/paid-generation-staging-integration.ts").replace(/\r\n/g, "\n");

// 1. assertStagingSupabaseProject() must run before any Supabase-client-capable import.
const guardCallIndex = script.indexOf("assertStagingSupabaseProject();");
const firstClientImportIndex = Math.min(
  ...["../app/lib/paidReports/server", "../app/lib/paidGenerationTelemetryServer", "../app/lib/supabase/admin"]
    .map((moduleSpecifier) => script.indexOf(`await import("${moduleSpecifier}")`))
    .filter((index) => index !== -1),
);
assert(guardCallIndex !== -1, "script must call assertStagingSupabaseProject()");
assert(
  firstClientImportIndex !== -1 && guardCallIndex < firstClientImportIndex,
  "assertStagingSupabaseProject() must run before any Supabase-client-capable module is imported",
);
console.log("1. staging project guard runs before any Supabase client import \u2713");

// 2. STAGING_RUNTIME_TEST_CONFIRM must gate writes, checked strictly for "yes".
assert(
  script.includes("STAGING_RUNTIME_TEST_CONFIRM") && script.includes('!== "yes"'),
  "script must require STAGING_RUNTIME_TEST_CONFIRM to be exactly \"yes\"",
);
const confirmCallIndex = script.indexOf("requireRuntimeTestConfirmation();");
assert(
  confirmCallIndex !== -1 && guardCallIndex < confirmCallIndex && confirmCallIndex < firstClientImportIndex,
  "STAGING_RUNTIME_TEST_CONFIRM check must run after the project guard and before any client import",
);
console.log("2. STAGING_RUNTIME_TEST_CONFIRM guard present and ordered correctly \u2713");

// 3. cleanup must delete only the paid_reports fixture (no direct attempts DELETE,
//    since service_role has no DELETE grant on paid_generation_attempts), then verify
//    via read-only SELECT that both tables are empty for this run, throwing otherwise.
assert(script.includes("finally {"), "script must clean up fixtures in a finally block");
assert(
  !/\.from\("paid_generation_attempts"\)\s*\n\s*\.delete\(\)/.test(script),
  "script must not directly DELETE from paid_generation_attempts (service_role has no delete grant)",
);
const reportDeleteIndex = script.indexOf('.from("paid_reports")\n        .delete()');
assert(reportDeleteIndex !== -1, "script must delete the paid_reports fixture to cascade-delete its attempts");
const verificationSelectIndex = script.indexOf(
  '.from("paid_generation_attempts")\n        .select("attempt_id")',
);
assert(
  verificationSelectIndex !== -1 && reportDeleteIndex < verificationSelectIndex,
  "report delete must run before the read-only attempt-count verification",
);
assert(
  script.includes("cleanup failed:") && script.includes("still remain"),
  "cleanup must throw if any attempt or report row still remains after cascade delete",
);
console.log("3. cleanup deletes only the report fixture and verifies cascade via read-only SELECT \u2713");

// 4. no hardcoded production/user fixture identifiers - only env-sourced identity.
const uuidLiteralPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
assert(!uuidLiteralPattern.test(script), "script must not hardcode any UUID-shaped fixture identifier");
assert(
  script.includes("process.env.STAGING_RUNTIME_TEST_USER_ID") &&
    script.includes("process.env.STAGING_RUNTIME_TEST_PROFILE_ID"),
  "script must source fixture identity from env vars, not hardcoded IDs",
);
console.log("4. no hardcoded production/user fixture identifiers \u2713");

// 5. fixture isolation prefix and no OpenAI usage.
assert(script.includes("staging-runtime-test-"), "fixtures must use the staging-runtime-test- prefix");
assert(
  !script.includes("getOpenAIClient") &&
    !script.includes("generateAnalysisText") &&
    !script.includes("generatePaidAnalysisDetailV2"),
  "script must not call OpenAI or the real generation pipeline",
);
console.log("5. fixture prefix present and no OpenAI/generation call paths \u2713");

console.log("paid-generation-staging-integration-regression passed");
