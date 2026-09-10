import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/app/lib/supabase/admin";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const ALERT_FROM = "운보다 운영 알림 <noreply@mail.unboda.kr>";
const ADMIN_URL = "https://unboda.kr/admin";
const AI_WINDOW_HOURS = 24;
const MAX_ALERT_ATTEMPTS = 5;

type IncidentKind =
  | "PAYMENT_OWNER_REVIEW"
  | "REFUND_OWNER_REVIEW"
  | "REPORT_FAILED"
  | "CLOSURE_OWNER_REVIEW"
  | "AI_CHARGE_INTEGRITY";

type Incident = {
  kind: IncidentKind;
  reference: string;
  version: string;
};

type DeliveryRow = {
  id: string;
  alert_key: string;
  incident_count: number;
  status: "PENDING" | "SENDING" | "FAILED_RETRYING" | "SENT" | "FAILED_FINAL";
  attempt_count: number;
  max_attempt_count: number;
  next_retry_at: string | null;
};

export type OwnerAlertResult =
  | { status: "idle"; incidentCount: 0 }
  | { status: "unconfigured"; incidentCount: number }
  | { status: "no_recipients"; incidentCount: number }
  | { status: "already_sent" | "not_due" | "claim_lost"; incidentCount: number }
  | { status: "sent"; incidentCount: number; recipientCount: number }
  | { status: "retrying" | "failed_final"; incidentCount: number; errorCode: string };

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
    REPORT_FAILED: 0,
    CLOSURE_OWNER_REVIEW: 0,
    AI_CHARGE_INTEGRITY: 0,
  };
  for (const incident of incidents) counts[incident.kind] += 1;
  return counts;
}

async function collectAiChargeIntegrityIncidents(): Promise<Incident[]> {
  const db = createAdminClient();
  const since = new Date(Date.now() - AI_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const nowMs = Date.now();
  const { data: userRows, error: userError } = await db
    .from("ai_consulting_messages")
    .select("id,charged,reservation_token,reservation_expires_at,reservation_released_at,created_at")
    .eq("role", "user")
    .eq("scope_decision", "ALLOW")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);
  if (userError) throw new Error("OWNER_ALERT_AI_MESSAGES_READ_FAILED");

  const rows = userRows ?? [];
  const ids = rows.map((row) => row.id as string);
  if (ids.length === 0) return [];

  const [assistantResult, consumeResult, attemptResult] = await Promise.all([
    db.from("ai_consulting_messages").select("reply_to_message_id").eq("role", "assistant").in("reply_to_message_id", ids),
    db.from("ai_consulting_credit_ledger").select("related_message_id").eq("entry_type", "CONSUME").in("related_message_id", ids),
    db.from("ai_consulting_attempts").select("user_message_id").in("user_message_id", ids),
  ]);
  if (assistantResult.error || consumeResult.error || attemptResult.error) {
    throw new Error("OWNER_ALERT_AI_INTEGRITY_READ_FAILED");
  }

  const replies = new Set((assistantResult.data ?? []).map((row) => row.reply_to_message_id).filter(Boolean) as string[]);
  const consumes = new Set((consumeResult.data ?? []).map((row) => row.related_message_id).filter(Boolean) as string[]);
  const attempts = new Set((attemptResult.data ?? []).map((row) => row.user_message_id).filter(Boolean) as string[]);
  const incidents: Incident[] = [];

  for (const row of rows) {
    const id = row.id as string;
    const charged = Boolean(row.charged);
    const createdAt = normalizeVersion(row.created_at as string | null);
    const integrityProblems = [
      charged && !replies.has(id),
      charged && !consumes.has(id),
      !charged && replies.has(id),
      !charged && consumes.has(id),
    ].some(Boolean);

    const expiresAt = row.reservation_expires_at as string | null;
    const staleReservation = !charged
      && Boolean(row.reservation_token)
      && !row.reservation_released_at
      && Boolean(expiresAt)
      && Number.isFinite(new Date(expiresAt as string).getTime())
      && new Date(expiresAt as string).getTime() <= nowMs;
    const releasedWithoutFailureTelemetry = !charged && Boolean(row.reservation_released_at) && !attempts.has(id);

    if (integrityProblems || staleReservation || releasedWithoutFailureTelemetry) {
      incidents.push({
        kind: "AI_CHARGE_INTEGRITY",
        reference: digest(id),
        version: createdAt,
      });
    }
  }

  return incidents;
}

