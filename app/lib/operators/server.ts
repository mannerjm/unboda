import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const OPERATOR_ROLES = ["CS_OPERATOR"] as const;
export type OperatorRole = (typeof OPERATOR_ROLES)[number];

export const OPERATOR_AUDIT_ACTIONS = [
  "CUSTOMER_LOOKUP",
  "ORDER_LOOKUP",
  "FAILURE_QUEUE_VIEW",
] as const;
export type OperatorAuditAction = (typeof OPERATOR_AUDIT_ACTIONS)[number];

export const OPERATOR_AUDIT_TARGET_TYPES = ["ACCOUNT", "ORDER", "FAILURE_QUEUE"] as const;
export type OperatorAuditTargetType = (typeof OPERATOR_AUDIT_TARGET_TYPES)[number];

export const OPERATOR_AUDIT_OUTCOMES = ["SUCCESS", "NOT_FOUND", "INVALID_INPUT", "ERROR"] as const;
export type OperatorAuditOutcome = (typeof OPERATOR_AUDIT_OUTCOMES)[number];

export type OperatorIdentity = {
  operatorId: string;
  authUserId: string;
  role: OperatorRole;
};

export type OperatorAuthorizationCandidate = {
  id: string;
  auth_user_id: string;
  role: string;
  is_active: boolean;
  revoked_at: string | null;
};

export class OperatorAuthorizationError extends Error {
  constructor(readonly code: "UNAUTHENTICATED" | "MISSING_ROLE" | "INACTIVE_ROLE" | "UNSUPPORTED_ROLE" | "ROLE_LOOKUP_FAILED") {
    super(code);
    this.name = "OperatorAuthorizationError";
  }
}

function includes<T extends string>(values: readonly T[], value: string): value is T {
  return values.includes(value as T);
}

export function resolveOperatorIdentity(
  authUserId: string,
  candidate: OperatorAuthorizationCandidate | null,
): OperatorIdentity {
  if (!candidate || candidate.auth_user_id !== authUserId) {
    throw new OperatorAuthorizationError("MISSING_ROLE");
  }
  if (!candidate.is_active || candidate.revoked_at !== null) {
    throw new OperatorAuthorizationError("INACTIVE_ROLE");
  }
  if (!includes(OPERATOR_ROLES, candidate.role)) {
    throw new OperatorAuthorizationError("UNSUPPORTED_ROLE");
  }

  return {
    operatorId: candidate.id,
    authUserId,
    role: candidate.role,
  };
}

/** Resolves only the verified server session; no request-provided identity is accepted. */
export async function requireOperator(): Promise<OperatorIdentity> {
  const user = await getCurrentUser();
  if (!user) {
    throw new OperatorAuthorizationError("UNAUTHENTICATED");
  }

  const { data, error } = await createAdminClient()
    .from("operator_roles")
    .select("id,auth_user_id,role,is_active,revoked_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<OperatorAuthorizationCandidate>();

  if (error) {
    throw new OperatorAuthorizationError("ROLE_LOOKUP_FAILED");
  }

  return resolveOperatorIdentity(user.id, data);
}

export type OperatorAuditEventInput = {
  action: OperatorAuditAction;
  targetType: OperatorAuditTargetType;
  targetReference: string;
  outcome: OperatorAuditOutcome;
  reason?: string;
  correlationId?: string;
};

type PreparedOperatorAuditEvent = Omit<OperatorAuditEventInput, "targetReference" | "reason" | "correlationId"> & {
  operator: OperatorIdentity;
  targetReferenceHash: string;
  reason: string | null;
  correlationId: string;
};

function prepareOperatorAuditEvent(
  operator: OperatorIdentity,
  input: OperatorAuditEventInput,
): PreparedOperatorAuditEvent {
  if (!includes(OPERATOR_AUDIT_ACTIONS, input.action)) throw new Error("Unsupported operator audit action");
  if (!includes(OPERATOR_AUDIT_TARGET_TYPES, input.targetType)) throw new Error("Unsupported operator audit target");
  if (!includes(OPERATOR_AUDIT_OUTCOMES, input.outcome)) throw new Error("Unsupported operator audit outcome");
  if (!input.targetReference.trim()) throw new Error("Operator audit target reference is required");
  if (input.reason !== undefined && (!input.reason.trim() || input.reason.length > 240)) throw new Error("Operator audit reason is invalid");

  return {
    operator,
    action: input.action,
    targetType: input.targetType,
    targetReferenceHash: createHash("sha256").update(input.targetReference.trim()).digest("hex"),
    outcome: input.outcome,
    reason: input.reason?.trim() || null,
    correlationId: input.correlationId ?? randomUUID(),
  };
}

/**
 * Mandatory audit writer for future privileged lookup and write routes.
 * It intentionally throws when persistence fails so callers fail closed.
 */
export async function recordOperatorAuditEvent(input: OperatorAuditEventInput): Promise<void> {
  const operator = await requireOperator();
  const event = prepareOperatorAuditEvent(operator, input);
  const { error } = await createAdminClient().from("operator_audit_events").insert({
    operator_id: event.operator.operatorId,
    operator_auth_user_id: event.operator.authUserId,
    action: event.action,
    target_type: event.targetType,
    target_reference_hash: event.targetReferenceHash,
    outcome: event.outcome,
    correlation_id: event.correlationId,
    reason: event.reason,
  });

  if (error) {
    throw new Error("Operator audit event could not be persisted");
  }
}