import { createAdminClient } from "../supabase/admin";
import type { AiConsultingScopeDecision } from "../aiConsultingDataModel";

export type AiConsultingGrantRpcRow = {
  id: string;
  user_id: string;
  profile_id: string;
  source_purchase_id: string;
  source_product_id: string;
  base_entitlement_id: string;
  base_product_id: string;
  base_resource_type: string;
  analysis_edition_key: string;
  question_limit: number;
  questions_used: number;
  questions_reserved: number;
  status: "active" | "exhausted" | "revoked" | "expired";
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AiConsultingReservation = {
  messageId: string;
  reservationToken: string | null;
  reservationExpiresAt: string | null;
  chargeable: boolean;
  questionsRemaining: number;
};

export type AiConsultingCompletion = {
  assistantMessageId: string;
  questionsUsed: number;
  questionsReserved: number;
  questionLimit: number;
  grantStatus: "active" | "exhausted" | "revoked" | "expired";
};

function firstRow<T>(data: unknown): T | null {
  return Array.isArray(data) && data.length > 0 ? (data[0] as T) : null;
}

export async function issueAiConsultingGrant(input: {
  sourcePurchaseId: string;
  baseEntitlementId: string;
  questionLimit: number;
  expiresAt?: string | null;
}): Promise<AiConsultingGrantRpcRow> {
  if (!Number.isInteger(input.questionLimit) || input.questionLimit <= 0 || input.questionLimit > 1000) {
    throw new Error("AI_CONSULTING_INVALID_QUESTION_LIMIT");
  }

  const { data, error } = await createAdminClient().rpc("issue_ai_consulting_grant", {
    p_source_purchase_id: input.sourcePurchaseId,
    p_base_entitlement_id: input.baseEntitlementId,
    p_question_limit: input.questionLimit,
    p_expires_at: input.expiresAt ?? null,
  });

  const row = firstRow<AiConsultingGrantRpcRow>(data);
  if (error || !row) {
    throw new Error(error?.message ?? "AI_CONSULTING_GRANT_ISSUE_FAILED");
  }
  return row;
}

export async function reserveAiConsultingQuestion(input: {
  threadId: string;
  requestId: string;
  content: string;
  scopeDecision: AiConsultingScopeDecision;
  scopeReasonCode?: string | null;
  reservationTtlSeconds?: number;
}): Promise<AiConsultingReservation> {
  const { data, error } = await createAdminClient().rpc("reserve_ai_consulting_question", {
    p_thread_id: input.threadId,
    p_request_id: input.requestId,
    p_content: input.content,
    p_scope_decision: input.scopeDecision,
    p_scope_reason_code: input.scopeReasonCode ?? null,
    p_reservation_ttl_seconds: input.reservationTtlSeconds ?? 300,
  });

  const row = firstRow<{
    message_id: string;
    reservation_token: string | null;
    reservation_expires_at: string | null;
    chargeable: boolean;
    questions_remaining: number;
  }>(data);

  if (error || !row) {
    throw new Error(error?.message ?? "AI_CONSULTING_RESERVATION_FAILED");
  }

  return {
    messageId: row.message_id,
    reservationToken: row.reservation_token,
    reservationExpiresAt: row.reservation_expires_at,
    chargeable: row.chargeable,
    questionsRemaining: row.questions_remaining,
  };
}

export async function releaseAiConsultingQuestionReservation(input: {
  userMessageId: string;
  reservationToken: string;
}): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc(
    "release_ai_consulting_question_reservation",
    {
      p_user_message_id: input.userMessageId,
      p_reservation_token: input.reservationToken,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
  return data === true;
}

export async function completeAiConsultingAnswer(input: {
  userMessageId: string;
  reservationToken: string;
  assistantContent: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
}): Promise<AiConsultingCompletion> {
  const { data, error } = await createAdminClient().rpc("complete_ai_consulting_answer", {
    p_user_message_id: input.userMessageId,
    p_reservation_token: input.reservationToken,
    p_assistant_content: input.assistantContent,
    p_model: input.model,
    p_input_tokens: input.inputTokens ?? null,
    p_output_tokens: input.outputTokens ?? null,
  });

  const row = firstRow<{
    assistant_message_id: string;
    questions_used: number;
    questions_reserved: number;
    question_limit: number;
    grant_status: AiConsultingCompletion["grantStatus"];
  }>(data);

  if (error || !row) {
    throw new Error(error?.message ?? "AI_CONSULTING_COMPLETION_FAILED");
  }

  return {
    assistantMessageId: row.assistant_message_id,
    questionsUsed: row.questions_used,
    questionsReserved: row.questions_reserved,
    questionLimit: row.question_limit,
    grantStatus: row.grant_status,
  };
}