async function collectOwnerReviewIncidents(): Promise<Incident[]> {
  const db = createAdminClient();
  const [paymentResult, refundResult, reportResult, closureResult, aiIncidents] = await Promise.all([
    db.from("toss_payment_records")
      .select("order_id,reconciliation_status,updated_at")
      .in("reconciliation_status", ["terminal_mismatch", "reconciliation_failed"]),
    db.from("refund_workflows")
      .select("order_id,status,updated_at")
      .eq("status", "OWNER_REVIEW_REQUIRED"),
    db.from("paid_reports")
      .select("id,status,updated_at")
      .eq("status", "failed"),
    db.from("account_lifecycles")
      .select("user_id,status,updated_at")
      .eq("status", "DELETION_REQUESTED")
      .eq("closure_owner_review_required", true),
    collectAiChargeIntegrityIncidents(),
  ]);

  if (paymentResult.error || refundResult.error || reportResult.error || closureResult.error) {
    throw new Error("OWNER_ALERT_OPERATIONAL_READ_FAILED");
  }

  const incidents: Incident[] = [
    ...(paymentResult.data ?? []).map((row) => ({
      kind: "PAYMENT_OWNER_REVIEW" as const,
      reference: digest(String(row.order_id)),
      version: normalizeVersion(row.updated_at as string | null),
    })),
    ...(refundResult.data ?? []).map((row) => ({
      kind: "REFUND_OWNER_REVIEW" as const,
      reference: digest(String(row.order_id)),
      version: normalizeVersion(row.updated_at as string | null),
    })),
    ...(reportResult.data ?? []).map((row) => ({
      kind: "REPORT_FAILED" as const,
      reference: digest(String(row.id)),
      version: normalizeVersion(row.updated_at as string | null),
    })),
    ...(closureResult.data ?? []).map((row) => ({
      kind: "CLOSURE_OWNER_REVIEW" as const,
      reference: digest(String(row.user_id)),
      version: normalizeVersion(row.updated_at as string | null),
    })),
    ...aiIncidents,
  ];

  incidents.sort((a, b) => `${a.kind}:${a.reference}:${a.version}`.localeCompare(`${b.kind}:${b.reference}:${b.version}`));
  return incidents;
}

async function activeOperatorEmails(): Promise<string[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("operator_roles")
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
  const minutes = Math.min(60, 5 * 2 ** Math.max(0, attemptCount - 1));
  return minutes * 60 * 1000;
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
    .select("id,alert_key,incident_count,status,attempt_count,max_attempt_count,next_retry_at")
    .eq("alert_key", alertKey)
    .single<DeliveryRow>();
  if (error || !data) throw new Error("OWNER_ALERT_LEDGER_READ_FAILED");
  return data;
}

async function claimDelivery(row: DeliveryRow): Promise<DeliveryRow | null> {
  if (row.status === "SENT" || row.status === "FAILED_FINAL" || row.status === "SENDING") return null;
  if (row.next_retry_at && new Date(row.next_retry_at).getTime() > Date.now()) return null;

  const nextAttempt = row.attempt_count + 1;
  const db = createAdminClient();
  const { data, error } = await db.from("operator_alert_deliveries")
    .update({
      status: "SENDING",
      attempt_count: nextAttempt,
      next_retry_at: null,
      last_error_code: null,
    })
    .eq("id", row.id)
    .eq("status", row.status)
    .select("id,alert_key,incident_count,status,attempt_count,max_attempt_count,next_retry_at")
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
    ["유료 분석 생성 실패", counts.REPORT_FAILED],
    ["계정 종료 수동 확인", counts.CLOSURE_OWNER_REVIEW],
    ["AI 질문권 무결성", counts.AI_CHARGE_INTEGRITY],
  ].filter(([, count]) => Number(count) > 0) as Array<[string, number]>;
  const summary = lines.map(([label, count]) => `${label}: ${count}건`).join("\n");
  const escapedSummary = lines.map(([label, count]) => `<li>${label}: <strong>${count}건</strong></li>`).join("");
  return {
    subject: `[운보다] 대표 확인이 필요한 운영 예외 ${incidents.length}건`,
    text: `운보다에서 대표 확인이 필요한 운영 예외가 감지되었습니다.\n\n${summary}\n\n고객 개인정보나 주문 식별자는 이메일에 포함하지 않았습니다. 관리자 화면에서 확인하세요.\n${ADMIN_URL}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>운보다 운영 확인 필요</h2><p>대표 확인이 필요한 예외가 감지되었습니다.</p><ul>${escapedSummary}</ul><p>고객 개인정보나 주문 식별자는 이메일에 포함하지 않았습니다.</p><p><a href="${ADMIN_URL}">운영 대시보드에서 확인하기</a></p></div>`,
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
  if (delivery.status === "SENT" || delivery.status === "FAILED_FINAL") {
    return { status: "already_sent", incidentCount: incidents.length };
  }
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
      const retryable = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
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
