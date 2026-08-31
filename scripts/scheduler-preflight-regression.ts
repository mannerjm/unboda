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
// STEP 57D-46 PHASE 3E-3: the single hourly cron now targets the shared internal dispatcher,
// which invokes the payment reconciliation worker as a direct server-side call.
assert(crons[0]?.path === "/api/internal/reconcile", "cron must invoke the shared internal dispatcher route");
assert(crons[0]?.schedule === "0 * * * *", "cron must run at most hourly");

const dispatcherRoute = read("app/api/internal/reconcile/route.ts");
const schedulerAuth = read("app/lib/internal/schedulerAuth.ts");
assert(schedulerAuth.includes("PAYMENT_RECONCILIATION_SECRET"), "scheduler route must require a secret");
assert(schedulerAuth.includes("Bearer"), "scheduler route must accept Vercel Cron bearer authentication");
assert(dispatcherRoute.includes("export async function GET"), "scheduler route must expose GET for Vercel Cron");
assert(dispatcherRoute.includes("force-dynamic") && dispatcherRoute.includes("no-store"), "cron mutation route must be dynamic and uncached");

const server = read("app/lib/purchases/server.ts");
assert(server.includes("runId") && server.includes("retryPending") && server.includes("escalation") && server.includes("durationMs"), "scheduler result must be structured");
assert(server.includes("max_retry_count") && server.includes("next_retry_at"), "retry budget must be durable");
assert(server.includes("Math.min(60 * 60 * 1000"), "retry backoff must be bounded");
assert(server.includes("records.slice(0, 50)"), "reconciliation batch must be bounded");
assert(server.includes("terminal_mismatch"), "permanent mismatches must remain terminal");

const migration = read("supabase/migrations/018_toss_reconciliation_retry_budget.sql");
for (const field of ["retry_count", "max_retry_count", "next_retry_at", "last_attempt_at"]) {
  assert(migration.includes(field), `retry migration must persist ${field}`);
}

console.log("scheduler preflight regression passed");