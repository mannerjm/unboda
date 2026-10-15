import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getSoloOperationsSnapshot } from "./soloOperations";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const ALERT_FROM = "운보다 운영 알림 <noreply@mail.unboda.kr>";
const ADMIN_URL = "https://unboda.kr/admin";
const MAX_ALERT_ATTEMPTS = 10;
const STALE_SENDING_MS = 15 * 60 * 1000;

type IncidentKind =
  | "PAYMENT_OWNER_REVIEW"
  | "REFUND_OWNER_REVIEW"
  | "AI_CREDIT_REFUND_OWNER_REVIEW"
  | "REPORT_FAILED"
  | "CLOSURE_OWNER_REVIEW"
  | "AI_CHARGE_INTEGRITY"
  | "REPORT_RECOVERY_EXHAUSTED"
  | "SUPPORT_OVERDUE"
  | "REVIEWS_OVERDUE"
  | "NOTIFICATION_FAILURE"
  | "AI_OPERATIONS_ANOMALY"
  | "SCHEDULER_UNHEALTHY";

type Incident = {
  kind: IncidentKind;
  reference: string;
  version: string;
};

type DeliveryStatus = "PENDING" | "SENDING" | "FAILED_RETRYING" | "SENT" | "FAILED_FINAL";

type DeliveryRow = {
  id: string;
  alert_key: string;
  incident_count: number;
  status: DeliveryStatus;
  attempt_count: number;
  max_attempt_count: number;
  next_retry_at: string | null;
  updated_at: string;
};

const DELIVERY_SELECT = "id,alert_key,incident_count,status,attempt_count,max_attempt_count,next_retry_at,updated_at";

export type OwnerAlertResult =
  | { status: "idle"; incidentCount: 0 }
  | { status: "unconfigured" | "no_recipients"; incidentCount: number }
  | { status: "already_sent" | "not_due" | "claim_lost" | "failed_final"; incidentCount: number }
  | { status: "sent"; incidentCount: number; recipientCount: number }
  | { status: "retrying"; incidentCount: number; errorCode: string };

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeVersion(value: string | null | undefined): string {
  return value && value.trim() ? value : "unknown";
}

function countKinds(incidents: readonly Incident[]): Record<IncidentKind, number> {
  const counts: Record<IncidentKind, number> = {
    PAYMENT_OWNER_REVIEW: 0,
    REFUND_OWNER_REVIEW: 0,
    AI_CREDIT_REFUND_OWNER_REVIEW: 0,
    REPORT_FAILED: 0,
    CLOSURE_OWNER_REVIEW: 0,
    AI_CHARGE_INTEGRITY: 0,
    REPORT_RECOVERY_EXHAUSTED: 0,
    SUPPORT_OVERDUE: 0,
    REVIEWS_OVERDUE: 0,
    NOTIFICATION_FAILURE: 0,
    AI_OPERATIONS_ANOMALY: 0,
    SCHEDULER_UNHEALTHY: 0,
  };
  for (const incident of incidents) counts[incident.kind] += 1;
  return counts;
}

async function collectAiChargeIntegrityIncidents(): Promise<Incident[]> {
  // Fully evaluated on the DB using indexed joins, not an arbitrary latest-500 slice.
  // The RPC only returns internal identifiers and timestamps, never user text.
  const { data, error } = await createAdminClient().rpc("list_ai_charge_integrity_incidents_24h");
  if (error) throw new Error("OWNER_ALERT_AI_INTEGRITY_READ_FAILED");
  return (data ?? []).map((row: { message_id: string; message_created_at: string }) => ({
    kind: "AI_CHARGE_INTEGRITY" as const,
    reference: digest(row.message_id),
    version: normalizeVersion(row.message_created_at),
  }));
}

