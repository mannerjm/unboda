import "server-only";

import { createAdminClient } from "@/app/lib/supabase/admin";
import { SUPPORT_CATEGORY_LABELS, type SupportRequestCategory } from "@/app/lib/support/types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SUPPORT_FROM = "운보다 고객지원 <noreply@mail.unboda.kr>";
const ADMIN_SUPPORT_URL = "https://unboda.kr/admin/support";
const CUSTOMER_SUPPORT_URL = "https://unboda.kr/support";
const DEFAULT_BATCH_LIMIT = 10;
const STALE_SENDING_MS = 15 * 60 * 1000;

type NotificationType = "OWNER_NEW_REQUEST" | "CUSTOMER_RESPONSE";
type DeliveryStatus = "PENDING" | "SENDING" | "FAILED_RETRYING" | "SENT" | "FAILED_FINAL";

type DeliveryRow = {
  id: string;
  support_request_id: string;
  notification_type: NotificationType;
  status: DeliveryStatus;
  attempt_count: number;
  max_attempt_count: number;
  next_retry_at: string | null;
  updated_at: string;
};

type SupportRequestRow = {
  id: string;
  contact_email: string;
  category: SupportRequestCategory;
};

const DELIVERY_SELECT = "id,support_request_id,notification_type,status,attempt_count,max_attempt_count,next_retry_at,updated_at";

export type SupportNotificationDispatchResult = {
  configured: boolean;
  scanned: number;
  sent: number;
  retrying: number;
  failedFinal: number;
  skipped: number;
};

function retryDelayMs(attemptCount: number): number {
  return Math.min(60, 5 * 2 ** Math.max(0, attemptCount - 1)) * 60 * 1000;
}

function safeErrorCode(error: unknown): string {
  if (error instanceof Error && /^SUPPORT_EMAIL_[A-Z0-9_]+$/.test(error.message)) return error.message;
  return "SUPPORT_EMAIL_SEND_FAILED";
}

async function activeOperatorEmails(): Promise<string[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("operator_roles")
    .select("auth_user_id")
    .eq("role", "CS_OPERATOR")
    .eq("is_active", true)
    .is("revoked_at", null);
  if (error) throw new Error("SUPPORT_EMAIL_OPERATOR_READ_FAILED");

  const emails = new Set<string>();
  for (const row of data ?? []) {
    const { data: authData, error: authError } = await db.auth.admin.getUserById(row.auth_user_id as string);
    if (authError) throw new Error("SUPPORT_EMAIL_OPERATOR_AUTH_READ_FAILED");
    const email = authData.user?.email?.trim().toLowerCase();
    if (email) emails.add(email);
  }
  return [...emails];
}

async function recoverStaleSending(row: DeliveryRow): Promise<DeliveryRow | null> {
  if (row.status !== "SENDING") return row;
  const updatedMs = new Date(row.updated_at).getTime();
  if (!Number.isFinite(updatedMs) || Date.now() - updatedMs < STALE_SENDING_MS) return null;

  const { data, error } = await createAdminClient().from("support_notification_deliveries")
    .update({
      status: "FAILED_RETRYING",
      next_retry_at: new Date().toISOString(),
      last_error_code: "SUPPORT_EMAIL_STALE_SENDING_RECOVERED",
    })
    .eq("id", row.id)
    .eq("status", "SENDING")
    .eq("updated_at", row.updated_at)
    .select(DELIVERY_SELECT)
    .maybeSingle<DeliveryRow>();
  if (error) throw new Error("SUPPORT_EMAIL_STALE_RECOVERY_FAILED");
  return data ?? null;
}

async function claimDelivery(input: DeliveryRow): Promise<DeliveryRow | null> {
  const row = await recoverStaleSending(input);
  if (!row || row.status === "SENT" || row.status === "FAILED_FINAL" || row.status === "SENDING") return null;
  if (row.next_retry_at && new Date(row.next_retry_at).getTime() > Date.now()) return null;
  if (row.attempt_count >= row.max_attempt_count) return null;

  const { data, error } = await createAdminClient().from("support_notification_deliveries")
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
  if (error) throw new Error("SUPPORT_EMAIL_CLAIM_FAILED");
  return data ?? null;
}

async function markSent(id: string, providerMessageId: string | null): Promise<void> {
  const { error } = await createAdminClient().from("support_notification_deliveries").update({
    status: "SENT",
    sent_at: new Date().toISOString(),
    provider_message_id: providerMessageId,
    next_retry_at: null,
    last_error_code: null,
  }).eq("id", id).eq("status", "SENDING");
  if (error) throw new Error("SUPPORT_EMAIL_COMPLETE_FAILED");
}

async function markFailed(row: DeliveryRow, errorCode: string, retryable: boolean): Promise<"retrying" | "failed_final"> {
  const final = row.attempt_count >= row.max_attempt_count || !retryable;
  const { error } = await createAdminClient().from("support_notification_deliveries").update({
    status: final ? "FAILED_FINAL" : "FAILED_RETRYING",
    next_retry_at: final ? null : new Date(Date.now() + retryDelayMs(row.attempt_count)).toISOString(),
    last_error_code: errorCode,
  }).eq("id", row.id).eq("status", "SENDING");
  if (error) throw new Error("SUPPORT_EMAIL_FAILURE_UPDATE_FAILED");
  return final ? "failed_final" : "retrying";
}

