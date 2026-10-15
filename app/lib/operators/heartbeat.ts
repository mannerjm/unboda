import "server-only";
import { createAdminClient } from "@/app/lib/supabase/admin";

export type JobName = "reconcile" | "paid_report_recovery";
export type HeartbeatRow = {
  job_name: JobName;
  last_attempt_at: string;
  last_success_at: string | null;
  last_error_code: string | null;
};

export async function recordJobHeartbeat(job: JobName, ok: boolean, code?: string): Promise<void> {
  const { error } = await createAdminClient().rpc("record_internal_job_heartbeat", {
    p_job_name: job, p_ok: ok, p_error_code: ok ? null : (code ?? "JOB_FAILED"),
  });
  if (error) throw new Error("INTERNAL_HEARTBEAT_PERSIST_FAILED");
}

export async function readJobHeartbeats(): Promise<HeartbeatRow[]> {
  const { data, error } = await createAdminClient().from("internal_job_heartbeats")
    .select("job_name,last_attempt_at,last_success_at,last_error_code");
  if (error) throw new Error("INTERNAL_HEARTBEAT_READ_FAILED");
  return (data ?? []) as HeartbeatRow[];
}

export function summarizeHeartbeat(rows: HeartbeatRow[], job: JobName, now = Date.now()): {
  state: "healthy" | "stale" | "failed" | "missing"; lastSuccessAt: string | null;
} {
  const entry = rows.find((row) => row.job_name === job);
  if (!entry || !entry.last_success_at) return { state: "missing", lastSuccessAt: entry?.last_success_at ?? null };
  if (entry.last_error_code) return { state: "failed", lastSuccessAt: entry.last_success_at };
  const last = Date.parse(entry.last_success_at);
  return {
    state: Number.isFinite(last) && now - last <= 150 * 60 * 1000 ? "healthy" : "stale",
    lastSuccessAt: entry.last_success_at,
  };
}
