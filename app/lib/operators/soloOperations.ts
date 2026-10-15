import "server-only";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { estimateAiConsultingCostUsd } from "@/app/lib/aiConsulting/qualityCost";
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
  aiAnomaly: "AI_FAILURE_RATE" | "AI_COST_SPIKE" | "AI_HIGH_LATENCY" | null;
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
    db.from("support_requests").select("id", { head: true, count: "exact" }).in("status", ["OPEN", "IN_REVIEW", "WAITING_USER"]),
    db.from("support_requests").select("id", { head: true, count: "exact" }).in("status", ["OPEN", "IN_REVIEW", "WAITING_USER"]).lt("created_at", since24h),
    db.from("paid_product_reviews").select("id", { head: true, count: "exact" }).eq("status", "PENDING"),
    db.from("paid_product_reviews").select("id", { head: true, count: "exact" }).eq("status", "PENDING").lt("created_at", since48h),
    db.from("ai_credit_refund_requests").select("id", { head: true, count: "exact" }).in("status", ["REVIEW_REQUIRED", "MANUAL_BANK_REQUIRED"]),
    db.from("ai_credit_refund_requests").select("id", { head: true, count: "exact" }).in("status", ["PROVIDER_UNKNOWN", "PENDING"]),
    db.from("operator_alert_deliveries").select("id", { head: true, count: "exact" }).eq("status", "FAILED_FINAL"),
    db.from("support_notification_deliveries").select("id", { head: true, count: "exact" }).eq("status", "FAILED_FINAL"),
    db.from("ai_consulting_attempts").select("status,model,input_tokens,output_tokens,duration_ms,started_at").gte("started_at", since24h)
      .order("started_at", { ascending: false }).limit(500),
    db.from("paid_report_recovery_attempts").select("report_id", { head: true, count: "exact" }).gte("attempt_count", 3).eq("last_outcome", "FAILED"),
    readJobHeartbeats(),
  ]);
  const queries = [support,supportAged,review,reviewAged,creditRefund,creditRefundRecovering,alerts,supportEmails,aiAttempts,exhausted];
  if (queries.some((result) => result.error)) throw new Error("SOLO_OPERATIONS_DASHBOARD_UNAVAILABLE");

  const attempts = aiAttempts.data ?? [];
  const failed = attempts.filter((attempt) => attempt.status === "failed" || attempt.status === "timed_out").length;
  const durationRows = attempts.filter((attempt) => typeof attempt.duration_ms === "number");
  const averageDuration = durationRows.length > 0
    ? durationRows.reduce((sum, attempt) => sum + (attempt.duration_ms ?? 0), 0) / durationRows.length : 0;
  const cost = attempts.reduce((sum, attempt) => sum + (estimateAiConsultingCostUsd({
    model: attempt.model, inputTokens: attempt.input_tokens, outputTokens: attempt.output_tokens,
  }) ?? 0), 0);
  // Suppress sparse-sample false alarms. Cost is only an estimate based on stored tokens.
  const aiAnomaly = cost >= 5 ? "AI_COST_SPIKE"
    : attempts.length >= 20 && failed / attempts.length >= 0.25 ? "AI_FAILURE_RATE"
    : durationRows.length >= 20 && averageDuration >= 30000 ? "AI_HIGH_LATENCY" : null;
  return {
    supportActive: support.count ?? 0, supportOverdue: supportAged.count ?? 0,
    reviewsPending: review.count ?? 0, reviewsOverdue: reviewAged.count ?? 0,
    creditRefundManual: creditRefund.count ?? 0, creditRefundRecovering: creditRefundRecovering.count ?? 0,
    failedOwnerEmails: alerts.count ?? 0, failedSupportEmails: supportEmails.count ?? 0,
    aiAnomaly, aiAttempts24h: attempts.length, aiEstimatedCost24hUsd: cost,
    scheduler: summarizeHeartbeat(heartbeats,"reconcile").state,
    reportRecovery: summarizeHeartbeat(heartbeats,"paid_report_recovery").state,
    reportRecoveryExhausted: exhausted.count ?? 0,
  };
}
