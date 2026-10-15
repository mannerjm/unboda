import "server-only";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { readJobHeartbeats, summarizeHeartbeat } from "./heartbeat";

export type SoloOperationsSnapshot = {
  supportActive: number;
  supportOverdue: number;
  reviewsPending: number;
  reviewsOverdue: number;
  creditRefundManual: number;
  creditRefundRecovering: number;
  failedOwnerEmails: number;
  failedSupportEmails: number;
  aiAnomaly: "AI_FAILURE_RATE" | "AI_COST_SPIKE" | "AI_HIGH_LATENCY" | "AI_COST_ESTIMATE_UNAVAILABLE" | null;
  aiAttempts24h: number;
  aiEstimatedCost24hUsd: number;
  scheduler: "healthy" | "stale" | "failed" | "missing";
  reportRecovery: "healthy" | "stale" | "failed" | "missing";
  reportRecoveryExhausted: number;
};

export async function getSoloOperationsSnapshot(): Promise<SoloOperationsSnapshot> {
  const db = createAdminClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const [
    support, supportAged, review, reviewAged, creditRefund, creditRefundRecovering,
    alerts, supportEmails, aiAttempts, exhausted, heartbeats,
  ] = await Promise.all([
    db.from("support_requests").select("id", { head: true, count: "exact" }).in("status", ["OPEN", "IN_REVIEW"]),
    db.from("support_requests").select("id", { head: true, count: "exact" }).in("status", ["OPEN", "IN_REVIEW"]).lt("created_at", since24h),
    db.from("paid_product_reviews").select("id", { head: true, count: "exact" }).eq("status", "PENDING"),
    db.from("paid_product_reviews").select("id", { head: true, count: "exact" }).eq("status", "PENDING").lt("created_at", since48h),
    db.from("ai_credit_refund_requests").select("id", { head: true, count: "exact" }).in("status", ["REVIEW_REQUIRED", "MANUAL_BANK_REQUIRED"]),
    db.from("ai_credit_refund_requests").select("id", { head: true, count: "exact" }).in("status", ["PROVIDER_UNKNOWN", "PENDING"]),
    db.from("operator_alert_deliveries").select("id", { head: true, count: "exact" }).eq("status", "FAILED_FINAL"),
    db.from("support_notification_deliveries").select("id", { head: true, count: "exact" }).eq("status", "FAILED_FINAL"),
    db.rpc("get_ai_solo_operations_metrics_24h"),
    db.rpc("count_exhausted_paid_report_recoveries"),
    readJobHeartbeats(),
  ]);
  const queries = [support,supportAged,review,reviewAged,creditRefund,creditRefundRecovering,alerts,supportEmails,aiAttempts,exhausted];
  if (queries.some((result) => result.error)) throw new Error("SOLO_OPERATIONS_DASHBOARD_UNAVAILABLE");

  const metrics = (aiAttempts.data ?? [])[0] as {
    attempt_count: number; failed_count: number; duration_count: number;
    average_duration_ms: number | string; estimated_cost_usd: number | string;
    unknown_cost_count: number;
  } | undefined;
  if (!metrics) throw new Error("SOLO_OPERATIONS_AI_METRICS_UNAVAILABLE");
  const attempts = metrics.attempt_count;
  const failed = metrics.failed_count;
  const cost = Number(metrics.estimated_cost_usd);
  const averageDuration = Number(metrics.average_duration_ms);
  const aiAnomaly = cost >= 5 ? "AI_COST_SPIKE"
    : attempts >= 20 && failed / attempts >= 0.25 ? "AI_FAILURE_RATE"
    : metrics.duration_count >= 20 && averageDuration >= 30000 ? "AI_HIGH_LATENCY"
    : metrics.unknown_cost_count >= 20 ? "AI_COST_ESTIMATE_UNAVAILABLE" : null;
  return {
    supportActive: support.count ?? 0, supportOverdue: supportAged.count ?? 0,
    reviewsPending: review.count ?? 0, reviewsOverdue: reviewAged.count ?? 0,
    creditRefundManual: creditRefund.count ?? 0, creditRefundRecovering: creditRefundRecovering.count ?? 0,
    failedOwnerEmails: alerts.count ?? 0, failedSupportEmails: supportEmails.count ?? 0,
    aiAnomaly, aiAttempts24h: attempts.length, aiEstimatedCost24hUsd: cost,
    scheduler: summarizeHeartbeat(heartbeats,"reconcile").state,
    reportRecovery: summarizeHeartbeat(heartbeats,"paid_report_recovery").state,
    reportRecoveryExhausted: Number(exhausted.data ?? 0),
  };
}