async function collectOwnerReviewIncidents(): Promise<Incident[]> {
  const db = createAdminClient();
  const [paymentResult, refundResult, creditRefundResult, reportResult, recoveryStateResult, closureResult, aiIncidents, solo] = await Promise.all([
    db.from("toss_payment_records")
      .select("order_id,reconciliation_status")
      .in("reconciliation_status", ["terminal_mismatch", "reconciliation_failed"]),
    db.from("refund_workflows")
      .select("order_id,status,updated_at")
      .eq("status", "OWNER_REVIEW_REQUIRED"),
    db.from("ai_credit_refund_requests")
      .select("id,status,updated_at")
      .in("status", ["REVIEW_REQUIRED", "MANUAL_BANK_REQUIRED"]),
    db.from("paid_reports")
      .select("id,status,error_code,updated_at")
      .eq("status", "failed"),
    db.from("paid_report_recovery_attempts")
      .select("report_id,attempt_count,last_outcome"),
    db.from("account_lifecycles")
      .select("user_id,status,updated_at")
      .eq("status", "DELETION_REQUESTED")
      .eq("closure_owner_review_required", true),
    collectAiChargeIntegrityIncidents(),
    getSoloOperationsSnapshot(),
  ]);
  if (paymentResult.error || refundResult.error || creditRefundResult.error || reportResult.error || recoveryStateResult.error || closureResult.error) {
    throw new Error("OWNER_ALERT_OPERATIONAL_READ_FAILED");
  }

  const recoveryStates = new Map((recoveryStateResult.data ?? []).map((row) =>
    [row.report_id as string, { attempts: row.attempt_count as number, outcome: row.last_outcome as string }],
  ));
  const incidents: Incident[] = [
    ...(paymentResult.data ?? []).map((row) => ({
      kind: "PAYMENT_OWNER_REVIEW" as const,
      reference: digest(String(row.order_id)),
      // Retry timestamps are not a new incident. Notify again only when the
      // underlying payment reconciliation classification actually changes.
      version: normalizeVersion(row.reconciliation_status as string | null),
    })),
    ...(refundResult.data ?? []).map((row) => ({
      kind: "REFUND_OWNER_REVIEW" as const,
      reference: digest(String(row.order_id)),
      version: normalizeVersion(row.updated_at as string | null),
    })),
    ...(creditRefundResult.data ?? []).map((row) => ({
      kind: "AI_CREDIT_REFUND_OWNER_REVIEW" as const,
      reference: digest(String(row.id)),
      version: normalizeVersion(row.updated_at as string | null),
    })),
    ...(reportResult.data ?? []).filter((row) => {
      const recovery = recoveryStates.get(String(row.id));
      return row.error_code === "analysis_input_snapshot_invalid"
        || (recovery?.attempts ?? 0) >= 3;
    }).map((row) => ({
      kind: "REPORT_FAILED" as const,
      reference: digest(String(row.id)),
      version: normalizeVersion(row.error_code as string | null),
    })),
    ...(closureResult.data ?? []).map((row) => ({
      kind: "CLOSURE_OWNER_REVIEW" as const,
      reference: digest(String(row.user_id)),
      version: normalizeVersion(row.updated_at as string | null),
    })),
    ...aiIncidents,
    ...(solo.supportOverdue > 0 ? [{
      kind: "SUPPORT_OVERDUE" as const, reference: digest("support-overdue"), version: String(solo.supportOverdue),
    }] : []),
    ...(solo.reviewsOverdue > 0 ? [{
      kind: "REVIEWS_OVERDUE" as const, reference: digest("reviews-overdue"), version: String(solo.reviewsOverdue),
    }] : []),
    ...(solo.failedOwnerEmails + solo.failedSupportEmails > 0 ? [{
      kind: "NOTIFICATION_FAILURE" as const, reference: digest("notification-final-failure"),
      version: String(solo.failedOwnerEmails + solo.failedSupportEmails),
    }] : []),
    ...(solo.reportRecoveryExhausted > 0 ? [{
      kind: "REPORT_RECOVERY_EXHAUSTED" as const, reference: digest("report-recovery-exhausted"),
      version: String(solo.reportRecoveryExhausted),
    }] : []),
    ...(solo.aiAnomaly ? [{
      kind: "AI_OPERATIONS_ANOMALY" as const, reference: digest(solo.aiAnomaly),
      version: new Date().toISOString().slice(0, 10),
    }] : []),
    ...(["stale", "failed"].includes(solo.scheduler) || ["stale", "failed"].includes(solo.reportRecovery)
      ? [{ kind: "SCHEDULER_UNHEALTHY" as const, reference: digest("scheduler"),
          version: solo.scheduler + "/" + solo.reportRecovery }] : []),
  ];
  incidents.sort((a, b) => `${a.kind}:${a.reference}:${a.version}`.localeCompare(`${b.kind}:${b.reference}:${b.version}`));
  return incidents;
}

async function activeOperatorEmails(): Promise<string[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("operator_roles")
    .select("auth_user_id")
    .eq("role", "CS_OPERATOR")
    .eq("is_active", true)
    .is("revoked_at", null);
  if (error) throw new Error("OWNER_ALERT_OPERATOR_READ_FAILED");

  const emails = new Set<string>();
  for (const row of data ?? []) {
    const { data: authData, error: authError } = await db.auth.admin.getUserById(row.auth_user_id as string);
    if (authError) throw new Error("OWNER_ALERT_OPERATOR_AUTH_READ_FAILED");
    const email = authData.user?.email?.trim().toLowerCase();
    if (email) emails.add(email);
  }
  return [...emails];
}

