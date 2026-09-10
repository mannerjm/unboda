import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { recordOperatorAuditEvent, requireOperator } from "@/app/lib/operators/server";
import {
  isSupportRequestStatus,
  type OperatorSupportRequestDto,
  type SupportRequestCategory,
  type SupportRequestStatus,
} from "./types";

const OPERATOR_LIST_LIMIT = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVE_STATUSES: SupportRequestStatus[] = ["OPEN", "IN_REVIEW", "WAITING_USER"];

type OperatorSupportRequestRow = {
  id: string;
  contact_email: string;
  category: SupportRequestCategory;
  message: string;
  order_id: string | null;
  status: SupportRequestStatus;
  operator_response: string | null;
  responded_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export class OperatorSupportError extends Error {
  constructor(readonly code: "INVALID_INPUT" | "NOT_FOUND" | "LOOKUP_FAILED" | "UPDATE_FAILED" | "AUDIT_FAILED") {
    super(code);
    this.name = "OperatorSupportError";
  }
}

function toDto(row: OperatorSupportRequestRow): OperatorSupportRequestDto {
  return {
    id: row.id,
    contactEmail: row.contact_email,
    category: row.category,
    message: row.message,
    orderId: row.order_id,
    status: row.status,
    operatorResponse: row.operator_response,
    respondedAt: row.responded_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function auditView(reference: string, outcome: "SUCCESS" | "ERROR"): Promise<void> {
  try {
    await recordOperatorAuditEvent({
      action: "SUPPORT_REQUEST_VIEW",
      targetType: "SUPPORT_REQUEST",
      targetReference: reference,
      outcome,
    });
  } catch {
    throw new OperatorSupportError("AUDIT_FAILED");
  }
}

export async function getActiveSupportRequestCount(): Promise<number> {
  await requireOperator();
  const { count, error } = await createAdminClient()
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .in("status", ACTIVE_STATUSES);

  if (error) {
    await auditView("SUPPORT_QUEUE_COUNT", "ERROR");
    throw new OperatorSupportError("LOOKUP_FAILED");
  }

  await auditView("SUPPORT_QUEUE_COUNT", "SUCCESS");
  return count ?? 0;
}

export async function listSupportRequestsForOperator(status?: unknown): Promise<OperatorSupportRequestDto[]> {
  await requireOperator();
  const normalizedStatus = status === undefined || status === null || status === "" ? null : status;
  if (normalizedStatus !== null && !isSupportRequestStatus(normalizedStatus)) throw new OperatorSupportError("INVALID_INPUT");

  const supabase = createAdminClient();
  let query = supabase
    .from("support_requests")
    .select("id,contact_email,category,message,order_id,status,operator_response,responded_at,resolved_at,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(OPERATOR_LIST_LIMIT);

  query = normalizedStatus
    ? query.eq("status", normalizedStatus)
    : query.in("status", ACTIVE_STATUSES);

  const { data, error } = await query;
  const auditReference = normalizedStatus ? `SUPPORT_QUEUE:${normalizedStatus}` : "SUPPORT_QUEUE:ACTIVE";
  if (error) {
    await auditView(auditReference, "ERROR");
    throw new OperatorSupportError("LOOKUP_FAILED");
  }

  await auditView(auditReference, "SUCCESS");
  return ((data ?? []) as OperatorSupportRequestRow[]).map(toDto);
}

export async function updateSupportRequestForOperator(input: {
  requestId: unknown;
  status: unknown;
  response: unknown;
}): Promise<Pick<OperatorSupportRequestDto, "id" | "status" | "operatorResponse" | "respondedAt" | "resolvedAt" | "updatedAt">> {
  const operator = await requireOperator();
  if (typeof input.requestId !== "string" || !UUID_PATTERN.test(input.requestId) || !isSupportRequestStatus(input.status)) {
    throw new OperatorSupportError("INVALID_INPUT");
  }

  const response = typeof input.response === "string" ? input.response.trim() : "";
  if (response.length > 1500 || ((input.status === "WAITING_USER" || input.status === "RESOLVED") && response.length < 5)) {
    throw new OperatorSupportError("INVALID_INPUT");
  }

  const targetHash = createHash("sha256").update(input.requestId).digest("hex");
  const { data, error } = await createAdminClient().rpc("operator_update_support_request", {
    p_operator_id: operator.operatorId,
    p_operator_auth_user_id: operator.authUserId,
    p_request_id: input.requestId,
    p_status: input.status,
    p_response: response,
    p_target_reference_hash: targetHash,
    p_correlation_id: randomUUID(),
  });

  if (error) {
    if (error.message.includes("SUPPORT_REQUEST_NOT_FOUND")) throw new OperatorSupportError("NOT_FOUND");
    throw new OperatorSupportError("UPDATE_FAILED");
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new OperatorSupportError("UPDATE_FAILED");
  return {
    id: row.id,
    status: row.status,
    operatorResponse: row.operator_response,
    respondedAt: row.responded_at,
    resolvedAt: row.resolved_at,
    updatedAt: row.updated_at,
  };
}