async function loadSupportRequest(id: string): Promise<SupportRequestRow> {
  const { data, error } = await createAdminClient().from("support_requests")
    .select("id,contact_email,category")
    .eq("id", id)
    .single<SupportRequestRow>();
  if (error || !data) throw new Error("SUPPORT_EMAIL_REQUEST_READ_FAILED");
  return data;
}

function ownerMessage(category: SupportRequestCategory): { subject: string; text: string; html: string } {
  const label = SUPPORT_CATEGORY_LABELS[category];
  return {
    subject: `[운보다] 새 고객지원 문의 · ${label}`,
    text: `운보다 고객지원 센터에 새 문의가 접수되었습니다.\n\n분류: ${label}\n\n고객 이메일, 주문번호, 문의 본문은 이메일에 포함하지 않았습니다. 관리자 고객지원 화면에서 확인하세요.\n${ADMIN_SUPPORT_URL}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>새 고객지원 문의</h2><p>분류: <strong>${label}</strong></p><p>고객 이메일, 주문번호, 문의 본문은 이메일에 포함하지 않았습니다.</p><p><a href="${ADMIN_SUPPORT_URL}">관리자 고객지원에서 확인하기</a></p></div>`,
  };
}

function customerMessage(): { subject: string; text: string; html: string } {
  return {
    subject: "[운보다] 고객지원 답변이 등록되었습니다",
    text: `운보다 고객지원 문의에 답변이 등록되었습니다.\n\n보안을 위해 답변 내용은 이메일에 포함하지 않았습니다. 운보다에 로그인한 뒤 고객지원 센터에서 확인해 주세요.\n${CUSTOMER_SUPPORT_URL}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>고객지원 답변이 등록되었습니다</h2><p>보안을 위해 답변 내용은 이메일에 포함하지 않았습니다.</p><p>운보다에 로그인한 뒤 고객지원 센터에서 확인해 주세요.</p><p><a href="${CUSTOMER_SUPPORT_URL}">고객지원 답변 확인하기</a></p></div>`,
  };
}

async function sendResendEmail(input: { to: string[]; subject: string; text: string; html: string; apiKey: string }): Promise<string | null> {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: SUPPORT_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) throw new Error("SUPPORT_EMAIL_RETRYABLE_PROVIDER_ERROR");
    throw new Error("SUPPORT_EMAIL_PROVIDER_REJECTED");
  }

  const body = await response.json().catch(() => null) as { id?: string } | null;
  return typeof body?.id === "string" ? body.id : null;
}

export async function dispatchSupportNotificationDeliveries(options: { requestId?: string; batchLimit?: number } = {}): Promise<SupportNotificationDispatchResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { configured: false, scanned: 0, sent: 0, retrying: 0, failedFinal: 0, skipped: 0 };

  const limit = Math.min(25, Math.max(1, options.batchLimit ?? DEFAULT_BATCH_LIMIT));
  let query = createAdminClient().from("support_notification_deliveries")
    .select(DELIVERY_SELECT)
    .in("status", ["PENDING", "FAILED_RETRYING", "SENDING"])
    .order("created_at", { ascending: true })
    .limit(limit);
  if (options.requestId) query = query.eq("support_request_id", options.requestId);

  const { data, error } = await query;
  if (error) throw new Error("SUPPORT_EMAIL_QUEUE_READ_FAILED");

  const result: SupportNotificationDispatchResult = {
    configured: true,
    scanned: (data ?? []).length,
    sent: 0,
    retrying: 0,
    failedFinal: 0,
    skipped: 0,
  };

  for (const candidate of (data ?? []) as DeliveryRow[]) {
    const claimed = await claimDelivery(candidate);
    if (!claimed) {
      result.skipped += 1;
      continue;
    }

    try {
      const supportRequest = await loadSupportRequest(claimed.support_request_id);
      let recipients: string[];
      let rendered: { subject: string; text: string; html: string };

      if (claimed.notification_type === "OWNER_NEW_REQUEST") {
        recipients = await activeOperatorEmails();
        if (recipients.length === 0) throw new Error("SUPPORT_EMAIL_NO_OPERATOR_RECIPIENT");
        rendered = ownerMessage(supportRequest.category);
      } else {
        const email = supportRequest.contact_email.trim().toLowerCase();
        if (!email) throw new Error("SUPPORT_EMAIL_NO_CUSTOMER_RECIPIENT");
        recipients = [email];
        rendered = customerMessage();
      }

      const providerMessageId = await sendResendEmail({ ...rendered, to: recipients, apiKey });
      await markSent(claimed.id, providerMessageId);
      result.sent += 1;
    } catch (error) {
      const errorCode = safeErrorCode(error);
      const retryable = errorCode !== "SUPPORT_EMAIL_PROVIDER_REJECTED";
      const status = await markFailed(claimed, errorCode, retryable);
      if (status === "retrying") result.retrying += 1;
      else result.failedFinal += 1;
    }
  }

  return result;
}