function retryDelayMs(attemptCount: number): number {
  return Math.min(60, 5 * 2 ** Math.max(0, attemptCount - 1)) * 60 * 1000;
}

function safeErrorCode(error: unknown): string {
  if (error instanceof Error && /^OWNER_ALERT_[A-Z0-9_]+$/.test(error.message)) return error.message;
  return "OWNER_ALERT_SEND_FAILED";
}

async function ensureDelivery(alertKey: string, incidentCount: number): Promise<DeliveryRow> {
  const db = createAdminClient();
  const { error: insertError } = await db.from("operator_alert_deliveries").upsert({
    alert_key: alertKey,
    alert_type: "OWNER_REVIEW",
    incident_count: incidentCount,
    status: "PENDING",
    max_attempt_count: MAX_ALERT_ATTEMPTS,
  }, { onConflict: "alert_key", ignoreDuplicates: true });
  if (insertError) throw new Error("OWNER_ALERT_LEDGER_INSERT_FAILED");

  const { data, error } = await db.from("operator_alert_deliveries")
    .select(DELIVERY_SELECT)
    .eq("alert_key", alertKey)
    .single<DeliveryRow>();
  if (error || !data) throw new Error("OWNER_ALERT_LEDGER_READ_FAILED");
  return data;
}

async function recoverStaleSending(row: DeliveryRow): Promise<DeliveryRow | null> {
  if (row.status !== "SENDING") return row;
  const updatedMs = new Date(row.updated_at).getTime();
  if (!Number.isFinite(updatedMs) || Date.now() - updatedMs < STALE_SENDING_MS) return null;

  const db = createAdminClient();
  const { data, error } = await db.from("operator_alert_deliveries")
    .update({
      status: "FAILED_RETRYING",
      next_retry_at: new Date().toISOString(),
      last_error_code: "OWNER_ALERT_STALE_SENDING_RECOVERED",
    })
    .eq("id", row.id)
    .eq("status", "SENDING")
    .eq("updated_at", row.updated_at)
    .select(DELIVERY_SELECT)
    .maybeSingle<DeliveryRow>();
  if (error) throw new Error("OWNER_ALERT_STALE_RECOVERY_FAILED");
  return data ?? null;
}

async function claimDelivery(input: DeliveryRow): Promise<DeliveryRow | null> {
  const row = await recoverStaleSending(input);
  if (!row || row.status === "SENT" || row.status === "FAILED_FINAL" || row.status === "SENDING") return null;
  if (row.next_retry_at && new Date(row.next_retry_at).getTime() > Date.now()) return null;
  if (row.attempt_count >= row.max_attempt_count) return null;

  const db = createAdminClient();
  const { data, error } = await db.from("operator_alert_deliveries")
    .update({
      status: "SENDING",
      attempt_count: row.attempt_count + 1,
      next_retry_at: null,
      last_error_code: null,
    })
    .eq("id", row.id)
    .eq("status", row.status)
    .eq("attempt_count", row.attempt_count)
    .select(DELIVERY_SELECT)
    .maybeSingle<DeliveryRow>();
  if (error) throw new Error("OWNER_ALERT_LEDGER_CLAIM_FAILED");
  return data ?? null;
}

async function markSent(id: string, providerMessageId: string | null): Promise<void> {
  const { error } = await createAdminClient().from("operator_alert_deliveries").update({
    status: "SENT",
    sent_at: new Date().toISOString(),
    provider_message_id: providerMessageId,
    next_retry_at: null,
    last_error_code: null,
  }).eq("id", id).eq("status", "SENDING");
  if (error) throw new Error("OWNER_ALERT_LEDGER_COMPLETE_FAILED");
}

async function markFailed(row: DeliveryRow, errorCode: string, retryable: boolean): Promise<"retrying" | "failed_final"> {
  const exhausted = row.attempt_count >= row.max_attempt_count;
  const final = exhausted || !retryable;
  const { error } = await createAdminClient().from("operator_alert_deliveries").update({
    status: final ? "FAILED_FINAL" : "FAILED_RETRYING",
    next_retry_at: final ? null : new Date(Date.now() + retryDelayMs(row.attempt_count)).toISOString(),
    last_error_code: errorCode,
  }).eq("id", row.id).eq("status", "SENDING");
  if (error) throw new Error("OWNER_ALERT_LEDGER_FAILURE_FAILED");
  return final ? "failed_final" : "retrying";
}

