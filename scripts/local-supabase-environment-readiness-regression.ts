import { readFileSync } from "fs";
import { join } from "path";
import {
  assertDisposableSupabaseDatabaseUrl,
  assertDisposableSupabaseUrl,
} from "./lib/disposable-supabase-target";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

assertDisposableSupabaseUrl("http://127.0.0.1:54321");
assertDisposableSupabaseDatabaseUrl(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);

for (const unsafeUrl of [
  "https://project.supabase.co",
  "http://staging.internal:54321",
  "postgresql://postgres:password@db.example.com:5432/postgres",
]) {
  let rejected = false;
  try {
    unsafeUrl.startsWith("postgresql:")
      ? assertDisposableSupabaseDatabaseUrl(unsafeUrl)
      : assertDisposableSupabaseUrl(unsafeUrl);
  } catch {
    rejected = true;
  }
  assert(rejected, `unsafe target must be rejected: ${unsafeUrl}`);
}

const config = read("supabase/config.toml");
assert(config.includes('project_id = "unboda-local"'), "local project id must be explicit");
assert(config.includes("port = 54321") && config.includes("port = 54322"), "local API and DB ports must be configured");

const migration = read("supabase/migrations/016_toss_payment_reconciliation.sql");
assert(migration.includes("toss_payment_records"), "payment migration must be present at version 016");

const worker = read("app/api/internal/payments/reconcile/route.ts");
assert(worker.includes("PAYMENT_RECONCILIATION_SECRET"), "reconciliation worker must be authenticated");
assert(worker.includes("listTossPaymentsForReconciliation"), "worker must invoke reconciliation discovery");

console.log("local Supabase environment readiness regression passed");