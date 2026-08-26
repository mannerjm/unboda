import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const vercel = JSON.parse(read("vercel.json")) as {
  crons?: Array<{ path?: string; schedule?: string }>;
};
const crons = vercel.crons ?? [];
assert(crons.length === 1, "exactly one bounded reconciliation cron must exist");
assert(crons[0]?.path === "/api/internal/payments/reconcile", "cron must invoke reconciliation route");
assert(crons[0]?.schedule === "0 * * * *", "cron must run at most hourly");

const route = read("app/api/internal/payments/reconcile/route.ts");
assert(route.includes("PAYMENT_RECONCILIATION_SECRET"), "scheduler route must require a secret");
assert(route.includes("Bearer"), "scheduler route must accept Vercel Cron bearer authentication");
assert(route.includes("export async function GET"), "scheduler route must expose GET for Vercel Cron");
assert(route.includes("force-dynamic") && route.includes("no-store"), "cron mutation route must be dynamic and uncached");
assert(route.includes("runId") && route.includes("retryPending") && route.includes("escalation") && route.includes("durationMs"), "scheduler result must be structured");

const server = read("app/lib/purchases/server.ts");
assert(server.includes("max_retry_count") && server.includes("next_retry_at"), "retry budget must be durable");
assert(server.includes("Math.min(60 * 60 * 1000"), "retry backoff must be bounded");
assert(server.includes("records.slice(0, 50)"), "reconciliation batch must be bounded");
assert(server.includes("terminal_mismatch"), "permanent mismatches must remain terminal");

const migration = read("supabase/migrations/018_toss_reconciliation_retry_budget.sql");
for (const field of ["retry_count", "max_retry_count", "next_retry_at", "last_attempt_at"]) {
  assert(migration.includes(field), `retry migration must persist ${field}`);
}

console.log("scheduler preflight regression passed");