function renderAlert(incidents: readonly Incident[]): { subject: string; text: string; html: string } {
  const counts = countKinds(incidents);
  const lines = [
    ["결제 상태 불일치", counts.PAYMENT_OWNER_REVIEW],
    ["환불 수동 확인", counts.REFUND_OWNER_REVIEW],
    ["AI 질문권 환불 예외", counts.AI_CREDIT_REFUND_OWNER_REVIEW],
    ["유료 분석 생성 실패", counts.REPORT_FAILED],
    ["계정 종료 수동 확인", counts.CLOSURE_OWNER_REVIEW],
    ["AI 질문권 무결성", counts.AI_CHARGE_INTEGRITY],
    ["유료 리포트 자동 복구 한도 초과", counts.REPORT_RECOVERY_EXHAUSTED],
    ["고객 문의 24시간 미처리", counts.SUPPORT_OVERDUE],
    ["구매 후기 48시간 검수 대기", counts.REVIEWS_OVERDUE],
    ["중요 이메일 최종 발송 실패", counts.NOTIFICATION_FAILURE],
    ["AI 상담 품질·비용 이상", counts.AI_OPERATIONS_ANOMALY],
    ["자동 작업 실행 이상", counts.SCHEDULER_UNHEALTHY],
  ].filter(([, count]) => Number(count) > 0) as Array<[string, number]>;
  const summary = lines.map(([label, count]) => `${label}: ${count}건`).join("\n");
  const htmlSummary = lines.map(([label, count]) => `<li>${label}: <strong>${count}건</strong></li>`).join("");
  return {
    subject: `[운보다] 대표 확인이 필요한 운영 예외 ${incidents.length}건`,
    text: `운보다에서 대표 확인이 필요한 운영 예외가 감지되었습니다.\n\n${summary}\n\n고객 개인정보나 주문 식별자는 이메일에 포함하지 않았습니다. 관리자 화면에서 확인하세요.\n${ADMIN_URL}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>운보다 운영 확인 필요</h2><p>대표 확인이 필요한 예외가 감지되었습니다.</p><ul>${htmlSummary}</ul><p>고객 개인정보나 주문 식별자는 이메일에 포함하지 않았습니다.</p><p><a href="${ADMIN_URL}">운영 대시보드에서 확인하기</a></p></div>`,
  };
}

export async function sendOwnerReviewAlertIfNeeded(): Promise<OwnerAlertResult> {
  const incidents = await collectOwnerReviewIncidents();
  if (incidents.length === 0) return { status: "idle", incidentCount: 0 };

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { status: "unconfigured", incidentCount: incidents.length };

  const recipients = await activeOperatorEmails();
  if (recipients.length === 0) return { status: "no_recipients", incidentCount: incidents.length };

  const fingerprint = incidents.map((incident) => `${incident.kind}:${incident.reference}:${incident.version}`).join("|");
  const alertKey = `owner-review/${digest(fingerprint)}`;
  const delivery = await ensureDelivery(alertKey, incidents.length);
  if (delivery.status === "SENT") return { status: "already_sent", incidentCount: incidents.length };
  if (delivery.status === "FAILED_FINAL") return { status: "failed_final", incidentCount: incidents.length };
  if (delivery.next_retry_at && new Date(delivery.next_retry_at).getTime() > Date.now()) {
    return { status: "not_due", incidentCount: incidents.length };
  }

  const claimed = await claimDelivery(delivery);
  if (!claimed) return { status: "claim_lost", incidentCount: incidents.length };

  const email = renderAlert(incidents);
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": alertKey,
      },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: recipients,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorCode = `OWNER_ALERT_RESEND_HTTP_${response.status}`;
      const retryable = response.status !== 400 && response.status !== 422;
      const status = await markFailed(claimed, errorCode, retryable);
      return { status, incidentCount: incidents.length, errorCode };
    }

    const payload = await response.json().catch(() => null) as { id?: string } | null;
    await markSent(claimed.id, payload?.id ?? null);
    return { status: "sent", incidentCount: incidents.length, recipientCount: recipients.length };
  } catch (error) {
    const errorCode = safeErrorCode(error);
    const status = await markFailed(claimed, errorCode, true);
    return { status, incidentCount: incidents.length, errorCode };
  }
}
